# Frontend Blueprint — Notas Operatorias (Servicio de Oftalmología, HCSC)

> Documento de arquitectura y análisis técnico para construir el frontend en `/frontend`.
> Elaborado a partir del código Go de `/server`, `ENDPOINTS.md` e `historias-de-usuario.md`.
> **Base URL por defecto:** `http://localhost:8080` (variable `PORT`).

---

## 1. Resumen de la arquitectura del backend

### 1.1 Stack

| Capa | Tecnología |
|---|---|
| Lenguaje | Go 1.23 |
| Router HTTP | `gorilla/mux` |
| Base de datos | PostgreSQL (acceso vía `jackc/pgx/v5` + `pgxpool`, **SQL crudo, sin ORM**) |
| Sesiones | Cache **en memoria** LRU con expiración (`hashicorp/golang-lru/v2/expirable`), 5000 entradas, TTL 32 h |
| Hash de contraseñas | `bcrypt` (`golang.org/x/crypto`) |
| Correo | Resend (`resendlabs/resend-go`) para invitación y recuperación |
| Exportación | `github.com/xuri/excelize/v2` — genera `.xlsx` en memoria y lo escribe directo al `ResponseWriter` |
| WebSocket | `gorilla/websocket` declarado, pero `/stream` es un stub sin usar |

### 1.2 Estructura de carpetas

```
server/
├── main.go              # arranque: carga .env, InitDB, DropDB→InitDB→LoadSampleData, levanta servidor
├── config/config.go     # pool de PostgreSQL (DATABASE_URI) + upgrader websocket
├── routes/              # un archivo por recurso; routes.Init monta todo
├── controllers/         # handlers HTTP; controllers/auth para sesión/login/signup
├── models/              # structs + SQL crudo por recurso (notas, pacientes, usuarios, catálogos)
│   └── schemas/*.sql    # create.sql, drop.sql, sample_data.sql
├── services/email.go    # envío de correos con Resend
└── utils/               # hashing, helpers
```

### 1.3 Flujo de arranque (crítico entenderlo)

En `main.go`, **en cada arranque** se ejecuta:

```
DropDB()  →  InitDB()  →  LoadSeed()  →  LoadSampleData()
```

Esto **borra y recrea la base de datos completa** en cada reinicio. El orden importa:

- `LoadSeed()` carga el **catálogo clínico real** del servicio (diagnósticos, procedimientos
  y técnicas de oftalmología). Es idempotente — corre con `ON CONFLICT DO NOTHING`, así que
  no duplica ni pisa ediciones del admin (HU-20). Esto es contenido de producción.
- `LoadSampleData()` carga pacientes, médicos, notas de prueba y las notas referencian los
  diagnósticos/procedimientos del seed, por eso el seed va primero.

Consecuencias para el frontend:

- No hay persistencia real entre reinicios del servidor durante el desarrollo. Cualquier
  nota o paciente que cargues se pierde al reiniciar.
- Las notas de prueba se recargan siempre "frescas", por lo que quedan dentro del plazo de
  edición de 7 días. En producción esto tendría que desactivarse.
- El catálogo (diagnósticos, procedimientos, técnicas) **sí sobrevive** entre reinicios en
  producción porque `LoadSeed` es idempotente; en desarrollo se recarga completo.

### 1.4 Autenticación y sesiones

- **Basada en cookie**, no en tokens en el header. Al hacer login el servidor genera un
  token aleatorio de 32 bytes, lo guarda en el cache LRU asociado a `{UserID, Role}` y lo
  devuelve como cookie `session_id`.
- La cookie es `HttpOnly`, `SameSite=Strict`, `Secure=false` (pendiente pasar a HTTPS),
  `Path=/`, expira a las 32 h. Al ser **HttpOnly, el JS del frontend NO puede leerla** — el
  navegador la envía automáticamente si se usan credenciales.
- No hay JWT expuesto: aunque `golang-jwt` está en `go.mod`, la sesión vive en el cache del
  servidor. **Si el servidor se reinicia, todas las sesiones se invalidan** (el cache es en
  memoria) → el usuario debe volver a loguearse.
