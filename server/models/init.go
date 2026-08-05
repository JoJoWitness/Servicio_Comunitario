package models

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

func DropDB(db *pgxpool.Pool) {
	sqlScript, err := getSqlScript("drop.sql")
	if err != nil {
		log.Fatalln("Error reading drop.sql", err)
	}
	err = runSqlScript(db, sqlScript)
	if err != nil {
		log.Fatalln("Error executing drop.sql", err)
	}
}

func InitDB(db *pgxpool.Pool) {
	sqlScript, err := getSqlScript("create.sql")
	if err != nil {
		log.Fatalln("Error reading drop.sql", err)
	}
	err = runSqlScript(db, sqlScript)
	if err != nil {
		log.Fatalln("Error executing drop.sql", err)
	}

}

// LoadSeed carga el catálogo clínico real del servicio: diagnósticos,
// procedimientos y técnicas (HU-19). A diferencia de los datos de muestra, esto
// es contenido de producción y el script es idempotente, así que volver a
// correrlo no duplica ni pisa lo que el admin haya editado (HU-20).
func LoadSeed(db *pgxpool.Pool) {
	sqlScript, err := getSqlScript("seed.sql")
	if err != nil {
		log.Fatalln("Error reading seed.sql", err)
	}
	err = runSqlScript(db, sqlScript)
	if err != nil {
		log.Fatalln("Error executing seed.sql", err)
	}
}

func LoadSampleData(db *pgxpool.Pool) {
	sqlScript, err := getSqlScript("sample_data.sql")
	if err != nil {
		log.Fatalln("Error reading sample_data.sql", err)
	}
	err = runSqlScript(db, sqlScript)
	if err != nil {
		log.Fatalln("Error executing sample_data.sql", err)
	}
}

func getSqlScript(fileName string) (string, error) {
	mydir, err := os.Getwd()
	if err != nil {
		return "", err
	}

	filepath := fmt.Sprintf("models/schemas/%s", fileName)
	path := fmt.Sprintf("%s/%s", mydir, filepath)

	sqlScript, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}

	return string(sqlScript), nil
}

func runSqlScript(db *pgxpool.Pool, sqlScript string) error {
	_, err := db.Exec(context.Background(), sqlScript)
	if err != nil {
		return err
	}
	return nil
}
