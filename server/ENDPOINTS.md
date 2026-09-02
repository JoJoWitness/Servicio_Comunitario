# API Endpoints

Todas las rutas son **relativas** a la base del servidor. El puerto por defecto es `8080`
y se cambia con la variable `PORT`.

Las rutas se registran en `server/routes/`. Middleware global: `corsMiddleware`.
Las rutas `/auth/*` son públicas. Todo el REST API (`/usuarios`, `/pacientes`, `/notas`,
`/diagnosticos`, `/procedimientos`, `/tecnicas`) exige sesión vía `auth.Users`, y cada
handler de escritura va envuelto en el middleware de rol que le corresponde.

## Permisos por rol

El rol sale de `"Usuarios".rol` y viaja en la sesión. Sin sesión: `401`. Con sesión pero sin
privilegios: `403`.

| Recurso                                         | Lectura                | Escritura                            |
|-------------------------------------------------|------------------------|--------------------------------------|
| `/notas` (vista global)                         | secretaria, admin      | —                                    |
| `/notas` (resto)                                | cualquiera autenticado | medico, admin                        |
| `/notas/{id}/legalizada`                        | —                      | admin, secretaria; medico si participó |
| `/pacientes`                                    | cualquiera autenticado | medico, admin (`DELETE`: solo admin) |
| `/pacientes/{id}/cedula`                        | cualquiera autenticado | medico, admin                        |
| `/biopsias`                                     | cualquiera autenticado | crear/baja: medico, admin; `PUT`: por rol (ver Biopsias) |
| `/notas/{id}/biopsias/{idBiopsia}`              | —                      | medico participante de la nota, admin |
| `/usuarios/me`, `/usuarios/me/password`         | el propio usuario      | el propio usuario                    |
| `/usuarios` (lista)                             | cualquiera autenticado | admin                                |
| `/usuarios/{id}`                                | admin                  | admin                                |
| `/diagnosticos`, `/procedimientos`, `/tecnicas` | cualquiera autenticado | admin                                |

Además de estos middlewares, `PUT`/`DELETE` de una nota exigen que el médico haya
participado en ella: que sea el `id_medico_encargado` o que esté en `"Equipo_Quirurgico"`.
El admin queda exento. Un médico que no participó recibe `403`; una nota inexistente o dada
de baja, `404`.

Todo `403` sobre una nota lleva la cabecera **`X-Motivo`** con uno de `fuera_de_plazo`,
`no_participante` o `legalizada`, para que el cliente no tenga que interpretar el texto.
Va expuesta por CORS.

---

## System

| Method | URL       | Handler | Notes                         |
|--------|-----------|---------|-------------------------------|
| GET    | `/health` | inline  | Health check                  |
| GET    | `/stream` | inline  | Stream/websocket check (TODO) |

## Authentication (`/auth`) — public

| Method | URL                    | Handler                | Notes                             |
|--------|------------------------|------------------------|-----------------------------------|
| ANY    | `/auth/login`          | `auth.Login`           | Login (setea cookie `session_id`) |
| ANY    | `/auth/validateUser`   | `auth.ValidateSession` | Valida la sesión actual           |
| ANY    | `/auth/logout`         | `auth.Logout`          | Cierra sesión y limpia la cookie  |

## Usuarios (`/usuarios`) — lista abierta a autenticados, resto solo admin

| Method | URL                     | Handler                    |
|--------|-------------------------|----------------------------|
| GET    | `/usuarios/me`          | `controllers.GetUserData`  |
| PUT    | `/usuarios/me/password` | `auth.ChangePassword`      |
| GET    | `/usuarios`             | `controllers.GetAllMedics` |
| POST   | `/usuarios`             | `controllers.CreateUser`   |
| GET    | `/usuarios/{id}`        | `controllers.GetUser`      |
| PUT    | `/usuarios/{id}`        | `controllers.UpdateUser`   |
| DELETE | `/usuarios/{id}`        | `controllers.DeleteUser`   |

## Pacientes (`/pacientes`) — lectura autenticada, escritura solo médicos

