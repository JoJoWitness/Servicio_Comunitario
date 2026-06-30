package routes

import (
	"net/http"

	"server/controllers"
	"server/controllers/auth"

	"github.com/gorilla/mux"
)

func UnitsRoutes() http.Handler {
	r := mux.NewRouter()
	// Protect routes to only be accesible by admins
	p := r.PathPrefix("").Subrouter()
	p.Use(auth.Admins)

	r.HandleFunc("/units", controllers.GetAllUnits).Methods("GET")
	p.HandleFunc("/units", controllers.CreateStop).Methods("POST")
	p.HandleFunc("/units/{id}", controllers.UpdateStop).Methods("PUT")
	p.HandleFunc("/units/{id}", controllers.DeleteStop).Methods("DELETE")
	r.HandleFunc("/units/{id}", controllers.GetUnit).Methods("GET")

	return r
}
