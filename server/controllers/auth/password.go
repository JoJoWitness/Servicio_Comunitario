package auth

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"server/config"
	models "server/models/usuarios"
	"server/utils"

	"golang.org/x/crypto/bcrypt"
)

// LargoMinimoContrasena es el mínimo que se le exige a una contraseña nueva.
const LargoMinimoContrasena = 8

// CambioContrasena es el cuerpo de PUT /usuarios/me/password.
type CambioContrasena struct {
	Actual string `json:"contrasena_actual"`
	Nueva  string `json:"contrasena_nueva"`
}

// ChangePassword cambia la contraseña del usuario de la sesión, exigiéndole la
// actual (HU-04). No sirve para cambiarle la contraseña a otro: para eso está
// PUT /usuarios/{id}, que es de admin.
func ChangePassword(w http.ResponseWriter, r *http.Request) {
	session, err := GetSessionCookie(w, r)
	if err != nil {
		http.Error(w, "Unable to get user info", http.StatusUnauthorized)
		return
	}

	var cambio CambioContrasena
	if err := json.NewDecoder(r.Body).Decode(&cambio); err != nil {
		log.Printf("Error decoding request body: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Request body is not valid JSON"))
		return
	}

	if len(cambio.Nueva) < LargoMinimoContrasena {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "la contrasena nueva debe tener al menos %d caracteres", LargoMinimoContrasena)
		return
	}

	if cambio.Nueva == cambio.Actual {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("la contrasena nueva debe ser distinta de la actual"))
		return
	}

	var user models.Usuarios
	user.ID = session.UserID
	if err := user.Get(config.PsqlDB); err != nil {
		log.Printf("Error getting user to change password: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get user"))
		return
	}

	// La cuenta pudo darse de baja con la sesión ya abierta.
	if user.Eliminado {
		revocarSesiones(session.UserID, "")
		ClearSessionCookie(w)
		http.Error(w, "la cuenta esta dada de baja", http.StatusUnauthorized)
		return
	}

	// La actual tiene que coincidir: si alguien deja la sesión abierta, no le
	// puede cambiar la contraseña a su dueño.
	if err := bcrypt.CompareHashAndPassword([]byte(user.Contrasena), []byte(cambio.Actual)); err != nil {
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte("la contrasena actual no es correcta"))
		return
	}

	hash, err := utils.HashPassword(cambio.Nueva)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Something went wrong"))
		return
	}

	if err := user.UpdateContrasena(config.PsqlDB, hash); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to update password"))
		return
	}

	// Las demás sesiones del usuario quedan invalidadas: si la contraseña se
	// cambió porque alguien más la sabía, esa sesión debe caerse. La actual
	// sobrevive para no echar de la aplicación a quien acaba de cambiarla.
	revocarSesiones(session.UserID, tokenDe(r))

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("contrasena actualizada"))
}

// tokenDe devuelve el token de sesión de la petición, o "" si no trae cookie.
func tokenDe(r *http.Request) string {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		return ""
	}
	return cookie.Value
}

// revocarSesiones borra de la caché las sesiones del usuario, salvo `excepto`.
// Con `excepto` vacío las borra todas.
func revocarSesiones(userID string, excepto string) {
	for _, token := range LogCache.Keys() {
		if token == excepto {
			continue
		}
		if s, ok := LogCache.Peek(token); ok && s.UserID == userID {
			LogCache.Remove(token)
		}
	}
}
