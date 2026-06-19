# Especificacion ABAP: Tabla Z y EntitySet para Apto Medico por Habilitacion

## Contexto del problema

Actualmente el endpoint OData `AptoMedico2Set` usa el **Legajo como clave primaria**. Esto significa que existe un unico registro de apto medico por persona, compartido por todas sus habilitaciones (PT15, TCT, MTO, etc.).

**Consecuencia:** Cuando se actualiza el apto medico desde cualquier habilitacion PT15, se modifica el registro unico y el cambio impacta en **todas** las habilitaciones del mismo legajo.

**Solucion:** Crear una nueva tabla Z que almacene los datos de apto medico **por habilitacion** (no por legajo), y exponerla como EntitySet en el servicio OData existente.

---

## 1. Tabla Z: `ZAPTO_MEDICO_HABPT15`

### Campos

| Campo            | Elemento de datos (sugerido) | Tipo ABAP   | Long. | Descripcion                          | Clave |
|------------------|------------------------------|-------------|-------|--------------------------------------|-------|
| `IDHABILITACION` | CHAR                         | CHAR        | 20    | ID de la habilitacion                | X     |
| `CLASEHAB`       | CHAR                         | CHAR        | 10    | Clase de habilitacion (ej: H0003)    | X     |
| `LEGAJO`         | CHAR                         | CHAR        | 20    | Legajo del empleado                  |       |
| `GRADOAP`        | CHAR                         | CHAR        | 2     | Grado de aptitud (A, B, C, D)       |       |
| `VIGENCIA`       | DATS                         | DATS        | 8     | Fecha de vencimiento del apto medico |       |
| `OBSERVACIONES`  | CHAR                         | STRING      | 255   | Observaciones                        |       |
| `EMPRESA`        | CHAR                         | CHAR        | 10    | Empresa (100/300)                    |       |

### Clave primaria

`IDHABILITACION` + `CLASEHAB`

### Valores del campo GRADOAP

| Valor | Significado                 |
|-------|-----------------------------|
| A     | Apto sin preexistencias     |
| B     | Apto con preexistencias     |
| C     | Apto con limitaciones       |
| D     | No Apto                     |

---

## 2. EntitySet OData: `AptoMedicoPT15Set`

Exponer la tabla `ZAPTO_MEDICO_HABPT15` como un nuevo EntitySet dentro del servicio OData existente:

**Servicio:** `Z_SCP_HABILITACIONES_SRV`

### Propiedades del EntityType

| Propiedad       | Tipo Edm       | Clave | Nullable |
|-----------------|-----------------|-------|----------|
| Idhabilitacion  | Edm.String      | X     | false    |
| Clasehab        | Edm.String      | X     | false    |
| Legajo          | Edm.String      |       | false    |
| Gradoap         | Edm.String      |       | true     |
| Vigencia        | Edm.DateTime    |       | true     |
| Observaciones   | Edm.String      |       | true     |
| Empresa         | Edm.String      |       | true     |

### Operaciones requeridas

| Operacion  | Descripcion                                                              |
|------------|--------------------------------------------------------------------------|
| **READ**   | Leer por clave: `/AptoMedicoPT15Set(Idhabilitacion='XXX',Clasehab='H0003')` |
| **QUERY**  | Filtrar por Idhabilitacion: `/AptoMedicoPT15Set?$filter=Idhabilitacion eq 'XXX'` |
| **CREATE** | Crear registro nuevo al crear habilitacion PT15                          |
| **UPDATE** | Actualizar Gradoap, Vigencia y Observaciones                            |

> **No se requiere DELETE.** Los registros no se eliminan desde el frontend.

---

## 3. Validaciones en el backend (ABAP)

### Validacion de estado en UPDATE

Antes de permitir la actualizacion del apto medico, el backend debe validar el estado actual de la habilitacion asociada (consultando `HabTecnicas2Set` o la tabla que corresponda):

**Estados donde SI se permite actualizar:**

| Estado              | Codigo |
|---------------------|--------|
| En Proceso          | P      |
| Inicio Programado   | I      |
| Habilitado          | H      |
| Suspension Salud    | SS     |
| Suspension Salud+GPOR | SG  |
| Suspension GPOR     | SP     |

