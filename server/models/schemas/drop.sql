BEGIN;
    DROP TABLE IF EXISTS "Equipo_Quirurgico" CASCADE;
    DROP TABLE IF EXISTS "Nota_Operatoria" CASCADE;
    DROP TABLE IF EXISTS "Paciente" CASCADE;
    DROP TABLE IF EXISTS "Usuarios" CASCADE;
    DROP TABLE IF EXISTS "Procedimientos" CASCADE;
    DROP TABLE IF EXISTS "Diagnosticos" CASCADE;
    DROP TABLE IF EXISTS "Intervencion" CASCADE;

    -- Esquema anterior (minúsculas). Se dejan para que una base ya creada con
    -- la versión vieja quede limpia al migrar.
    DROP TABLE IF EXISTS equipo_quirurgico CASCADE;
    DROP TABLE IF EXISTS notas CASCADE;
    DROP TABLE IF EXISTS admins CASCADE;
    DROP TABLE IF EXISTS pacientes CASCADE;
    DROP TABLE IF EXISTS usuarios CASCADE;
END;
