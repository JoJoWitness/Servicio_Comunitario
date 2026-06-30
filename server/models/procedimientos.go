package models

import (
	"context"
	"log"
	"server/config"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Procedimientos struct {
	Id           int    `json:"id"`
	Intervencion string `json:"intervencion"`
	Resumen      string `json:"resumen"`
}

func (u *Procedimientos) Get(db *pgxpool.Pool) error {
	query := `
		SELECT 
			intervencion,
			resumen
		FROM 
		    Procedimientos 
		WHERE 
		    id = @id
	`

	_, err := db.Exec(context.Background(), query, pgx.NamedArgs{"id": u.Id})
	if err != nil {
		log.Printf("Error getting intervencion: %v\n", err)
		return err
	}

	return nil
}

func (u *Procedimientos) Create(db *pgxpool.Pool) error {
	query := `
	INSERT INTO Procedimientos 
		(intervencion, resumen) 
	VALUES 
		(@intervencion, @resumen);
	`
	args := pgx.NamedArgs{
		"intervencion": u.Intervencion,
		"resumen":      u.Resumen,
	}

	_, err := db.Exec(context.Background(), query, args)
	if err != nil {
		log.Printf("Error creating intervencion: %v\n", err)
		return err
	}

	return nil
}

func (u *Procedimientos) Update(db *pgxpool.Pool) error {
	query := `
		UPDATE 
			Procedimientos
		SET 
			intervencion = @intervencion,
			resumen = @resumen
		WHERE 
			id = @id;
	`
	args := pgx.NamedArgs{
		"id":           u.Id,
		"intervencion": u.Intervencion,
		"resumen":      u.Resumen,
	}

	_, err := db.Exec(context.Background(), query, args)
	if err != nil {
		log.Printf("Error updating intervencion: %v\n", err)
		return err
	}

	return nil
}

func (u *Procedimientos) Delete(db *pgxpool.Pool) error {
	query := `
		DELETE FROM
			Procedimientos
		WHERE 
			id = @id;
	`

	_, err := db.Exec(context.Background(), query, pgx.NamedArgs{"id": u.Id})
	if err != nil {
		log.Printf("Error deleting intervencion: %v\n", err)
		return err
	}

	return nil
}

func GetAllProcedimientos() ([]Procedimientos, error) {
	query := `	
		SELECT 
			id,
			intervencion,
			resumen
		FROM 
		    procedimientos;
	`

	rows, err := config.PsqlDB.Query(context.Background(), query)
	if err != nil {
		log.Printf("Error getting all procedimientos: %v\n", err)
		return nil, err
	}
	defer rows.Close()

	var procedimientos []Procedimientos
	for rows.Next() {
		var u Procedimientos
		err := rows.Scan(&u.Id, &u.Intervencion, &u.Resumen)
		if err != nil {
			log.Printf("Error scanning procedimiento row: %v\n", err)
			return nil, err
		}
		procedimientos = append(procedimientos, u)
	}

	if rows.Err() != nil {
		log.Printf("Error iterating procedimiento rows: %v\n", rows.Err())
		return nil, rows.Err()
	}

	return procedimientos, nil
}
