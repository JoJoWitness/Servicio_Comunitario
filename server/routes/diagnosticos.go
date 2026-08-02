package routes

import (
	"net/http"
	"server/controllers"
	"server/controllers/auth"

	"github.com/gorilla/mux"
)

func DiagnosticosRoutes() http.Handler {
	r := mux.NewRouter()

	p := r.PathPrefix("").Subrouter()
	p.Use(auth.Admins)

	r.HandleFunc("/diagnosticos", controllers.GetAllDiagnosticos).Methods("GET")
	r.HandleFunc("/diagnosticos", controllers.CreateDiagnostico).Methods("POST")
	r.HandleFunc("/diagnosticos/{id}", controllers.GetDiagnostico).Methods("GET")
	r.HandleFunc("/diagnosticos/{id}", controllers.UpdateDiagnostico).Methods("PUT")
	r.HandleFunc("/diagnosticos/{id}", controllers.DeleteDiagnostico).Methods("DELETE")

	return r
}
