package auth

import (
	"context"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"server/config"
	"server/models/usuarios"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Demostración de la escalada de privilegios por mass assignment en el registro.
//
// El endpoint público /auth/signup decodifica el cuerpo JSON completo del
// cliente en la struct Usuarios, incluido el campo `rol`, y createUser lo usa
// tal cual sin validarlo. Este test lo prueba: manda un registro con
// rol="admin" y verifica que la cuenta creada quedó, en efecto, como admin.
//
// Cuando se corrija (forzar el rol en el servidor, ignorando el del cliente),
// este test debe empezar a FALLAR — y ahí se invierte su sentido: pasa a ser el
// guardián que impide que la vulnerabilidad vuelva.
//
// Requiere una base de datos real. Se salta si no está DATABASE_URI, para no
// romper el CI de quien no la tenga:
//
//	DATABASE_URI=postgres://postgres:x@127.0.0.1:55460/hcsc \
//	  go test ./controllers/auth/ -run TestMassAssignment -v
func TestMassAssignmentRolAdmin(t *testing.T) {
	uri := os.Getenv("DATABASE_URI")
	if uri == "" {
		t.Skip("sin DATABASE_URI; test de integración omitido")
	}

	pool, err := pgxpool.New(context.Background(), uri)
	if err != nil {
		t.Fatalf("no se pudo conectar a la base: %v", err)
	}
	defer pool.Close()
	config.PsqlDB = pool

	// El esquema se carga aparte (ver el comando de ejecución); aquí basta con
	// que exista la tabla Usuarios. Se limpia el correo de una corrida previa.
	_, _ = pool.Exec(context.Background(),
		`DELETE FROM "Usuarios" WHERE correo = 'atacante@ejemplo.com'`)

	// Un atacante que se registra pidiéndose a sí mismo el rol admin.
	atacante := &usuarios.Usuarios{
		Correo:     "atacante@ejemplo.com",
		Nombres:    "Mala",
		Apellidos:  "Intención",
		Contrasena: "loquesea123",
		Rol:        "admin", // <-- lo controla el cliente
	}

	// createUser es el paso final del alta (el que corre tras confirmar el
	// correo). Se le pasa el objeto tal como salió del JSON del cliente.
	rec := httptest.NewRecorder()
	createUser(atacante, rec)

	// ¿Con qué rol quedó registrado en la base?
	var rol string
	err = pool.QueryRow(context.Background(),
		`SELECT rol FROM "Usuarios" WHERE correo = $1`, atacante.Correo).Scan(&rol)
	if err != nil {
		t.Fatalf("la cuenta no se creó: %v", err)
	}

	if strings.EqualFold(rol, "admin") {
		t.Errorf("VULNERABLE: un registro público creó una cuenta con rol=%q "+
			"(el servidor aceptó el rol enviado por el cliente sin validarlo)", rol)
	} else {
		t.Logf("OK: el servidor ignoró el rol del cliente y asignó %q", rol)
	}
}