| Method | URL               | Handler                       |
|--------|-------------------|-------------------------------|
| GET    | `/pacientes`      | `controllers.GetAllPacientes` |
| POST   | `/pacientes`      | `controllers.CreatePaciente`  |
| GET    | `/pacientes/{id}` | `controllers.GetPaciente`     |
| PUT    | `/pacientes/{id}` | `controllers.UpdatePaciente`  |
| DELETE | `/pacientes/{id}` | `controllers.DeletePaciente`  |
| GET    | `/pacientes/{id}/cedula` | `controllers.GetCedula` (imagen) |
| PUT    | `/pacientes/{id}/cedula` | `controllers.PutCedula` (medico, admin) |
| DELETE | `/pacientes/{id}/cedula` | `controllers.DeleteCedula` (medico, admin) |
| GET    | `/pacientes/{id}/biopsias` | `controllers.GetBiopsiasDePaciente` |

## Notas (`/notas`)

| Method | URL                      | Handler                                      |
|--------|--------------------------|----------------------------------------------|
| GET    | `/notas`                 | `controllers.GetAllNotas` (secretaria/admin) |
| GET    | `/notas/medics`          | `controllers.GetNotasFromMedic`              |
| GET    | `/notas/medics/dates`    | `controllers.GetNotasFromMedicDates`         |
| GET    | `/notas/medics/export`   | `controllers.ExportNotasMedico` (`.xlsx`)    |
| GET    | `/notas/pacientes/{id}`  | `controllers.GetNotasFromPaciente`           |
| GET    | `/notas/pacientes/dates` | `controllers.GetNotasFromPacienteDates`      |
| POST   | `/notas`                 | `controllers.CreateNota`                     |
| GET    | `/notas/{id}`            | `controllers.GetNota`                        |
| PUT    | `/notas/{id}`            | `controllers.UpdateNota`                     |
| DELETE | `/notas/{id}`            | `controllers.DeleteNota`                     |
| PATCH  | `/notas/{id}/legalizada` | `controllers.PatchLegalizada`                |
| GET    | `/notas/{id}/biopsias`   | `controllers.GetBiopsiasDeNota`              |
| POST   | `/notas/{id}/biopsias/{idBiopsia}` | `controllers.VincularBiopsia` (medico participante, admin) |
| DELETE | `/notas/{id}/biopsias/{idBiopsia}` | `controllers.DesvincularBiopsia` (ídem) |

## Biopsias (`/biopsias`) — v0.5.0

| Method | URL              | Handler                      | Permiso |
|--------|------------------|------------------------------|---------|
| GET    | `/biopsias`      | `controllers.GetAllBiopsias` | autenticado |
| POST   | `/biopsias`      | `controllers.CreateBiopsia`  | medico, admin |
| GET    | `/biopsias/{id}` | `controllers.GetBiopsia`     | autenticado |
| PUT    | `/biopsias/{id}` | `controllers.UpdateBiopsia`  | admin y responsable: todo; participante de una nota vinculada: todo menos retroceder; secretaria: solo envío y resultado, hacia adelante |
| DELETE | `/biopsias/{id}` | `controllers.DeleteBiopsia`  | admin, medico responsable |

Una biopsia es una muestra enviada a anatomía patológica. Vive en su propia tabla
(`"Biopsia"`) y se liga a las notas por `"Nota_Biopsia"` (`id_nota_operatoria`,
`id_biopsia`, `rol` ∈ `origen` | `seguimiento`). **No le aplican el plazo de edición ni la
legalización de la nota**: el informe llega semanas después de cerrarla.

Ciclo: `tomada → enviada → con_resultado → entregada`. El servidor exige los datos de cada
estado (`enviada`: `fecha_envio`; `con_resultado`: `resultado` y `fecha_resultado`;
`entregada`: `fecha_entrega`) y responde `400` si faltan. Retroceder limpia lo del estado
abandonado y solo lo hacen admin o responsable (`403`, `X-Motivo: no_participante`).

`GET /biopsias` admite `?estado=tomada,enviada` (varios, separados por coma), `?medico=`
(responsable **o** participante de una nota vinculada), `?paciente=`, `?from=&to=` (sobre
`fecha_toma`), `?sin_resultado_desde=YYYY-MM-DD` (tomadas hasta esa fecha y sin resultado) y
la paginación estándar (`sortBy` ∈ `fecha_toma`, `estado`, `fecha_resultado`). La respuesta
trae además `sin_resultado`, `atrasadas` y `dias_atraso` (30) para el encabezado de seguimiento.

