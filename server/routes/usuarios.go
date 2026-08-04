package routes

import (
	"net/http"
	"server/controllers"
	"server/controllers/auth"

	"github.com/gorilla/mux"
)

func UserRoutes() http.Handler {
	r := mux.NewRouter()

	// Perfil propio. Va antes del comodín /usuarios/{id} para que "me" no se
	// interprete como un id.
	r.HandleFunc("/usuarios/me", controllers.GetUserData).Methods("GET")
	r.HandleFunc("/usuarios/me/password", auth.ChangePassword).Methods("PUT")

	// La lista de médicos la necesita cualquier usuario autenticado para armar
	// el selector de equipo quirúrgico (HU-15).
	r.HandleFunc("/usuarios", controllers.GetAllMedics).Methods("GET")

	// Gestión de cuentas: solo admin (HU-21).
	r.Handle("/usuarios", auth.Admins(http.HandlerFunc(controllers.CreateUser))).Methods("POST")
	r.Handle("/usuarios/{id}", auth.Admins(http.HandlerFunc(controllers.GetUser))).Methods("GET")
	r.Handle("/usuarios/{id}", auth.Admins(http.HandlerFunc(controllers.UpdateUser))).Methods("PUT")
	r.Handle("/usuarios/{id}", auth.Admins(http.HandlerFunc(controllers.DeleteUser))).Methods("DELETE")

	return r
}
