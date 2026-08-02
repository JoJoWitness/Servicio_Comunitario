package routes

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"server/controllers/auth"

	"github.com/gorilla/mux"
)

func Init(router *mux.Router) {
	api := router.PathPrefix("").Subrouter()
	authentication := router.PathPrefix("/auth/").Subrouter()

	//Middlewares
	router.Use(corsMiddleware)
	api.Use(auth.Users)

	// Authentication routes
	authentication.HandleFunc("/login", auth.Login)
	authentication.HandleFunc("/signup/{token}", auth.SignUp).Methods("POST")
	authentication.HandleFunc("/validateUser", auth.ValidateSession)
	authentication.HandleFunc("/logout", auth.Logout)

	// Rest API routes
	api.PathPrefix("/usuarios").Handler(UserRoutes())
	api.PathPrefix("/pacientes").Handler(PacientesRoutes())
	api.PathPrefix("/notas").Handler(NotasRoutes())
	api.PathPrefix("/diagnosticos").Handler(DiagnosticosRoutes())
	api.PathPrefix("/procedimientos").Handler(ProcedimientosRoutes())
	api.PathPrefix("/tecnicas").Handler(TecnicasRoutes())

	// Health check
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		log.Println("ok")
		fmt.Fprintln(w, "Ryuk is the best dog!")
	})

	// Stream check //TODO: Upgrade websocket health check
	router.HandleFunc("/stream", func(w http.ResponseWriter, r *http.Request) {
		ticker := time.NewTicker(2 * time.Second)
		defer ticker.Stop()

		for range ticker.C {
			fmt.Printf("\nHello, world! %v", time.Now())
		}
	})
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, hx-request, hx-current-url")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Max-Age", "86400")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
