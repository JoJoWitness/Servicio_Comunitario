BEGIN;
    DROP TABLE IF EXISTS public."Equipo_Quirurgico" CASCADE;
    DROP TABLE IF EXISTS public."Nota_Operatoria" CASCADE;
    DROP TABLE IF EXISTS public."Diagnosticos" CASCADE;
    DROP TABLE IF EXISTS public."Procedimientos" CASCADE;
    DROP TABLE IF EXISTS public."Intervencion" CASCADE;
    DROP TABLE IF EXISTS public."Usuarios" CASCADE;
    DROP TABLE IF EXISTS public."Paciente" CASCADE;
END;