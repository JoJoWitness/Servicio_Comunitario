package models

import (
	"context"
	"log"
	"server/config"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Tecnica struct {
	Id      int    `json:"id"`
	Tecnica string `json:"tecnica"`
}

func (u *Tecnica) Get(db *pgxpool.Pool) error {
	query := `
		SELECT
			"Intervencion"
		FROM "Intervencion"
		WHERE
		    id = @id
	`

	row := db.QueryRow(context.Background(), query, pgx.NamedArgs{"id": u.Id})
	err := row.Scan(&u.Tecnica)
	if err != nil {
		log.Printf("Error getting technique: %v\n", err)
		return err
	}

	return nil
}

func (u *Tecnica) Create(db *pgxpool.Pool) error {
	query := `
	INSERT INTO "Intervencion" 
		(tecnica) 
	VALUES 
		(@tecnica);
	`
	args := pgx.NamedArgs{
		"tecnica": u.Tecnica,
	}

	_, err := db.Exec(context.Background(), query, args)
	if err != nil {
		log.Printf("Error creating technique: %v\n", err)
		return err
	}

	return nil
}

func (u *Tecnica) Update(db *pgxpool.Pool) error {
	query := `
		UPDATE "Intervencion"
		SET
			tecnica = @tecnica
		WHERE
			id = @id;
	`
	args := pgx.NamedArgs{
		"id":      u.Id,
		"tecnica": u.Tecnica,
	}

	_, err := db.Exec(context.Background(), query, args)
	if err != nil {
		log.Printf("Error updating technique: %v\n", err)
		return err
	}

	return nil
}

func (u *Tecnica) Delete(db *pgxpool.Pool) error {
	query := `
		DELETE FROM "Intervencion"
		WHERE 
			id = @id;
	`

	_, err := db.Exec(context.Background(), query, pgx.NamedArgs{"id": u.Id})
	if err != nil {
		log.Printf("Error deleting technique: %v\n", err)
		return err
	}

	return nil
}

func GetAllTecnicas() ([]Tecnica, error) {
	query := `	
		SELECT 
			id,
			"Intervencion"
		FROM "Intervencion";
	`

	rows, err := config.PsqlDB.Query(context.Background(), query)
	if err != nil {
		log.Printf("Error getting all tecnicas: %v\n", err)
		return nil, err
	}
	defer rows.Close()

	var tecnicas []Tecnica
	for rows.Next() {
		var u Tecnica
		err := rows.Scan(&u.Id, &u.Tecnica)
		if err != nil {
			log.Printf("Error scanning tecnica row: %v\n", err)
			return nil, err
		}
		tecnicas = append(tecnicas, u)
	}

	if rows.Err() != nil {
		log.Printf("Error iterating tecnica rows: %v\n", rows.Err())
		return nil, rows.Err()
	}

	return tecnicas, nil
}
