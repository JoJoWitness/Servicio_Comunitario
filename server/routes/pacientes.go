package routes

import (
	"net/http"
	"server/controllers"
	"server/controllers/auth"

	"github.com/gorilla/mux"
)

func PacientesRoutes() http.Handler {
	r := mux.NewRouter()

	p := r.PathPrefix("").Subrouter()
	p.Use(auth.Admins)

	r.HandleFunc("/pacientes", controllers.GetAllPacientes).Methods("GET")
	r.HandleFunc("/pacientes", controllers.CreatePaciente).Methods("POST")
	r.HandleFunc("/pacientes/{id}", controllers.GetPaciente).Methods("GET")
	r.HandleFunc("/pacientes/{id}", controllers.UpdatePaciente).Methods("PUT")
	r.HandleFunc("/pacientes/{id}", controllers.DeletePaciente).Methods("DELETE")

	return r
}
