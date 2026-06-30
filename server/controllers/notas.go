package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"server/config"
	notas2 "server/models/notas"
	"strconv"

	"github.com/gorilla/mux"
)

func CreateNotas(w http.ResponseWriter, r *http.Request) {
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

func UpdateNotas(w http.ResponseWriter, r *http.Request) {
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

func DeleteNotas(w http.ResponseWriter, r *http.Request) {
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
