package notas

import (
	"context"
	"log"

	"server/config"
	"server/models/usuarios"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// getMedicos trae el equipo quirúrgico (médicos) de una nota.
func getMedicos(db *pgxpool.Pool, notaID int) ([]usuarios.Usuarios, error) {
	query := `
		SELECT u.id, u.correo, u.nombres, u.apellidos, u.rol
		FROM equipo_quirurgico eq
		JOIN usuarios u ON u.id = eq.id_usuario
		WHERE eq.id_nota = @id;
	`

	rows, err := db.Query(context.Background(), query, pgx.NamedArgs{"id": notaID})
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	medicos := []usuarios.Usuarios{}
	for rows.Next() {
		var u usuarios.Usuarios
		if err := rows.Scan(&u.ID, &u.Correo, &u.Nombres, &u.Apellidos, &u.Rol); err != nil {
			return nil, err
		}
		medicos = append(medicos, u)
	}
	return medicos, rows.Err()
}

func (n *Notas) Get(db *pgxpool.Pool) error {
	query := `
		SELECT
			id, dx_pre_operatorio, dx_post_operatorio, intervencion_realizada, fecha_comienzo, fecha_culminacion, hora_comienzo, hora_culminacion, resumen_intervencion, pabellon, es_electiva, es_emergencia, tuvo_biopsia, anestia, id_paciente, medico_encargado, eliminado
		FROM notas
		WHERE id = @id;
	`

	row := db.QueryRow(context.Background(), query, pgx.NamedArgs{"id": n.ID})
	err := row.Scan(&n.ID, &n.DX_Pre_Operatorio, &n.DX_Post_Operatorio, &n.Intervencion_Realizado, &n.Fecha_Comienzo, &n.Fecha_Culminacion, &n.Hora_Comienzo, &n.Hora_Culminacion, &n.Resumen_Intervencion, &n.Pabellon, &n.Es_Electiva, &n.Es_Emergencia, &n.Tuvo_Biopsia, &n.Anestia, &n.ID_Paciente, &n.Medico_Encargado, &n.Eliminado)
	if err != nil {
		log.Printf("\n\nError getting nota: %v", err)
		return err
	}

	n.Medicos, err = getMedicos(db, n.ID)
	if err != nil {
		log.Printf("\n\nError getting medicos for nota: %v", err)
		return err
	}

	return nil
}

func GetAllNotas(db *pgxpool.Pool) ([]Notas, error) {
	query := `
		SELECT
			id, dx_pre_operatorio, dx_post_operatorio, intervencion_realizada, fecha_comienzo, fecha_culminacion, hora_comienzo, hora_culminacion, resumen_intervencion, pabellon, es_electiva, es_emergencia, tuvo_biopsia, anestia, id_paciente, medico_encargado, eliminado
		FROM notas;
	`

	rows, err := db.Query(context.Background(), query)
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
	if err := rows.Err(); err != nil {
		return records, err
	}

	for i := range records {
		records[i].Medicos, err = getMedicos(db, records[i].ID)
		if err != nil {
			return records, err
		}
	}
	return records, nil
}

func CheckNotasDate(id int) error {
	query := `SELECT 1 FROM notas WHERE id = @id AND created_at::date = CURRENT_DATE;`

	var one int
	err := config.PsqlDB.QueryRow(context.Background(), query, pgx.NamedArgs{"id": id}).Scan(&one)
	if err != nil {
		log.Printf("\n\nNota is not from today or not found: %v", err)
		return err
	}
	return nil
}

func (n *Notas) Create(db *pgxpool.Pool) error {
	query := `
		INSERT INTO notas
			(dx_pre_operatorio, dx_post_operatorio, intervencion_realizada, fecha_comienzo, fecha_culminacion, hora_comienzo, hora_culminacion, resumen_intervencion, pabellon, es_electiva, es_emergencia, tuvo_biopsia, anestia, id_paciente, medico_encargado, eliminado) 
		VALUES 
			(@dx_pre_operatorio, @dx_post_operatorio, @intervencion_realizada, @fecha_comienzo, @fecha_culminacion, @hora_comienzo, @hora_culminacion, @resumen_intervencion, @pabellon, @es_electiva, @es_emergencia, @tuvo_biopsia, @anestia, @id_paciente, @medico_encargado, @eliminado);
	`

	args := pgx.NamedArgs{
		"dx_pre_operatorio":      n.DX_Pre_Operatorio,
		"dx_post_operatorio":     n.DX_Post_Operatorio,
		"intervencion_realizada": n.Intervencion_Realizado,
		"fecha_comienzo":         n.Fecha_Comienzo,
		"fecha_culminacion":      n.Fecha_Culminacion,
		"hora_comienzo":          n.Hora_Comienzo,
		"hora_culminacion":       n.Hora_Culminacion,
		"resumen_intervencion":   n.Resumen_Intervencion,
		"pabellon":               n.Pabellon,
		"es_electiva":            n.Es_Electiva,
		"es_emergencia":          n.Es_Emergencia,
		"tuvo_biopsia":           n.Tuvo_Biopsia,
		"anestia":                n.Anestia,
		"id_paciente":            n.ID_Paciente,
		"medico_encargado":       n.Medico_Encargado,
		"eliminado":              n.Eliminado,
	}

	_, err := db.Exec(context.Background(), query, args)
	if err != nil {
		log.Printf("\n\nError creating nota: %v", err)
		return err
	}

	return nil
}

func (n *Notas) Update(db *pgxpool.Pool) error {
	query := `
		UPDATE notas
		SET
			dx_pre_operatorio = @dx_pre_operatorio,
			dx_post_operatorio = @dx_post_operatorio,
			intervencion_realizada = @intervencion_realizada,
			fecha_comienzo = @fecha_comienzo,
			fecha_culminacion = @fecha_culminacion,
			hora_comienzo = @hora_comienzo,
			hora_culminacion = @hora_culminacion,
			resumen_intervencion = @resumen_intervencion,
			pabellon = @pabellon,
			es_electiva = @es_electiva,
			es_emergencia = @es_emergencia,
			tuvo_biopsia = @tuvo_biopsia,
			anestia = @anestia,
			id_paciente = @id_paciente,
			medico_encargado = @medico_encargado,
			eliminado = @eliminado
		WHERE id = @id;
	`

	args := pgx.NamedArgs{
		"id":                     n.ID,
		"dx_pre_operatorio":      n.DX_Pre_Operatorio,
		"dx_post_operatorio":     n.DX_Post_Operatorio,
		"intervencion_realizada": n.Intervencion_Realizado,
		"fecha_comienzo":         n.Fecha_Comienzo,
		"fecha_culminacion":      n.Fecha_Culminacion,
		"hora_comienzo":          n.Hora_Comienzo,
		"hora_culminacion":       n.Hora_Culminacion,
		"resumen_intervencion":   n.Resumen_Intervencion,
		"pabellon":               n.Pabellon,
		"es_electiva":            n.Es_Electiva,
		"es_emergencia":          n.Es_Emergencia,
		"tuvo_biopsia":           n.Tuvo_Biopsia,
		"anestia":                n.Anestia,
		"id_paciente":            n.ID_Paciente,
		"medico_encargado":       n.Medico_Encargado,
		"eliminado":              n.Eliminado,
	}

	_, err := db.Exec(context.Background(), query, args)
	if err != nil {
		log.Printf("\n\nError updating nota: %v", err)
		return err
	}

	return nil
}

func (n *Notas) Delete(db *pgxpool.Pool) error {
	query := `DELETE FROM notas WHERE id = @id;`

	_, err := db.Exec(context.Background(), query, pgx.NamedArgs{"id": n.ID})
	if err != nil {
		log.Printf("\n\nError deleting record: %v", err)
		return err
	}

	return nil
}
