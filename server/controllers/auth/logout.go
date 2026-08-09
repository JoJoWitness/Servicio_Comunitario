package auth

import (
	"log"
	"net/http"
	"time"
)

func Logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		ClearSessionCookie(w)
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Logout successful (no active session cookie found)"))
		return
	}

	token := cookie.Value

	// Remove the session from the server cache
	if LogCache.Remove(token) {
		log.Printf("Session token removed from cache: %s...", token[:8])
	} else {
		log.Printf("Attempted to remove non-existent session token: %s...", token[:8])
	}

	// Clear the cookie in the user's browser
	ClearSessionCookie(w)

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Logout successful"))
}

// ClearSessionCookie borra la cookie del navegador. Los atributos tienen que
// ser los mismos con los que se creó (PlantillaCookie) o el navegador la trata
// como otra cookie distinta y deja viva la original.
func ClearSessionCookie(w http.ResponseWriter) {
	cookie := PlantillaCookie()
	cookie.Value = ""
	cookie.Expires = time.Now().Add(-time.Hour)
	http.SetCookie(w, cookie)
}
