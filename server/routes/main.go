package routes

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"server/controllers/auth"

	"github.com/gorilla/mux"
)

func Init(router *mux.Router) {
	api := router.PathPrefix("").Subrouter()
	authentication := router.PathPrefix("/auth/").Subrouter()

	//Middlewares
	router.Use(corsMiddleware)
	api.Use(auth.Users)

	// Authentication routes
	authentication.HandleFunc("/login", auth.Login)
	authentication.HandleFunc("/signup/{token}", auth.SignUp).Methods("POST")
	authentication.HandleFunc("/validateUser", auth.ValidateSession)
	authentication.HandleFunc("/logout", auth.Logout)

	// Rest API routes
	api.PathPrefix("/usuarios").Handler(UserRoutes())
	api.PathPrefix("/pacientes").Handler(PacientesRoutes())
	api.PathPrefix("/notas").Handler(NotasRoutes())
	api.PathPrefix("/diagnosticos").Handler(DiagnosticosRoutes())
	api.PathPrefix("/procedimientos").Handler(ProcedimientosRoutes())
	api.PathPrefix("/tecnicas").Handler(TecnicasRoutes())
	api.PathPrefix("/sync").Handler(SyncRoutes())

	// Health check
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		log.Println("ok")
		fmt.Fprintln(w, "Ryuk is the best dog!")
	})

	// Stream check //TODO: Upgrade websocket health check
	router.HandleFunc("/stream", func(w http.ResponseWriter, r *http.Request) {
		ticker := time.NewTicker(2 * time.Second)
		defer ticker.Stop()

		for range ticker.C {
			fmt.Printf("\nHello, world! %v", time.Now())
		}
	})
}

// origenesPorDefecto son los orígenes desde los que se usa la aplicación cuando
// nadie configuró nada: los de desarrollo y los dos que estrena la WebView de
// Tauri, que cambian según el sistema operativo.
var origenesPorDefecto = []string{
	"tauri://localhost",       // binario de escritorio en Linux y macOS
	"http://tauri.localhost",  // binario de escritorio en Windows
	"https://tauri.localhost", // ídem, cuando la WebView sirve por https
	"http://localhost:4321",   // vite dev (ver frontend/vite.config.ts)
	"http://localhost:1420",
	"http://localhost:5173",
}

// origenPermitido decide si se le entrega la autorización con credenciales a
// quien está preguntando.
//
// La lista se configura con ALLOWED_ORIGINS (separada por comas) y se suma a la
// de por defecto. El valor "*" abre la puerta a cualquiera: sirve para depurar,
// pero en producción deja la cookie de sesión al alcance de cualquier página que
// el médico tenga abierta.
func origenPermitido(origen string) bool {
	permitidos := append([]string{}, origenesPorDefecto...)
	if extra := os.Getenv("ALLOWED_ORIGINS"); extra != "" {
		for o := range strings.SplitSeq(extra, ",") {
			if o = strings.TrimSpace(o); o != "" {
				permitidos = append(permitidos, o)
			}
		}
	}

	for _, permitido := range permitidos {
		if permitido == "*" || strings.EqualFold(permitido, origen) {
			return true
		}
	}
	return false
}

// corsMiddleware autoriza al frontend a llamar a la API desde otro origen.
//
// La sesión viaja en cookie, así que el navegador manda `credentials: include`
// y eso restringe lo que se puede responder: con `Allow-Credentials: true`, el
// comodín `*` en `Allow-Origin` es ilegal y el navegador descarta la respuesta
// entera. Hay que devolver el origen concreto que pidió, y avisar con `Vary`
// que la respuesta cambia según quién pregunte para que ninguna caché
// intermedia le sirva a un origen la autorización de otro.
//
// Esto importa especialmente en la app de escritorio: la WebView de Tauri no
// pide desde `http://localhost` sino desde `tauri://localhost` (o
// `http://tauri.localhost` en Windows), y sin reflejar ese origen no hay una
// sola petición autenticada que funcione desde el binario.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if origen := r.Header.Get("Origin"); origen != "" {
			// Solo se autoriza a los orígenes conocidos. Reflejar cualquiera
			// sería dejar que un sitio cualquiera use la cookie del médico
			// desde su navegador para escribir en la historia clínica.
			if origenPermitido(origen) {
				w.Header().Set("Access-Control-Allow-Origin", origen)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
			}
			w.Header().Add("Vary", "Origin")
		} else {
			// Sin Origin no hay navegador de por medio (curl, health checks
			// del hosting): no hay nada que autorizar ni cookie que proteger.
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, hx-request, hx-current-url")
		// El nombre del archivo de las descargas (.xlsx) viaja aquí; sin
		// exponerlo, el navegador se lo oculta al frontend.
		w.Header().Set("Access-Control-Expose-Headers", "Content-Disposition")
		w.Header().Set("Access-Control-Max-Age", "86400")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
