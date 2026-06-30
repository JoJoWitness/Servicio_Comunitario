package routes

import (
	"net/http"

	"server/controllers"
	"server/controllers/auth"

	"github.com/gorilla/mux"
)

func StopsRoutes() http.Handler {
	r := mux.NewRouter()

	// Protect routes to only be accesible by admins
	p := r.PathPrefix("").Subrouter()
	p.Use(auth.Admins)

	r.HandleFunc("/stops", controllers.GetAllStops).Methods("GET")
	r.HandleFunc("/stops/route/{id}", controllers.GetStopsByRoute).Methods("GET")

	p.HandleFunc("/stops", controllers.CreateStop).Methods("POST")
	p.HandleFunc("/stops/single", controllers.UpdateStop).Methods("PUT")
	p.HandleFunc("/stops/single", controllers.DeleteStop).Methods("DELETE")
	r.HandleFunc("/stops/single", controllers.GetStop).Methods("GET")

	return r
}
