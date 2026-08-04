package pacientes

import (
	"context"
	"errors"
	"log"
	"server/config"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// columnas de "Paciente", en el orden en que las escanean Get y GetAllPacientes.
// Ojo con dos nombres del esquema: la cédula es `numero_identifiacion` (con el
// typo) y el teléfono es `numero_telefono`.
const columnas = `
	id,
	historia_medica,
	numero_identifiacion,
	tipo_documento,
	nombre,
	genero,
	fecha_nacimiento,
	numero_telefono,
	direccion,
	eliminado
`

func (u *Pacientes) Get(db *pgxpool.Pool) error {
	if u.ID == "" && u.Historia_Medica == "" {
		return errors.New("ID or Medical History must be provided to retrieve a patient")
	}

	query := `
		SELECT ` + columnas + `
		FROM "Paciente"
		WHERE eliminado = FALSE
	`

	args := pgx.NamedArgs{}

	if u.ID != "" {
		// Como texto para que un UUID mal formado no aborte la consulta.
		query += " AND id::text = @id"
		args["id"] = u.ID
	} else if u.Historia_Medica != "" {
		query += " AND historia_medica = @historia_medica"
		args["historia_medica"] = u.Historia_Medica
	}

	row := db.QueryRow(context.Background(), query, args)
	err := row.Scan(&u.ID, &u.Historia_Medica, &u.Numero_Indentificacion, &u.Tipo_Documento, &u.Nombre, &u.Genero, &u.Fecha_Nacimiento, &u.Telefono, &u.Direccion, &u.Eliminado)
	if err != nil {
		log.Printf("Error scanning pacientes: %v", err)
		return err
	}
	return nil
}

func (u *Pacientes) Create(db *pgxpool.Pool) error {
	// El id es UUID y la tabla no lo genera sola: lo pone el servidor.
	if u.ID == "" {
		id, err := uuid.NewV7()
		if err != nil {
			log.Printf("Error generating paciente id: %v\n", err)
			return err
		}
		u.ID = id.String()
	}

	// `eliminado` no se escribe: la baja es exclusiva de Delete.
	query := `
		INSERT INTO "Paciente"
			(id, historia_medica, numero_identifiacion, tipo_documento, nombre, genero, fecha_nacimiento, numero_telefono, direccion)
		VALUES
			(@id, @historia_medica, @numero_identificacion, @tipo_documento, @nombre, @genero, @fecha_nacimiento, @telefono, @direccion)
	`

	args := pgx.NamedArgs{
		"id":                    u.ID,
		"historia_medica":       u.Historia_Medica,
		"numero_identificacion": u.Numero_Indentificacion,
		"tipo_documento":        u.Tipo_Documento,
		"nombre":                u.Nombre,
		"genero":                u.Genero,
		"fecha_nacimiento":      u.Fecha_Nacimiento,
		"telefono":              u.Telefono,
		"direccion":             u.Direccion,
	}

	_, err := db.Exec(context.Background(), query, args)
	if err != nil {
		log.Printf("Error creating paciente: %v\n", err)
		return err
	}

	return nil
}

func (u *Pacientes) Update(db *pgxpool.Pool) error {
	query := `
		UPDATE "Paciente"
		SET
			historia_medica = @historia_medica,
			numero_identifiacion = @numero_identificacion,
			tipo_documento = @tipo_documento,
			nombre = @nombre,
			genero = @genero,
			fecha_nacimiento = @fecha_nacimiento,
			numero_telefono = @telefono,
			direccion = @direccion
		WHERE
			id::text = @id
			AND eliminado = FALSE;
	`
	args := pgx.NamedArgs{
		"id":                    u.ID,
		"historia_medica":       u.Historia_Medica,
		"numero_identificacion": u.Numero_Indentificacion,
		"tipo_documento":        u.Tipo_Documento,
		"nombre":                u.Nombre,
		"genero":                u.Genero,
		"fecha_nacimiento":      u.Fecha_Nacimiento,
		"telefono":              u.Telefono,
		"direccion":             u.Direccion,
	}

	_, err := db.Exec(context.Background(), query, args)
	if err != nil {
		log.Printf("Error updating paciente: %v\n", err)
		return err
	}

	return nil
}

func (u *Pacientes) Delete(db *pgxpool.Pool) error {
	query := `
		UPDATE "Paciente"
		SET
			eliminado = TRUE
		WHERE
			id::text = @id;
	`

	_, err := db.Exec(context.Background(), query, pgx.NamedArgs{"id": u.ID})
	if err != nil {
		log.Printf("Error deleting paciente: %v\n", err)
		return err
	}

	return nil
}

func GetAllPacientes() ([]Pacientes, error) {
	query := `
		SELECT ` + columnas + `
		FROM "Paciente"
		WHERE eliminado = FALSE
		ORDER BY nombre;
	`
	rows, err := config.PsqlDB.Query(context.Background(), query)
	if err != nil {
		log.Printf("\n\nError getting pacientes: %v", err)
		return nil, err
	}
	defer rows.Close()

	pacientes := []Pacientes{}
	for rows.Next() {
		var paciente Pacientes

		err := rows.Scan(&paciente.ID, &paciente.Historia_Medica, &paciente.Numero_Indentificacion, &paciente.Tipo_Documento, &paciente.Nombre, &paciente.Genero, &paciente.Fecha_Nacimiento, &paciente.Telefono, &paciente.Direccion, &paciente.Eliminado)
		if err != nil {
			log.Printf("Error scanning paciente: %v", paciente)
			log.Printf("Error fetching pacientes: %v", err)
			return pacientes, err
		}
		pacientes = append(pacientes, paciente)
	}

	return pacientes, rows.Err()
}
