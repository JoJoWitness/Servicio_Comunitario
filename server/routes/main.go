package routes

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"server/controllers"
	"server/controllers/auth"
	tracking "server/controllers/ws"

	"github.com/gorilla/mux"
)

func Init(router *mux.Router) {
	api := router.PathPrefix("").Subrouter()
	ws := router.PathPrefix("/ws").Subrouter()
	authentication := router.PathPrefix("/auth/").Subrouter()

	//Middlewares
	router.Use(corsMiddleware)
	api.Use(auth.Users)

	// Authentication routes
	authentication.HandleFunc("/login", auth.Login)
	authentication.HandleFunc("/signup/{token}", auth.SignUp).Methods("POST")
	authentication.HandleFunc("/validateUser", auth.ValidateSession)
	// authentication.HandleFunc("/logout", auth.Logout) //TODO

	// Rest API routes
	api.PathPrefix("/users").Handler(UserRoutes())      //Done (1)
	api.PathPrefix("/routes").Handler(RouteRoutes())    //Done
	api.PathPrefix("/units").Handler(UnitsRoutes())     //Done
	api.PathPrefix("/records").Handler(RecordsRoutes()) //Done (1)
	api.PathPrefix("/stops").Handler(StopsRoutes())     //Done

	// Websocket routes
	hub := tracking.NewHub()
	go hub.Run()
	ws.Handle("/token", auth.Users(http.HandlerFunc(controllers.TokenWebsocket)))
	ws.HandleFunc("/tracking/{token}", func(w http.ResponseWriter, r *http.Request) {
		tracking.ServerWs(hub, w, r)
	})

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
