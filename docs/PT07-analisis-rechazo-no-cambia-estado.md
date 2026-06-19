# PT7 - Análisis: Al rechazar una licencia no cambia el estado a Cancelado/Finalizado

## Problema

Se rechaza una licencia desde el workflow y el estado sigue figurando **"Nueva Habilitación" (N)** cuando debería haber pasado a **"Cancelado" (C)** o **"Finalizado" (F)**.

### Ejemplo del ticket
- Se rechazó una licencia desde SAP Build Process Automation
- El estado en la app sigue mostrando "Nueva Habilitación"
- El estado debería ser "Cancelado" (C) para reflejar que el proceso fue finalizado por rechazo

---

## Análisis del Frontend (PT15)

### Mapeo de estados en el frontend

En `Main.controller.js` (línea 114-133) — `formatEstado()`:

| Código | Estado mostrado |
|--------|----------------|
| `N` | Nueva Habilitación |
| `H` | Habilitado |
| `D` | Revocado |
| `S` | Suspendido |
| `P` | Pendiente Gestión de Calidad / Pendiente Auditoría Externa |
| `C` | Cancelado |
| `F` | Finalizado |

### Flujos de cambio de estado en PT15 frontend

El frontend de PT15 solo permite cambiar estado en **dos escenarios**:

#### 1. Cambio manual por Director Técnico (`onChangeStatus`)
- Solo disponible con roles `Direccion_TecnicaPT15` o `Director_Tecnico`
- Opciones disponibles: Habilitado (H), Revocado (D), Suspendido (S)
- **No incluye Cancelado (C) ni Finalizado (F)** como opciones
- Solo se muestra si el estado actual NO es "N" ni "P" (`ShowButtonStatus`, línea 503)

#### 2. Cambio automático por Medicina Laboral (`onUpdateData`)
- Grado A/B/C → Estado H (Habilitado)
- Grado D/F/SEM → Estado S (Suspendido)
- Grado E → Estado D (Revocado)
- **Nunca pone estado C ni F**

### Conclusión frontend
**El frontend NO tiene ningún mecanismo para poner estado "C" (Cancelado) o "F" (Finalizado).** Esto es correcto por diseño — esos estados deberían venir del workflow.

---

## Causa Raíz: Backend / Workflow

El ticket indica que el problema está en **la lógica de backend del servicio `Z_SCP_HABILITACIONES`**. Cuando el workflow (SAP Build Process Automation) rechaza una licencia:

1. El workflow procesa el rechazo internamente
2. **Debería** llamar al servicio OData para actualizar el estado de la habilitación a "C" (Cancelado) en la tabla `ZTAB_HABTECNICAS`
3. **No lo está haciendo** — el estado queda en "N" (Nueva Habilitación)

### Posibles causas en backend

1. **El workflow no llama al servicio de actualización de estado:** El flujo de rechazo en SAP Build Process Automation puede no tener configurada la acción de actualizar la entidad `HabTecnicas2Set` con el nuevo estado
2. **Error en la entidad OData:** La entidad `HabTecnicas2Set` podría tener una validación que impide cambiar de "N" a "C" directamente
3. **Problema en el mapping del workflow:** El workflow puede estar enviando un código de estado incorrecto o no enviando el campo `Estado` en el payload

---

## Verificación sugerida

### En SAP Build Process Automation
1. Revisar el flujo de rechazo del workflow de PT15
2. Verificar si hay una acción configurada para actualizar el estado en `ZTAB_HABTECNICAS` al rechazar
3. Si existe la acción, verificar qué valor de estado envía y si el servicio OData responde con éxito

### En Backend SAP (tabla ZTAB_HABTECNICAS)
1. Buscar la licencia del ejemplo en la tabla directamente (transacción SE16)
2. Verificar qué valor tiene el campo `Estado` 
3. Si es "N", confirma que el workflow no actualizó el estado
4. Intentar actualizar manualmente el estado vía el servicio OData para descartar que el problema sea del servicio vs. del workflow

### En el servicio OData Z_SCP_HABILITACIONES_SRV
1. Verificar si la entidad `HabTecnicas2Set` permite UPDATE del campo Estado de "N" a "C"
2. Revisar si hay validaciones en el `DPC_EXT` que bloqueen el cambio
3. Probar con Postman/Gateway Client un UPDATE directo cambiando Estado de "N" a "C"

---

## Posible solución

### Opción A: Fix en el Workflow (recomendado)
Agregar/corregir la acción en SAP Build Process Automation para que al rechazar:
1. Llame a `POST /HabTecnicas2Set` o `PATCH` con `Estado: "C"`
2. Registre el motivo de cambio de estado vía `MotivoCambioEstadoSet`

### Opción B: Fix en Backend (servicio OData)
Si el workflow SÍ está llamando al servicio pero este falla silenciosamente:
1. Revisar el método `UPDATE_ENTITY` de `HabTecnicas2Set` en la clase `ZCL_Z_SCP_HABILITACIONES_DPC_EXT`
2. Asegurar que permite la transición N → C

### Opción C: Fix en Frontend (complementario, no resuelve la raíz)
Agregar "Cancelado" como opción en el diálogo de cambio de estado para que un Director Técnico pueda cancelar manualmente. Esto no resuelve el problema del workflow pero da una salida manual:

```javascript
// En loadStatusOptionsModel() o enableStatusOptionsByRolAndLicstat()
// Agregar cuando el estado es "N":
if (EstadoActual === "N") {
    this.getView().getModel("StatusOptionsModel").setData({
        Options: [{
            key: "C",
            text: "Cancelado"
        }]
    });
}
```

---

## Resumen

| Aspecto | Detalle |
|---------|---------|
| **Tipo de bug** | Backend / Workflow |
| **Frontend afectado** | No — el frontend solo lee el estado, no lo cambia en este flujo |
| **Dónde investigar** | SAP Build Process Automation (flujo de rechazo PT15) y servicio `Z_SCP_HABILITACIONES_SRV` |
| **Tabla SAP** | `ZTAB_HABTECNICAS` |
| **Acción requerida** | Equipo backend/BPA debe verificar y corregir el flujo de rechazo |