**Estados donde NO se permite actualizar (devolver error):**

| Estado     | Codigo |
|------------|--------|
| Cancelado  | C      |
| Revocado   | D      |
| Finalizado | F      |

Si el estado no esta en la lista permitida, retornar un mensaje de error OData:
`"No se puede modificar el apto medico en una habilitacion con estado [ESTADO]"`

### Validacion de fecha

- La nueva fecha de `Vigencia` debe ser **mayor o igual** a la fecha actual almacenada. No se permite retroceder la fecha de vencimiento.

---

## 4. Migracion de datos existentes

Los registros actuales de `AptoMedico2Set` (tabla actual por legajo) deben migrarse a la nueva tabla `ZAPTO_MEDICO_HABPT15`. La logica de migracion seria:

```
Por cada registro en AptoMedico2Set (clave: Legajo):
  Por cada habilitacion activa de ese Legajo donde Clasehab = 'H0003' (PT15):
    Insertar en ZAPTO_MEDICO_HABPT15:
      IDHABILITACION = habilitacion.Idhabilitacion
      CLASEHAB       = 'H0003'
      LEGAJO         = AptoMedico2Set.Legajo
      GRADOAP        = AptoMedico2Set.Gradoap
      VIGENCIA       = AptoMedico2Set.Vigencia
      OBSERVACIONES  = AptoMedico2Set.Observaciones
      EMPRESA        = habilitacion.Empresa
```

> **Nota:** Solo migrar habilitaciones PT15 (Clasehab = H0003). Las habilitaciones TCT y MTO siguen usando el endpoint actual `AptoMedico2Set` sin cambios.

---

## 5. Impacto en endpoints existentes

| Endpoint existente      | Cambio requerido |
|-------------------------|------------------|
| `AptoMedico2Set`        | **Sin cambios.** Sigue funcionando igual para TCT y otros modulos. |
| `HabTecnicas2Set`       | **Sin cambios.** La navigation property `Hab_apmedico_nav` sigue existiendo para compatibilidad con TCT. |
| `AptoMedicoPT15Set`     | **NUEVO.** Es el que se describe en este documento. |

---

## 6. Ejemplo de uso desde el frontend

Una vez creado el EntitySet, el frontend PT15 lo consumira asi:

### Lectura
```
GET /sap/opu/odata/sap/Z_SCP_HABILITACIONES_SRV/AptoMedicoPT15Set?$filter=Idhabilitacion eq '12345'
```

### Creacion
```
POST /sap/opu/odata/sap/Z_SCP_HABILITACIONES_SRV/AptoMedicoPT15Set
Body: {
  "Idhabilitacion": "12345",
  "Clasehab": "H0003",
  "Legajo": "00099999",
  "Gradoap": "A",
  "Vigencia": "/Date(1735689600000)/",
  "Observaciones": "Sin observaciones",
  "Empresa": "100"
}
```

### Actualizacion
```
PUT /sap/opu/odata/sap/Z_SCP_HABILITACIONES_SRV/AptoMedicoPT15Set(Idhabilitacion='12345',Clasehab='H0003')
Body: {
  "Gradoap": "B",
  "Vigencia": "/Date(1767225600000)/",
  "Observaciones": "Actualizado"
}
```

---

## 7. Resumen de entregables ABAP

1. Crear tabla Z `ZAPTO_MEDICO_HABPT15` con la estructura definida en seccion 1
2. Crear EntityType y EntitySet `AptoMedicoPT15Set` en `Z_SCP_HABILITACIONES_SRV` (seccion 2)
3. Implementar operaciones CRUD (READ, QUERY, CREATE, UPDATE) en la clase DPC_EXT del servicio
4. Implementar validacion de estado en UPDATE (seccion 3)
5. Implementar validacion de fecha en UPDATE (seccion 3)
6. Ejecutar migracion de datos existentes (seccion 4)
7. **No modificar** los endpoints existentes (`AptoMedico2Set`, `HabTecnicas2Set`)
