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

	r.HandleFunc("/diagnosticos/{id}", controllers.GetDiagnostico).Methods("GET")
	r.HandleFunc("/diagnosticos", controllers.CreateDiagnostico).Methods("POST")
	r.HandleFunc("/diagnosticos", controllers.UpdateDiagnostico).Methods("PUT")
	r.HandleFunc("/diagnosticos", controllers.DeleteDiagnostico).Methods("DELETE")
	r.HandleFunc("/diagnosticos", controllers.GetAllDiagnosticos).Methods("GET") //TODO Discuss if this is necessary

	return r
}