`POST /biopsias` acepta `nota_id` **o** `nota_client_uuid`: crea la muestra y la vincula como
`origen` en la misma llamada, tomando paciente, médico responsable y fecha de toma de la nota
si no vienen. Con `nota_client_uuid` de una nota que aún no subió responde `409` (el cliente
encola). Vincular con `origen` pone `tuvo_biopsia = TRUE` en la nota, aunque esté fuera de
plazo o legalizada; desvincular no la vuelve a `FALSE`. Una biopsia tiene a lo sumo una nota
`origen` (`409` si ya la tiene); vincular a una nota de otro paciente responde `400`; la
misma pareja dos veces, `409`.

Toda lectura trae `notas` (vínculos con `rol`, fecha e intervención), `puede_editar` y
`puede_tramitar` calculados para el usuario de la sesión.

```json
{
  "id_paciente": "a0000000-…", "id_medico_responsable": "6c6f6076-…",
  "ojo": "OD", "tejido": "Pterigión", "descripcion_macroscopica": "…",
  "diagnostico_presuntivo": "Pterigión recidivante", "fecha_toma": "2026-09-01T00:00:00Z",
  "laboratorio": "Anatomía Patológica HCSC", "fecha_envio": "2026-09-01T00:00:00Z",
  "numero_patologia": "AP-2026-1187", "resultado": null, "fecha_resultado": null,
  "fecha_entrega": null, "estado": "enviada", "observaciones": "",
  "nota_id": 340
}
```

En `POST /sync` el lote acepta una tercera lista `biopsias` (después de `notas`), cada una
con `client_uuid` y `nota_client_uuid` o `nota_id`. Si la nota de origen no está todavía en
el servidor, la biopsia responde `error` y se queda en la cola para la pasada siguiente.

### Campos que el servidor agrega a toda nota (v0.4.0)

Todas las lecturas (`GET /notas/{id}`, listados, la respuesta de `POST`/`PUT`/`PATCH`)
traen, además de las columnas de la tabla:

| Campo            | Tipo              | Significado |
|------------------|-------------------|-------------|
| `legalizada`     | bool              | La nota impresa ya se firmó, selló y archivó. Solo cambia por `PATCH /notas/{id}/legalizada`; `PUT` lo ignora. |
| `legalizada_en`  | RFC3339 \| ausente | Cuándo se puso la marca. |
| `legalizada_por` | UUID \| ausente    | Quién la puso. |
| `created_at`     | RFC3339           | Registro en el servidor. |
| `puede_editar`   | bool              | Para **el usuario de la sesión**: vigente, no legalizada, y admin o participante. Es lo que la interfaz usa para habilitar "Editar" y "Eliminar" antes del clic. |

No hay plazo de edición: una nota se puede corregir mientras no esté legalizada.

### `GET /notas/medics/export` — record quirúrgico en Excel

Descarga un `.xlsx` con las notas del **médico de la sesión**: las que encabezó y aquellas en
las que figura dentro del equipo quirúrgico. No devuelve JSON.

| Parámetro | Obligatorio | Formato                  | Notas                                              |
|-----------|-------------|--------------------------|----------------------------------------------------|
| `from`    | no          | `YYYY-MM-DD` o RFC3339   | Sin él, no hay límite inferior                      |
| `to`      | no          | `YYYY-MM-DD` o RFC3339   | Día incluido completo; sin él, no hay límite superior |
| `medico`  | no          | UUID                     | **Solo admin.** Otro rol que lo mande recibe `403`  |

Sin `from` ni `to` baja el historial completo. `to` anterior a `from`: `400`.

Respuesta: `200` con
`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` y
`Content-Disposition: attachment; filename="record-quirurgico-<medico>-<from>_<to>.xlsx"`
(el header va expuesto por CORS). Un médico sin notas en el rango recibe la planilla vacía,
no un error.

El libro trae dos hojas: **Record Quirurgico** (una fila por nota: fecha, horas, paciente,
edad al momento de la cirugía, cédula, DX pre y post, intervención, cirujano, ayudantes,
anestesia, pabellón, electiva/emergencia, biopsia y resumen) y **Resumen** (conteo por
procedimiento, desglose de electivas/emergencias/biopsias y operaciones por mes, con dos
gráficas: barras horizontales de procedimientos y columnas de actividad mensual).

```
GET /notas/medics/export?from=2026-01-01&to=2026-06-30
```

## Diagnósticos (`/diagnosticos`) — lectura autenticada, escritura solo admin

