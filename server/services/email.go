package services

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"os"

	"github.com/resendlabs/resend-go"
)

func SendConfirmationEmail(email string) (*string, error) {
	apiKey := os.Getenv("RESEND_KEY")
	client := resend.NewClient(apiKey)

	randomBytes := make([]byte, 32)
	if _, err := rand.Read(randomBytes); err != nil {
		log.Printf("Failed to generate random bytes on confirmation email: %v", err)
		return nil, err
	}
	token := hex.EncodeToString(randomBytes)

	params := &resend.SendEmailRequest{
		From:    "<onboarding@resend.dev>",
		To:      []string{email},
		Html:    ``,
		Subject: "Cambio de contraseña Repositorio de Tesis ULA",
		// Cc:      []string{"cc@example.com"},
		// Bcc:     []string{"bcc@example.com"},
		// ReplyTo: "replyto@example.com",
	}

	_, err := client.Emails.Send(params)
	if err != nil {
		fmt.Println(err.Error())
		return nil, err
	}

	log.Println("Email confirmation token: ", token)

	return &token, nil
}