- El **rol viaja en la sesión** (`"Usuarios".rol`: `admin` | `medico` | `secretaria`) y es
  lo que leen los middlewares de autorización.

### 1.5 Autorización (dónde se aplica)

- `corsMiddleware` global.
- `auth.Users` protege **todo** el REST API (`/usuarios`, `/pacientes`, `/notas`,
  `/diagnosticos`, `/procedimientos`, `/tecnicas`): sin sesión → `401`.
- Cada handler de **escritura** se envuelve individualmente con el middleware de rol
  (`auth.Medicos`, `auth.Admins`, `auth.Secretarias`). Rol insuficiente → `403`.
- Regla extra de autoría en notas: `PUT`/`DELETE` exigen que el médico sea
  `id_medico_encargado` o parte del `Equipo_Quirurgico` (salvo admin). Comprobado en
  `notas.EsParticipante`.

### 1.6 Persistencia de las notas operatorias

- Tabla `"Nota_Operatoria"` (id **entero autoincremental**) + tabla puente
  `"Equipo_Quirurgico"` (`id_nota_operatoria`, `id_medico`, `rol` default `'cirujano'`).
- `Create`/`Update` corren en **una transacción**: escriben la nota y luego
  `sincronizarEquipo` borra e inserta de nuevo todo el equipo. **El médico encargado se
  inserta siempre en el equipo** (por eso la nota le aparece en "Mis notas").
- **Baja lógica**: `DELETE` solo hace `UPDATE ... SET eliminado = TRUE`. La fila y su equipo
  se conservan (parte de la historia clínica). Toda consulta filtra `eliminado = FALSE`.
- **Ventana de edición**: `PUT`/`DELETE` solo dentro de `notas.PlazoEdicionDias = 7` días
  calendario desde `created_at`. Fuera de plazo → `403`.

---

## 2. Mapeo de Historias de Usuario → Endpoints

| HU | Descripción | Método + Endpoint | Rol | Notas |
|---|---|---|---|---|
| HU-01 | Iniciar sesión | `POST /auth/login` · `GET/POST /auth/validateUser` | público | Login devuelve `{id,nombres,apellidos,correo,rol}` + setea cookie |
| HU-02 | Cerrar sesión | `GET/POST /auth/logout` | autenticado | Limpia cookie e invalida sesión en cache |
| HU-03 | Registro por invitación | `POST /auth/signup/confirmation` (paso 1) → `POST /auth/signup/{token}` (paso 2) | público (con token) | Paso 2 no lleva body |
| HU-04 | Cambiar contraseña | `PUT /usuarios/me/password` | autenticado | **No está en ENDPOINTS.md** (existe en `routes/usuarios.go`) |
| HU-05 | Buscar paciente | `GET /pacientes` | autenticado | **No hay búsqueda server-side**: devuelve todos, filtrar en cliente |
| HU-06 | Registrar paciente | `POST /pacientes` | medico, admin | Server genera el UUID |
| HU-07 | Ficha e historial del paciente | `GET /pacientes/{id}` · `GET /notas/pacientes/{id}` · `GET /notas/pacientes/dates?id=&from=&to=` | autenticado | Historial sin notas → `[]` |
| HU-08 | Corregir datos del paciente | `PUT /pacientes/{id}` (medico, admin) · `DELETE /pacientes/{id}` (**solo admin**) | según acción | |
| HU-09 | Crear nota operatoria | `POST /notas` | medico, admin | Ver §3 |
| HU-10 | Autoguardado de borrador | — | — | **Sin backend**: 100% frontend (localStorage/IndexedDB) |
| HU-11 | Ver mis notas | `GET /notas/medics` · `GET /notas/medics/dates?from=&to=` | autenticado | El id del médico sale de la sesión |
| HU-11 ★ | **Exportar record quirúrgico (.xlsx)** | `GET /notas/medics/export?from=&to=` (admin: `&medico=UUID`) | autenticado | **Nuevo endpoint.** No devuelve JSON. Responde el archivo directamente |
| HU-12 | Detalle de una nota | `GET /notas/{id}` | autenticado | Trae `medicos` (equipo completo). No existe/baja → `404` |
| HU-13 | Editar nota | `PUT /notas/{id}` | medico (participante), admin | `403` fuera de 7 días o si no participó |
| HU-14 | Eliminar nota | `DELETE /notas/{id}` | medico (participante), admin | Baja lógica; misma regla de 7 días |
| HU-15 | Registrar equipo quirúrgico | campo `equipo` en `POST`/`PUT /notas` + `GET /usuarios` (selector) | medico, admin | `equipo` = lista de UUID |
| HU-16 | Ver todas las notas | `GET /notas?medico=&paciente=&from=&to=` | **secretaria, admin** | Médico usa `/notas/medics` |
| HU-17 | Buscar nota concreta | filtros de `GET /notas` | secretaria, admin | Combina médico + fechas + paciente |
| HU-18 | Resumen de actividad | `GET /notas/medics/export` (Excel) | autenticado | El Excel ya incluye hoja "Resumen" con conteos por procedimiento, desglose electiva/emergencia/biopsia y actividad mensual. Sin endpoint JSON de agregados |
| HU-19 | Catálogos en la nota | `GET /diagnosticos` · `GET /procedimientos` · `GET /tecnicas` | autenticado | Solo autocompletado; la nota guarda **texto libre** |
| HU-20 | Mantener catálogos | CRUD en `/diagnosticos`, `/procedimientos`, `/tecnicas` | **solo admin** escribe | |
| HU-21 | Gestionar usuarios | `GET /usuarios` (lista, autenticado) · `POST/GET/PUT/DELETE /usuarios/{id}` (admin) | admin | Baja lógica |
| HU-22 | Acceso por rol y sesión | middlewares `auth.*` + `notas.EsParticipante` | — | Transversal |