| Method | URL                  | Handler                          |
|--------|----------------------|----------------------------------|
| GET    | `/diagnosticos`      | `controllers.GetAllDiagnosticos` |
| POST   | `/diagnosticos`      | `controllers.CreateDiagnostico`  |
| GET    | `/diagnosticos/{id}` | `controllers.GetDiagnostico`     |
| PUT    | `/diagnosticos/{id}` | `controllers.UpdateDiagnostico`  |
| DELETE | `/diagnosticos/{id}` | `controllers.DeleteDiagnostico`  |

## Procedimientos (`/procedimientos`) — lectura autenticada, escritura solo admin

| Method | URL                    | Handler                            |
|--------|------------------------|------------------------------------|
| GET    | `/procedimientos`      | `controllers.GetAllProcedimientos` |
| POST   | `/procedimientos`      | `controllers.CreateProcedimiento`  |
| GET    | `/procedimientos/{id}` | `controllers.GetProcedimiento`     |
| PUT    | `/procedimientos/{id}` | `controllers.UpdateProcedimiento`  |
| DELETE | `/procedimientos/{id}` | `controllers.DeleteProcedimiento`  |

## Técnicas (`/tecnicas`) — lectura autenticada, escritura solo admin

| Method | URL              | Handler                      |
|--------|------------------|------------------------------|
| GET    | `/tecnicas`      | `controllers.GetAllTecnicas` |
| POST   | `/tecnicas`      | `controllers.CreateTecnica`  |
| GET    | `/tecnicas/{id}` | `controllers.GetTecnica`     |
| PUT    | `/tecnicas/{id}` | `controllers.UpdateTecnica`  |
| DELETE | `/tecnicas/{id}` | `controllers.DeleteTecnica`  |

---

## Sin montar

- `AdminRoutes()` (`server/routes/admin.go`) no está registrado en `routes.Init` y su cuerpo
  está comentado. Quedó sin propósito: la tabla `admins` desapareció del esquema y el rol de
  administrador se lee de `"Usuarios".rol`. Se puede borrar el archivo.

---

# Request Bodies

Bodies JSON para los endpoints que consumen `body`. Los nombres de campo son
exactamente los tags JSON de los structs.

> **Esquema.** Las tablas son `"Paciente"`, `"Usuarios"`, `"Nota_Operatoria"`,
> `"Equipo_Quirurgico"`, `"Diagnosticos"`, `"Procedimientos"` e `"Intervencion"`: van entre
> comillas dobles porque llevan mayúsculas. Algunos nombres JSON del API no coinciden con la
> columna (`anestia` → `anestesia`, `resumen_intervencion` → `resumen_intevencion`,
> `medico_encargado` → `id_medico_encargado`, `diagnostico` → `procedimientos`).
>
> **`Id_paciente` es un UUID**, no un entero: el paciente lo genera el servidor al crearlo.
>
> **`hora_comienzo` y `hora_culminacion` son `TIME`** (hora del día). Se leen y escriben como
> RFC3339, pero la parte de fecha no significa nada — la fecha real vive en `fecha_comienzo`.

> **Content-Type:** `application/json` en todos.
> Fechas/horas de tipo `time.Time` van en **RFC3339** (ej. `2026-07-20T14:30:00Z`).

## Usuarios

### `GET /usuarios/me` — GetUserData
**Sin body.** Devuelve el perfil de la sesión actual: `id`, `nombres`, `apellidos`, `correo`
y `rol`. Nunca incluye la contraseña.

### `PUT /usuarios/me/password` — ChangePassword
Cambia **la contraseña propia**, exigiendo la actual (HU-04). Para que un admin le cambie la
contraseña a otro está `PUT /usuarios/{id}`.
```json
{
  "contrasena_actual": "roma2026",
  "contrasena_nueva": "nuevaClave2026"
}
```

| Caso | Respuesta |
|---|---|
| Cambio correcto | `200 contrasena actualizada` |
| `contrasena_actual` no coincide | `403` |
| Nueva de menos de 8 caracteres | `400` |
| Nueva igual a la actual | `400` |
| Sin sesión | `401` |
| Cuenta dada de baja | `401`, y se revocan sus sesiones |

Al cambiarla, **las demás sesiones del usuario se invalidan** y la actual sobrevive: si la
contraseña se cambió porque alguien más la sabía, esa otra sesión debe caerse.

