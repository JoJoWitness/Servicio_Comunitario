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

func GetTecnica(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("param {:id} must be an integer"))
		return
	}

	var tecnica models.Tecnica
	tecnica.Id = id
	err = tecnica.Get(config.PsqlDB)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get tecnica"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "200")
	json.NewEncoder(w).Encode(tecnica)
}

func CreateTecnica(w http.ResponseWriter, r *http.Request) {
	var newTecnica models.Tecnica

	if err := json.NewDecoder(r.Body).Decode(&newTecnica); err != nil {
		fmt.Printf("Error decoding request body: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Request body is not valid JSON"))
		return
	}

	err := newTecnica.Get(config.PsqlDB)
	if err == nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("tecnica already exists"))
		return
	}

	err = newTecnica.Create(config.PsqlDB)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to create tecnica"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "201")
	json.NewEncoder(w).Encode(newTecnica)
}

func UpdateTecnica(w http.ResponseWriter, r *http.Request) {
	var tecnica models.Tecnica

	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("param {:id} must be an integer"))
		return
	}

	if err := json.NewDecoder(r.Body).Decode(&tecnica); err != nil {
		fmt.Printf("Error decoding request body: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Request body is not valid JSON"))
		return
	}

	tecnica.Id = id

	// La comprobación de existencia va sobre una copia: `Get` rellena el
	// struct desde la base, y hacerlo sobre `tecnica` pisaría lo que trae la
	// petición, dejando el UPDATE sin efecto.
	existente := models.Tecnica{Id: id}
	err = existente.Get(config.PsqlDB)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("tecnica does not exist"))
		return
	}

	// El catálogo del admin edita el nombre y la frase, no los huecos. Si la
	// petición no los trae, se conservan los que ya estaban en vez de vaciarlos.
	if tecnica.Huecos == nil {
		tecnica.Huecos = existente.Huecos
	}

	err = tecnica.Update(config.PsqlDB)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to update tecnica"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "201")
	json.NewEncoder(w).Encode(tecnica)
}

func DeleteTecnica(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("param {:id} must be an integer"))
		return
	}

	var tecnica models.Tecnica
	tecnica.Id = id
	err = tecnica.Get(config.PsqlDB)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to delete tecnica"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "201")
	w.Write([]byte("tecnica deleted"))
}

func GetAllTecnicas(w http.ResponseWriter, r *http.Request) {
	tecnicas, err := models.GetAllTecnicas()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get tecnicas"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "200")
	json.NewEncoder(w).Encode(tecnicas)
}
