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

func ClearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    "", // Clear the value
		HttpOnly: true,
		Secure:   false, // TODO: Must match the SessionCookie setting
		SameSite: http.SameSiteStrictMode,
		Path:     "/",
		Expires:  time.Now().Add(-time.Hour),
	})
}
