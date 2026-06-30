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
	if os.Getenv("ENVIRONMENT") != "PROD" {
		err := godotenv.Load(".env")
		if err != nil {
			log.Fatal("Error loading .env file")
		}
	}

	config.InitDB()

	models.DropDB(config.PsqlDB)
	models.InitDB(config.PsqlDB)
	models.LoadSampleData(config.PsqlDB)

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