### `POST /usuarios` — CreateUser
El server hashea `contrasena` antes de guardar.
```json
{
  "correo": "nuevo@dog.unet.ve",
  "nombres": "Nuevo",
  "apellidos": "Medico",
  "rol": "medico",
  "contrasena": "secreto123"
}
```

### `PUT /usuarios/{id}` — UpdateUser
El `id` (UUID) va en el **URL**. En el body mandas los campos a actualizar.
```json
{
  "correo": "actualizado@test.com",
  "nombres": "Nombre",
  "apellidos": "Apellido",
  "rol": "medico",
  "contrasena": "nuevaPass123"
}
```

> `GET /usuarios/{id}` y `DELETE /usuarios/{id}` **no llevan body** — usan el `id` (UUID) del URL.

## Pacientes

### `POST /pacientes` — CreatePaciente
**No mandes `id`**: es un UUID que genera el servidor y lo devuelve en la respuesta.
`tipo_documento` y `genero` son de **un solo carácter** (`V`/`E`, `M`/`F`).
```json
{
  "historia_medica": "HC-2026001",
  "numero_identificacion": "V-12345678",
  "tipo_documento": "V",
  "nombre": "Juan Pérez",
  "genero": "M",
  "fecha_nacimiento": "1990-05-20T00:00:00Z",
  "telefono": "0414-1234567",
  "direccion": "Av. Principal, San Cristóbal"
}
```

### `PUT /pacientes/{id}` — UpdatePaciente
El `id` (UUID) va en el **URL**. Mismo shape que el POST, sin `id`.
```json
{
  "historia_medica": "HC-2026001",
  "numero_identificacion": "V-12345678",
  "tipo_documento": "V",
  "nombre": "Juan Pérez",
  "genero": "M",
  "fecha_nacimiento": "1990-05-20T00:00:00Z",
  "telefono": "0414-7654321",
  "direccion": "Nueva dirección"
}
```

> `historia_medica` y `numero_identificacion` son **únicos** en la base.
> Si la `historia_medica` ya existe, el server responde `400 paciente already exists`.
> Con `numero_identificacion` repetida **no** hay ese chequeo previo: lo rechaza la
> restricción UNIQUE y sale como `500`.
>
> `eliminado` no se manda nunca — la baja es exclusiva del `DELETE`, y es **lógica**.

> `DELETE /pacientes/{id}` **no lleva body** — usa el `id` del URL. Solo admin.

### `GET /pacientes/{id}/cedula` — GetCedula
**Sin body.** Devuelve la imagen tal cual (`Content-Type: image/jpeg|png|webp`), con `ETag`
y `Cache-Control: private, max-age=86400`; con `If-None-Match` coincidente responde `304`.
`404` si el paciente no tiene cédula o está dado de baja.

### `PUT /pacientes/{id}/cedula` — PutCedula
El body es la **imagen cruda**, no JSON ni multipart. El tipo se decide por los primeros
bytes del archivo (JPEG, PNG o WebP), no por la cabecera. Tope: **1 MB**.
Responde `201` con `{"tiene_cedula": true}`; `400` si el formato no es imagen; `413` si
pesa más de 1 MB; `404` si el paciente no existe. Reemplaza la anterior si la había.

### `DELETE /pacientes/{id}/cedula` — DeleteCedula
**Sin body.** Quita la imagen. Responde `204`.

> Toda lectura de paciente trae `"tiene_cedula": true|false`; el binario nunca viaja en
> el JSON. En `POST /sync`, cada paciente del lote puede traer `cedula_base64` (sin prefijo
> o como data URI) y `cedula_content_type`: se guarda tras registrarlo, y también cuando el
> paciente resulta `duplicado`, por si la pasada anterior se cortó antes de la imagen. Si la
> imagen falla, el paciente igual queda `creado` y el motivo va en `motivo`.

## Notas

### `GET /notas` — GetAllNotas
Todas las notas vigentes (`eliminado = FALSE`) del servicio, de la más reciente a la más
antigua. **Sin body.** Solo secretaria y admin; el médico usa `/notas/medics`.

Filtros opcionales por query string, combinables:

| Param         | Ejemplo                          | Significado                                                |
|---------------|----------------------------------|------------------------------------------------------------|
| `medico`      | `?medico=6c6f6076-...`           | notas donde ese médico es encargado **o** parte del equipo |
| `paciente`    | `?paciente=a0000000-...`         | notas de ese paciente (UUID)                               |
| `from` / `to` | `?from=2025-08-01&to=2025-08-31` | rango sobre `fecha_comienzo` (`YYYY-MM-DD` o RFC3339)      |
| `legalizada`  | `?legalizada=false`              | solo legalizadas (`true`) o solo pendientes (`false`)      |

