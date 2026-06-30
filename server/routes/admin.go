package routes

import (
	"net/http"

	"github.com/gorilla/mux"
)

func AdminRoutes() http.Handler {
	r := mux.NewRouter()

	// r.HandleFunc("/users/coordinators/{route_id}", controllers.GetCoordinatorsByRoute).Methods("GET")
	// r.HandleFunc("/users/coordinators", controllers.GetAllAdmins).Methods("GET")
	return r
}
