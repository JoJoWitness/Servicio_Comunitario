package controllers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"server/config"
	"server/controllers/auth"
	notas2 "server/models/notas"
	"server/models/pagination"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5"
)

func GetNota(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("param {:id} must be an integer"))
		return
	}

	var nota notas2.Notas
	nota.ID = id
	err = nota.Get(config.PsqlDB)
	if err != nil {
		// Una nota dada de baja tampoco se puede leer: para el cliente no existe.
		if errors.Is(err, pgx.ErrNoRows) {
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte("nota no encontrada"))
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get nota"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "200")
	json.NewEncoder(w).Encode(nota)
}

// GetAllNotas devuelve las notas de todo el servicio paginadas. Es la vista de
// la secretaria (HU-16); admite ?medico=&paciente=&from=&to=&page=&size=&sortBy=&order=
func GetAllNotas(w http.ResponseWriter, r *http.Request) {
	filtro, err := filtroDesdeQuery(r)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(err.Error()))
		return
	}

	allowedSort := map[string]string{
		"fecha_comienzo": "n.fecha_comienzo",
		"pabellon":       "n.pabellon",
		"id":             "n.id",
	}
	p := parsePaginationParams(r, allowedSort, "n.fecha_comienzo")

	notas, total, err := notas2.GetAllNotasPaged(config.PsqlDB, filtro, p)
	if err != nil {
		log.Printf("Error getting notas: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get notas"))
		return
	}

	meta := pagination.NewMeta(total, p)
	resp := struct {
		Data []notas2.Notas `json:"data"`
		Meta pagination.Meta `json:"meta"`
	}{Data: notas, Meta: meta}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "200")
	json.NewEncoder(w).Encode(resp)
}

// filtroDesdeQuery arma el filtro a partir del query string. Las fechas se
// aceptan como YYYY-MM-DD o RFC3339.
func filtroDesdeQuery(r *http.Request) (notas2.FiltroNotas, error) {
	var filtro notas2.FiltroNotas
	query := r.URL.Query()

	filtro.MedicoID = query.Get("medico")

	filtro.PacienteID = query.Get("paciente")

	from, err := parseFecha(query.Get("from"))
	if err != nil {
		return filtro, errors.New("el parametro 'from' debe ser una fecha YYYY-MM-DD o RFC3339")
	}
	filtro.From = from

	to, err := parseFecha(query.Get("to"))
	if err != nil {
		return filtro, errors.New("el parametro 'to' debe ser una fecha YYYY-MM-DD o RFC3339")
	}
	filtro.To = to

	return filtro, nil
}

// rangoDesdeQuery lee el rango obligatorio `?from=&to=` de los endpoints de
// fechas. Acepta YYYY-MM-DD o RFC3339.
func rangoDesdeQuery(r *http.Request) (time.Time, time.Time, error) {
	query := r.URL.Query()

	from, err := parseFecha(query.Get("from"))
	if err != nil || from.IsZero() {
		return from, from, errors.New("el parametro 'from' es obligatorio y debe ser una fecha YYYY-MM-DD o RFC3339")
	}

	to, err := parseFecha(query.Get("to"))
	if err != nil || to.IsZero() {
		return from, to, errors.New("el parametro 'to' es obligatorio y debe ser una fecha YYYY-MM-DD o RFC3339")
	}

	return from, to, nil
}

func parseFecha(valor string) (time.Time, error) {
	if valor == "" {
		return time.Time{}, nil
	}

	if fecha, err := time.Parse(time.RFC3339, valor); err == nil {
		return fecha, nil
	}

	return time.Parse("2006-01-02", valor)
}

// notaVigente responde 404 si la nota no existe o ya fue dada de baja. Escribe
// la respuesta de error cuando devuelve false.
func notaVigente(w http.ResponseWriter, notaID int) bool {
	existe, err := notas2.Existe(config.PsqlDB, notaID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to check nota"))
		return false
	}

	if !existe {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte("nota no encontrada"))
		return false
	}

	return true
}

