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

func GetProcedimiento(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("param {:id} must be an integer"))
		return
	}

	var procedimiento models.Procedimientos
	procedimiento.Id = id
	err = procedimiento.Get(config.PsqlDB)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get procedimiento"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "200")
	json.NewEncoder(w).Encode(procedimiento)
}

func CreateProcedimiento(w http.ResponseWriter, r *http.Request) {
	var newProcedimiento models.Procedimientos

	if err := json.NewDecoder(r.Body).Decode(&newProcedimiento); err != nil {
		fmt.Printf("Error decoding request body: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Request body is not valid JSON"))
		return
	}

	err := newProcedimiento.Get(config.PsqlDB)
	if err == nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("procedimiento already exists"))
		return
	}

	err = newProcedimiento.Create(config.PsqlDB)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to create procedimiento"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "201")
	json.NewEncoder(w).Encode(newProcedimiento)
}

func UpdateProcedimiento(w http.ResponseWriter, r *http.Request) {
	var procedimiento models.Procedimientos

	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("param {:id} must be an integer"))
		return
	}

	if err := json.NewDecoder(r.Body).Decode(&procedimiento); err != nil {
		fmt.Printf("Error decoding request body: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Request body is not valid JSON"))
		return
	}

	procedimiento.Id = id
	err = procedimiento.Get(config.PsqlDB)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("procedimiento does not exist"))
		return
	}

	err = procedimiento.Update(config.PsqlDB)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to update procedimiento"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "201")
	json.NewEncoder(w).Encode(procedimiento)
}

func Deleteprocedimiento(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("param {:id} must be an integer"))
		return
	}

	var procedimiento models.Procedimientos
	procedimiento.Id = id
	err = procedimiento.Get(config.PsqlDB)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to delete procedimiento"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "201")
	w.Write([]byte("procedimiento deleted"))
}

func GetAllprocedimientos(w http.ResponseWriter, r *http.Request) {
	procedimientos, err := models.GetAllProcedimientos()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get procedimientos"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "200")
	json.NewEncoder(w).Encode(procedimientos)
}
