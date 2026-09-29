package pacientes

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"server/config"
	"server/services/storage"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// TamanoMaximoCedula es lo más que se acepta por imagen: 1 MB. El cliente la
// reduce antes de subir (≈ 400 KB); el tope de aquí es la red de seguridad
// contra quien mande el archivo original de la cámara.
const TamanoMaximoCedula = 1 << 20

// tiposCedula son los formatos que se guardan, con la extensión con la que se
// nombra el objeto en el bucket. Se decide por los bytes del archivo, nunca
// por la extensión ni por lo que diga el cliente.
var tiposCedula = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
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
	if _, ok := tiposCedula[tipo]; !ok {
		return "", ErrTipoCedula
	}
	return tipo, nil
}

// claveCedula es el nombre del objeto en el bucket: cedulas/<paciente>.<ext>.
// Una por paciente, así que reemplazarla es sobrescribir el mismo objeto
// (salvo que cambie el formato; ver GuardarCedula).
func claveCedula(pacienteID, tipo string) string {
	return "cedulas/" + pacienteID + tiposCedula[tipo]
}

// contextoBucket acota lo que se espera al bucket: la imagen pesa 1 MB como
// mucho y el servidor tiene 15 s para responder.
func contextoBucket() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 12*time.Second)
}

// ObtenerCedula devuelve la imagen del paciente, o pgx.ErrNoRows si no tiene o
// si el paciente está dado de baja (la imagen sigue guardada, pero no se
// sirve: la baja es lógica también para ella).
//
// La fila dice dónde está la imagen: con "clave", en el bucket; sin ella, en
// la propia fila (guardada antes de tener bucket, o en un servidor sin él).
func ObtenerCedula(db *pgxpool.Pool, pacienteID string) (*Cedula, error) {
	query := `
		SELECT c.imagen, c.clave, c.content_type, c.subida_en
		FROM "Paciente_Cedula" c
		JOIN "Paciente" p ON p.id = c.id_paciente
		WHERE p.id::text = @id
		AND p.eliminado = FALSE;
	`

	var c Cedula
	var clave *string
	err := db.QueryRow(context.Background(), query, pgx.NamedArgs{"id": pacienteID}).
		Scan(&c.Imagen, &clave, &c.ContentType, &c.SubidaEn)
	if err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			log.Printf("Error getting cedula: %v", err)
		}
		return nil, err
	}

	if clave == nil || *clave == "" {
		return &c, nil
	}

	if config.Archivos == nil {
		log.Printf("La cedula de %s esta en el bucket y este servidor no tiene bucket configurado", pacienteID)
		return nil, errors.New("bucket no configurado")
	}

	ctx, cancelar := contextoBucket()
	defer cancelar()
	objeto, err := config.Archivos.Abrir(ctx, *clave)
	if err != nil {
		if errors.Is(err, storage.ErrNoEncontrado) {
			// Fila sin objeto: para quien pregunta, no hay cédula.
			log.Printf("Cedula %s registrada pero ausente del bucket", *clave)
			return nil, pgx.ErrNoRows
		}
		log.Printf("Error reading cedula %s from bucket: %v", *clave, err)
		return nil, err
	}
	defer objeto.Close()

	c.Imagen, err = io.ReadAll(io.LimitReader(objeto, TamanoMaximoCedula+1))
	if err != nil {
		log.Printf("Error reading cedula %s from bucket: %v", *clave, err)
		return nil, err
	}
	return &c, nil
}

// GuardarCedula valida la imagen y la deja como la única del paciente,
// reemplazando la anterior si la había. Con bucket, los bytes van allá y la
// fila guarda la clave; sin bucket, van en la fila como en v0.4.0.
func GuardarCedula(db *pgxpool.Pool, pacienteID string, imagen []byte, subidaPor string) (string, error) {
	tipo, err := ValidarImagenCedula(imagen)
	if err != nil {
		return "", err
	}

	query := `
		INSERT INTO "Paciente_Cedula" (id_paciente, imagen, clave, content_type, tamano_bytes, subida_por, subida_en)
		VALUES (@id::uuid, @imagen, @clave, @tipo, @tamano, @usuario::uuid, NOW())
		ON CONFLICT (id_paciente) DO UPDATE SET
			imagen = EXCLUDED.imagen,
			clave = EXCLUDED.clave,
			content_type = EXCLUDED.content_type,
			tamano_bytes = EXCLUDED.tamano_bytes,
			subida_por = EXCLUDED.subida_por,
			subida_en = NOW();
	`
	args := pgx.NamedArgs{
		"id":      pacienteID,
		"imagen":  imagen,
		"clave":   nil,
		"tipo":    tipo,
		"tamano":  len(imagen),
		"usuario": subidaPor,
	}

	var anterior *string
	if config.Archivos != nil {
		clave := claveCedula(pacienteID, tipo)

		// La clave que tenía, para retirar ese objeto si el formato cambió
		// (de .jpg a .png, por ejemplo) y no dejar huérfanos.
		err := db.QueryRow(context.Background(),
			`SELECT clave FROM "Paciente_Cedula" WHERE id_paciente::text = @id;`,
			pgx.NamedArgs{"id": pacienteID}).Scan(&anterior)
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			log.Printf("Error reading previous cedula key: %v", err)
			return "", err
		}

		ctx, cancelar := contextoBucket()
		defer cancelar()
		if err := config.Archivos.Guardar(ctx, clave, tipo, bytes.NewReader(imagen), int64(len(imagen))); err != nil {
			log.Printf("Error uploading cedula %s: %v", clave, err)
			return "", err
		}

		args["imagen"] = nil
		args["clave"] = clave
		if anterior != nil && *anterior == clave {
			anterior = nil // se sobrescribió el mismo objeto
		}
	}

	if _, err := db.Exec(context.Background(), query, args); err != nil {
		log.Printf("Error saving cedula: %v", err)
		return "", err
	}

	if anterior != nil && *anterior != "" {
		retirarObjeto(*anterior)
	}
	return tipo, nil
}

