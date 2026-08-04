package auth

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"server/models/usuarios"

	"github.com/hashicorp/golang-lru/v2/expirable"
	"golang.org/x/crypto/bcrypt"

	"server/config"
	"time"
)

type Session struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
}

var LogCache = expirable.NewLRU[string, *Session](5000, nil, time.Hour*32)

func Login(w http.ResponseWriter, r *http.Request) {
	var user *usuarios.Usuarios

	log.Printf("Login endpoint hit")

	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		fmt.Printf("Error decoding request body: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Request body is not valid JSON"))
		return
	}

	user, status, err := authenticate(user.Contrasena, user.Correo)
	if err != nil {
		http.Error(w, err.Error(), status)
		return
	}

	SessionCookie(user.ID, user.Rol, w)

	// El cliente necesita el rol para saber a qué pantalla entrar: el médico a
	// "Mis notas", la secretaria a la vista global del servicio.
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(usuarios.UsuarioData{
		ID:        user.ID,
		Nombres:   user.Nombres,
		Apellidos: user.Apellidos,
		Correo:    user.Correo,
		Rol:       user.Rol,
	})
}

func authenticate(password string, email string) (user *usuarios.Usuarios, codeStatus int, error error) {
	var loginAttempt usuarios.Usuarios
	loginAttempt.Correo = email

	log.Printf("Login attempt hit %v", loginAttempt)

	err := loginAttempt.Get(config.PsqlDB)
	if err != nil {
		return nil, http.StatusUnauthorized, errors.New("unauthorize access, email not found")
	}

	// Una cuenta dada de baja no entra (HU-21). Se responde igual que con
	// credenciales inválidas para no revelar que la cuenta existió.
	if loginAttempt.Eliminado {
		return nil, http.StatusUnauthorized, errors.New("unauthorize access, email not found")
	}

	err = bcrypt.CompareHashAndPassword([]byte(loginAttempt.Contrasena), []byte(password))
	if err != nil {
		return nil, http.StatusUnauthorized, errors.New("unauthorize access, wrong password")
	}

	return &loginAttempt, http.StatusOK, nil
}

// SessionCookie abre una sesión y la entrega como cookie. El rol es el de
// usuarios.rol ('admin' | 'medico' | 'secretaria'): es lo que leen los
// middlewares de autorización, así que tiene que salir de ahí y no de la tabla
// admins, que solo distingue administradores.
func SessionCookie(id string, rol string, w http.ResponseWriter) {
	session := Session{UserID: id, Role: rol}

	randomBytes := make([]byte, 32)
	if _, err := rand.Read(randomBytes); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("failed to generate session token"))
		return
	}
	token := hex.EncodeToString(randomBytes)

	LogCache.Add(token, &session)
	http.SetCookie(w, &http.Cookie{
		Name:     "session_id",
		Value:    token,
		HttpOnly: true,
		Secure:   false, //TODO: set this to false on production and set HTTPS
		SameSite: http.SameSiteStrictMode,
		Path:     "/",
		Expires:  time.Now().Add(time.Hour * 32),
	})
}
