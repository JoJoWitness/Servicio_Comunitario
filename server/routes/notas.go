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

	// Rutas específicas primero (antes del comodín /notas/{id})
	r.HandleFunc("/notas/medics/dates", controllers.GetNotasFromMedicDates).Methods("GET")
	r.HandleFunc("/notas/medics", controllers.GetNotasFromMedic).Methods("GET")
	r.HandleFunc("/notas/pacientes/dates", controllers.GetNotasFromPacienteDates).Methods("GET")
	r.HandleFunc("/notas/pacientes/{id}", controllers.GetNotasFromPaciente).Methods("GET")

	r.HandleFunc("/notas", controllers.CreateNota).Methods("POST")
	r.HandleFunc("/notas/{id}", controllers.GetNota).Methods("GET")
	r.HandleFunc("/notas/{id}", controllers.UpdateNota).Methods("PUT")
	r.HandleFunc("/notas/{id}", controllers.DeleteNota).Methods("DELETE")

	return r
}
