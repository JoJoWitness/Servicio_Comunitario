# Historias de Usuario — Notas Operatorias

**Servicio de Oftalmología — Hospital Central de San Cristóbal (HCSC), Táchira**

## 1. Contexto

Después de cada operación, el médico debe redactar una **nota operatoria**: el registro de
qué paciente se operó, qué procedimiento se realizó, con qué técnica, con qué diagnóstico
pre y post operatorio, quién estuvo en el equipo quirúrgico y cómo transcurrió la
intervención.

Hoy esas notas se llevan de forma dispersa. El objetivo del sistema es que **todas las notas
del servicio vivan en un solo lugar**, se creen rápido después de quirófano y no se pierdan.

## 2. Actores

| Actor | Descripción | Alcance sobre notas |
|---|---|---|
| **Médico** (`rol = 'medico'`) | Cirujano del servicio. Opera y redacta la nota. | Ve **sus** notas (donde es médico encargado o parte del equipo quirúrgico). Puede crear, editar y eliminar. |
| **Secretaria** (`rol = 'secretaria'`) | Personal administrativo del servicio. | Ve **todas** las notas de todos los médicos. Solo lectura. |
| **Admin** (`rol = 'admin'`) | Responsable técnico / jefe de servicio. | Gestiona usuarios y catálogos. |

> El rol vive en `"Usuarios".rol` (`models/schemas/create.sql`) y admite `'admin'`, `'medico'`
> y `'secretaria'`. El **admin** puede además todo lo que puede un médico, y es el único
> exento de la regla de autoría de las notas.

### Matriz de permisos (implementada)

| Recurso | Lectura | Escritura |
|---|---|---|
| Notas — vista global del servicio | secretaria, admin | — |
| Notas — resto | cualquiera autenticado | medico, admin |
| Pacientes | cualquiera autenticado | medico, admin (borrar: solo admin) |
| Usuarios — lista de médicos | cualquiera autenticado | admin |
| Usuarios — ficha individual | admin | admin |
| Catálogos | cualquiera autenticado | admin |

Además, editar o eliminar una nota exige haber participado en esa operación. Detalle en
`server/ENDPOINTS.md`.

## 3. Épicas

- **E1** — Acceso y cuentas
- **E2** — Pacientes
- **E3** — Notas operatorias (médico)
- **E4** — Consulta y seguimiento (secretaria)
- **E5** — Catálogos clínicos (diagnósticos, procedimientos, técnicas)
- **E6** — Administración

---

## E1 — Acceso y cuentas

### HU-01 · Iniciar sesión
**Como** médico o secretaria
**quiero** entrar al sistema con mi correo y contraseña
**para** acceder solo a la información que me corresponde.

**Criterios de aceptación**
- Con credenciales válidas entro al sistema y se abre una sesión (cookie `session_id`).
- Con credenciales inválidas veo un mensaje de error y **no** entro.
- Al entrar, el sistema ya sabe mi rol y me muestra la pantalla inicial según ese rol
  (médico → "Mis notas"; secretaria → "Todas las notas").
- Si mi sesión expira o es inválida, cualquier pantalla me devuelve al login.

*Backend:* `POST /auth/login`, `GET /auth/validateUser`.

### HU-02 · Cerrar sesión
**Como** usuario del sistema
**quiero** cerrar sesión
**para** que nadie use mi cuenta en una computadora compartida del servicio.

**Criterios de aceptación**
- Al cerrar sesión la cookie se limpia y la sesión se invalida en el servidor.
- Después de cerrar sesión, volver atrás en el navegador no muestra datos de pacientes.

*Backend:* `GET|POST /auth/logout`.

### HU-03 · Registro por invitación
**Como** admin
**quiero** invitar a un médico o secretaria por correo
**para** que solo personal autorizado del servicio tenga cuenta.

**Criterios de aceptación**
- El registro **no** es abierto: requiere un token de invitación.
- La persona invitada recibe un correo con un enlace; al abrirlo y confirmar, su cuenta
  queda creada con el rol asignado.
- Un token ya usado o inexistente no permite crear cuenta.

*Backend:* `POST /auth/signup/confirmation` (paso 1) y `POST /auth/signup/{token}` (paso 2), `services/email.go`.

### HU-04 · Recuperar / cambiar contraseña
**Como** usuario
**quiero** cambiar mi contraseña
**para** mantener segura la información de los pacientes.

