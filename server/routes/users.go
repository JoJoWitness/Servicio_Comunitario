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

	r.HandleFunc("/users/data", controllers.GetUserData).Methods("GET")
	p.HandleFunc("/users/coordinators", controllers.GetCoordinators).Methods("GET")
	p.HandleFunc("/users/coordinators", controllers.SetCoordinator).Methods("POST")
	p.HandleFunc("/users/coordinators/{id}", controllers.RemoveCoordinator).Methods("DELETE")
	r.HandleFunc("/users/preferences", controllers.GetUserPreferences).Methods("GET")
	r.HandleFunc("/users/preferences", controllers.UpdateUserPreferences).Methods("PUT")

	// r.HandleFunc("/users/id/{id}", controllers.GetUser).Methods("GET") // TODO: retrieve data from session
	r.HandleFunc("/users", controllers.UpdateUser).Methods("PUT")
	r.HandleFunc("/users", controllers.DeleteUser).Methods("DELETE")
	r.HandleFunc("/users", controllers.GetAllUsers).Methods("GET") //TODO Discuss if this is necessary

	return r
}
