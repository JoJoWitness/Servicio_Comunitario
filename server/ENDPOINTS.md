# API Endpoints

Base URL: `http://localhost:8080` (default port `8080`, override with `PORT`)

All routes are registered in `server/routes/`. Global middleware: `corsMiddleware`.
The `/auth/*` routes are public. Everything under the REST API (`/usuarios`, `/pacientes`,
`/notas`, `/diagnosticos`, `/procedimientos`, `/tecnicas`) is protected by the `auth.Users`
middleware, and each resource subrouter additionally wires `auth.Admins`.

---

## System

| Method | URL                             | Handler | Notes                         |
|--------|---------------------------------|---------|-------------------------------|
| GET    | `http://localhost:8080/health`  | inline  | Health check                  |
| GET    | `http://localhost:8080/stream`  | inline  | Stream/websocket check (TODO) |

## Authentication (`/auth`) — public

| Method | URL                                          | Handler                | Notes                     |
|--------|----------------------------------------------|------------------------|---------------------------|
| ANY    | `http://localhost:8080/auth/login`           | `auth.Login`           | Login (setea cookie `session_id`) |
| POST   | `http://localhost:8080/auth/signup/{token}`  | `auth.SignUp`          | Sign up con token de invitación |
| ANY    | `http://localhost:8080/auth/validateUser`    | `auth.ValidateSession` | Valida la sesión actual   |
| ANY    | `http://localhost:8080/auth/logout`          | `auth.Logout`          | Cierra sesión y limpia la cookie |

## Usuarios (`/usuarios`) — requires Users + Admins

| Method | URL                                          | Handler                    |
|--------|----------------------------------------------|----------------------------|
| GET    | `http://localhost:8080/usuarios`             | `controllers.GetAllMedics` |
| POST   | `http://localhost:8080/usuarios`             | `controllers.CreateUser`   |
| GET    | `http://localhost:8080/usuarios/{id}`        | `controllers.GetUser`      |
| PUT    | `http://localhost:8080/usuarios/{id}`        | `controllers.UpdateUser`   |
| DELETE | `http://localhost:8080/usuarios/{id}`        | `controllers.DeleteUser`   |

## Pacientes (`/pacientes`) — requires Users + Admins

| Method | URL                                           | Handler                       |
|--------|-----------------------------------------------|-------------------------------|
| GET    | `http://localhost:8080/pacientes`             | `controllers.GetAllPacientes` |
| POST   | `http://localhost:8080/pacientes`             | `controllers.CreatePaciente`  |
| GET    | `http://localhost:8080/pacientes/{id}`        | `controllers.GetPaciente`     |
| PUT    | `http://localhost:8080/pacientes/{id}`        | `controllers.UpdatePaciente`  |
| DELETE | `http://localhost:8080/pacientes/{id}`        | `controllers.DeletePaciente`  |

## Notas (`/notas`) — requires Users + Admins

| Method | URL                                                  | Handler                                 |
|--------|------------------------------------------------------|-----------------------------------------|
| GET    | `http://localhost:8080/notas/medics`                 | `controllers.GetNotasFromMedic`         |
| GET    | `http://localhost:8080/notas/medics/dates`           | `controllers.GetNotasFromMedicDates`    |
| GET    | `http://localhost:8080/notas/pacientes/{id}`         | `controllers.GetNotasFromPaciente`      |
| GET    | `http://localhost:8080/notas/pacientes/dates`        | `controllers.GetNotasFromPacienteDates` |
| POST   | `http://localhost:8080/notas`                        | `controllers.CreateNota`                |
| GET    | `http://localhost:8080/notas/{id}`                   | `controllers.GetNota`                   |
| PUT    | `http://localhost:8080/notas/{id}`                   | `controllers.UpdateNota`                |
| DELETE | `http://localhost:8080/notas/{id}`                   | `controllers.DeleteNota`                |

## Diagnósticos (`/diagnosticos`) — requires Users + Admins

| Method | URL                                              | Handler                          |
|--------|--------------------------------------------------|----------------------------------|
| GET    | `http://localhost:8080/diagnosticos`             | `controllers.GetAllDiagnosticos` |
| POST   | `http://localhost:8080/diagnosticos`             | `controllers.CreateDiagnostico`  |
| GET    | `http://localhost:8080/diagnosticos/{id}`        | `controllers.GetDiagnostico`     |
| PUT    | `http://localhost:8080/diagnosticos/{id}`        | `controllers.UpdateDiagnostico`  |
| DELETE | `http://localhost:8080/diagnosticos/{id}`        | `controllers.DeleteDiagnostico`  |