**Criterios de aceptación**
- Puedo cambiar mi contraseña desde mi perfil ingresando la actual.
- La contraseña se guarda siempre hasheada (bcrypt), nunca en texto plano.

*Estado:* existe `utils/hash.go` y `controllers/auth/password.go`; falta ruta expuesta.

---

## E2 — Pacientes

### HU-05 · Buscar un paciente
**Como** médico o secretaria
**quiero** buscar un paciente por cédula, historia médica o nombre
**para** encontrar rápido a quién le voy a registrar o consultar una nota.

**Criterios de aceptación**
- Busco por número de identificación, número de historia médica o nombre.
- Los resultados muestran: nombre, tipo y número de documento, historia médica, edad/fecha
  de nacimiento y género.
- Si no hay coincidencias, el sistema me ofrece **registrar un paciente nuevo** desde ahí mismo.
- Los pacientes marcados como eliminados no aparecen en la búsqueda.

*Backend:* `GET /pacientes`.

### HU-06 · Registrar un paciente nuevo
**Como** médico
**quiero** registrar un paciente que no está en el sistema
**para** poder asociarle su nota operatoria.

**Criterios de aceptación**
- Campos obligatorios: historia médica, tipo y número de documento, nombre, género y
  fecha de nacimiento. Teléfono y dirección son opcionales.
- El sistema advierte si ya existe un paciente con el mismo número de documento.
- Al guardar, vuelvo al flujo donde estaba (por ejemplo, la creación de la nota) con el
  paciente ya seleccionado.

*Backend:* `POST /pacientes`.

### HU-07 · Ver la ficha e historial de un paciente
**Como** médico o secretaria
**quiero** abrir la ficha de un paciente y ver todas sus notas operatorias
**para** conocer sus intervenciones previas antes de operar o al responder una consulta.

**Criterios de aceptación**
- La ficha muestra los datos del paciente y la lista de sus notas ordenadas de la más
  reciente a la más antigua.
- Cada ítem de la lista muestra fecha, intervención realizada, médico encargado y pabellón.
- Puedo filtrar el historial por rango de fechas.

*Backend:* `GET /notas/pacientes/{id}`, `GET /notas/pacientes/dates?id=&from=&to=`.

### HU-08 · Corregir datos de un paciente
**Como** médico
**quiero** corregir los datos de un paciente (teléfono, dirección, un nombre mal escrito)
**para** mantener el registro al día sin tocar las notas clínicas.

**Criterios de aceptación**
- Puedo editar datos demográficos y de contacto.
- Editar el paciente **no** modifica ninguna nota ya registrada.
- Dar de baja un paciente es **lógico** y queda reservado al admin.

*Backend:* `PUT /pacientes/{id}` (medico y admin), `DELETE /pacientes/{id}` (solo admin).

> La secretaria **no** escribe pacientes: fue una decisión del servicio. Si en la práctica
> le toca registrarlos antes de la cirugía, es cambiar un middleware en `routes/pacientes.go`.

---

## E3 — Notas operatorias (médico)

> Épica central del sistema.

### HU-09 · Crear una nota operatoria
**Como** médico
**quiero** registrar la nota operatoria justo después de la cirugía
**para** que quede constancia del procedimiento sin depender de papeles sueltos.

**Criterios de aceptación**
- Selecciono (o registro) al paciente antes de llenar la nota.
- La nota captura:
  - Diagnóstico **pre**operatorio y diagnóstico **post**operatorio
  - Intervención realizada (procedimiento) y técnica utilizada
  - Fecha y hora de **inicio** y de **culminación**
  - Pabellón / quirófano
  - Tipo de intervención: **electiva** o **emergencia**
  - Si hubo **biopsia**
  - Tipo de **anestesia**
  - **Resumen** de la intervención (texto libre)
  - **Equipo quirúrgico**: uno o varios médicos del servicio
- El **médico encargado** se toma de mi sesión por defecto; puedo cambiarlo si operó otro.
- Campos mínimos para guardar: paciente, diagnóstico preoperatorio, intervención realizada
  y fecha de la operación.
- El sistema valida que la hora de culminación no sea anterior a la de inicio.
- Al guardar veo confirmación y la nota aparece de inmediato en "Mis notas".

*Backend:* `POST /notas`.

### HU-10 · No perder una nota a medio escribir
**Como** médico
**quiero** que el formulario conserve lo que escribí si se corta la luz o se cierra el navegador
**para** no rehacer la nota completa.

