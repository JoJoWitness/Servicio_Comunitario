package auth

import (
	"net/http"
)

func GetSessionCookie(w http.ResponseWriter, r *http.Request) (*Session, error) {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		return nil, err
	}

	session, ok := LogCache.Get(cookie.Value)
	if !ok {
		return nil, err
	}

	return session, nil
}