---

## 3. Análisis de datos — payloads y respuestas

> **Content-Type:** `application/json` en todo, excepto `GET /notas/medics/export` que
> devuelve `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
> Fechas/horas `time.Time` en **RFC3339**.
> Los nombres de campo son los **tags JSON**, que en varios casos **no** coinciden con la
> columna SQL (ver desajustes abajo).

### 3.1 El formulario de la nota operatoria (lo más importante)

**Request de `POST /notas` y `PUT /notas/{id}`** (struct `notas.Notas`):

| Campo JSON (lo que envías) | Tipo | Obligatorio* | Notas |
|---|---|---|---|
| `dx_pre_operatorio` | string | sí | Diagnóstico preoperatorio (texto libre) |
| `dx_post_operatorio` | string | sí (NOT NULL) | Diagnóstico postoperatorio |
| `intervencion_realizado` | string | sí | Procedimiento (texto libre). OJO: JSON con `o` final, columna es `intervencion_realizada` |
| `fecha_comienzo` | RFC3339 | sí | Se guarda como `DATE` |
| `fecha_culminacion` | RFC3339 | sí | `DATE` |
| `hora_comienzo` | RFC3339 | sí | Se guarda como `TIME`; **la parte de fecha se ignora** |
| `hora_culminacion` | RFC3339 | sí | `TIME` |
| `resumen_intervencion` | string | sí | Texto libre. Columna con typo: `resumen_intevencion` |
| `pabellon` | string | sí | Quirófano |
| `es_electiva` | bool | sí | |
| `es_emergencia` | bool | sí | |
| `tuvo_biopsia` | bool | sí | |
| `anestia` | string | sí | JSON mal escrito `anestia`; columna `anestesia` |
| `Id_paciente` | string (UUID) | sí | **Mayúscula inicial y UUID**, no entero |
| `medico_encargado` | string (UUID) | no | JSON `medico_encargado` → columna `id_medico_encargado`. Si falta, se usa el de la sesión |
| `equipo` | string[] (UUID) | no | Equipo quirúrgico; el encargado se agrega solo. UUID inválido → `400` |
| `ojo` | string | no | **Nuevo.** Ojo operado: `"OD"` (derecho), `"OI"` (izquierdo) o `"AO"` (ambos). Valor inválido rechazado por constraint |
| `estado` | string | no | **Nuevo.** `"realizada"` (default) o `"diferida"`. Indica si la cirugía se llevó a cabo o se postergó |

\* *"Obligatorio" = la columna es `NOT NULL`. El backend **no** valida campos mínimos ni
que `hora_culminacion >= hora_comienzo` (HU-09 lo pide, pero está sin implementar). **La
validación debe hacerse en el frontend.***

**Respuesta de `POST`/`PUT`** = el mismo objeto con dos diferencias clave:

- `id` (entero) poblado.
- `medicos`: **array de objetos usuario completos** (id, correo, nombres, apellidos, rol) del
  equipo quirúrgico. Este es el campo de **lectura**; `equipo` es el de **escritura** y viene
  vacío/`null` en las respuestas.

```jsonc
// Fragmento de respuesta GET /notas/{id}
{
  "id": 12,
  "dx_pre_operatorio": "Catarata senil OD",
  "intervencion_realizado": "Facoemulsificación",
  "Id_paciente": "a0000000-0000-4000-8000-000000000001",
  "medico_encargado": "100e8400-...",
  "equipo": null,              // vacío en lectura
  "medicos": [                 // el equipo real, para render
    { "id": "100e8400-...", "correo": "...", "nombres": "Ryuk",
      "apellidos": "Dog", "rol": "admin", "contrasena": "", "eliminado": false }
  ]
}
```

> **Al editar (HU-13):** para conservar el equipo hay que reenviar en `equipo` los UUID de
> `medicos` (mapear `medicos[].id` → `equipo`), porque el backend **reemplaza** el equipo
> completo en cada `PUT`. Si mandas `equipo` vacío, queda solo el encargado.

### 3.2 Paciente (`pacientes.Pacientes`)

`POST`/`PUT /pacientes` — **no envíes `id`** (lo genera el server):

```json
{
  "historia_medica": "HC-2026001",
  "numero_identificacion": "V-12345678",
  "tipo_documento": "V",
  "nombre": "Juan Pérez",
  "genero": "M",
  "fecha_nacimiento": "1990-05-20T00:00:00Z",
  "telefono": "0414-1234567",
  "direccion": "Av. Principal"
}
```

- `tipo_documento` y `genero` son **1 carácter** (`V`/`E`, `M`/`F`).
- `historia_medica` y `numero_identificacion` son **únicos**. Historia repetida → `400`;
  identificación repetida → `500` (lo rechaza la constraint, sin chequeo previo).
- Baja lógica solo por `DELETE` (admin). `eliminado` no se envía.

### 3.3 Usuario (`usuarios.Usuarios`)

`POST /usuarios` (admin): `{correo, nombres, apellidos, rol, contrasena}`. El server hashea
la contraseña; el hash **nunca** vuelve en respuestas (`contrasena` sale vacío).
`GET /usuarios` (lista de médicos, autenticado) alimenta el selector de equipo (HU-15).

### 3.4 Login

`POST /auth/login` request `{correo, contrasena}` → respuesta
`{id, nombres, apellidos, correo, rol}` + cookie. **Guarda `rol` en el estado global** para
decidir la pantalla inicial y qué acciones mostrar.

### 3.5 Catálogos

Los catálogos ahora están **sembrados con datos reales de oftalmología** (`seed.sql`). El
frontend puede confiar en que las listas tendrán contenido relevante al primer arranque.

| Endpoint | Body POST/PUT | Novedades en el esquema |
|---|---|---|
| `POST/PUT /diagnosticos` | `{ "diagnostico": "...", "resumen": "..." }` | `procedimientos` UNIQUE; `resumen` ahora es nullable (diagnósticos no tienen relato quirúrgico) |
| `POST/PUT /procedimientos` | `{ "intervencion": "...", "resumen": "..." }` | `intervencion` UNIQUE; `resumen` = relato canónico que se puede precargar en la nota |
| `POST/PUT /tecnicas` | `{ "tecnica": "...", "frase": "...", "huecos": [...] }` | **Nuevos campos**: `frase` (texto a insertar en el resumen) y `huecos` (JSONB: valores variables de la técnica) |

**`Procedimiento_Tecnica`** es una nueva tabla puente que relaciona qué técnicas propone
cada procedimiento y en qué orden (`orden`, `por_defecto`). **Hoy no tiene endpoint expuesto**,
pero es la base de una futura pantalla de "pasos sugeridos al elegir procedimiento" (ver §4).

### 3.6 Exportación `.xlsx` — `GET /notas/medics/export`

Este endpoint **no devuelve JSON**: envía el archivo binario directamente.

| Query param | Obligatorio | Descripción |
|---|---|---|
| `from` | no | Límite inferior del período (`YYYY-MM-DD` o RFC3339). Sin él, sin límite |
| `to` | no | Límite superior (día incluido completo). Sin él, sin límite |
| `medico` | no | UUID de otro médico. **Solo admin.** Otro rol → `403` |

Respuesta exitosa:
- Status `200`
- `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `Content-Disposition: attachment; filename="record-quirurgico-<slug-medico>-<from>_<to>.xlsx"`
- `Access-Control-Expose-Headers: Content-Disposition` (ya configurado en CORS global)

