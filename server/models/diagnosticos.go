package models

import (
	"context"
	"log"
	"server/config"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Diagnosticos struct {
	Id          int    `json:"id"`
	Diagnostico string `json:"diagnostico"` // columna `procedimientos` en el esquema
	Resumen     string `json:"resumen"`
}

func (u *Diagnosticos) Get(db *pgxpool.Pool) error {
	query := `
		SELECT
			procedimientos,
			resumen
		FROM "Diagnosticos"
		WHERE
		    id = @id
	`

	row := db.QueryRow(context.Background(), query, pgx.NamedArgs{"id": u.Id})
	err := row.Scan(&u.Diagnostico, &u.Resumen)
	if err != nil {
		log.Printf("Error getting diagnostico: %v\n", err)
		return err
	}

	return nil
}

func (u *Diagnosticos) Create(db *pgxpool.Pool) error {
	query := `
	INSERT INTO "Diagnosticos" 
		(procedimientos, resumen) 
	VALUES 
		(@diagnostico, @resumen);
	`
	args := pgx.NamedArgs{
		"diagnostico": u.Diagnostico,
		"resumen":     u.Resumen,
	}

	_, err := db.Exec(context.Background(), query, args)
	if err != nil {
		log.Printf("Error creating diagostico: %v\n", err)
		return err
	}

	return nil
}

func (u *Diagnosticos) Update(db *pgxpool.Pool) error {
	query := `
		UPDATE "Diagnosticos"
		SET 
			procedimientos = @diagnostico,
			resumen = @resumen
		WHERE 
			id = @id;
	`
	args := pgx.NamedArgs{
		"id":          u.Id,
		"diagnostico": u.Diagnostico,
		"resumen":     u.Resumen,
	}

	_, err := db.Exec(context.Background(), query, args)
	if err != nil {
		log.Printf("Error updating diagnostico: %v\n", err)
		return err
	}

	return nil
}

func (u *Diagnosticos) Delete(db *pgxpool.Pool) error {
	query := `
		DELETE FROM "Diagnosticos"
		WHERE 
			id = @id;
	`

	_, err := db.Exec(context.Background(), query, pgx.NamedArgs{"id": u.Id})
	if err != nil {
		log.Printf("Error deleting diagnostico: %v\n", err)
		return err
	}

	return nil
}

func GetAllDiagnosticos() ([]Diagnosticos, error) {
	query := `	
		SELECT 
			id,
			procedimientos,
			resumen
		FROM "Diagnosticos";
	`

	rows, err := config.PsqlDB.Query(context.Background(), query)
	if err != nil {
		log.Printf("Error getting all diagnosticos: %v\n", err)
		return nil, err
	}
	defer rows.Close()

	var diagnosticos []Diagnosticos
	for rows.Next() {
		var u Diagnosticos
		err := rows.Scan(&u.Id, &u.Diagnostico, &u.Resumen)
		if err != nil {
			log.Printf("Error scanning procedimientos row: %v\n", err)
			return nil, err
		}
		diagnosticos = append(diagnosticos, u)
	}

	if rows.Err() != nil {
		log.Printf("Error iterating procedimientos rows: %v\n", rows.Err())
		return nil, rows.Err()
	}

	return diagnosticos, nil
}
