package models

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"

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

// LoadSampleData carga las cuentas, pacientes, notas y biopsias de prueba
// sobre una base recién creada, y encima los descriptores de la solicitud de
// biopsia. Es el arranque de desarrollo.
func LoadSampleData(db *pgxpool.Pool) {
	ejecutarOMorir(db, "sample_data.sql")
	ejecutarOMorir(db, "sample_data_descriptores.sql")
}

// LoadSampleDataIdempotente deja los datos de prueba al día en una base que
// puede tenerlos ya (el servidor de pruebas desplegado, que no se reconstruye
// en cada arranque):
//   - sin la cuenta admin de prueba, carga sample_data.sql entero;
//   - con ella, aplica la segunda tanda si todavía no está (su propio guardián
//     la rechaza cuando ya se cargó, y eso no es un error);
//   - en ambos casos, corre los UPDATE de los descriptores, que son repetibles.
//
// Nunca borra: para eso está el modo desarrollo.
func LoadSampleDataIdempotente(db *pgxpool.Pool) {
	var hayCuentas bool
	err := db.QueryRow(context.Background(),
		`SELECT EXISTS (SELECT 1 FROM "Usuarios" WHERE correo = 'ryuk@test.com');`).Scan(&hayCuentas)
	if err != nil {
		log.Fatalln("Error comprobando los datos de prueba", err)
	}

	if !hayCuentas {
		log.Println("Datos de prueba: base sin cuentas de prueba, se carga sample_data.sql")
		ejecutarOMorir(db, "sample_data.sql")
	} else {
		sqlScript, err := getSqlScript("sample_data_segunda_tanda.sql")
		if err != nil {
			log.Fatalln("Error reading sample_data_segunda_tanda.sql", err)
		}
		switch err := runSqlScript(db, sqlScript); {
		case err == nil:
			log.Println("Datos de prueba: segunda tanda de biopsias cargada")
		case strings.Contains(err.Error(), "ya está cargada"):
			log.Println("Datos de prueba: la segunda tanda ya estaba cargada")
		default:
			log.Fatalln("Error executing sample_data_segunda_tanda.sql", err)
		}
	}

	ejecutarOMorir(db, "sample_data_descriptores.sql")
	log.Println("Datos de prueba al día")
}

func ejecutarOMorir(db *pgxpool.Pool, fileName string) {
	sqlScript, err := getSqlScript(fileName)
	if err != nil {
		log.Fatalln("Error reading "+fileName, err)
	}
	if err := runSqlScript(db, sqlScript); err != nil {
		log.Fatalln("Error executing "+fileName, err)
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
