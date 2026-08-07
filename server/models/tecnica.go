package models

import (
	"context"
	"encoding/json"
	"log"
	"server/config"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Hueco es un valor que cambia de una cirugía a otra dentro de la frase de una
// técnica: la hora del reloj, el número de puntos, el calibre. La pantalla los
// pide al médico y sustituye cada `{nombre}` de la frase por lo que responda.
type Hueco struct {
	Nombre  string `json:"nombre"`
	Default string `json:"default"`
}

type Tecnica struct {
	Id      int    `json:"id"`
	Tecnica string `json:"tecnica"`
	// Lo que esta técnica aporta al resumen de la nota. El nombre corto no
	// sirve para redactar: "Apertura de puerto principal" es la etiqueta,
	// "se abre puerto principal en H{hora}" es lo que se escribe.
	Frase  string  `json:"frase"`
	Huecos []Hueco `json:"huecos"`
}

// scanHuecos convierte el JSONB de la columna `huecos` en la lista tipada.
// La columna admite NULL y las consultas la normalizan a '[]', así que basta
// con tratar el vacío como "sin huecos".
func scanHuecos(raw []byte, destino *[]Hueco) error {
	if len(raw) == 0 {
		*destino = nil
		return nil
	}
	if err := json.Unmarshal(raw, destino); err != nil {
		log.Printf("Error decoding huecos: %v\n", err)
		return err
	}
	return nil
}

// huecosParaGuardar serializa los huecos al formato de la columna JSONB.
func (u *Tecnica) huecosParaGuardar() ([]byte, error) {
	if len(u.Huecos) == 0 {
		return []byte("[]"), nil
	}
	raw, err := json.Marshal(u.Huecos)
	if err != nil {
		log.Printf("Error encoding huecos: %v\n", err)
		return nil, err
	}
	return raw, nil
}

func (u *Tecnica) Get(db *pgxpool.Pool) error {
	query := `
		SELECT
			tecnica,
			COALESCE(frase, ''),
			COALESCE(huecos, '[]'::jsonb)
		FROM "Intervencion"
		WHERE
		    id = @id
	`

	var huecos []byte
	row := db.QueryRow(context.Background(), query, pgx.NamedArgs{"id": u.Id})
	err := row.Scan(&u.Tecnica, &u.Frase, &huecos)
	if err != nil {
		log.Printf("Error getting technique: %v\n", err)
		return err
	}

	return scanHuecos(huecos, &u.Huecos)
}

func (u *Tecnica) Create(db *pgxpool.Pool) error {
	query := `
	INSERT INTO "Intervencion"
		(tecnica, frase, huecos)
	VALUES
		(@tecnica, @frase, @huecos);
	`

	huecos, err := u.huecosParaGuardar()
	if err != nil {
		return err
	}

	args := pgx.NamedArgs{
		"tecnica": u.Tecnica,
		"frase":   u.Frase,
		"huecos":  huecos,
	}

	_, err = db.Exec(context.Background(), query, args)
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
			tecnica = @tecnica,
			frase = @frase,
			huecos = @huecos
		WHERE
			id = @id;
	`

	huecos, err := u.huecosParaGuardar()
	if err != nil {
		return err
	}

	args := pgx.NamedArgs{
		"id":      u.Id,
		"tecnica": u.Tecnica,
		"frase":   u.Frase,
		"huecos":  huecos,
	}

	_, err = db.Exec(context.Background(), query, args)
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
			tecnica,
			COALESCE(frase, ''),
			COALESCE(huecos, '[]'::jsonb)
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
		var huecos []byte
		err := rows.Scan(&u.Id, &u.Tecnica, &u.Frase, &huecos)
		if err != nil {
			log.Printf("Error scanning tecnica row: %v\n", err)
			return nil, err
		}
		if err := scanHuecos(huecos, &u.Huecos); err != nil {
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
