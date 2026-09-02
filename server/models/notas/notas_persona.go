package notas

import (
	"time"

	"server/config"
)

// Las cuatro consultas de aquí comparten el SELECT con el resto del paquete
// (ver `columnas` y `leerNota` en notas.go): lo único que cambia es el WHERE.

// condicionParticipa es el criterio de "sus notas" para un médico: las que
// encabezó o en las que figura dentro del equipo quirúrgico (HU-11).
const condicionParticipa = `(
			n.id_medico_encargado::text = @id
			OR EXISTS (SELECT 1 FROM "Equipo_Quirurgico" eq WHERE eq.id_nota_operatoria = n.id AND eq.id_medico::text = @id)
		)`

func GetNotasFromMedic(id string) ([]Notas, error) {
	args := argsConPlazo()
	args["id"] = id
	return consultarNotas(config.PsqlDB, `
		SELECT `+columnas+`
		FROM "Nota_Operatoria" n
		WHERE `+condicionParticipa+`
		AND n.eliminado = FALSE
		ORDER BY n.fecha_comienzo DESC, n.id DESC;
	`, args)
}

func GetNotasFromMedicDates(id string, from time.Time, to time.Time) ([]Notas, error) {
	args := argsConPlazo()
	args["id"] = id
	args["from"] = from
	args["to"] = to
	return consultarNotas(config.PsqlDB, `
		SELECT `+columnas+`
		FROM "Nota_Operatoria" n
		WHERE `+condicionParticipa+`
		AND n.eliminado = FALSE
		AND n.fecha_comienzo BETWEEN @from AND @to
		ORDER BY n.fecha_comienzo DESC, n.id DESC;
	`, args)
}

func GetNotasFromPaciente(id string) ([]Notas, error) {
	args := argsConPlazo()
	args["id"] = id
	return consultarNotas(config.PsqlDB, `
		SELECT `+columnas+`
		FROM "Nota_Operatoria" n
		WHERE n.id_paciente::text = @id
		AND n.eliminado = FALSE
		ORDER BY n.fecha_comienzo DESC, n.id DESC;
	`, args)
}

func GetNotasFromPacienteDates(id string, from time.Time, to time.Time) ([]Notas, error) {
	args := argsConPlazo()
	args["id"] = id
	args["from"] = from
	args["to"] = to
	return consultarNotas(config.PsqlDB, `
		SELECT `+columnas+`
		FROM "Nota_Operatoria" n
		WHERE n.id_paciente::text = @id
		AND n.eliminado = FALSE
		AND n.fecha_comienzo BETWEEN @from AND @to
		ORDER BY n.fecha_comienzo DESC, n.id DESC;
	`, args)
}
