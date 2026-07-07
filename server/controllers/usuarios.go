package controllers

import (
	"encoding/json"
	"log"
	"net/http"
	"server/config"
	"server/controllers/auth"
	users2 "server/models/usuarios"
	"server/utils"

	"github.com/jackc/pgx/v5"
)

func LoadSampleUsers() {
	users := []users2.Usuarios{
		{ID: "100e8400-e29b-41d4-a716-446655440000", Nombres: "Ryuk", Apellidos: "Dog", Correo: "ryuk@dog.unet.ve", Rol: "admin", Contrasena: "ryuk"},
		{ID: "200e8400-e29b-41d4-a716-446655440000", Nombres: "Natty", Apellidos: "Dog", Correo: "natty@dog.unet.ve", Rol: "medico", Contrasena: "natty"},
		{ID: "300e8400-e29b-41d4-a716-446655440000", Nombres: "Lobito", Apellidos: "Dog", Correo: "lobito@dog.unet.ve", Rol: "medico", Contrasena: "lobito"},
		{ID: "400e8400-e29b-41d4-a716-446655440000", Nombres: "Roma", Apellidos: "Dog", Correo: "roma@dog.unet.ve", Rol: "medico", Contrasena: "roma"},
		{ID: "500e8400-e29b-41d4-a716-446655440000", Nombres: "Canela", Apellidos: "Dog", Correo: "canela@dog.unet.ve", Rol: "medico", Contrasena: "canela"},
		{ID: "600e8400-e29b-41d4-a716-446655440000", Nombres: "Neron", Apellidos: "Dog", Correo: "neron@dog.unet.ve", Rol: "medico", Contrasena: "neron"},
		{ID: "700e8400-e29b-41d4-a716-446655440000", Nombres: "Negro", Apellidos: "Dog", Correo: "negro@dog.unet.ve", Rol: "medico", Contrasena: "negro"},
		{ID: "800e8400-e29b-41d4-a716-446655440000", Nombres: "Traviesa", Apellidos: "Dog", Correo: "traviesa@dog.unet.ve", Rol: "medico", Contrasena: "traviesa"},
		{ID: "900e8400-e29b-41d4-a716-446655440000", Nombres: "Oso", Apellidos: "Dog", Correo: "oso@dog.unet.ve", Rol: "medico", Contrasena: "oso"},
	}

	for _, u := range users {
		hashedPassword, err := utils.HashPassword(u.Contrasena)
		if err != nil {
			log.Printf("Error hashing password: %v", err)
			return
		}

		u.Contrasena = hashedPassword

		err = u.Create(config.PsqlDB)
		if err != nil {
			log.Printf("Error creating user: %v", err)
			return
		}

	}
}
func CreateUser(w http.ResponseWriter, r *http.Request) {
	var user users2.Usuarios
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		log.Printf("Error decoding request body: %v", err)
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

	err = user.Create(config.PsqlDB)
	if err != nil {
		log.Printf("Error creating user: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to create user"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "201")
	json.NewEncoder(w).Encode(user)
}

func GetUser(w http.ResponseWriter, r *http.Request) {
	session, err := auth.GetSessionCookie(w, r)
	if err != nil {
		log.Println("Unable to get cookie ", err)
		http.Error(w, "Unable to get user info", http.StatusUnauthorized)
		return
	}

	var user users2.Usuarios
	user.ID = session.UserID

	err = user.Get(config.PsqlDB)
	if err != nil {
		if err == pgx.ErrNoRows {
			log.Printf("Error no user found: %v", err)
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte("No user found"))
			return
		}
		log.Printf("Error getting user: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get user"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "200")
	json.NewEncoder(w).Encode(user)
}

func UpdateUser(w http.ResponseWriter, r *http.Request) {
	session, err := auth.GetSessionCookie(w, r)
	if err != nil {
		log.Println("Unable to get cookie ", err)
		http.Error(w, "Unable to get user info", http.StatusUnauthorized)
		return
	}

	var user users2.Usuarios
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		log.Printf("Error decoding Update User request body: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Request body is not valid JSON"))
		return
	}

	user.ID = session.UserID

	err = user.Get(config.PsqlDB)
	if err == nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("User does not exist"))
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
		log.Printf("Error updating user: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to update user"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "201")
	json.NewEncoder(w).Encode(user)
}

func DeleteUser(w http.ResponseWriter, r *http.Request) {
	session, err := auth.GetSessionCookie(w, r)
	if err != nil {
		log.Println("Unable to get cookie ", err)
		http.Error(w, "Unable to get user info", http.StatusUnauthorized)
		return
	}

	var user users2.Usuarios
	user.ID = session.UserID
	err = user.Delete(config.PsqlDB)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to delete user"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "201")
	w.Write([]byte("User deleted"))
}

func GetAllMedics(w http.ResponseWriter, r *http.Request) {
	users, err := users2.GetAllMedics()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get medics"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "200")
	json.NewEncoder(w).Encode(users)
}

func GetUserData(w http.ResponseWriter, r *http.Request) {
	session, err := auth.GetSessionCookie(w, r)
	if err != nil {
		log.Println("Unable to get cookie ", err)
		http.Error(w, "Unable to get user info", http.StatusUnauthorized)
		return
	}

	var userData users2.UsuarioData

	userData.Rol = session.Role
	userData.ID = session.UserID
	err = userData.Get(config.PsqlDB)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get user data"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "200")
	json.NewEncoder(w).Encode(userData)
}
