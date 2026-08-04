package auth

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"server/models/usuarios"

	"server/config"
	"server/utils"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/hashicorp/golang-lru/v2/expirable"
	"github.com/resendlabs/resend-go"
)

var SignUpCache = expirable.NewLRU[string, *usuarios.Usuarios](2000, nil, time.Hour*1)

func SignUp(w http.ResponseWriter, r *http.Request) {
	var user *usuarios.Usuarios
	vars := mux.Vars(r)
	if vars["token"] != "confirmation" {
		token := vars["token"]
		user, ok := SignUpCache.Get(token)
		if !ok {
			log.Printf("Error getting user from cache: %v", ok)
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte("Unable to get SignUp cache"))
			return
		}

		createUser(user, w)
		return
	}

	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		fmt.Printf("Error decoding request body: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Request body is not valid JSON"))
		return
	}

	// Check if email already in use
	err := user.Get(config.PsqlDB)
	if err == nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("email already in use"))
		return
	}

	// Signup LRU Token
	randomBytes := make([]byte, 32)
	if _, err := rand.Read(randomBytes); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("failed to generate session token"))
		return
	}
	token := hex.EncodeToString(randomBytes)
	SignUpCache.Add(token, user)

	// Send confirmation email
	err = SendConfirmationEmail(token, user.Correo)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Something went wrong"))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "202")
}

func SendConfirmationEmail(token string, email string) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	client := resend.NewClient(apiKey)

	params := &resend.SendEmailRequest{
		From: "RutUNET <onboarding@resend.dev>", //TODO: Change to rutUNET email
		To:   []string{email},
		Html: `
		<div style="font-family: Arial, sans-serif; text-align: center; color: #2c3e50; padding: 20px;">
            <img 
				src="https://dgassesrahgacupzsiem.supabase.co/storage/v1/object/public/email.imgs/email_header/banner_correo.png" //TODO: Change to rutUNET svg
				alt="RUTUNET" 
				style="max-width: 65%; 
				height: auto; 
				display: block;
				margin: 30px auto;" 
			/>

            <p style="font-size: 16px; color: #004080;">
                ¡Bienvenido a <strong>RUTUNET</strong>!
            </p>
            <p style="font-size: 16px; color: #004080;">
                Por favor presiona el siguiente botón para completar el inicio de sesión:
            </p>
            <a href="http://localhost:4321/signup/` + token + `" 
            style="display: inline-block; background-color: #52a0de; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; margin-top: 20px;">
            Confirmar correo
            </a>
        </div>
		`,
		Subject: "Confirmación de registro RUTUNET",

		// Cc:      []string{"cc@example.com"},
		// Bcc:     []string{"bcc@example.com"},
		// ReplyTo: "replyto@example.com",

	}

	sent, err := client.Emails.Send(params)
	if err != nil {
		fmt.Println(err.Error())
		return err
	}
	fmt.Println(sent.Id)

	log.Println("Email confirmation token: ", token)

	return nil
}

func createUser(user *usuarios.Usuarios, w http.ResponseWriter) {
	id, err := uuid.NewV7()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Something went wrong"))
		return
	}

	hashedPassword, err := utils.HashPassword(user.Contrasena)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Something went wrong"))
		return
	}

	newAccount := usuarios.Usuarios{
		ID:         id.String(),
		Nombres:    user.Nombres,
		Apellidos:  user.Apellidos,
		Rol:        user.Rol,
		Correo:     user.Correo,
		Contrasena: hashedPassword,
	}

	err = newAccount.Create(config.PsqlDB)
	if err != nil {
		log.Printf("Error creating user: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to create user"))
		return
	}

	SessionCookie(newAccount.ID, newAccount.Rol, w)

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "201")
}
