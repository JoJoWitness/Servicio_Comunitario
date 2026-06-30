package auth

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"server/config"
	models "server/models/usuarios"
	"server/services"
	"server/utils"

	"github.com/gorilla/mux"
)

func UpdatePassword(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	if vars["token"] != "confirmation" {
		token := vars["token"]
		user, ok := SignUpCache.Get(token)
		if !ok {
			log.Printf("Error getting user from cache: %v", ok)
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte("Unable to get user cache"))
			return
		}

		if err := json.NewDecoder(r.Body).Decode(&user.Contrasena); err != nil {
			fmt.Printf("Error decoding request body: %v", err)
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte("Request body is not valid JSON"))
			return
		}

		hashedPassword, err := utils.HashPassword(user.Contrasena)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Something went wrong"))
			return
		}

		user.Contrasena = hashedPassword

		err = user.Update(config.PsqlDB)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Something went wrong updating password"))
			return
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Request body is not valid JSON"))
		return
	}

	var user *models.Usuarios

	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		fmt.Printf("Error decoding request body: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Request body is not valid JSON"))
		return
	}

	err := user.Get(config.PsqlDB)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get user"))
		return
	}

	token, err := services.SendConfirmationEmail(user.Correo)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Something went wrong"))
		return
	}

	SignUpCache.Add(*token, user)

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "202")
}
