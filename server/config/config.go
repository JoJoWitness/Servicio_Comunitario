package config

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5/pgxpool"
)

var PsqlDB *pgxpool.Pool

func InitDB() {
	dbURL := os.Getenv("DATABASE_URI")
	if dbURL == "" {
		log.Fatal("DATABASE_URI environment variable is not set")
	}

	dbPool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to create connection pool: %v\n", err)
		os.Exit(1)
	}

	if err := dbPool.Ping(context.Background()); err != nil {
		log.Fatalf("Unable to ping database: %v", err)
	}
	log.Println("Successfully connected to database!")

	PsqlDB = dbPool
}

var WsUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// configure CORS
}
