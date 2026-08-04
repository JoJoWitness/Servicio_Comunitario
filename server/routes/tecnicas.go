package routes

import (
	"net/http"
	"server/controllers"
	"server/controllers/auth"

	"github.com/gorilla/mux"
)

func TecnicasRoutes() http.Handler {
	r := mux.NewRouter()

	// Lectura: el catálogo alimenta el autocompletado de la nota (HU-19).
	r.HandleFunc("/tecnicas", controllers.GetAllTecnicas).Methods("GET")
	r.HandleFunc("/tecnicas/{id}", controllers.GetTecnica).Methods("GET")

	// Mantenimiento del catálogo: solo admin (HU-20).
	r.Handle("/tecnicas", auth.Admins(http.HandlerFunc(controllers.CreateTecnica))).Methods("POST")
	r.Handle("/tecnicas/{id}", auth.Admins(http.HandlerFunc(controllers.UpdateTecnica))).Methods("PUT")
	r.Handle("/tecnicas/{id}", auth.Admins(http.HandlerFunc(controllers.DeleteTecnica))).Methods("DELETE")

	return r
}
