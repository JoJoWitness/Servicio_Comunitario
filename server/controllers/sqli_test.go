package controllers

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
)

// El único lugar donde algo del usuario entra a una consulta por concatenación
// —no por parámetro— es el ORDER BY de la paginación: `sortBy` y `order`. Un
// nombre de columna no se puede parametrizar, así que la defensa es una lista
// blanca. Este test fija esa defensa: si alguien mañana toca
// parsePaginationParams y deja pasar el valor crudo, el CI lo caza aquí en vez
// de en producción.

// reqCon arma una petición GET con un query param ya codificado, tal como lo
// mandaría un navegador o un atacante con curl. Sin codificar, un payload con
// espacios rompería el parseo de la URL antes de llegar a la lógica.
func reqCon(param, valor string) *http.Request {
	u := "/x?" + param + "=" + url.QueryEscape(valor)
	return httptest.NewRequest("GET", u, nil)
}

// allowedDemo imita la whitelist que pasan los controladores reales
// (GetAllPacientes, GetAllMedics, GetAllNotas).
var allowedDemo = map[string]string{
	"nombre":    "nombre",
	"apellidos": "apellidos",
}

func TestSortByRechazaInyeccion(t *testing.T) {
	// Cada payload es un intento real de romper el ORDER BY. Ninguno debe
	// sobrevivir: el resultado tiene que ser siempre una columna de la lista.
	payloads := []string{
		`id;DROP TABLE "Paciente";--`,
		`nombre) INTO OUTFILE '/tmp/x'--`,
		`(CASE WHEN 1=1 THEN nombre ELSE apellidos END)`,
		`nombre UNION SELECT contrasena FROM "Usuarios"--`,
		`nombre;SELECT pg_sleep(5)--`,
		`1,(SELECT 1)`,
		`'; DELETE FROM "Nota_Operatoria"; --`,
	}

	permitidas := map[string]bool{"nombre": true, "apellidos": true}

	for _, p := range payloads {
		got := parsePaginationParams(reqCon("sortBy", p), allowedDemo, "nombre").SortBy

		// El único desenlace aceptable es una columna de la whitelist. Si el
		// payload aparece intacto (o parcial) en SortBy, se ejecutaría.
		if !permitidas[got] {
			t.Errorf("sortBy=%q pasó al SQL como %q; debía caer en la whitelist", p, got)
		}
	}
}

func TestOrderSoloAscODesc(t *testing.T) {
	// `order` se concatena junto a sortBy. Solo ASC/DESC son válidos; cualquier
	// otra cosa —incluido un payload— tiene que forzarse a DESC.
	casos := map[string]string{
		"ASC":                     "ASC",
		"asc":                     "ASC",
		"DESC":                    "DESC",
		"ASC; DROP TABLE x--":     "DESC", // no es ASC exacto → default
		"DESC/**/UNION/**/SELECT": "DESC",
		"":                        "DESC",
	}

	for entrada, esperado := range casos {
		if got := parsePaginationParams(reqCon("order", entrada), allowedDemo, "nombre").Order; got != esperado {
			t.Errorf("order=%q → %q; esperaba %q", entrada, got, esperado)
		}
	}
}

// El sortBy por defecto también sale de la whitelist del llamador, nunca del
// input: si el valor pedido no está permitido, se usa el default que fija el
// controlador, no lo que mandó el cliente.
func TestSortByDesconocidoCaeAlDefault(t *testing.T) {
	got := parsePaginationParams(reqCon("sortBy", "columna_inexistente"), allowedDemo, "apellidos").SortBy
	if got != "apellidos" {
		t.Errorf("sortBy desconocido → %q; esperaba el default 'apellidos'", got)
	}
}
