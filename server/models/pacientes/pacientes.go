package pacientes

import (
	"context"
	"errors"
	"log"
	"server/config"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func (u *Pacientes) Get(db *pgxpool.Pool) error {
	if u.ID == "" && u.Historia_Medica == "" {
		return errors.New("ID or Medical History must be provided to retrieve a patient")
	}

	query := `
		SELECT
		    id,
		    historia_medica,
			numero_identificacion,
		    nombre,
			genero,
			fecha_nacimiento,
			telefono,
			direccion,
			eliminado
		FROM
		    pacientes
		WHERE TRUE
	`

	args := pgx.NamedArgs{}

	if u.ID != "" {
		query += " AND id = @id"
		args["id"] = u.ID
	} else if u.Historia_Medica != "" {
		query += " AND historia_medica = @historia_medica"
		args["historia_medica"] = u.Historia_Medica
	}

	row := db.QueryRow(context.Background(), query, args)
	err := row.Scan(&u.ID, &u.Historia_Medica, &u.Numero_Indentificacion, &u.Nombre, &u.Genero, &u.Fecha_Nacimiento, &u.Telefono, &u.Direccion, &u.Eliminado)
	if err != nil {
		log.Printf("Error scanning pacientes: %v", err)
		return err
	}
	return nil
}

func (u *Pacientes) Create(db *pgxpool.Pool) error {
	query := `
		INSERT INTO pacientes 
			(historia_medica, numero_identificacion, nombre, genero, fecha_nacimiento, telefono, direccion, eliminado) 
		VALUES 
			(@historia_medica, @numero_identificacion, @nombre, @genero, @fecha_nacimiento, @telefono, @direccion, @eliminado)
	`

	args := pgx.NamedArgs{
		"historia_medica":       u.Historia_Medica,
		"numero_identificacion": u.Numero_Indentificacion,
		"nombre":                u.Nombre,
		"genero":                u.Genero,
		"fecha_nacimiento":      u.Fecha_Nacimiento,
		"telefono":              u.Telefono,
		"direccion":             u.Direccion,
		"eliminado":             u.Eliminado,
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
		UPDATE 
			pacientes
		SET 
			historia_medica = @historia_medica,
			numero_identificacion = @numero_identificacion,
			nombre = @nombre,
			genero = @genero,
			fecha_nacimiento = @fecha_nacimiento,
			telefono = @telefono,
			direccion = @direccion
		WHERE 
			id = @id;
	`
	args := pgx.NamedArgs{
		"id":                    u.ID,
		"historia_medica":       u.Historia_Medica,
		"numero_identificacion": u.Numero_Indentificacion,
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
		UPDATE 
			pacientes
		SET 
			eliminado = TRUE 
		WHERE 
			id = @id;
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
		SELECT 
			id,
			historia_medica,
			numero_identificacion,
			nombre,
			genero,
			fecha_nacimiento,
			telefono,
			direccion
		FROM 
			pacientes
		WHERE
			eliminado = FALSE;
	`
	rows, err := config.PsqlDB.Query(context.Background(), query)
	if err != nil {
		log.Printf("\n\nError getting pacientes: %v", err)
		return nil, err
	}
	defer rows.Close()

	var pacientes []Pacientes
	for rows.Next() {
		var paciente Pacientes

		err := rows.Scan(&paciente.ID, &paciente.Historia_Medica, &paciente.Numero_Indentificacion, &paciente.Nombre, &paciente.Genero, &paciente.Fecha_Nacimiento, &paciente.Telefono, &paciente.Direccion)
		if err != nil {
			log.Printf("Error scanning paciente: %v", paciente)
			log.Printf("Error fetching pacientes: %v", err)
			return pacientes, err
		}
		pacientes = append(pacientes, paciente)
	}

	return pacientes, nil
}
