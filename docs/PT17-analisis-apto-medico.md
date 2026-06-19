# PT17 - Análisis: Fecha de Vencimiento de Apto Médico se cambia en todas las Licencias

## Problema

Al registrar un apto médico en cualquier Licencia, se está cambiando la fecha de vencimiento del apto en **todas** las Licencias del mismo legajo. Este es un error grave.

### Causa Raíz

El endpoint OData `AptoMedico2Set` usa el **Legajo como clave primaria** (`/AptoMedico2Set('LEGAJO')`). Esto significa que existe **un solo registro de apto médico por persona**, compartido por todas sus habilitaciones (PT15, TCT, MTO, etc.).

Cuando se ejecuta `HabilitacionServices.saveHabilitacion()` con el payload:

```javascript
Hab_apmedico_nav: [{
    "Legajo": habilitacion.Legajo,
    "Vigencia": oModel.oData.Medicina_Fecha_vencimiento,
    "Observaciones": "Sin observaciones",
    "Gradoap": oModel.oData.Gradoap
}]
```

El backend actualiza el registro único de `AptoMedico2Set` para ese Legajo, afectando **todas las habilitaciones** que expanden `Hab_apmedico_nav`.

Adicionalmente, en `onUpdateData()` (línea 858 de `detailHabPT15.controller.js`):
```javascript
habilitacion.Vigencia = oModel.oData.Medicina_Fecha_vencimiento;
```
Se sincroniza la vigencia de la habilitación principal con la fecha médica.

---

## Reglas de Negocio (del ticket)

### Estados donde SI se debe actualizar la fecha de vencimiento del apto:
| Estado | Código (estimado) |
|--------|-------------------|
| En Proceso | `P` |
| Inicio Programado | `I` |
| Habilitado | `H` |
| Suspensión Salud | `SS` |
| Suspensión Salud + GPOR | `SG` |
| Suspensión GPOR | `SP` |

### Estados donde NO se debe actualizar (estados finales):
| Estado | Código (estimado) |
|--------|-------------------|
| Cancelado | `C` |
| Revocado | `D` |
| Finalizado | `F` |

> **Nota:** Los códigos de estado deben validarse contra el backend SAP. Los códigos actuales conocidos en el frontend son: `H` (Habilitado), `D` (Revocado), `S` (Suspendido), `C` (Cancelado), `N` (Nuevo), `P` (En Proceso), `F` (Finalizado).

---

## Solución Propuesta: Nueva Tabla Z para Aptos Médicos de PT15

### Concepto

Crear una nueva tabla Z en SAP (`ZAPTO_MEDICO_PT15` o similar) que almacene las fechas de aptos médicos **por habilitación** en lugar de **por legajo**. Esto desacopla los datos médicos entre licencias.

### Estructura propuesta de la tabla Z

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `Idhabilitacion` | STRING | ID de la habilitación (clave) |
| `Legajo` | STRING | Legajo del empleado |
| `Clasehab` | STRING | Clase de habilitación (H0003 para PT15) |
| `Gradoap` | STRING | Grado de aptitud (A, B, C, D) |
| `Vigencia` | DATE | Fecha de vencimiento del apto |
| `Observaciones` | STRING | Observaciones |
| `Empresa` | STRING | Empresa (100/300) |

### Clave primaria: `Idhabilitacion` + `Clasehab` (o `Idhabilitacion` solo si es suficiente)

---

## Implementación en el Frontend (PT15)

### Archivos a modificar

1. **`webapp/services/IntervencionesServices.js`** o crear nuevo servicio
2. **`webapp/controller/detailHabPT15.controller.js`**
3. **`webapp/services/HabilitacionServices.js`** (posiblemente)

### Cambios detallados

#### 1. Nuevo servicio o endpoint para la tabla Z

Crear un nuevo servicio que interactúe con el nuevo EntitySet (ej: `AptoMedicoPT15Set`):

```javascript
// Opción A: Nuevo servicio webapp/services/AptoMedicoPT15Service.js
loadAptoMedico: function (idHabilitacion, successCallback, errorCallback) {
    var odataModel = oDataServices.getModel();
    odataModel.read("/AptoMedicoPT15Set", {
        filters: [
            new Filter("Idhabilitacion", FilterOperator.EQ, idHabilitacion)
        ],
        success: successCallback,
        error: errorCallback
    });
},
saveAptoMedico: function (data, successCallback, errorCallback) {
    var odataModel = oDataServices.getModel();
    odataModel.create("/AptoMedicoPT15Set", data, {
        success: successCallback,
        error: errorCallback
    });
},
updateAptoMedico: function (idHabilitacion, data, successCallback, errorCallback) {
    var path = "/AptoMedicoPT15Set('" + idHabilitacion + "')";
    var odataModel = oDataServices.getModel();
    odataModel.update(path, data, {
        success: successCallback,
        error: errorCallback
    });
}
```

