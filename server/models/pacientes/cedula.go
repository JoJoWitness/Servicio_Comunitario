package pacientes

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// TamanoMaximoCedula es lo más que se acepta por imagen: 1 MB. El cliente la
// reduce antes de subir (≈ 400 KB); el tope de aquí es la red de seguridad
// contra quien mande el archivo original de la cámara.
const TamanoMaximoCedula = 1 << 20

// tiposCedula son los formatos que se guardan. Se decide por los bytes del
// archivo, nunca por la extensión ni por lo que diga el cliente.
var tiposCedula = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
}

// ErrTipoCedula es el rechazo por formato; el controlador lo traduce a 400.
var ErrTipoCedula = errors.New("la cedula debe ser una imagen JPEG, PNG o WebP")

// ErrTamanoCedula es el rechazo por peso; el controlador lo traduce a 413.
var ErrTamanoCedula = fmt.Errorf("la imagen de la cedula no puede pesar mas de %d bytes", TamanoMaximoCedula)

// Cedula es la imagen del documento del paciente tal como está guardada.
type Cedula struct {
	Imagen      []byte
	ContentType string
	SubidaEn    time.Time
}

// ValidarImagenCedula comprueba tipo y tamaño y devuelve el Content-Type real
// del archivo, detectado por sus primeros bytes.
func ValidarImagenCedula(datos []byte) (string, error) {
	if len(datos) == 0 {
		return "", ErrTipoCedula
	}
	if len(datos) > TamanoMaximoCedula {
		return "", ErrTamanoCedula
	}
	tipo := http.DetectContentType(datos)
	if !tiposCedula[tipo] {
		return "", ErrTipoCedula
	}
	return tipo, nil
}

// ObtenerCedula devuelve la imagen del paciente, o pgx.ErrNoRows si no tiene o
// si el paciente está dado de baja (la imagen sigue en la base, pero no se
// sirve: la baja es lógica también para ella).
func ObtenerCedula(db *pgxpool.Pool, pacienteID string) (*Cedula, error) {
	query := `
		SELECT c.imagen, c.content_type, c.subida_en
		FROM "Paciente_Cedula" c
		JOIN "Paciente" p ON p.id = c.id_paciente
		WHERE p.id::text = @id
		AND p.eliminado = FALSE;
	`

	var c Cedula
	err := db.QueryRow(context.Background(), query, pgx.NamedArgs{"id": pacienteID}).
		Scan(&c.Imagen, &c.ContentType, &c.SubidaEn)
	if err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			log.Printf("Error getting cedula: %v", err)
		}
		return nil, err
	}
	return &c, nil
}

// GuardarCedula valida la imagen y la deja como la única del paciente,
// reemplazando la anterior si la había.
func GuardarCedula(db *pgxpool.Pool, pacienteID string, imagen []byte, subidaPor string) (string, error) {
	tipo, err := ValidarImagenCedula(imagen)
	if err != nil {
		return "", err
	}

	query := `
		INSERT INTO "Paciente_Cedula" (id_paciente, imagen, content_type, tamano_bytes, subida_por, subida_en)
		VALUES (@id::uuid, @imagen, @tipo, @tamano, @usuario::uuid, NOW())
		ON CONFLICT (id_paciente) DO UPDATE SET
			imagen = EXCLUDED.imagen,
			content_type = EXCLUDED.content_type,
			tamano_bytes = EXCLUDED.tamano_bytes,
			subida_por = EXCLUDED.subida_por,
			subida_en = NOW();
	`

	_, err = db.Exec(context.Background(), query, pgx.NamedArgs{
		"id":      pacienteID,
		"imagen":  imagen,
		"tipo":    tipo,
		"tamano":  len(imagen),
		"usuario": subidaPor,
	})
	if err != nil {
		log.Printf("Error saving cedula: %v", err)
		return "", err
	}
	return tipo, nil
}

// BorrarCedula quita la imagen del paciente. Sin imagen que borrar no es error.
func BorrarCedula(db *pgxpool.Pool, pacienteID string) error {
	_, err := db.Exec(context.Background(),
		`DELETE FROM "Paciente_Cedula" WHERE id_paciente::text = @id;`,
		pgx.NamedArgs{"id": pacienteID})
	if err != nil {
		log.Printf("Error deleting cedula: %v", err)
		return err
	}
	return nil
}
