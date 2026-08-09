package controllers

import (
	"encoding/json"
	"log"
	"net/http"
	"server/config"
	"server/controllers/auth"
	"server/models/pagination"
	users2 "server/models/usuarios"
	"server/utils"
	"strings"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
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

	// El correo es con lo que se entra. Dos cuentas con el mismo dejan el login
	// a merced de cuál fila devuelva la base primero: la contraseña nueva se
	// compara contra el hash de la vieja y no entra ninguna de las dos.
	existente := users2.Usuarios{Correo: user.Correo}
	if err := existente.Get(config.PsqlDB); err == nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("ese correo ya esta registrado"))
		return
	}

	hashedPassword, err := utils.HashPassword(user.Contrasena)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Something went wrong"))
		return
	}

	user.Contrasena = hashedPassword

	if user.ID == "" {
		id, err := uuid.NewV7()
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Something went wrong"))
			return
		}
		user.ID = id.String()
	}

	err = user.Create(config.PsqlDB)
	if err != nil {
		log.Printf("Error creating user: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to create user"))
		return
	}

	// El hash nunca sale en una respuesta.
	user.Contrasena = ""

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "201")
	json.NewEncoder(w).Encode(user)
}

func GetUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var user users2.Usuarios
	user.ID = id

	err := user.Get(config.PsqlDB)
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

	// El hash nunca sale en una respuesta.
	user.Contrasena = ""

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "200")
	json.NewEncoder(w).Encode(user)
}

func UpdateUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	// Decodificar solo los campos que el admin puede cambiar.
	// La contraseña se gestiona por separado en PUT /usuarios/me/password.
	var payload struct {
		Correo    string `json:"correo"`
		Nombres   string `json:"nombres"`
		Apellidos string `json:"apellidos"`
		Rol       string `json:"rol"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		log.Printf("Error decoding Update User request body: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Request body is not valid JSON"))
		return
	}

	// Cargar el usuario existente para no pisar campos no enviados.
	var user users2.Usuarios
	user.ID = id
	if err := user.Get(config.PsqlDB); err != nil {
		log.Printf("Error fetching user before update: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to find user"))
		return
	}

	// Aplicar solo los campos presentes en el payload.
	if payload.Correo != "" {
		// Mismo motivo que en el alta: cambiarle el correo a uno que ya usa
		// otra cuenta deja a las dos sin poder entrar.
		if !strings.EqualFold(strings.TrimSpace(payload.Correo), strings.TrimSpace(user.Correo)) {
			otro := users2.Usuarios{Correo: payload.Correo}
			if err := otro.Get(config.PsqlDB); err == nil && otro.ID != user.ID {
				w.WriteHeader(http.StatusBadRequest)
				w.Write([]byte("ese correo ya esta registrado"))
				return
			}
		}
		user.Correo = payload.Correo
	}
	if payload.Nombres != "" {
		user.Nombres = payload.Nombres
	}
	if payload.Apellidos != "" {
		user.Apellidos = payload.Apellidos
	}
	if payload.Rol != "" {
		user.Rol = payload.Rol
	}
	// user.Contrasena conserva el hash existente — no se toca aquí.

	if err := user.Update(config.PsqlDB); err != nil {
		log.Printf("Error updating user: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to update user"))
		return
	}

	user.Contrasena = ""

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "200")
	json.NewEncoder(w).Encode(user)
}

func DeleteUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var user users2.Usuarios
	user.ID = id
	err := user.Delete(config.PsqlDB)
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
	allowedSort := map[string]string{
		"apellidos": "apellidos",
		"nombres":   "nombres",
		"correo":    "correo",
		"rol":       "rol",
	}
	p := parsePaginationParams(r, allowedSort, "apellidos")

	q := r.URL.Query()
	f := users2.FiltrosUsuarios{
		Nombre: q.Get("nombre"),
		Correo: q.Get("correo"),
		Rol:    q.Get("rol"),
	}

	users, total, err := users2.GetAllMedicsPaged(f, p)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get medics"))
		return
	}

	meta := pagination.NewMeta(total, p)
	resp := struct {
		Data []users2.Usuarios `json:"data"`
		Meta pagination.Meta   `json:"meta"`
	}{Data: users, Meta: meta}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "200")
	json.NewEncoder(w).Encode(resp)
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
