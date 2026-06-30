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
	"github.com/jackc/pgx/v5"
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

	SessionCookie(user.ID, w)
}

func authenticate(password string, email string) (user *usuarios.Usuarios, codeStatus int, error error) {
	var loginAttempt usuarios.Usuarios
	loginAttempt.Correo = email

	log.Printf("Login attempt hit %v", loginAttempt)

	err := loginAttempt.Get(config.PsqlDB)
	if err != nil {
		return nil, http.StatusUnauthorized, errors.New("unauthorize access, email not found")
	}

	err = bcrypt.CompareHashAndPassword([]byte(loginAttempt.Contrasena), []byte(password))
	if err != nil {
		return nil, http.StatusUnauthorized, errors.New("unauthorize access, wrong password")
	}

	return &loginAttempt, http.StatusOK, nil
}

func SessionCookie(id string, w http.ResponseWriter) {
	var a usuarios.Admin
	var session Session

	session.UserID = id
	a.UserID = id
	err := a.Get(config.PsqlDB)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			session.Role = "user"
		} else {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Internal server error while checking permissions"))
			return
		}
		session.Role = "user"
	} else {
		session.Role = a.Role
	}

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