**Criterios de aceptación**
- El formulario guarda un borrador local automáticamente mientras escribo.
- Al volver a abrir, el sistema me ofrece recuperar el borrador.
- Un borrador no cuenta como nota registrada y no lo ve nadie más.

*Estado:* **sin implementar** — es puramente de frontend, que todavía no existe.
*Prioridad:* alta para la aceptación de los médicos (la queja es justamente "que queden sin problema").

### HU-11 · Ver mis notas
**Como** médico
**quiero** ver la lista de todas las notas en las que participé
**para** revisar mi actividad quirúrgica.

**Criterios de aceptación**
- Veo las notas donde soy **médico encargado** y también aquellas donde formo parte del
  **equipo quirúrgico**.
- La lista está ordenada de la más reciente a la más antigua y muestra fecha, paciente,
  intervención y pabellón.
- Puedo filtrar por rango de fechas.
- No veo notas de operaciones en las que no participé.

*Backend:* `GET /notas/medics`, `GET /notas/medics/dates?from=&to=`.

### HU-12 · Ver el detalle de una nota
**Como** médico o secretaria
**quiero** abrir una nota y ver todos sus campos
**para** consultarla íntegra cuando la necesito.

**Criterios de aceptación**
- Se muestran todos los campos de la nota, los datos del paciente y el equipo quirúrgico completo.
- La vista de detalle es de solo lectura hasta que pulso "Editar".

*Backend:* `GET /notas/{id}`.

### HU-13 · Editar una nota
**Como** médico
**quiero** corregir una nota que acabo de registrar
**para** arreglar un error de transcripción sin crear una nota duplicada.

**Criterios de aceptación**
- Solo puedo editar notas en las que participé.
- **Regla vigente:** se puede editar una nota dentro de los **7 días calendario**
  siguientes a su registro. Pasado ese plazo, el botón "Editar" aparece deshabilitado con
  una explicación clara, y el servidor responde `403` aunque se intente por API.
- Al guardar, veo confirmación y los cambios se reflejan en la lista.

*Backend:* `PUT /notas/{id}`, que valida `created_at` contra `notas.PlazoEdicionDias`.

### HU-14 · Eliminar una nota
**Como** médico
**quiero** eliminar una nota creada por error
**para** que no quede un registro equivocado en el historial del paciente.

**Criterios de aceptación**
- El sistema pide confirmación explícita antes de eliminar.
- Aplica la misma regla: solo notas dentro de los 7 días siguientes a su registro.
- La eliminación es **lógica** (`eliminado = true`): la nota y su equipo quirúrgico
  permanecen en la base de datos, pero desaparecen de toda consulta (`404`). Una edición
  posterior no la resucita.

*Backend:* `DELETE /notas/{id}`.

### HU-15 · Registrar el equipo quirúrgico
**Como** médico
**quiero** indicar qué colegas participaron en la operación
**para** que la nota refleje quién estuvo en quirófano y ellos también la vean.

**Criterios de aceptación**
- Puedo agregar uno o varios médicos del servicio como equipo quirúrgico.
- Los médicos agregados ven esa nota en "Mis notas" (HU-11).
- El médico encargado no se duplica dentro del equipo.

*Backend:* campo `equipo` (lista de UUID) en `POST`/`PUT /notas`.

---

## E4 — Consulta y seguimiento (secretaria)

### HU-16 · Ver todas las notas del servicio
**Como** secretaria
**quiero** ver las notas operatorias de todos los médicos
**para** llevar el control administrativo del servicio.

**Criterios de aceptación**
- Veo una lista con las notas de **todos** los médicos.
- Puedo filtrar por médico, por paciente y por rango de fechas.
- La vista es de **solo lectura**: no aparecen las acciones de crear, editar ni eliminar.
- Si intento entrar por URL directa a una pantalla de edición, el sistema me lo impide.

*Backend:* `GET /notas` (secretaria y admin), con filtros `?medico=&paciente=&from=&to=`.

### HU-17 · Buscar una nota concreta
**Como** secretaria
**quiero** buscar por paciente, cédula, fecha o médico
**para** ubicar rápido una nota cuando alguien la solicita.

**Criterios de aceptación**
- La búsqueda combina filtros (por ejemplo: médico + rango de fechas).
- Los resultados enlazan al detalle de la nota (HU-12).

