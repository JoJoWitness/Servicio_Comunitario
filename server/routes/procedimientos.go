package routes

import (
	"net/http"
	"server/controllers"
	"server/controllers/auth"

	"github.com/gorilla/mux"
)

func ProcedimientosRoutes() http.Handler {
	r := mux.NewRouter()

	p := r.PathPrefix("").Subrouter()
	p.Use(auth.Admins)

	r.HandleFunc("/procedimientos", controllers.GetAllProcedimientos).Methods("GET")
	r.HandleFunc("/procedimientos", controllers.CreateProcedimiento).Methods("POST")
	r.HandleFunc("/procedimientos/{id}", controllers.GetProcedimiento).Methods("GET")
	r.HandleFunc("/procedimientos/{id}", controllers.UpdateProcedimiento).Methods("PUT")
	r.HandleFunc("/procedimientos/{id}", controllers.DeleteProcedimiento).Methods("DELETE")

	return r
}