```
GET /notas?medico=6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7&from=2025-08-01&to=2026-07-31
```

### `GET /notas/{id}` — GetNota
**Sin body.** Devuelve la nota completa con su `medicos` (equipo quirúrgico). Si la nota no
existe o fue dada de baja, responde `404`.

### `POST /notas` — CreateNota
`medico_encargado` es opcional: si no se manda, se usa el usuario de la sesión, salvo que
sea un administrador (ver abajo). `equipo` es la lista de UUID del equipo quirúrgico; el
encargado se agrega solo, no hace falta repetirlo. Si algún UUID no corresponde a un
médico activo, responde `400`.

> **El administrador no puede figurar en una nota operatoria.** Puede registrarlas, pero
> no aparecer en ellas ni como `medico_encargado` ni dentro de `equipo`, ni poniéndose él
> ni poniéndolo otro médico: `ValidarEquipo` solo acepta usuarios con rol `medico`. Si un
> admin crea una nota sin `medico_encargado`, responde `400` en vez de asignársela.
```json
{
  "dx_pre_operatorio": "Apendicitis aguda",
  "dx_post_operatorio": "Apendicitis perforada",
  "intervencion_realizado": "Apendicectomía",
  "fecha_comienzo": "2026-07-20T00:00:00Z",
  "fecha_culminacion": "2026-07-20T00:00:00Z",
  "hora_comienzo": "2026-07-20T08:00:00Z",
  "hora_culminacion": "2026-07-20T09:30:00Z",
  "resumen_intervencion": "Procedimiento sin complicaciones",
  "comentarios": "Sangrado mínimo, paciente estable",
  "pabellon": "Quirófano 2",
  "es_electiva": false,
  "es_emergencia": true,
  "tuvo_biopsia": true,
  "anestia": "General",
  "Id_paciente": "a0000000-0000-4000-8000-000000000001",
  "medico_encargado": "6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7",
  "equipo": [
    "422fcc07-fcf9-441f-9565-0d05516a54f3",
    "257991b4-2438-45a4-8008-cbff46c5debd"
  ]
}
```
> `equipo` es lo que se **escribe**: los UUID del equipo quirúrgico. `medicos` es lo que se
> **lee** en los `GET`: los datos completos de cada médico, traídos de `"Equipo_Quirurgico"`.
> La respuesta del `POST`/`PUT` ya trae `medicos` actualizado.
> `eliminado` no se manda: la baja es exclusiva del `DELETE`.
> `comentarios` es opcional y se guarda en su propia columna, pero se lee como parte del
> relato: al mostrar o exportar la nota va al final del resumen, tras `Observaciones:`.

### `PUT /notas/{id}` — UpdateNota
El `id` va en el **URL** (el body ya no lo necesita). Solo se permite editar una nota
mientras **no esté legalizada**; en ese caso responde `403` con `X-Motivo: legalizada`. No
hay plazo de edición. Los campos
`legalizada`, `legalizada_en` y `legalizada_por` se ignoran si vienen en el body.
```json
{
  "dx_pre_operatorio": "Apendicitis aguda",
  "dx_post_operatorio": "Apendicitis perforada",
  "intervencion_realizado": "Apendicectomía",
  "fecha_comienzo": "2026-07-20T00:00:00Z",
  "fecha_culminacion": "2026-07-20T00:00:00Z",
  "hora_comienzo": "2026-07-20T08:00:00Z",
  "hora_culminacion": "2026-07-20T09:30:00Z",
  "resumen_intervencion": "Resumen actualizado",
  "comentarios": "Sangrado mínimo, paciente estable",
  "pabellon": "Quirófano 2",
  "es_electiva": false,
  "es_emergencia": true,
  "tuvo_biopsia": true,
  "anestia": "General",
  "Id_paciente": "a0000000-0000-4000-8000-000000000001",
  "medico_encargado": "6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7",
  "equipo": [
    "422fcc07-fcf9-441f-9565-0d05516a54f3",
    "257991b4-2438-45a4-8008-cbff46c5debd"
  ]
}
```
> `equipo` es lo que se **escribe**: los UUID del equipo quirúrgico. `medicos` es lo que se
> **lee** en los `GET`: los datos completos de cada médico, traídos de `"Equipo_Quirurgico"`.
> La respuesta del `POST`/`PUT` ya trae `medicos` actualizado.
> `eliminado` no se manda: la baja es exclusiva del `DELETE`.
> `comentarios` es opcional y se guarda en su propia columna, pero se lee como parte del
> relato: al mostrar o exportar la nota va al final del resumen, tras `Observaciones:`.

