package controllers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"server/config"
	notas2 "server/models/notas"
	models "server/models/pacientes"
	users2 "server/models/usuarios"

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
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("param {:id} must be an integer"))
		return
	}

	paciente.ID = id
	err = paciente.Delete(config.PsqlDB)
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
	pacientes, err := models.GetAllPacientes()

	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get pacientes"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "200")
	json.NewEncoder(w).Encode(pacientes)
}

func GetNotasFromPaciente(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var paciente models.Pacientes
	paciente.ID = id

	var notas []notas2.Notas
	notas, err := notas2.GetNotasFromPaciente(paciente.ID)
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

func GetNotasFromPacienteDates(w http.ResponseWriter, r *http.Request) {

	var userNotasDates users2.UsuarioNotasDates
	if err := json.NewDecoder(r.Body).Decode(&userNotasDates); err != nil {
		log.Printf("Error decoding request body: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Request body is not valid JSON"))
		return
	}

	userID := userNotasDates.ID
	from := userNotasDates.From
	to := userNotasDates.To

	notas, err := notas2.GetNotasFromPacienteDates(userID, from, to)
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
