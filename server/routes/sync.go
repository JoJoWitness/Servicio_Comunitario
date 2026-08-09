package routes

import (
	"net/http"
	"server/controllers"
	"server/controllers/auth"

	"github.com/gorilla/mux"
)

// SyncRoutes expone la subida del trabajo redactado sin conexión.
//
// Es escritura clínica, así que pide los mismos permisos que crear una nota a
// mano: solo médicos y admin. La secretaria consulta, no redacta (HU-16).
func SyncRoutes() http.Handler {
	r := mux.NewRouter()

	r.Handle("/sync", auth.Medicos(http.HandlerFunc(controllers.SyncPendientes))).Methods("POST")

	return r
}
