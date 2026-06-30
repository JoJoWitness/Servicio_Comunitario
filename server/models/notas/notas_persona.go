package notas

import (
	"context"
	"log"
	"time"

	"server/config"

	"github.com/jackc/pgx/v5"
)

func GetNotasFromMedic(id string) ([]Notas, error) {
	query := `
		SELECT
			id, dx_pre_operatorio, dx_post_operatorio, intervencion_realizada, fecha_comienzo, fecha_culminacion, hora_comienzo, hora_culminacion, resumen_intervencion, pabellon, es_electiva, es_emergencia, tuvo_biopsia, anestia, id_paciente, medico_encargado, eliminado
		FROM notas n
		JOIN notas ON equipo_quirurgico.id eq = notas.id n
		JOIN usuarios ON equipo_quirurgico.id_usuario = usuarios.id u
		WHERE u.id = @id;
	`

	rows, err := config.PsqlDB.Query(context.Background(), query, pgx.NamedArgs{"id": id})
	if err != nil {
		log.Printf("\n\nError getting records: %v", err)
		return nil, err
	}
	defer rows.Close()

	var records []Notas
	for rows.Next() {
		var r Notas
		err := rows.Scan(&r.ID, &r.DX_Pre_Operatorio, &r.DX_Post_Operatorio, &r.Intervencion_Realizado, &r.Fecha_Comienzo, &r.Fecha_Culminacion, &r.Hora_Comienzo, &r.Hora_Culminacion, &r.Resumen_Intervencion, &r.Pabellon, &r.Es_Electiva, &r.Es_Emergencia, &r.Tuvo_Biopsia, &r.Anestia, &r.ID_Paciente, &r.Medico_Encargado, &r.Eliminado)
		if err != nil {
			log.Printf("Error fetching records: %v", err)
			return records, err
		}
		records = append(records, r)
	}

	return records, nil
}

func GetNotasFromMedicDates(id string, from time.Time, to time.Time) ([]Notas, error) {
	query := `
		SELECT
			id, dx_pre_operatorio, dx_post_operatorio, intervencion_realizada, fecha_comienzo, fecha_culminacion, hora_comienzo, hora_culminacion, resumen_intervencion, pabellon, es_electiva, es_emergencia, tuvo_biopsia, anestia, id_paciente, medico_encargado, eliminado
		FROM notas n
		JOIN notas ON equipo_quirurgico.id eq = notas.id n
		JOIN usuarios ON equipo_quirurgico.id_usuario = usuarios.id u
		WHERE u.id = @id
		AND n.fecha_comienzo BETWEEN @from AND @to;
	`

	rows, err := config.PsqlDB.Query(context.Background(), query, pgx.NamedArgs{"id": id})
	if err != nil {
		log.Printf("\n\nError getting records: %v", err)
		return nil, err
	}
	defer rows.Close()

	var records []Notas
	for rows.Next() {
		var r Notas
		err := rows.Scan(&r.ID, &r.DX_Pre_Operatorio, &r.DX_Post_Operatorio, &r.Intervencion_Realizado, &r.Fecha_Comienzo, &r.Fecha_Culminacion, &r.Hora_Comienzo, &r.Hora_Culminacion, &r.Resumen_Intervencion, &r.Pabellon, &r.Es_Electiva, &r.Es_Emergencia, &r.Tuvo_Biopsia, &r.Anestia, &r.ID_Paciente, &r.Medico_Encargado, &r.Eliminado)
		if err != nil {
			log.Printf("Error fetching records: %v", err)
			return records, err
		}
		records = append(records, r)
	}

	return records, nil
}

func GetNotasFromPaciente(id string) ([]Notas, error) {
	query := `
		SELECT
			id, dx_pre_operatorio, dx_post_operatorio, intervencion_realizada, fecha_comienzo, fecha_culminacion, hora_comienzo, hora_culminacion, resumen_intervencion, pabellon, es_electiva, es_emergencia, tuvo_biopsia, anestia, id_paciente, medico_encargado, eliminado
		FROM notas n
		WHERE n.id_paciente = @id;
	`

	rows, err := config.PsqlDB.Query(context.Background(), query, pgx.NamedArgs{"id": id})
	if err != nil {
		log.Printf("\n\nError getting records: %v", err)
		return nil, err
	}
	defer rows.Close()

	var records []Notas
	for rows.Next() {
		var r Notas
		err := rows.Scan(&r.ID, &r.DX_Pre_Operatorio, &r.DX_Post_Operatorio, &r.Intervencion_Realizado, &r.Fecha_Comienzo, &r.Fecha_Culminacion, &r.Hora_Comienzo, &r.Hora_Culminacion, &r.Resumen_Intervencion, &r.Pabellon, &r.Es_Electiva, &r.Es_Emergencia, &r.Tuvo_Biopsia, &r.Anestia, &r.ID_Paciente, &r.Medico_Encargado, &r.Eliminado)
		if err != nil {
			log.Printf("Error fetching records: %v", err)
			return records, err
		}
		records = append(records, r)
	}

	return records, nil
}

func GetNotasFromPacienteDates(id string, from time.Time, to time.Time) ([]Notas, error) {
	query := `
		SELECT
			id, dx_pre_operatorio, dx_post_operatorio, intervencion_realizada, fecha_comienzo, fecha_culminacion, hora_comienzo, hora_culminacion, resumen_intervencion, pabellon, es_electiva, es_emergencia, tuvo_biopsia, anestia, id_paciente, medico_encargado, eliminado
		FROM notas n
		WHERE n.id_paciente = @id
		AND n.fecha_comienzo BETWEEN @from AND @to;
	`

	rows, err := config.PsqlDB.Query(context.Background(), query, pgx.NamedArgs{"id": id})
	if err != nil {
		log.Printf("\n\nError getting records: %v", err)
		return nil, err
	}
	defer rows.Close()

	var records []Notas
	for rows.Next() {
		var r Notas
		err := rows.Scan(&r.ID, &r.DX_Pre_Operatorio, &r.DX_Post_Operatorio, &r.Intervencion_Realizado, &r.Fecha_Comienzo, &r.Fecha_Culminacion, &r.Hora_Comienzo, &r.Hora_Culminacion, &r.Resumen_Intervencion, &r.Pabellon, &r.Es_Electiva, &r.Es_Emergencia, &r.Tuvo_Biopsia, &r.Anestia, &r.ID_Paciente, &r.Medico_Encargado, &r.Eliminado)
		if err != nil {
			log.Printf("Error fetching records: %v", err)
			return records, err
		}
		records = append(records, r)
	}

	return records, nil
}
