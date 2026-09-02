package routes

import (
	"net/http"
	"server/controllers"
	"server/controllers/auth"

	"github.com/gorilla/mux"
)

// BiopsiasRoutes expone las biopsias (PRD 0.5.0).
//
// Lectura para cualquier autenticado. Crear y dar de baja son escritura
// clínica (médicos y admin). PUT queda abierto a toda sesión porque la
// secretaria puede registrar el envío y el resultado; el handler acota qué
// campos y qué transiciones le corresponden a cada rol.
func BiopsiasRoutes() http.Handler {
	r := mux.NewRouter()

	r.HandleFunc("/biopsias", controllers.GetAllBiopsias).Methods("GET")
	r.Handle("/biopsias", auth.Medicos(http.HandlerFunc(controllers.CreateBiopsia))).Methods("POST")
	r.HandleFunc("/biopsias/{id}", controllers.GetBiopsia).Methods("GET")
	r.HandleFunc("/biopsias/{id}", controllers.UpdateBiopsia).Methods("PUT")
	r.Handle("/biopsias/{id}", auth.Medicos(http.HandlerFunc(controllers.DeleteBiopsia))).Methods("DELETE")

	return r
}