// BorrarCedula quita la imagen del paciente. Sin imagen que borrar no es error.
func BorrarCedula(db *pgxpool.Pool, pacienteID string) error {
	var clave *string
	err := db.QueryRow(context.Background(),
		`DELETE FROM "Paciente_Cedula" WHERE id_paciente::text = @id RETURNING clave;`,
		pgx.NamedArgs{"id": pacienteID}).Scan(&clave)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		log.Printf("Error deleting cedula: %v", err)
		return err
	}
	if clave != nil && *clave != "" {
		retirarObjeto(*clave)
	}
	return nil
}

// retirarObjeto borra del bucket sin que un fallo importe: la fila ya no
// apunta ahí, y un objeto suelto solo cuesta unos KB.
func retirarObjeto(clave string) {
	if config.Archivos == nil {
		return
	}
	ctx, cancelar := contextoBucket()
	defer cancelar()
	if err := config.Archivos.Borrar(ctx, clave); err != nil {
		log.Printf("Aviso: no se pudo borrar %s del bucket: %v", clave, err)
	}
}

// MigrarCedulasAlBucket mueve al bucket las cédulas que quedaron guardadas en
// la base (todas las de antes de tener bucket). Se corre al arrancar; cuando no
// queda ninguna no hace nada. Una que falle se deja donde está y se reintenta
// en el próximo arranque: mientras, se sigue sirviendo desde la fila.
func MigrarCedulasAlBucket(db *pgxpool.Pool) {
	if config.Archivos == nil {
		return
	}

	filas, err := db.Query(context.Background(),
		`SELECT id_paciente, content_type FROM "Paciente_Cedula" WHERE clave IS NULL AND imagen IS NOT NULL;`)
	if err != nil {
		log.Printf("Error listing cedulas to migrate: %v", err)
		return
	}
	type pendiente struct{ id, tipo string }
	var pendientes []pendiente
	for filas.Next() {
		var p pendiente
		if err := filas.Scan(&p.id, &p.tipo); err != nil {
			log.Printf("Error scanning cedula to migrate: %v", err)
			filas.Close()
			return
		}
		pendientes = append(pendientes, p)
	}
	filas.Close()
	if len(pendientes) == 0 {
		return
	}

	log.Printf("Cedulas: %d por mover de la base al bucket", len(pendientes))
	movidas := 0
	for _, p := range pendientes {
		var imagen []byte
		err := db.QueryRow(context.Background(),
			`SELECT imagen FROM "Paciente_Cedula" WHERE id_paciente = @id;`,
			pgx.NamedArgs{"id": p.id}).Scan(&imagen)
		if err != nil {
			log.Printf("Cedulas: no se pudo leer la de %s: %v", p.id, err)
			continue
		}

		clave := claveCedula(p.id, p.tipo)
		ctx, cancelar := contextoBucket()
		err = config.Archivos.Guardar(ctx, clave, p.tipo, bytes.NewReader(imagen), int64(len(imagen)))
		cancelar()
		if err != nil {
			log.Printf("Cedulas: no se pudo subir la de %s: %v", p.id, err)
			continue
		}

		// Solo se vacía la fila cuando el objeto ya está arriba.
		_, err = db.Exec(context.Background(),
			`UPDATE "Paciente_Cedula" SET clave = @clave, imagen = NULL WHERE id_paciente = @id;`,
			pgx.NamedArgs{"clave": clave, "id": p.id})
		if err != nil {
			log.Printf("Cedulas: subida %s pero no se pudo actualizar la fila: %v", clave, err)
			continue
		}
		movidas++
	}
	log.Printf("Cedulas: %d de %d movidas al bucket", movidas, len(pendientes))
}