#### 2. Cambios en `detailHabPT15.controller.js`

**En `onBindingIntervenciones()`:**
- Reemplazar la lectura de `Habilitacion.Hab_apmedico_nav` por una lectura a la nueva tabla Z
- Los datos del apto médico ahora vienen filtrados por `Idhabilitacion`, no por `Legajo`

**En `onUpdateData()`:**
- Reemplazar el envío de `Hab_apmedico_nav` en el payload de `saveHabilitacion()` 
- En su lugar, llamar al nuevo servicio para guardar/actualizar en la tabla Z
- Agregar validación de estado: solo actualizar si el estado de la habilitación actual está en la lista permitida
- NO modificar `habilitacion.Vigencia` directamente desde el apto médico (o hacerlo solo para la habilitación actual)

**Validación de estado propuesta:**
```javascript
// Estados donde se permite actualizar el apto médico
var estadosPermitidos = ['P', 'I', 'H', 'SS', 'SG', 'SP']; // Ajustar códigos según backend
var estadoActual = habilitacion.Estado;

if (!estadosPermitidos.includes(estadoActual)) {
    MessageBox.error("No se puede modificar el apto médico en una habilitación con estado " + 
        this.StatusFormatter(estadoActual));
    return;
}
```

#### 3. Cambios en `HabilitacionServices.js`

En `saveHabilitacion()` para PT15, ya no enviar `Hab_apmedico_nav` en el payload. O, si el backend lo requiere, enviar un array vacío.

---

## Alcance: Solo PT15 — TCT y MTO sin cambios

La nueva tabla Z es **exclusiva para PT15**. Los demás módulos no se tocan:

### TCT (`detailHabTCT.controller.js`)
- Sigue leyendo de `Hab_apmedico_nav` (modo solo lectura, líneas 468-470) — **sin cambios**
- TCT no escribe datos de apto médico, solo los muestra

### MTO (`detailHabMTO.controller.js`)
- No interactúa con `Hab_apmedico_nav` — **sin cambios, sin impacto**

### Consecuencia
- PT15 lee y escribe exclusivamente en la nueva tabla Z (`AptoMedicoPT15Set`)
- PT15 deja de enviar `Hab_apmedico_nav` al guardar, por lo tanto ya no modifica el registro global de `AptoMedico2Set`
- TCT y MTO siguen funcionando como hoy contra `Hab_apmedico_nav` / `AptoMedico2Set`
- El registro global por Legajo sigue existiendo para quien lo necesite, pero PT15 ya no lo toca

### Vista PT15 (`detailHabPT15.view.xml`)
- La sección "Medicina Laboral" (líneas 277-340) no necesita cambios en la vista
- Los bindings siguen apuntando a `HabilitacionModel>/Gradoap` y `HabilitacionModel>/Medicina_Fecha_vencimiento`
- El cambio es en el controlador, que ahora alimenta estos campos desde la nueva tabla Z

---

## Beneficios esperados

1. **Elimina el bug grave:** Cada habilitación tiene su propia fecha de vencimiento de apto médico
2. **Respeta estados finales:** Las habilitaciones en Cancelado/Revocado/Finalizado no se ven afectadas
3. **Trazabilidad:** Se puede ver el historial de aptos médicos por habilitación específica
4. **Escalabilidad:** Se pueden agregar campos específicos de PT15 sin afectar otros procesos

---

## Dependencias

- **Backend SAP:** Se necesita crear la tabla Z y exponer el EntitySet en el servicio OData `Z_SCP_HABILITACIONES_SRV`
- **Migración de datos:** Los datos existentes en `AptoMedico2Set` deben migrarse a la nueva tabla, asociándolos a cada habilitación activa
- **Testing:** Probar todos los flujos de PT15 con la nueva tabla, verificando que los estados finales no se actualizan

---

## Diagrama de flujo propuesto

```
Usuario (MedicinaLaboral_PT15) edita Grado/Fecha
  ↓
onUpdateData()
  ↓
¿Estado en lista permitida? ──NO──→ Mostrar error, cancelar
  ↓ SI
Guardar en nueva tabla Z (AptoMedicoPT15Set)
  con Idhabilitacion como clave
  ↓
Actualizar estado de la habilitación actual (si aplica)
  ↓
NO tocar otras habilitaciones del mismo legajo
```
