package routes

import (
	"net/http"

	"server/controllers"
	"server/controllers/auth"

	"github.com/gorilla/mux"
)

func RouteRoutes() http.Handler {
	r := mux.NewRouter()

	// Protect routes to only be accesible by admins
	p := r.PathPrefix("").Subrouter()
	p.Use(auth.Admins)

	r.HandleFunc("/routes", controllers.GetAllRoutes).Methods("GET")
	p.HandleFunc("/routes", controllers.CreateRoute).Methods("POST")
	p.HandleFunc("/routes/{id}", controllers.GetRoute).Methods("GET")
	p.HandleFunc("/routes/{id}", controllers.UpdateRoute).Methods("PUT")
	r.HandleFunc("/routes/{id}", controllers.DeleteRoute).Methods("DELETE")
	r.HandleFunc("/routes/data/{id}", controllers.GetRouteData).Methods("GET")

	return r
}
