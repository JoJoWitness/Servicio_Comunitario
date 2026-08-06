package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"server/config"
	models "server/models/pacientes"
	"server/models/pagination"

	"github.com/gorilla/mux"
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

	err := newpaciente.Get(config.PsqlDB)
	if err == nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("paciente already exists"))
		return
	}

	err = newpaciente.Create(config.PsqlDB)
	if err != nil {
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