El libro tiene **dos hojas**:

1. **Record Quirurgico** — Una fila por nota: N°, fecha, hora inicio/fin, paciente, edad
   al momento de la cirugía (calculada históricamente), sexo, cédula, DX pre/post,
   intervención, cirujano, ayudantes, anestesia, pabellón, tipo (Electiva/Emergencia),
   biopsia y resumen. Encabezado fijo y con autofiltro.
2. **Resumen** — Conteo por procedimiento (normalizado: mayúsculas, espacios colapsados)
   ordenado de mayor a menor, total, desglose electivas/emergencias/biopsias, actividad por
   mes, y dos gráficas: barras horizontales de procedimientos y columnas de actividad mensual.

**Cómo descargarlo en el cliente:**

```js
// fetch + Blob — el más portable
const res = await fetch(`${BASE_URL}/notas/medics/export?from=2026-01-01`, {
  credentials: "include",
});
if (!res.ok) throw new Error(await res.text());

// El nombre del archivo viaja en Content-Disposition (ya expuesto por CORS)
const disposition = res.headers.get("Content-Disposition") ?? "";
const match = disposition.match(/filename="?([^"]+)"?/);
const nombre = match?.[1] ?? "record.xlsx";

const blob = await res.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = nombre;
a.click();
URL.revokeObjectURL(url);
```