## Procedimientos (`/procedimientos`) — requires Users + Admins

| Method | URL                                                | Handler                            |
|--------|----------------------------------------------------|------------------------------------|
| GET    | `http://localhost:8080/procedimientos`             | `controllers.GetAllProcedimientos` |
| POST   | `http://localhost:8080/procedimientos`             | `controllers.CreateProcedimiento`  |
| GET    | `http://localhost:8080/procedimientos/{id}`        | `controllers.GetProcedimiento`     |
| PUT    | `http://localhost:8080/procedimientos/{id}`        | `controllers.UpdateProcedimiento`  |
| DELETE | `http://localhost:8080/procedimientos/{id}`        | `controllers.DeleteProcedimiento`  |

## Técnicas (`/tecnicas`) — requires Users + Admins

| Method | URL                                          | Handler                     |
|--------|----------------------------------------------|-----------------------------|
| GET    | `http://localhost:8080/tecnicas`             | `controllers.GetAllTecnicas`|
| POST   | `http://localhost:8080/tecnicas`             | `controllers.CreateTecnica` |
| GET    | `http://localhost:8080/tecnicas/{id}`        | `controllers.GetTecnica`    |
| PUT    | `http://localhost:8080/tecnicas/{id}`        | `controllers.UpdateTecnica` |
| DELETE | `http://localhost:8080/tecnicas/{id}`        | `controllers.DeleteTecnica` |

---

## Not mounted / TODO

- `AdminRoutes()` (`server/routes/admin.go`) exists but is **not registered** in `routes.Init`, and its handlers are commented out (`GetCoordinatorsByRoute`, `GetAllAdmins`).

---

# Request Bodies

Bodies JSON para los endpoints que consumen `body`. Los nombres de campo son
exactamente los tags JSON de los structs (incluidos typos como `dirrecion`,
`dx_pre_operatorio`, `mdicos`, `anestia` — el server decodifica por esos nombres).

> **Content-Type:** `application/json` en todos.
> Fechas/horas de tipo `time.Time` van en **RFC3339** (ej. `2026-07-20T14:30:00Z`).

## Usuarios

### `POST http://localhost:8080/usuarios` — CreateUser
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

### `PUT http://localhost:8080/usuarios/{id}` — UpdateUser
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

### `POST http://localhost:8080/pacientes` — CreatePaciente
```json
{
  "id": "PAC-001",
  "dx_pre_operatorio": "Historia médica del paciente",
  "numero_identificacion": "V-12345678",
  "tipo_documento": "CI",
  "nombre": "Juan Pérez",
  "genero": "M",
  "fecha_nacimiento": "1990-05-20T00:00:00Z",
  "telefono": "0414-1234567",
  "dirrecion": "Av. Principal, San Cristóbal",
  "eliminado": false
}
```

### `PUT http://localhost:8080/pacientes/{id}` — UpdatePaciente
El `id` va en el **URL**. Mismo shape que POST en el body (sin `id`).
```json
{
  "dx_pre_operatorio": "Historia médica actualizada",
  "numero_identificacion": "V-12345678",
  "tipo_documento": "CI",
  "nombre": "Juan Pérez",
  "genero": "M",
  "fecha_nacimiento": "1990-05-20T00:00:00Z",
  "telefono": "0414-7654321",
  "dirrecion": "Nueva dirección",
  "eliminado": false
}
```

> `DELETE /pacientes/{id}` **no lleva body** — usa el `id` del URL.

## Notas

### `POST http://localhost:8080/notas` — CreateNota
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
  "Id_paciente": 1,
  "medico_encargado": "6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7",
  "eliminado": false
}
```
> El equipo de médicos (`medicos`) se llena solo en las respuestas `GET` (viene de
> `equipo_quirurgico`); no se envía al crear/actualizar.

### `PUT http://localhost:8080/notas/{id}` — UpdateNota
El `id` va en el **URL** (el body ya no lo necesita). Solo se permite editar una nota **creada el mismo día** (columna `created_at`).
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
  "Id_paciente": 1,
  "medico_encargado": "6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7",
  "eliminado": false
}
```
> El equipo de médicos (`medicos`) se llena solo en las respuestas `GET` (viene de
> `equipo_quirurgico`); no se envía al crear/actualizar.

### `DELETE http://localhost:8080/notas/{id}` — DeleteNota
**Sin body.** El `id` va en el URL. Igual que el PUT, solo borra notas creadas el mismo día.

