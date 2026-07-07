package routes

import (
	"net/http"
	"server/controllers"
	"server/controllers/auth"

	"github.com/gorilla/mux"
)

func NotasRoutes() http.Handler {
	r := mux.NewRouter()

	p := r.PathPrefix("").Subrouter()
	p.Use(auth.Admins)

	r.HandleFunc("/notas/{id}", controllers.GetNota).Methods("GET")
	r.HandleFunc("/notas", controllers.CreateNota).Methods("POST")
	r.HandleFunc("/notas", controllers.UpdateNota).Methods("PUT")
	r.HandleFunc("/notas", controllers.DeleteNota).Methods("DELETE")

	r.HandleFunc("/notas/medics", controllers.GetNotasFromMedic).Methods("GET")
	r.HandleFunc("/notas/medics/dates", controllers.GetNotasFromMedicDates).Methods("GET")
	r.HandleFunc("/notas/pacientes", controllers.GetNotasFromPaciente).Methods("GET")
	r.HandleFunc("/notas/pacientes/dates", controllers.GetNotasFromPacienteDates).Methods("GET")

	return r
}
