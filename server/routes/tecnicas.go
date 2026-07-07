package routes

import (
	"net/http"
	"server/controllers"
	"server/controllers/auth"

	"github.com/gorilla/mux"
)

func TecnicasRoutes() http.Handler {
	r := mux.NewRouter()

	p := r.PathPrefix("").Subrouter()
	p.Use(auth.Admins)

	r.HandleFunc("/tecnicas/{id}", controllers.GetTecnica).Methods("GET") // TODO: retrieve data from session
	r.HandleFunc("/tecnicas", controllers.CreateTecnica).Methods("POST")
	r.HandleFunc("/tecnicas", controllers.UpdateTecnica).Methods("PUT")
	r.HandleFunc("/tecnicas", controllers.DeleteTecnica).Methods("DELETE")
	r.HandleFunc("/tecnicas", controllers.GetAllTecnicas).Methods("GET") //TODO Discuss if this is necessary

	return r
}
