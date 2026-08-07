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
| `/pacientes`                                    | cualquiera autenticado | medico, admin (`DELETE`: solo admin) |
| `/usuarios/me`, `/usuarios/me/password`         | el propio usuario      | el propio usuario                    |
| `/usuarios` (lista)                             | cualquiera autenticado | admin                                |
| `/usuarios/{id}`                                | admin                  | admin                                |
| `/diagnosticos`, `/procedimientos`, `/tecnicas` | cualquiera autenticado | admin                                |

Además de estos middlewares, `PUT`/`DELETE` de una nota exigen que el médico haya
participado en ella: que sea el `id_medico_encargado` o que esté en `"Equipo_Quirurgico"`.
El admin queda exento. Un médico que no participó recibe `403`; una nota inexistente o dada
de baja, `404`.

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
| POST   | `/auth/signup/{token}` | `auth.SignUp`          | Sign up con token de invitación   |
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

```
GET /notas?medico=6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7&from=2025-08-01&to=2026-07-31
```

### `GET /notas/{id}` — GetNota
**Sin body.** Devuelve la nota completa con su `medicos` (equipo quirúrgico). Si la nota no
existe o fue dada de baja, responde `404`.

### `POST /notas` — CreateNota
`medico_encargado` es opcional: si no se manda, se usa el usuario de la sesión.
`equipo` es la lista de UUID del equipo quirúrgico; el encargado se agrega solo, no hace
falta repetirlo. Si algún UUID no corresponde a un médico activo, responde `400`.
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

### `PUT /notas/{id}` — UpdateNota
El `id` va en el **URL** (el body ya no lo necesita). Solo se permite editar una nota dentro de los **7 días calendario** siguientes a su registro (columna `created_at`; ver `notas.PlazoEdicionDias`). Fuera de plazo: `403`.
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

### `POST /auth/signup/{token}` — SignUp
El `{token}` es un **path param**. Tiene dos modos según su valor:

- **Paso 1 — solicitar registro** → usa el token literal `confirmation` en la URL
  (`/auth/signup/confirmation`). Manda el body con los datos del usuario; el server
  guarda al usuario en caché y envía un correo de confirmación (Resend).
  ```json
  {
    "correo": "nuevo@test.com",
    "nombres": "Nuevo",
    "apellidos": "Medico",
    "rol": "medico",
    "contrasena": "secreto123"
  }
  ```
- **Paso 2 — confirmar** → el enlace del correo trae el token real
  (`/auth/signup/<token_generado>`). En este modo **no se manda body**: el server
  recupera al usuario de la caché con ese token, crea la cuenta y setea la sesión.

### `GET/POST /auth/validateUser` — ValidateSession
**Sin body.** Lee la cookie `session_id`. Responde `200` si la sesión es válida, `401` si no.

### `GET/POST /auth/logout` — Logout
**Sin body.** Lee la cookie `session_id`, la elimina de la caché de sesiones y limpia la cookie del navegador. Siempre responde `200`.

## Notas de implementación

- **Convención de rutas**: `GET`/`PUT`/`DELETE` por id usan `/{recurso}/{id}` en el URL
  (usuarios, pacientes, notas, diagnosticos, procedimientos, tecnicas). El `GET` de lista y
  el `POST` usan `/{recurso}` sin id. En notas, las rutas específicas (`/notas/medics`,
  `/notas/pacientes/{id}`, `.../dates`) se registran **antes** del comodín `/notas/{id}`.
- **Regla de edición de notas**: `PUT`/`DELETE` de notas solo funcionan dentro de los
  **7 días calendario** siguientes al registro (columna `created_at DEFAULT NOW()`). El
  plazo vive en una sola constante, `notas.PlazoEdicionDias`, y el mensaje de error se
  arma con ella. Como los datos de prueba se cargan en cada arranque, quedan editables.

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
