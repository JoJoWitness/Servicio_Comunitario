package routes

import (
	"net/http"
	"server/controllers"
	"server/controllers/auth"

	"github.com/gorilla/mux"
)

func TecnicasRoutes() http.Handler {
	r := mux.NewRouter()

	p := r.PathPrefix("").Subrouter()
	p.Use(auth.Admins)

	r.HandleFunc("/tecnicas", controllers.GetAllTecnicas).Methods("GET")
	r.HandleFunc("/tecnicas", controllers.CreateTecnica).Methods("POST")
	r.HandleFunc("/tecnicas/{id}", controllers.GetTecnica).Methods("GET")
	r.HandleFunc("/tecnicas/{id}", controllers.UpdateTecnica).Methods("PUT")
	r.HandleFunc("/tecnicas/{id}", controllers.DeleteTecnica).Methods("DELETE")

	return r
}