> Si el médico no tiene notas en el rango, recibe la **planilla vacía** con portada y
> encabezado, no un error. No hay que manejar ese caso como fallo.

### 3.7 Desajustes de nombres a memorizar

| JSON del API | Columna SQL | Comentario |
|---|---|---|
| `anestia` | `anestesia` | typo en el tag JSON |
| `resumen_intervencion` | `resumen_intevencion` | typo en la columna |
| `intervencion_realizado` | `intervencion_realizada` | género distinto |
| `medico_encargado` | `id_medico_encargado` | |
| `Id_paciente` | `id_paciente` | mayúscula inicial en JSON |
| `diagnostico` | `procedimientos` (tabla `Diagnosticos`) | |

---

## 4. Identificación de brechas (Gaps)

### 4.1 ~~Exportación a PDF~~ → cambiado: exportación a Excel implementada

El backend ahora genera y entrega el **record quirúrgico en `.xlsx`** (`GET /notas/medics/export`).
Esto cubre parcialmente el objetivo del proyecto. Lo que sigue sin implementar:

- **PDF por nota individual** (el que reemplaza al PowerPoint): no existe endpoint ni
  plantilla. Si el servicio necesita un PDF de cada nota (para historia clínica impresa,
  firmas, etc.), la generación sigue siendo responsabilidad del frontend, alimentándose de
  `GET /notas/{id}` + `GET /pacientes/{id}`.