### `PATCH /notas/{id}/legalizada` — PatchLegalizada
Pone o quita la marca de legalización. No pasa por el plazo de edición: el trámite físico
suele ocurrir semanas después de la cirugía. Admin y secretaria sobre cualquier nota; el
médico solo sobre las suyas (`403` con `X-Motivo: no_participante` si no participó).
Mientras la marca esté puesta, `PUT` y `DELETE` responden `403`.
```json
{ "legalizada": true }
```
Responde `200` con la nota completa (mismo JSON que `GET /notas/{id}`).

### `DELETE /notas/{id}` — DeleteNota
**Sin body.** El `id` va en el URL. Igual que el PUT, solo aplica dentro de los **7 días**
siguientes al registro.

La baja es **lógica**: la fila y su equipo quirúrgico se conservan en la base y solo se
marca `eliminado = TRUE`. Una nota operatoria es parte de la historia clínica. A partir de
ahí desaparece de toda consulta y responde `404`; un `PUT` posterior **no la resucita**
(`eliminado` no se escribe ni en el `POST` ni en el `PUT`).

### `GET /notas/medics/dates` — GetNotasFromMedicDates
**Sin body.** El `id` del médico sale de la sesión; el rango va en el query string.
`from` y `to` son obligatorios (`YYYY-MM-DD` o RFC3339); si falta alguno, `400`.
```
GET /notas/medics/dates?from=2025-08-01&to=2026-07-31
```

### `GET /notas/pacientes/{id}` — GetNotasFromPaciente
El `id` (UUID) del paciente va en el **URL**. Sin body. Un paciente sin notas devuelve `[]`.

### `GET /notas/pacientes/dates` — GetNotasFromPacienteDates
**Sin body.** Todo va en el query string: `id`, `from` y `to`, los tres obligatorios.
```
GET /notas/pacientes/dates?id=a0000000-0000-4000-8000-000000000001&from=2025-08-01&to=2026-07-31
```

> `GET /notas/medics` no lleva body ni parámetros.

> **Ningún `GET` de la API lleva body.** Los rangos de fechas van siempre en el query
> string, porque `fetch` y buena parte de los clientes HTTP descartan el body de un `GET`.

## Diagnósticos

### `POST /diagnosticos` — CreateDiagnostico
```json
{
  "diagnostico": "Hipertensión arterial",
  "resumen": "Paciente con presión elevada sostenida"
}
```

### `PUT /diagnosticos/{id}` — UpdateDiagnostico
El `id` va en el **URL** (el body ya no lo necesita).
```json
{
  "diagnostico": "Hipertensión arterial controlada",
  "resumen": "Resumen actualizado"
}
```

## Procedimientos

### `POST /procedimientos` — CreateProcedimiento
```json
{
  "intervencion": "Colecistectomía laparoscópica",
  "resumen": "Extracción de vesícula por vía laparoscópica"
}
```

### `PUT /procedimientos/{id}` — UpdateProcedimiento
El `id` va en el **URL** (el body ya no lo necesita).
```json
{
  "intervencion": "Colecistectomía abierta",
  "resumen": "Resumen actualizado"
}
```

## Técnicas

Además del nombre, una técnica lleva lo que aporta al resumen de la nota:

- `frase`: el texto que se inserta en el relato. El nombre corto no sirve para redactar —
  «Apertura de puerto principal» es la etiqueta, `se abre puerto principal en H{hora}` es lo
  que se escribe en la nota. Los marcadores van entre llaves.
- `huecos`: los valores que cambian de una cirugía a otra, para que la pantalla los pida y
  sustituya cada `{nombre}`. Columna `JSONB`; el servidor la normaliza a `[]` si es `NULL`.

`GET /tecnicas` y `GET /tecnicas/{id}` devuelven ambos campos.

### `POST /tecnicas` — CreateTecnica
```json
{
  "tecnica": "Lavado de superficie con iodopovidona al 2 %",
  "frase": "se procede a realizar lavado ocular con iodopovidona al 2 %, posterior lavado con {volumen} cc de solución Ringer",
  "huecos": [{ "nombre": "volumen", "default": "80" }]
}
```