// puedeModificar decide si quien hace la petición puede tocar la nota: el admin
// siempre, el médico solo si participó en esa operación (HU-22). Escribe la
// respuesta de error cuando devuelve false.
func puedeModificar(w http.ResponseWriter, r *http.Request, notaID int) bool {
	session, err := auth.GetSessionCookie(w, r)
	if err != nil {
		log.Println("Unable to get cookie ", err)
		http.Error(w, "Unable to get user info", http.StatusUnauthorized)
		return false
	}

	if session.Role == auth.RolAdmin {
		return true
	}

	participa, err := notas2.EsParticipante(config.PsqlDB, notaID, session.UserID)
	if err != nil {
		http.Error(w, "Unable to verify nota ownership", http.StatusInternalServerError)
		return false
	}

	if !participa {
		http.Error(w, "forbidden, solo el equipo quirurgico puede modificar esta nota", http.StatusForbidden)
		return false
	}

	return true
}

// validarEquipo rechaza los UUID que no correspondan a un médico activo.
// Escribe la respuesta de error cuando devuelve false.
func validarEquipo(w http.ResponseWriter, equipo []string) bool {
	invalidos, err := notas2.ValidarEquipo(config.PsqlDB, equipo)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to validate equipo quirurgico"))
		return false
	}

	if len(invalidos) > 0 {
		w.WriteHeader(http.StatusBadRequest)
		fmt.Fprintf(w, "equipo quirurgico invalido, no son medicos activos: %v", invalidos)
		return false
	}

	return true
}

func CreateNota(w http.ResponseWriter, r *http.Request) {
	var newnotas notas2.Notas

	session, err := auth.GetSessionCookie(w, r)
	if err != nil {
		log.Println("Unable to get cookie ", err)
		http.Error(w, "Unable to get user info", http.StatusUnauthorized)
		return
	}

	if err := json.NewDecoder(r.Body).Decode(&newnotas); err != nil {
		fmt.Printf("Error decoding request body: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Request body is not valid JSON"))
		return
	}

	// Por defecto el encargado es quien registra la nota; se manda explícito
	// solo cuando operó otro médico.
	if newnotas.Medico_Encargado == "" {
		newnotas.Medico_Encargado = session.UserID
	}

	// Nota redactada sin conexión que ya se había subido: se responde la que
	// está guardada en vez de duplicar la cirugía. Ver CrearNotaIdempotente.
	if existente, err := notas2.BuscarPorClientUUID(config.PsqlDB, newnotas.ClientUUID); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to create notas"))
		return
	} else if existente != nil {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Add("Status-Code", "200")
		json.NewEncoder(w).Encode(existente)
		return
	}

	if !validarEquipo(w, append([]string{newnotas.Medico_Encargado}, newnotas.Equipo...)) {
		return
	}

	err = newnotas.Create(config.PsqlDB)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to create notas"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "201")
	json.NewEncoder(w).Encode(newnotas)
}

func UpdateNota(w http.ResponseWriter, r *http.Request) {
	var notas notas2.Notas

	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("param {:id} must be an integer"))
		return
	}

	if !notaVigente(w, id) {
		return
	}

	// Solo se corrige dentro del plazo de edición
	if err := notas2.CheckNotasDate(id); err != nil {
		w.WriteHeader(http.StatusForbidden)
		fmt.Fprintf(w, "la nota solo se puede editar dentro de los %d dias siguientes a su registro", notas2.PlazoEdicionDias)
		return
	}

	if !puedeModificar(w, r, id) {
		return
	}

	if err := json.NewDecoder(r.Body).Decode(&notas); err != nil {
		fmt.Printf("Error decoding request body: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Request body is not valid JSON"))
		return
	}

	// El id manda desde el URL: sin esto el UPDATE corre contra id = 0.
	notas.ID = id

	// Si el cuerpo no trae encargado, se conserva el que ya tiene la nota:
	// una corrección no debería reasignar la cirugía a otro médico.
	if notas.Medico_Encargado == "" {
		var actual notas2.Notas
		actual.ID = id
		if err := actual.Get(config.PsqlDB); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Unable to read nota"))
			return
		}
		notas.Medico_Encargado = actual.Medico_Encargado
	}

	if !validarEquipo(w, append([]string{notas.Medico_Encargado}, notas.Equipo...)) {
		return
	}

	err = notas.Update(config.PsqlDB)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to update notas"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "201")
	json.NewEncoder(w).Encode(notas)
}