- **No hay almacenamiento de PDF** en el servidor. El Excel se genera en tiempo real; si
  necesitan archivarlo, hay que decidir dónde.

### 4.2 `created_at` no se expone → no se puede calcular el plazo de 7 días en cliente

La regla de edición (HU-13/14) depende de `created_at`, pero **ese campo no está en el struct
`Notas` ni en ningún `SELECT`**. El frontend no puede saber si una nota sigue editable sin
intentar el `PUT`/`DELETE` y recibir `403`.

**→ Opciones:** (a) pedir al backend que agregue `created_at` a la respuesta (recomendado), o
(b) manejar el `403` de forma reactiva (deshabilitar/mostrar mensaje tras el intento). Hoy solo
(b) es posible.

### 4.3 Campos nuevos `ojo` y `estado` en la nota — sin documentar en `ENDPOINTS.md`

El esquema agregó dos columnas a `"Nota_Operatoria"`:

- `ojo VARCHAR(3)` con constraint `CHECK IN ('OD', 'OI', 'AO')` — específico de oftalmología.
- `estado VARCHAR(20)` con default `'realizada'` y constraint `CHECK IN ('realizada', 'diferida')`.

**Ambos campos no están en el struct `Notas` ni en los INSERT/UPDATE del backend.** Hoy no se
pueden enviar ni leer desde el API. Cuando el backend los agregue al struct y los queries, el
frontend deberá añadirlos al formulario de la nota:
- `ojo`: un selector con `OD`, `OI`, `AO` (no es libre).
- `estado`: un selector `realizada` / `diferida` (útil para marcar cirugías postergadas).

### 4.4 `tipo_lente` (específico de oftalmología) existe en el esquema pero no se usa

La columna `tipo_lente VARCHAR(255)` está en `create.sql`, pero **no aparece en el struct
`Notas` ni en los INSERT/UPDATE/SELECT**. Si el servicio necesita registrar el lente
intraocular, hay que pedir que se agregue al backend; hoy no se puede enviar ni leer.

### 4.5 `Procedimiento_Tecnica` sin endpoint expuesto

La nueva tabla puente sabe qué técnicas aplican a cada procedimiento y en qué orden.
**No hay endpoint que la exponga.** Cuando se implemente, permitirá que el formulario de
la nota precargue automáticamente los pasos quirúrgicos al seleccionar un procedimiento
(p. ej.: elegir "Trabeculectomía" sugiere sus técnicas marcadas `por_defecto = TRUE`).

**→ Es un endpoint a pedir al backend** cuando se quiera implementar esa UX. Los campos
`frase` y `huecos` de `Intervencion` apuntan a que el plan es armar el resumen de la
intervención rellenando plantillas.

### 4.6 HU-18 (resumen/estadísticas) — cubierto parcialmente por el Excel

El endpoint de exportación ya genera la hoja "Resumen" con conteos. Lo que aún falta:
- No hay endpoint JSON de agregados (para mostrar estadísticas en la UI sin descargar un archivo).
- El resumen del Excel está limitado al médico de la sesión (o al que indique el admin con
  `?medico=`). No hay una vista de resumen global del servicio (todos los médicos).

**→ Para una pantalla de estadísticas en la app**, calcular sobre `GET /notas` con filtros o
pedir un endpoint de agregados dedicado.

### 4.7 HU-05 sin búsqueda server-side

`GET /pacientes` devuelve **todos** los pacientes (no hay `?q=`). **→ Filtrar por
cédula/historia/nombre en el cliente**; considerar paginación futura si la lista crece.

### 4.8 HU-10 (autoguardado de borrador) sin backend

Es puramente frontend. Implementar con `localStorage`/`IndexedDB` y ofrecer recuperación al
reabrir el formulario.

### 4.9 HU-19: la nota guarda texto libre, no FK al catálogo

