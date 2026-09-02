package routes

import (
	"net/http"
	"server/controllers"
	"server/controllers/auth"

	"github.com/gorilla/mux"
)

func PacientesRoutes() http.Handler {
	r := mux.NewRouter()

	// Imagen de la cédula: se ve con sesión, se cambia con permiso de escritura
	// clínica. Va antes del comodín /pacientes/{id}.
	r.HandleFunc("/pacientes/{id}/cedula", controllers.GetCedula).Methods("GET")
	r.HandleFunc("/pacientes/{id}/biopsias", controllers.GetBiopsiasDePaciente).Methods("GET")
	r.Handle("/pacientes/{id}/cedula", auth.Medicos(http.HandlerFunc(controllers.PutCedula))).Methods("PUT")
	r.Handle("/pacientes/{id}/cedula", auth.Medicos(http.HandlerFunc(controllers.DeleteCedula))).Methods("DELETE")

	// Lectura: cualquier usuario autenticado necesita buscar al paciente (HU-05).
	r.HandleFunc("/pacientes", controllers.GetAllPacientes).Methods("GET")
	r.HandleFunc("/pacientes/{id}", controllers.GetPaciente).Methods("GET")

	// Escritura: solo médicos. La secretaria consulta, no modifica.
	r.Handle("/pacientes", auth.Medicos(http.HandlerFunc(controllers.CreatePaciente))).Methods("POST")
	r.Handle("/pacientes/{id}", auth.Medicos(http.HandlerFunc(controllers.UpdatePaciente))).Methods("PUT")
	r.Handle("/pacientes/{id}", auth.Admins(http.HandlerFunc(controllers.DeletePaciente))).Methods("DELETE")

	return r
}