func DeleteNota(w http.ResponseWriter, r *http.Request) {
	var notas notas2.Notas

	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("param {:id} must be an integer"))
		return
	}
	notas.ID = id

	if !notaVigente(w, notas.ID) {
		return
	}

	// Solo se elimina dentro del plazo de edición
	if err := notas2.CheckNotasDate(notas.ID); err != nil {
		w.WriteHeader(http.StatusForbidden)
		fmt.Fprintf(w, "la nota solo se puede eliminar dentro de los %d dias siguientes a su registro", notas2.PlazoEdicionDias)
		return
	}

	if !puedeModificar(w, r, notas.ID) {
		return
	}

	err = notas.Delete(config.PsqlDB)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to delete notas"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "201")
	w.Write([]byte("nota dada de baja"))
}
func GetNotasFromMedic(w http.ResponseWriter, r *http.Request) {
	session, err := auth.GetSessionCookie(w, r)
	if err != nil {
		log.Println("Unable to get cookie ", err)
		http.Error(w, "Unable to get user info", http.StatusUnauthorized)
		return
	}

	var notas []notas2.Notas
	notas, err = notas2.GetNotasFromMedic(session.UserID)
	if err != nil {
		if err == pgx.ErrNoRows {
			log.Printf("Error no notas found: %v", err)
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte("No notas found"))
			return
		}
		log.Printf("Error getting notas: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get notas"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "200")
	json.NewEncoder(w).Encode(notas)

}

// GetNotasFromMedicDates devuelve las notas del médico de la sesión dentro de un
// rango. El rango va en el query string (`?from=&to=`): un `GET` con body no lo
// mandan ni `fetch` ni buena parte de los clientes HTTP.
func GetNotasFromMedicDates(w http.ResponseWriter, r *http.Request) {

	session, err := auth.GetSessionCookie(w, r)
	if err != nil {
		log.Println("Unable to get cookie ", err)
		http.Error(w, "Unable to get user info", http.StatusUnauthorized)
		return
	}

	from, to, err := rangoDesdeQuery(r)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(err.Error()))
		return
	}

	notas, err := notas2.GetNotasFromMedicDates(session.UserID, from, to)
	if err != nil {
		if err == pgx.ErrNoRows {
			log.Printf("Error no notas found: %v", err)
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte("No notas found"))
			return
		}
		log.Printf("Error getting notas: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get notas"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "200")
	json.NewEncoder(w).Encode(notas)
}
func GetNotasFromPaciente(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("param {:id} es obligatorio"))
		return
	}

	notas, err := notas2.GetNotasFromPaciente(id)
	if err != nil {
		if err == pgx.ErrNoRows {
			log.Printf("Error no notas found: %v", err)
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte("No notas found"))
			return
		}
		log.Printf("Error getting notas: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get notas"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "200")
	json.NewEncoder(w).Encode(notas)

}

// GetNotasFromPacienteDates devuelve el historial de un paciente dentro de un
// rango. Todo va en el query string: `?id=&from=&to=`.
func GetNotasFromPacienteDates(w http.ResponseWriter, r *http.Request) {

	pacienteID := r.URL.Query().Get("id")
	if pacienteID == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("el parametro 'id' es obligatorio"))
		return
	}

	from, to, err := rangoDesdeQuery(r)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(err.Error()))
		return
	}

	notas, err := notas2.GetNotasFromPacienteDates(pacienteID, from, to)
	if err != nil {
		if err == pgx.ErrNoRows {
			log.Printf("Error no notas found: %v", err)
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte("No notas found"))
			return
		}
		log.Printf("Error getting notas: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get notas"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "200")
	json.NewEncoder(w).Encode(notas)
}