Los catálogos solo sirven para autocompletar; la nota **no** referencia sus ids. El frontend
puede ofrecer autocompletado pero debe permitir texto libre y enviar strings. El campo
`resumen` de `Procedimientos` es el "relato canónico" que puede pre-llenar el campo
`resumen_intervencion` de la nota cuando el médico elige un procedimiento del catálogo.

### 4.10 Inconsistencias menores del backend a tener presentes

- **`Status-Code` header ≠ status real.** Las escrituras añaden un header `Status-Code: 201`
  pero el **status HTTP real es `200`**. **→ El cliente debe mirar `response.status`, nunca ese
  header.**
- **Documentación incompleta:** `GET /usuarios/me` y `PUT /usuarios/me/password` existen en
  `routes/usuarios.go` pero **no están en `ENDPOINTS.md`**.
- **`GET /pacientes/{id}` devuelve `500`** (no `404`) si el paciente no existe.
  `DELETE /pacientes/{id}` responde `201` aunque el id no exista.
- **Datos de prueba divergentes:** `sample_data.sql` (el que carga `main.go`) usa
  `ryuk@test.com`/`ryuk2026`; el `LoadSampleUsers` de `controllers/usuarios.go` usa
  `ryuk@dog.unet.ve`/`ryuk` y **no se invoca**. Usar las credenciales de `sample_data.sql`.
- **`/stream`** es un stub (bucle infinito de logs), no un websocket real.
- No hay validación de `hora_culminacion >= hora_comienzo` ni de campos mínimos en el server.

---

## 5. Recomendaciones para el frontend

### 5.1 CORS + cookies: el bloqueante número uno

El backend responde `Access-Control-Allow-Origin: *` **junto con**
`Access-Control-Allow-Credentials: true`. **Esa combinación es inválida en los navegadores:**
una petición con credenciales (cookies) es rechazada si el origen permitido es el comodín `*`.

Como la autenticación es **por cookie**, el frontend **debe** enviar credenciales, y para que
funcione el backend tendrá que **reflejar el origen concreto** (p. ej. `http://localhost:4321`)
en `Access-Control-Allow-Origin` en vez de `*`.

**→ Acción recomendada:** coordinar con el backend para que el CORS devuelva el origen exacto
del frontend (o una lista blanca). Sin ese cambio, las llamadas autenticadas fallarán en el
navegador aunque funcionen en Insomnia/Postman.

En el cliente, todas las llamadas deben incluir credenciales:

```js
fetch(`${BASE_URL}/notas`, { credentials: "include" /* , headers, method, body */ });
// axios: axios.create({ baseURL, withCredentials: true })
```

La cookie es `HttpOnly`: **el JS no puede leerla ni guardarla**; el navegador la gestiona sola.

### 5.2 Manejo de estado global

- **Sesión/rol:** guarda `{id, nombres, apellidos, correo, rol}` que devuelve el login. El
  `rol` decide routing y UI (médico → "Mis notas"; secretaria → "Todas las notas", solo
  lectura; admin → todo). **Nunca** confíes solo en ocultar botones: el backend igual valida,
  pero la UI debe reflejar permisos para no frustrar al usuario.
- **Rehidratación al recargar:** como no puedes leer la cookie, al iniciar la app llama a
  `GET /auth/validateUser` (o `GET /usuarios/me`) para saber si hay sesión y recuperar el
  perfil. Si `401`, redirige a login.
- **Sugerencia de librerías:** un store ligero para sesión/UI (Zustand, Pinia o Context) +
  **TanStack Query / SWR** para el estado del servidor (notas, pacientes, catálogos), que
  resuelve cache, revalidación e invalidación tras mutaciones.
- **Interceptor 401 global:** cualquier `401` (sesión caída, y recuerda que un reinicio del
  server invalida todas las sesiones) debe limpiar el estado y mandar al login.

### 5.3 Formulario de la nota (núcleo del producto)

- Valida en cliente lo que el backend no valida: campos mínimos (paciente, dx pre,
  intervención, fecha) y `hora_culminacion >= hora_comienzo`.
