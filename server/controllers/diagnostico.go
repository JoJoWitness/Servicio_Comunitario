package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"server/config"
	models "server/models"

	"github.com/gorilla/mux"
)

func GetDiagnostico(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("param {:id} must be an integer"))
		return
	}

	var diagnostico models.Diagnosticos
	diagnostico.Id = id
	err = diagnostico.Get(config.PsqlDB)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get diagnostico"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "200")
	json.NewEncoder(w).Encode(diagnostico)
}

func CreateDiagnostico(w http.ResponseWriter, r *http.Request) {
	var newDiagnostico models.Diagnosticos

	if err := json.NewDecoder(r.Body).Decode(&newDiagnostico); err != nil {
		fmt.Printf("Error decoding request body: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Request body is not valid JSON"))
		return
	}

	err := newDiagnostico.Get(config.PsqlDB)
	if err == nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("diagnostico already exists"))
		return
	}

	err = newDiagnostico.Create(config.PsqlDB)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to create diagnostico"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "201")
	json.NewEncoder(w).Encode(newDiagnostico)
}

func UpdateDiagnostico(w http.ResponseWriter, r *http.Request) {
	var diagnostico models.Diagnosticos

	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("param {:id} must be an integer"))
		return
	}

	if err := json.NewDecoder(r.Body).Decode(&diagnostico); err != nil {
		fmt.Printf("Error decoding request body: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Request body is not valid JSON"))
		return
	}

	diagnostico.Id = id
	err = diagnostico.Get(config.PsqlDB)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("diagnostico does not exist"))
		return
	}

	err = diagnostico.Update(config.PsqlDB)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to update diagnostico"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "201")
	json.NewEncoder(w).Encode(diagnostico)
}

func DeleteDiagnostico(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("param {:id} must be an integer"))
		return
	}

	var diagnostico models.Diagnosticos
	diagnostico.Id = id
	err = diagnostico.Get(config.PsqlDB)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to delete diagnostico"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "201")
	w.Write([]byte("diagnostico deleted"))
}

func GetAllDiagnosticos(w http.ResponseWriter, r *http.Request) {
	diagnosticos, err := models.GetAllDiagnosticos()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get diagnosticos"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "200")
	json.NewEncoder(w).Encode(diagnosticos)
}