*Backend:* los filtros de `GET /notas` ya lo cubren; falta la pantalla.

### HU-18 · Resumen de actividad del servicio
**Como** secretaria o jefe de servicio
**quiero** ver cuántas operaciones se hicieron en un período, por médico y por tipo
(electiva / emergencia)
**para** preparar los reportes del servicio.

**Criterios de aceptación**
- Elijo un rango de fechas y veo totales: operaciones por médico, electivas vs. emergencias,
  y con/sin biopsia.
- *Por confirmar con el servicio:* si además se necesita exportar ese resumen.

*Estado:* **sin implementar.** Hoy se puede aproximar contando sobre `GET /notas` con
filtros, pero falta un endpoint de agregados.

---

## E5 — Catálogos clínicos

### HU-19 · Elegir diagnóstico, procedimiento y técnica de una lista
**Como** médico
**quiero** seleccionar el diagnóstico, el procedimiento y la técnica de listas predefinidas
**para** escribir más rápido y que los registros del servicio sean uniformes.

**Criterios de aceptación**
- Los campos ofrecen autocompletado sobre los catálogos existentes.
- Si lo que necesito no está en la lista, puedo escribirlo como texto libre.

*Backend:* `GET /diagnosticos`, `GET /procedimientos`, `GET /tecnicas` (tablas
`"Diagnosticos"`, `"Procedimientos"` e `"Intervencion"`), sembrados con los diagnósticos,
procedimientos y técnicas que usa el servicio.
*Estado:* la nota guarda estos valores como **texto libre**; el catálogo solo autocompleta.

### HU-20 · Mantener los catálogos
**Como** admin
**quiero** agregar, editar y eliminar diagnósticos, procedimientos y técnicas
**para** que los catálogos se mantengan al día con la práctica del servicio.

**Criterios de aceptación**
- Puedo crear, editar y eliminar entradas de cada catálogo.
- Editar una entrada del catálogo **no** cambia lo escrito en notas ya registradas.
- El médico **no** edita catálogos: si le falta un diagnóstico, lo escribe como texto libre
  en la nota (HU-19) y lo pide al admin.

*Backend:* CRUD completo en `/diagnosticos`, `/procedimientos`, `/tecnicas`, restringido a admin.

> Fue una decisión del servicio. Si en la práctica trabar al médico resulta incómodo,
> ampliarlo a médicos es cambiar `auth.Admins` por `auth.Medicos` en tres archivos de rutas.

---

## E6 — Administración

### HU-21 · Gestionar usuarios
**Como** admin
**quiero** ver, crear, editar y desactivar cuentas de médicos y secretarias
**para** controlar quién accede al sistema.

**Criterios de aceptación**
- Veo la lista de usuarios con su rol.
- Puedo cambiar el rol de un usuario.
- Desactivar un usuario es **lógico** (`eliminado = true`): no puede iniciar sesión, pero
  sus notas siguen existiendo y siguen mostrando su nombre.

*Backend:* CRUD en `/usuarios`.

### HU-22 · Los datos de pacientes solo los ve quien debe
**Como** jefe del servicio
**quiero** que el acceso esté restringido por rol y por sesión
**para** proteger la información clínica de los pacientes.

**Criterios de aceptación**
- Ningún endpoint devuelve datos sin sesión válida.
- Un médico no puede leer ni modificar notas de operaciones en las que no participó.
- Una secretaria puede leer todo, pero no puede crear, editar ni eliminar nada clínico.
- Las restricciones se aplican en el **servidor**, no solo ocultando botones en la interfaz.

*Backend:* `auth.RequireRoles` en las rutas + `notas.EsParticipante` para la autoría de cada nota.

---

## 4. Flujo principal (el que hay que hacer impecable)

```
Médico sale de quirófano
        │
        ▼
  Login (HU-01)
        │
        ▼
  "Nueva nota"  →  buscar paciente (HU-05)
        │                │
        │                └─ no existe → registrarlo (HU-06)
        ▼
  Llenar la nota (HU-09) ── autoguardado de borrador (HU-10)
        │
        ▼
  Agregar equipo quirúrgico (HU-15)
        │
        ▼
  Guardar  →  aparece en "Mis notas" (HU-11)
        │
        ▼
  ¿Error de transcripción? → editar dentro de 7 días (HU-13)
```

En paralelo, la secretaria entra y ve **todas** las notas del servicio (HU-16), filtra y consulta.