- Envía fechas/horas en **RFC3339**. Para `hora_*`, la fecha da igual; envía una fecha fija y
  la hora correcta.
- Cuidado con los **tags mal escritos**: `anestia`, `Id_paciente` (mayúscula),
  `intervencion_realizado`. Encapsula el mapeo en una capa de API/DTO para no repetir errores.
- **Equipo quirúrgico:** al editar, precarga el multiselect desde `medicos[]` y, al guardar,
  envía `equipo` = `medicos.map(m => m.id)`. No repitas al encargado (el server lo agrega).
- **Autoguardado (HU-10):** persiste el borrador en `localStorage` por usuario+paciente y
  ofrece recuperarlo al reabrir.
- **Autocompletado de catálogos:** carga `/diagnosticos`, `/procedimientos`, `/tecnicas` y
  ofrece sugerencias, pero permite texto libre (la nota guarda strings).

### 5.4 Exportación a PDF (por nota) y descarga del record quirúrgico (.xlsx)

**Excel (ya implementado):**
- Un botón "Descargar record" llama a `GET /notas/medics/export` con el rango de fechas del
  filtro activo. Ver el snippet de fetch en §3.6.
- El admin necesita un selector de médico extra (envía `?medico=UUID`) para generar el
  reporte de otro colega.
- No gestiones este endpoint con TanStack Query / SWR: es una descarga binaria, no un fetch
  JSON. Usa `fetch` directo y Blob.

**PDF por nota individual (pendiente):**
- Generación en cliente. Evalúa `@react-pdf/renderer` (React) o `pdfmake` para plantillas
  declarativas; `jsPDF`+`html2canvas` si prefieres "imprimir" un layout HTML.
- Define con el servicio el **layout que reemplaza al PowerPoint** (encabezado del hospital,
  datos del paciente, campos de la nota, equipo quirúrgico, firmas). Ese formato es un
  entregable a acordar antes de codificar.
- Los datos vienen de `GET /notas/{id}` (incluye `medicos`) + `GET /pacientes/{id}`.

### 5.5 Códigos de estado y errores

- Lee siempre `response.status` (200/400/401/403/404/500). **Ignora el header `Status-Code`.**
- Mapea `403` de notas a mensajes claros: "fuera del plazo de 7 días" vs "no participaste en
  esta operación" (el body de texto los distingue).
- Los cuerpos de error son **texto plano**, no JSON. Léelos con `response.text()`.

### 5.6 Stack sugerido (a validar por el equipo)

- El correo de invitación ya apunta a `http://localhost:4321/signup/<token>` → el backend
  asume un frontend en el **puerto 4321** (por defecto de **Astro**). Conviene alinear el
  stack con eso o pedir cambiar la URL del correo.
- Propuesta: **Astro + React** (islas) o SPA React/Vue, **TypeScript**, TanStack Query,
  cliente HTTP con `withCredentials`, y una capa `api/` que centralice endpoints, mapeo de
  DTOs y manejo de errores.
- Configura `BASE_URL` por variable de entorno (`http://localhost:8080` en dev).

---

## 6. Checklist de coordinación con el backend

1. **CORS con origen específico** (no `*`) para permitir cookies — *bloqueante*.
2. Exponer **`created_at`** en las respuestas de nota (para el plazo de 7 días en UI).
3. Exponer **`ojo`** y **`estado`** en el struct `Notas` y sus queries (campos ya en la BD).
4. Exponer **`tipo_lente`** si el servicio necesita registrar el lente intraocular.
5. Crear endpoint para **`Procedimiento_Tecnica`** cuando se implemente la UX de pasos sugeridos.
6. Documentar `GET /usuarios/me`, `PUT /usuarios/me/password` y `GET /notas/medics/export` en `ENDPOINTS.md` raíz.
7. Confirmar el **puerto/URL del frontend** (correo apunta a `:4321`).
8. Decidir si el PDF por nota queda en cliente o se necesita almacenamiento server-side.
9. Recordar que `DropDB` en cada arranque debe desactivarse antes de cualquier demo real.
