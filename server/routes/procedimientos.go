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

	r.HandleFunc("/procedimientos/{id}", controllers.GetProcedimiento).Methods("GET") // TODO: retrieve data from session
	r.HandleFunc("/procedimientos", controllers.CreateProcedimiento).Methods("POST")
	r.HandleFunc("/procedimientos", controllers.UpdateProcedimiento).Methods("PUT")
	r.HandleFunc("/procedimientos", controllers.DeleteProcedimiento).Methods("DELETE")
	r.HandleFunc("/procedimientos", controllers.GetAllProcedimientos).Methods("GET") //TODO Discuss if this is necessary

	return r
}