### `PUT /tecnicas/{id}` — UpdateTecnica
El `id` va en el **URL** (el body ya no lo necesita).

Omitir `huecos` **conserva** los que ya tenía la técnica; enviarlos los reemplaza. `frase`
sí se sobrescribe con lo que llegue, incluida la cadena vacía.
```json
{
  "tecnica": "Sutura discontinua",
  "frase": "se realizan {puntos} puntos separados de nylon 10-0",
  "huecos": [{ "nombre": "puntos", "default": "3" }]
}
```

## Auth

### `POST /auth/login` — Login
Decodifica un `Usuarios`, pero solo usa `correo` y `contrasena`. Si es válido, setea la
cookie `session_id` y responde con los datos del usuario —**incluido el `rol`**, que el
cliente necesita para saber a qué pantalla entrar. La contraseña nunca sale en la respuesta.

```json
{
  "id": "3e61b05e-ff66-485b-86a6-3b8143f0bce8",
  "nombres": "Canela",
  "apellidos": "Cenelita",
  "correo": "canela@test.com",
  "rol": "secretaria"
}
```

Request:
```json
{
  "correo": "ryuk@test.com",
  "contrasena": "ryuk2026"
}
```

> **Usuarios de prueba** (ver `models/schemas/sample_data.sql`):
> `ryuk@test.com` / `ryuk2026` (admin) · `roma@test.com` / `roma2026` (medico) ·
> `oso@test.com` / `oso2026` (medico) · `lobo@test.com` / `lobo2026` (medico) ·
> `canela@test.com` / `canela2026` (secretaria).
>
> **Pacientes de prueba**: 10, con UUID predecibles
> `a0000000-0000-4000-8000-000000000001` … `-000000000010`, e historias `HC-2025001` … `HC-2025010`.
> Los datos se recargan en cada arranque del servidor, así que las 30 notas quedan siempre
> dentro del plazo de edición.

> **No hay registro público.** El alta por invitación con confirmación por correo se
> retiró junto con el envío de correos: las cuentas las crea el admin con
> `POST /usuarios`, que exige sesión, indicando rol y contraseña inicial. Cada
> usuario la cambia después desde `PUT /usuarios/me/password`.

### `GET/POST /auth/validateUser` — ValidateSession
**Sin body.** Lee la cookie `session_id`. Responde `200` si la sesión es válida, `401` si no.

### `GET/POST /auth/logout` — Logout
**Sin body.** Lee la cookie `session_id`, la elimina de la caché de sesiones y limpia la cookie del navegador. Siempre responde `200`.

## Notas de implementación

- **Convención de rutas**: `GET`/`PUT`/`DELETE` por id usan `/{recurso}/{id}` en el URL
  (usuarios, pacientes, notas, diagnosticos, procedimientos, tecnicas). El `GET` de lista y
  el `POST` usan `/{recurso}` sin id. En notas, las rutas específicas (`/notas/medics`,
  `/notas/pacientes/{id}`, `.../dates`) se registran **antes** del comodín `/notas/{id}`.
- **Regla de edición de notas**: `PUT`/`DELETE` de notas funcionan mientras la nota no
  esté legalizada y quien pide sea admin o participante. No hay plazo de edición. El
  veredicto viaja en cada nota como `puede_editar`.

- **Autorización**: cada handler de escritura se envuelve individualmente
  (`r.Handle(path, auth.Medicos(http.HandlerFunc(h)))`) en vez de usar un subrouter con
  `Use`. El patrón anterior —crear `p := r.PathPrefix("").Subrouter()` con `p.Use(...)` y
  registrar los handlers sobre `r`— no aplicaba el middleware a nada.

- **Código de estado**: los handlers escriben una cabecera propia `Status-Code: 201`, pero
  el **status HTTP real es `200`** en casi todas las escrituras. El cliente debe mirar el
  status de la respuesta, no esa cabecera.

### Pendiente (no crítico)

- Las tablas de catálogo ya existen (`"Diagnosticos"`, `"Procedimientos"`, `"Intervencion"`)
  y sus endpoints funcionan, pero `"Nota_Operatoria"` sigue guardando el diagnóstico y la
  intervención como **texto libre**, sin FK. Falta decidir si además debe validarse contra
  el catálogo.
