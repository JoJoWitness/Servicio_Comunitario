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

	r.HandleFunc("/usuarios", controllers.GetAllMedics).Methods("GET")
	r.HandleFunc("/usuarios", controllers.CreateUser).Methods("POST")
	r.HandleFunc("/usuarios/{id}", controllers.GetUser).Methods("GET")
	r.HandleFunc("/usuarios/{id}", controllers.UpdateUser).Methods("PUT")
	r.HandleFunc("/usuarios/{id}", controllers.DeleteUser).Methods("DELETE")

	return r
}
