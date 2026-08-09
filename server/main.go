package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"server/config"
	"server/models"
	"server/routes"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

func main() {
	// Sin ENVIRONMENT=PROD se asume desarrollo: las variables salen del .env y
	// la base se reconstruye desde cero en cada arranque.
	enProduccion := os.Getenv("ENVIRONMENT") == "PROD"

	if !enProduccion {
		err := godotenv.Load(".env")
		if err != nil {
			log.Fatal("Error loading .env file")
		}
	}

	config.InitDB()

	// Empezar de cero es una comodidad de desarrollo, no algo que se le pueda
	// hacer a la base del servicio: ahí viven las cuentas y las notas
	// operatorias, que son historia clínica. En producción no se borra nada.
	if !enProduccion {
		log.Println("Modo desarrollo: se reconstruye la base desde cero")
		models.DropDB(config.PsqlDB)
	}

	// El esquema sí se aplica siempre: create.sql es idempotente (CREATE TABLE
	// IF NOT EXISTS más las alteraciones repetibles), y es lo que lleva las
	// columnas nuevas a una base ya desplegada.
	models.InitDB(config.PsqlDB)

	// El catálogo clínico es contenido de producción y su script tampoco
	// duplica ni pisa lo que el admin haya editado (HU-20).
	models.LoadSeed(config.PsqlDB)

	// Los datos de muestra son cuentas y pacientes inventados, con contraseñas
	// conocidas: no tienen nada que hacer en el servidor real.
	if !enProduccion {
		models.LoadSampleData(config.PsqlDB)
	}

	router := mux.NewRouter()
	routes.Init(router)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:         ":" + port,
		WriteTimeout: time.Second * 15,
		ReadTimeout:  time.Second * 15,
		IdleTimeout:  time.Second * 60,
		Handler:      router,
	}

	if err := srv.ListenAndServe(); err != nil {
		fmt.Println(err)
	}
}
