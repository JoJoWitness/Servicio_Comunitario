package controllers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"server/config"
	"server/controllers/auth"
	notas2 "server/models/notas"
	models "server/models/pacientes"
	users2 "server/models/usuarios"
	"strconv"

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
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get nota"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "200")
	json.NewEncoder(w).Encode(nota)
}

func CreateNota(w http.ResponseWriter, r *http.Request) {
	var newnotas notas2.Notas

	if err := json.NewDecoder(r.Body).Decode(&newnotas); err != nil {
		fmt.Printf("Error decoding request body: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Request body is not valid JSON"))
		return
	}

	err := newnotas.Create(config.PsqlDB)
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

	// Checking if notas was added in current day
	if err := notas2.CheckNotasDate(id); err != nil {
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte("Only allowed editions on the current day"))
		return
	}

	if err := json.NewDecoder(r.Body).Decode(&notas); err != nil {
		fmt.Printf("Error decoding request body: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Request body is not valid JSON"))
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

	if err := json.NewDecoder(r.Body).Decode(&notas.ID); err != nil {
		fmt.Printf("Error decoding request body: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Request body is not valid JSON"))
		return
	}

	// Checking if use was added in current day
	if err := notas2.CheckNotasDate(notas.ID); err != nil {
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte("Edits are only allowed on the current day"))
		return
	}

	err := notas.Delete(config.PsqlDB)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to delete notas"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "201")
	w.Write([]byte("notas deleted"))
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

func GetNotasFromMedicDates(w http.ResponseWriter, r *http.Request) {

	session, err := auth.GetSessionCookie(w, r)
	if err != nil {
		log.Println("Unable to get cookie ", err)
		http.Error(w, "Unable to get user info", http.StatusUnauthorized)
		return
	}

	var userNotasDates users2.UsuarioNotasDates
	if err := json.NewDecoder(r.Body).Decode(&userNotasDates); err != nil {
		log.Printf("Error decoding request body: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Request body is not valid JSON"))
		return
	}

	userID := session.UserID
	from := userNotasDates.From
	to := userNotasDates.To

	notas, err := notas2.GetNotasFromMedicDates(userID, from, to)
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
