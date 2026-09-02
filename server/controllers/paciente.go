package controllers

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"

	"server/config"
	"server/controllers/auth"
	models "server/models/pacientes"
	"server/models/pagination"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5"
)

func GetPaciente(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var paciente models.Pacientes
	paciente.ID = id
	err := paciente.Get(config.PsqlDB)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get paciente"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "200")
	json.NewEncoder(w).Encode(paciente)
}

func CreatePaciente(w http.ResponseWriter, r *http.Request) {
	var newpaciente models.Pacientes

	if err := json.NewDecoder(r.Body).Decode(&newpaciente); err != nil {
		fmt.Printf("Error decoding request body: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Request body is not valid JSON"))
		return
	}

	// Paciente registrado sin conexión: el dispositivo ya le asignó un UUID y lo
	// manda con el alta. Si ese id ya está en la base, es que la subida anterior
	// sí llegó (o el médico tocó "sincronizar" dos veces) y se responde el
	// paciente que existe, no un error: para la cola local es un éxito.
	if newpaciente.ID != "" {
		yaRegistrado := models.Pacientes{ID: newpaciente.ID}
		if err := yaRegistrado.Get(config.PsqlDB); err == nil {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Add("Status-Code", "200")
			json.NewEncoder(w).Encode(yaRegistrado)
			return
		}
	}

	// El choque por historia médica sigue siendo un error: son dos pacientes
	// distintos peleando por el mismo número, y eso lo resuelve una persona.
	porHistoria := models.Pacientes{Historia_Medica: newpaciente.Historia_Medica}
	if err := porHistoria.Get(config.PsqlDB); err == nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("paciente already exists"))
		return
	}

	if err := newpaciente.Create(config.PsqlDB); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to create paciente"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "201")
	json.NewEncoder(w).Encode(newpaciente)
}

func UpdatePaciente(w http.ResponseWriter, r *http.Request) {
	var paciente models.Pacientes

	vars := mux.Vars(r)
	id := vars["id"]

	paciente.ID = id
	err := paciente.Get(config.PsqlDB)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("paciente does not exist"))
		return
	}

	if err := json.NewDecoder(r.Body).Decode(&paciente); err != nil {
		fmt.Printf("Error decoding request body: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Request body is not valid JSON"))
		return
	}

	err = paciente.Update(config.PsqlDB)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to update paciente"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "200")
	json.NewEncoder(w).Encode(paciente)
}

func DeletePaciente(w http.ResponseWriter, r *http.Request) {
	var paciente models.Pacientes

	vars := mux.Vars(r)
	id := vars["id"]

	paciente.ID = id
	err := paciente.Delete(config.PsqlDB)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to delete paciente"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "201")
	w.Write([]byte("paciente deleted"))
}

func GetAllPacientes(w http.ResponseWriter, r *http.Request) {
	// Columnas permitidas para sortBy — evita inyección SQL
	allowed := map[string]string{
		"nombre":           "nombre",
		"historia_medica":  "historia_medica",
		"fecha_nacimiento": "fecha_nacimiento",
		"tipo_documento":   "tipo_documento",
		"genero":           "genero",
	}
	p := parsePaginationParams(r, allowed, "nombre")

	q := r.URL.Query()
	f := models.FiltrosPacientes{
		Nombre:         q.Get("nombre"),
		Documento:      q.Get("documento"),
		HistoriaMedica: q.Get("historia_medica"),
		Genero:         q.Get("genero"),
	}

	pacientes, total, err := models.GetAllPacientesPaged(f, p)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get pacientes"))
		return
	}

	meta := pagination.NewMeta(total, p)
	resp := struct {
		Data []models.Pacientes `json:"data"`
		Meta pagination.Meta    `json:"meta"`
	}{Data: pacientes, Meta: meta}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "200")
	json.NewEncoder(w).Encode(resp)
}

// ---------------------------------------------------------------------------
// Cédula del paciente (v0.4.0)
//
// La imagen del documento se imprime en la hoja de la nota operatoria, en el
// hueco donde antes se pegaba la fotocopia. Es del paciente, no de la cirugía:
// se sube una vez y la usan todas sus notas.
// ---------------------------------------------------------------------------

// GetCedula sirve la imagen tal cual, con ETag para que el PDF de varias notas
// del mismo paciente no la vuelva a bajar.
// GET /pacientes/{id}/cedula
func GetCedula(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	cedula, err := models.ObtenerCedula(config.PsqlDB, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte("el paciente no tiene cedula registrada"))
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get cedula"))
		return
	}

	suma := sha256.Sum256(cedula.Imagen)
	etag := `"` + hex.EncodeToString(suma[:16]) + `"`

	w.Header().Set("ETag", etag)
	// Privada: es un documento de identidad y solo lo cachea el navegador de
	// quien tiene sesión, nunca un intermediario.
	w.Header().Set("Cache-Control", "private, max-age=86400")

	if r.Header.Get("If-None-Match") == etag {
		w.WriteHeader(http.StatusNotModified)
		return
	}

	w.Header().Set("Content-Type", cedula.ContentType)
	w.Header().Set("Content-Length", strconv.Itoa(len(cedula.Imagen)))
	w.WriteHeader(http.StatusOK)
	w.Write(cedula.Imagen)
}

// PutCedula guarda (o reemplaza) la imagen. El body es la imagen cruda; el
// tipo se decide por sus bytes, no por la cabecera.
// PUT /pacientes/{id}/cedula
func PutCedula(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	session, err := auth.GetSessionCookie(w, r)
	if err != nil {
		http.Error(w, "Unable to get user info", http.StatusUnauthorized)
		return
	}

	paciente := models.Pacientes{ID: id}
	if err := paciente.Get(config.PsqlDB); err != nil {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte("paciente does not exist"))
		return
	}

	// Un byte más que el tope, para distinguir "justo en el límite" de "se
	// pasó" sin tener que leer un archivo enorme entero.
	cuerpo, err := io.ReadAll(http.MaxBytesReader(w, r.Body, models.TamanoMaximoCedula+1))
	if err != nil {
		w.WriteHeader(http.StatusRequestEntityTooLarge)
		w.Write([]byte(models.ErrTamanoCedula.Error()))
		return
	}

	if _, err := models.GuardarCedula(config.PsqlDB, id, cuerpo, session.UserID); err != nil {
		switch {
		case errors.Is(err, models.ErrTamanoCedula):
			w.WriteHeader(http.StatusRequestEntityTooLarge)
		case errors.Is(err, models.ErrTipoCedula):
			w.WriteHeader(http.StatusBadRequest)
		default:
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Unable to save cedula"))
			return
		}
		w.Write([]byte(err.Error()))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "201")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]bool{"tiene_cedula": true})
}

// DeleteCedula quita la imagen del paciente. Las notas vuelven a imprimirse
// con el hueco en blanco.
// DELETE /pacientes/{id}/cedula
func DeleteCedula(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]

	if err := models.BorrarCedula(config.PsqlDB, id); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to delete cedula"))
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
