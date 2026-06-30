package auth

import (
	"net/http"
)

func ValidateSession(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	_, ok := LogCache.Get(cookie.Value)
	if !ok {
		cookie.MaxAge = -1
		http.SetCookie(w, cookie)
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	w.WriteHeader(http.StatusOK)
}
