package routes

import (
	"net/http"
	"server/controllers"
	"server/controllers/auth"

	"github.com/gorilla/mux"
)

func UserRoutes() http.Handler {
	r := mux.NewRouter()

	p := r.PathPrefix("").Subrouter()
	p.Use(auth.Admins)

	r.HandleFunc("/usuarios/id/{id}", controllers.GetUser).Methods("GET") // TODO: retrieve data from session
	r.HandleFunc("/usuarios", controllers.CreateUser).Methods("POST")
	r.HandleFunc("/usuarios", controllers.UpdateUser).Methods("PUT")
	r.HandleFunc("/usuarios", controllers.DeleteUser).Methods("DELETE")
	r.HandleFunc("/usuarios", controllers.GetAllMedics).Methods("GET") //TODO Discuss if this is necessary

	return r
}
