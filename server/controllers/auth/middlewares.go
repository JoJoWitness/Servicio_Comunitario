package auth

import (
	"log"
	"net/http"
)

func Users(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Println("Authorizing user")
		cookie, err := r.Cookie("session_id")
		if err != nil {
			http.Error(w, "forbidden access", http.StatusUnauthorized)
			return
		}

		_, ok := LogCache.Get(cookie.Value)
		if !ok {
			cookie.MaxAge = -1
			http.SetCookie(w, cookie)
			http.Error(w, "forbidden access", http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func Admins(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("session_id")
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		session, ok := LogCache.Get(cookie.Value)
		if !ok {
			cookie.MaxAge = -1
			http.SetCookie(w, cookie)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		if session.Role == "user" {
			http.Error(w, "Unauthorized not enough privileges", http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}
