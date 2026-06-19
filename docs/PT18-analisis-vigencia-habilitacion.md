# PT18 - Análisis: Actualizar apto médico cambia erróneamente la fecha de vencimiento de la habilitación

## Problema

Cuando Medicina Laboral actualiza el apto médico de una persona, la fecha de vencimiento **de la habilitación** se sobreescribe con la fecha del apto médico. Son dos fechas independientes que no deberían estar vinculadas:

- **Fecha de vencimiento del apto médico** → campo propio del apto
- **Fecha de vencimiento de la habilitación (Vigencia)** → campo propio de la licencia

### Ejemplo del ticket
- Licencia 113 tenía vigencia de habilitación: **30/06/2026**
- Vencimiento de apto médico anterior: **25/05/2008**
- Al actualizar el apto médico con fecha **13/11/2024**, la vigencia de la habilitación cambió a 13/11/2024
- **Resultado incorrecto:** La habilitación pasó de vencer en 2026 a vencer en 2024

---

## Causa Raíz — Línea exacta en el código

### `detailHabPT15.controller.js` — `onUpdateData()` (línea 858)

```javascript
// LÍNEA 858 — AQUÍ ESTÁ EL BUG
habilitacion.Vigencia = oModel.oData.Medicina_Fecha_vencimiento;
```

Esta línea sobreescribe la `Vigencia` de la habilitación con la fecha de vencimiento del apto médico. Luego ese valor se envía al backend en el payload de `saveHabilitacion()`:

```javascript
// línea 884 — se envía la Vigencia ya sobreescrita
var data = {
    ...
    Vigencia: habilitacion.Vigencia,  // ← contiene la fecha del apto, no la original
    Hab_apmedico_nav: [{
        "Legajo": habilitacion.Legajo,
        "Vigencia": oModel.oData.Medicina_Fecha_vencimiento,  // línea 887
        ...
    }]
};
```

### Flujo completo del bug

```
1. Usuario (MedicinaLaboral) cambia fecha de apto médico a 13/11/2024
2. onUpdateData() se ejecuta
3. Línea 851-859: Si grado es A/B/C, entra al if:
     habilitacion.Vigencia = Medicina_Fecha_vencimiento  ← BUG
4. Se arma el payload con:
     - Vigencia: 13/11/2024 (era 30/06/2026)
     - Hab_apmedico_nav[0].Vigencia: 13/11/2024
5. saveHabilitacion() envía al backend
6. Backend actualiza AMBAS fechas (habilitación y apto médico)
7. La habilitación ahora vence el 13/11/2024 en vez de 30/06/2026
```

### Código completo del bloque problemático (líneas 851-860)

```javascript
// valido fecha
if (oModel.oData.Gradoap === "A" || oModel.oData.Gradoap === "B" || oModel.oData.Gradoap === "C") {
    if (oModel.oData.Medicina_Fecha_vencimiento < oModel.oData.Medicina_Fecha_vencimiento_old) {
        MessageBox.alert("La fecha de validez debe ser mayor o igual a la actual.", {
            title: "Error"
        });
        return;
    } else {
        habilitacion.Vigencia = oModel.oData.Medicina_Fecha_vencimiento;  // ← BUG
    }
}
```

---

## Relación con PT17

Este ticket y PT17 comparten la misma raíz pero son problemas distintos:

| Ticket | Problema | Causa |
|--------|----------|-------|
| **PT17** | Al actualizar apto médico, cambia en TODAS las licencias | `AptoMedico2Set` usa Legajo como clave única (1 registro por persona) |
| **PT18** | Al actualizar apto médico, cambia la vigencia DE LA habilitación | Línea 858: `habilitacion.Vigencia = Medicina_Fecha_vencimiento` |

Ambos se resuelven con la misma intervención si se implementa la tabla Z de PT17.

---

## Solución propuesta

### Fix inmediato (solo PT18)

**Eliminar la línea 858** y no enviar `Vigencia` modificada en el payload. La vigencia de la habilitación no debe cambiar al actualizar el apto médico:

```javascript
// ANTES (buggy):
if (oModel.oData.Gradoap === "A" || oModel.oData.Gradoap === "B" || oModel.oData.Gradoap === "C") {
    if (oModel.oData.Medicina_Fecha_vencimiento < oModel.oData.Medicina_Fecha_vencimiento_old) {
        MessageBox.alert("La fecha de validez debe ser mayor o igual a la actual.", { title: "Error" });
        return;
    } else {
        habilitacion.Vigencia = oModel.oData.Medicina_Fecha_vencimiento;  // ELIMINAR
    }
}

// DESPUÉS (fix):
if (oModel.oData.Gradoap === "A" || oModel.oData.Gradoap === "B" || oModel.oData.Gradoap === "C") {
    if (oModel.oData.Medicina_Fecha_vencimiento < oModel.oData.Medicina_Fecha_vencimiento_old) {
        MessageBox.alert("La fecha de validez debe ser mayor o igual a la actual.", { title: "Error" });
        return;
    }
    // No modificar habilitacion.Vigencia — son fechas independientes
}
```

### Fix completo (PT17 + PT18 juntos)

Si se implementa la tabla Z de PT17, este fix viene incluido:
- PT15 deja de enviar `Hab_apmedico_nav` en el payload de `saveHabilitacion()`
- El apto médico se guarda en la tabla Z propia
- La `Vigencia` de la habilitación nunca se toca al actualizar el apto médico

---

## Alcance del cambio

| Archivo | Cambio |
|---------|--------|
| `webapp/controller/detailHabPT15.controller.js` | Eliminar línea 858 (`habilitacion.Vigencia = ...`) |

**TCT y MTO:** Sin cambios. Ninguno de los dos escribe datos de apto médico.

---

## Verificación

1. Actualizar apto médico con una fecha diferente a la vigencia de la habilitación
2. Confirmar que la vigencia de la habilitación NO cambió
3. Confirmar que la fecha del apto médico SÍ se actualizó correctamente
4. Repetir con grados A, B, C, D para cubrir todos los branches