### `GET http://localhost:8080/notas/medics/dates` — GetNotasFromMedicDates
El `id` del médico sale de la sesión; solo mandas el rango de fechas en el body.
```json
{
  "from": "2025-08-01T00:00:00Z",
  "to": "2026-07-31T23:59:59Z"
}
```

### `GET http://localhost:8080/notas/pacientes/{id}` — GetNotasFromPaciente
El `id` del paciente va en el **URL**. Sin body.

### `GET http://localhost:8080/notas/pacientes/dates` — GetNotasFromPacienteDates
El `id` del paciente va en el body (más el rango).
```json
{
  "id": "1",
  "from": "2025-08-01T00:00:00Z",
  "to": "2026-07-31T23:59:59Z"
}
```

> `GET /notas/medics` no lleva body.

## Diagnósticos

### `POST http://localhost:8080/diagnosticos` — CreateDiagnostico
```json
{
  "diagnostico": "Hipertensión arterial",
  "resumen": "Paciente con presión elevada sostenida"
}
```

### `PUT http://localhost:8080/diagnosticos/{id}` — UpdateDiagnostico
El `id` va en el **URL** (el body ya no lo necesita).
```json
{
  "diagnostico": "Hipertensión arterial controlada",
  "resumen": "Resumen actualizado"
}
```

## Procedimientos

### `POST http://localhost:8080/procedimientos` — CreateProcedimiento
```json
{
  "intervencion": "Colecistectomía laparoscópica",
  "resumen": "Extracción de vesícula por vía laparoscópica"
}
```

### `PUT http://localhost:8080/procedimientos/{id}` — UpdateProcedimiento
El `id` va en el **URL** (el body ya no lo necesita).
```json
{
  "intervencion": "Colecistectomía abierta",
  "resumen": "Resumen actualizado"
}
```

## Técnicas

### `POST http://localhost:8080/tecnicas` — CreateTecnica
```json
{
  "tecnica": "Sutura continua"
}
```

### `PUT http://localhost:8080/tecnicas/{id}` — UpdateTecnica
El `id` va en el **URL** (el body ya no lo necesita).
```json
{
  "tecnica": "Sutura discontinua"
}
```

## Auth

### `POST http://localhost:8080/auth/login` — Login
Decodifica un `Usuarios`, pero solo usa `correo` y `contrasena`. Si es válido, setea la cookie `session_id`.
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

### `POST http://localhost:8080/auth/signup/{token}` — SignUp
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

### `GET/POST http://localhost:8080/auth/validateUser` — ValidateSession
**Sin body.** Lee la cookie `session_id`. Responde `200` si la sesión es válida, `401` si no.

### `GET/POST http://localhost:8080/auth/logout` — Logout
**Sin body.** Lee la cookie `session_id`, la elimina de la caché de sesiones y limpia la cookie del navegador. Siempre responde `200`.

## Notas de implementación

- **Convención de rutas**: `GET`/`PUT`/`DELETE` por id usan `/{recurso}/{id}` en el URL
  (usuarios, pacientes, notas, diagnosticos, procedimientos, tecnicas). El `GET` de lista y
  el `POST` usan `/{recurso}` sin id. En notas, las rutas específicas (`/notas/medics`,
  `/notas/pacientes/{id}`, `.../dates`) se registran **antes** del comodín `/notas/{id}`.
- **Regla de edición de notas**: `PUT`/`DELETE` de notas solo funcionan si la nota se
  **creó el mismo día** (se agregó la columna `created_at DEFAULT NOW()`). Como los datos
  de prueba se cargan en cada arranque, quedan editables el día que corras el server.

### Pendiente (no crítico)

- **`auth.Admins` no está aplicado**: en cada archivo de `routes/` se crea un subrouter
  `p := r.PathPrefix("").Subrouter(); p.Use(auth.Admins)`, pero los handlers se registran
  sobre `r`, no sobre `p`. Ese middleware de admin **no protege nada** hoy; solo aplica
  `auth.Users` (heredado del subrouter `api`).
