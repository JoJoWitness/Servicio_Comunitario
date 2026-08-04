package auth

import (
	"log"
	"net/http"
)

// Roles válidos de usuarios.rol (ver models/schemas/create.sql).
const (
	RolAdmin      = "admin"
	RolMedico     = "medico"
	RolSecretaria = "secretaria"
)

// session valida la cookie y devuelve la sesión activa. Si la cookie falta o ya
// no está en caché, limpia la cookie del navegador y responde 401.
func session(w http.ResponseWriter, r *http.Request) (*Session, bool) {
	cookie, err := r.Cookie("session_id")
	if err != nil {
		http.Error(w, "forbidden access", http.StatusUnauthorized)
		return nil, false
	}

	s, ok := LogCache.Get(cookie.Value)
	if !ok {
		cookie.MaxAge = -1
		http.SetCookie(w, cookie)
		http.Error(w, "forbidden access", http.StatusUnauthorized)
		return nil, false
	}

	return s, true
}

// Users exige una sesión válida, sin importar el rol.
func Users(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Println("Authorizing user")
		if _, ok := session(w, r); !ok {
			return
		}

		next.ServeHTTP(w, r)
	})
}

// RequireRoles exige una sesión válida cuyo rol esté entre los permitidos.
// Devuelve 401 si no hay sesión y 403 si la sesión existe pero el rol no alcanza.
func RequireRoles(roles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			s, ok := session(w, r)
			if !ok {
				return
			}

			for _, rol := range roles {
				if s.Role == rol {
					next.ServeHTTP(w, r)
					return
				}
			}

			log.Printf("Rol %q sin permiso para %s %s", s.Role, r.Method, r.URL.Path)
			http.Error(w, "forbidden, not enough privileges", http.StatusForbidden)
		})
	}
}

// Admins restringe la gestión de usuarios y catálogos a administradores.
func Admins(next http.Handler) http.Handler {
	return RequireRoles(RolAdmin)(next)
}

// Medicos restringe la escritura clínica (notas y pacientes) al personal médico.
// La secretaria queda fuera: solo consulta (HU-16).
func Medicos(next http.Handler) http.Handler {
	return RequireRoles(RolMedico, RolAdmin)(next)
}

// Secretarias restringe la vista global del servicio, que el médico no necesita
// porque tiene la suya en /notas/medics (HU-16).
func Secretarias(next http.Handler) http.Handler {
	return RequireRoles(RolSecretaria, RolAdmin)(next)
}
