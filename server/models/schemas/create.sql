BEGIN;

-- ==========================================================
--  Esquema base - Servicio de Oftalmología
--  Hospital Central de San Cristóbal, Táchira - Venezuela
-- ==========================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id          UUID PRIMARY KEY,
    correo      TEXT UNIQUE NOT NULL,
    nombres     TEXT NOT NULL,
    apellidos   TEXT NOT NULL,
    rol         TEXT NOT NULL,          -- 'admin' | 'medico' | 'secretaria'
    contrasena  TEXT NOT NULL,          -- hash bcrypt
    eliminado   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS admins (
    user_id    UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    route_id   INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    role       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pacientes (
    id                    SERIAL PRIMARY KEY,
    historia_medica       TEXT NOT NULL,
    numero_identificacion TEXT NOT NULL,
    tipo_documento        TEXT NOT NULL DEFAULT 'V',
    nombre                TEXT NOT NULL,
    genero                TEXT NOT NULL,
    fecha_nacimiento      DATE NOT NULL,
    telefono              TEXT,
    direccion             TEXT,
    eliminado             BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS notas (
    id                     SERIAL PRIMARY KEY,
    dx_pre_operatorio      TEXT,
    dx_post_operatorio     TEXT,
    intervencion_realizada TEXT,
    fecha_comienzo         DATE,
    fecha_culminacion      DATE,
    hora_comienzo          TIMESTAMPTZ,
    hora_culminacion       TIMESTAMPTZ,
    resumen_intervencion   TEXT,
    pabellon               TEXT,
    es_electiva            BOOLEAN NOT NULL DEFAULT FALSE,
    es_emergencia          BOOLEAN NOT NULL DEFAULT FALSE,
    tuvo_biopsia           BOOLEAN NOT NULL DEFAULT FALSE,
    anestia                TEXT,
    id_paciente            INTEGER REFERENCES pacientes(id) ON DELETE CASCADE,
    medico_encargado       UUID REFERENCES usuarios(id),
    eliminado              BOOLEAN NOT NULL DEFAULT FALSE,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Equipo quirúrgico: relación N:M entre notas y usuarios (médicos)
CREATE TABLE IF NOT EXISTS equipo_quirurgico (
    id         SERIAL PRIMARY KEY,
    id_nota    INTEGER REFERENCES notas(id) ON DELETE CASCADE,
    id_usuario UUID REFERENCES usuarios(id) ON DELETE CASCADE
);

END;
