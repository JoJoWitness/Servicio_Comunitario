package routes

import (
	"net/http"
	"server/controllers"
	"server/controllers/auth"

	"github.com/gorilla/mux"
)

func DiagnosticosRoutes() http.Handler {
	r := mux.NewRouter()

	// Lectura: el catálogo alimenta el autocompletado de la nota (HU-19).
	r.HandleFunc("/diagnosticos", controllers.GetAllDiagnosticos).Methods("GET")
	r.HandleFunc("/diagnosticos/{id}", controllers.GetDiagnostico).Methods("GET")

	// Mantenimiento del catálogo: solo admin (HU-20).
	r.Handle("/diagnosticos", auth.Admins(http.HandlerFunc(controllers.CreateDiagnostico))).Methods("POST")
	r.Handle("/diagnosticos/{id}", auth.Admins(http.HandlerFunc(controllers.UpdateDiagnostico))).Methods("PUT")
	r.Handle("/diagnosticos/{id}", auth.Admins(http.HandlerFunc(controllers.DeleteDiagnostico))).Methods("DELETE")

	return r
}
