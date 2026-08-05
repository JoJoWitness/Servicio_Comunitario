package routes

import (
	"net/http"
	"server/controllers"
	"server/controllers/auth"

	"github.com/gorilla/mux"
)

func NotasRoutes() http.Handler {
	r := mux.NewRouter()

	// auth.Users ya se aplica al subrouter `api` en routes.Init, así que toda
	// ruta de aquí exige sesión. Lo que se envuelve abajo es el permiso por rol.

	// Rutas específicas primero (antes del comodín /notas/{id})

	// Lectura clínica: cualquier usuario autenticado. El médico consulta el
	// historial del paciente antes de operar (HU-07) y la secretaria responde
	// consultas (HU-17); /notas/medics ya se filtra sola por la sesión (HU-11).
	// Exportación del record quirúrgico: cada médico baja el suyo en .xlsx, con
	// el rango de fechas que elija. El handler se ata a la sesión, así que la
	// ruta no necesita más permiso que estar autenticado; solo el admin puede
	// pedir el de otro médico con ?medico=.
	r.HandleFunc("/notas/medics/export", controllers.ExportNotasMedico).Methods("GET")
	r.HandleFunc("/notas/medics/dates", controllers.GetNotasFromMedicDates).Methods("GET")
	r.HandleFunc("/notas/medics", controllers.GetNotasFromMedic).Methods("GET")
	r.HandleFunc("/notas/pacientes/dates", controllers.GetNotasFromPacienteDates).Methods("GET")
	r.HandleFunc("/notas/pacientes/{id}", controllers.GetNotasFromPaciente).Methods("GET")

	// Vista global del servicio: secretaria y admin (HU-16).
	r.Handle("/notas", auth.Secretarias(http.HandlerFunc(controllers.GetAllNotas))).Methods("GET")

	// Escritura: solo médicos. Además, UpdateNota y DeleteNota verifican que el
	// médico haya participado en la nota (HU-22).
	r.Handle("/notas", auth.Medicos(http.HandlerFunc(controllers.CreateNota))).Methods("POST")

	r.HandleFunc("/notas/{id}", controllers.GetNota).Methods("GET")
	r.Handle("/notas/{id}", auth.Medicos(http.HandlerFunc(controllers.UpdateNota))).Methods("PUT")
	r.Handle("/notas/{id}", auth.Medicos(http.HandlerFunc(controllers.DeleteNota))).Methods("DELETE")

	return r
}
