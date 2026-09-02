package config

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"sync"

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

// PlazoEdicionDiasPorDefecto es la ventana de edición de las notas cuando nadie
// configuró otra: siete días calendario contados desde el registro, incluido el
// día del registro (una nota del lunes se edita hasta el domingo).
const PlazoEdicionDiasPorDefecto = 7

var (
	plazoEdicion     int
	plazoEdicionOnce sync.Once
)

// PlazoEdicionDias devuelve la ventana de edición vigente, en días calendario.
//
// Se lee una sola vez de PLAZO_EDICION_DIAS. El valor tiene que ser un entero
// de 1 en adelante; cualquier otra cosa (vacío, texto, cero) cae al valor por
// defecto con un aviso en el log, en vez de dejar al servicio sin poder editar
// nada o editando para siempre por una variable mal escrita.
func PlazoEdicionDias() int {
	plazoEdicionOnce.Do(func() {
		plazoEdicion = PlazoEdicionDiasPorDefecto
		crudo := strings.TrimSpace(os.Getenv("PLAZO_EDICION_DIAS"))
		if crudo == "" {
			return
		}
		dias, err := strconv.Atoi(crudo)
		if err != nil || dias < 1 {
			log.Printf("PLAZO_EDICION_DIAS=%q no es un entero >= 1; se usan %d días", crudo, PlazoEdicionDiasPorDefecto)
			return
		}
		plazoEdicion = dias
	})
	return plazoEdicion
}
