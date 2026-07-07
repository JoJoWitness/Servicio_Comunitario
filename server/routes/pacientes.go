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

	r.HandleFunc("/pacientes/id/{id}", controllers.GetPaciente).Methods("GET") // TODO: retrieve data from session
	r.HandleFunc("/pacientes", controllers.CreatePaciente).Methods("POST")
	r.HandleFunc("/pacientes", controllers.UpdatePaciente).Methods("PUT")
	r.HandleFunc("/pacientes", controllers.DeletePaciente).Methods("DELETE")
	r.HandleFunc("/pacientes", controllers.GetAllPacientes).Methods("GET") //TODO Discuss if this is necessary

	return r
}
