package routes

import (
	"net/http"
	"server/controllers"
	"server/controllers/auth"

	"github.com/gorilla/mux"
)

func ProcedimientosRoutes() http.Handler {
	r := mux.NewRouter()

	// Lectura: el catálogo alimenta el autocompletado de la nota (HU-19).
	r.HandleFunc("/procedimientos", controllers.GetAllProcedimientos).Methods("GET")
	r.HandleFunc("/procedimientos/{id}", controllers.GetProcedimiento).Methods("GET")

	// Mantenimiento del catálogo: solo admin (HU-20).
	r.Handle("/procedimientos", auth.Admins(http.HandlerFunc(controllers.CreateProcedimiento))).Methods("POST")
	r.Handle("/procedimientos/{id}", auth.Admins(http.HandlerFunc(controllers.UpdateProcedimiento))).Methods("PUT")
	r.Handle("/procedimientos/{id}", auth.Admins(http.HandlerFunc(controllers.DeleteProcedimiento))).Methods("DELETE")

	return r
}
