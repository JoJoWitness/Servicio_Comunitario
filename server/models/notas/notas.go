package notas

import (
	"context"
	"errors"
	"log"

	"server/config"
	"server/models/pagination"
	"server/models/usuarios"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// getMedicos trae el equipo quirúrgico (médicos) de una nota.
func getMedicos(db *pgxpool.Pool, notaID int) ([]usuarios.Usuarios, error) {
	query := `
		SELECT u.id, u.correo, u.nombres, u.apellidos, u.rol
		FROM "Equipo_Quirurgico" eq
		JOIN "Usuarios" u ON u.id = eq.id_medico
		WHERE eq.id_nota_operatoria = @id;
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
			id, dx_pre_operatorio, dx_post_operatorio, intervencion_realizada, fecha_comienzo, fecha_culminacion, hora_comienzo, hora_culminacion, resumen_intevencion, pabellon, es_electiva, es_emergencia, tuvo_biopsia, anestesia, id_paciente, id_medico_encargado, eliminado, COALESCE(client_uuid::text, '')
		FROM "Nota_Operatoria"
		WHERE id = @id
		AND eliminado = FALSE;
	`

	row := db.QueryRow(context.Background(), query, pgx.NamedArgs{"id": n.ID})
	err := row.Scan(&n.ID, &n.DX_Pre_Operatorio, &n.DX_Post_Operatorio, &n.Intervencion_Realizado, &n.Fecha_Comienzo, &n.Fecha_Culminacion, &n.Hora_Comienzo, &n.Hora_Culminacion, &n.Resumen_Intervencion, &n.Pabellon, &n.Es_Electiva, &n.Es_Emergencia, &n.Tuvo_Biopsia, &n.Anestia, &n.ID_Paciente, &n.Medico_Encargado, &n.Eliminado, &n.ClientUUID)
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

// GetAllNotas devuelve las notas vigentes de todo el servicio, que es lo que ve
// la secretaria (HU-16). El filtro es opcional y sirve para la búsqueda (HU-17).
func GetAllNotas(db *pgxpool.Pool, f FiltroNotas) ([]Notas, error) {
	query := `
		SELECT
			n.id, n.dx_pre_operatorio, n.dx_post_operatorio, n.intervencion_realizada, n.fecha_comienzo, n.fecha_culminacion, n.hora_comienzo, n.hora_culminacion, n.resumen_intevencion, n.pabellon, n.es_electiva, n.es_emergencia, n.tuvo_biopsia, n.anestesia, n.id_paciente, n.id_medico_encargado, n.eliminado
		FROM "Nota_Operatoria" n
		WHERE n.eliminado = FALSE
	`

	args := pgx.NamedArgs{}

	// Un médico cuenta como participante si es el encargado o si está en el
	// equipo quirúrgico.
	if f.MedicoID != "" {
		query += `
			AND (
				n.id_medico_encargado::text = @medico
				OR EXISTS (SELECT 1 FROM "Equipo_Quirurgico" eq WHERE eq.id_nota_operatoria = n.id AND eq.id_medico::text = @medico)
			)`
		args["medico"] = f.MedicoID
	}

	if f.PacienteID != "" {
		// Como texto para que un UUID mal formado no aborte la consulta.
		query += " AND n.id_paciente::text = @paciente"
		args["paciente"] = f.PacienteID
	}

	if !f.From.IsZero() {
		query += " AND n.fecha_comienzo >= @from"
		args["from"] = f.From
	}

	if !f.To.IsZero() {
		query += " AND n.fecha_comienzo <= @to"
		args["to"] = f.To
	}

	// La más reciente primero: es el orden en que se consultan.
	query += " ORDER BY n.fecha_comienzo DESC, n.id DESC;"

	rows, err := db.Query(context.Background(), query, args)
	if err != nil {
		log.Printf("\n\nError getting records: %v", err)
		return nil, err
	}
	defer rows.Close()

	records := []Notas{}
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

// GetAllNotasPaged devuelve una página de notas vigentes y el total de registros
// para paginación server-side. Respeta los mismos filtros que GetAllNotas.
func GetAllNotasPaged(db *pgxpool.Pool, f FiltroNotas, p pagination.Params) ([]Notas, int, error) {
	// Construir la cláusula WHERE compartida por COUNT y SELECT.
	where := `WHERE n.eliminado = FALSE`
	args := pgx.NamedArgs{}

	if f.MedicoID != "" {
		where += `
			AND (
				n.id_medico_encargado::text = @medico
				OR EXISTS (SELECT 1 FROM "Equipo_Quirurgico" eq WHERE eq.id_nota_operatoria = n.id AND eq.id_medico::text = @medico)
			)`
		args["medico"] = f.MedicoID
	}
	if f.PacienteID != "" {
		where += " AND n.id_paciente::text = @paciente"
		args["paciente"] = f.PacienteID
	}
	if !f.From.IsZero() {
		where += " AND n.fecha_comienzo >= @from"
		args["from"] = f.From
	}
	if !f.To.IsZero() {
		where += " AND n.fecha_comienzo <= @to"
		args["to"] = f.To
	}

	// 1. Total
	var total int
	if err := db.QueryRow(context.Background(),
		`SELECT COUNT(*) FROM "Nota_Operatoria" n `+where, args).Scan(&total); err != nil {
		log.Printf("Error counting notas: %v", err)
		return nil, 0, err
	}

	// 2. Página
	args["limit"] = p.Size
	args["offset"] = p.Offset()
	dataQuery := `
		SELECT n.id, n.dx_pre_operatorio, n.dx_post_operatorio, n.intervencion_realizada,
			n.fecha_comienzo, n.fecha_culminacion, n.hora_comienzo, n.hora_culminacion,
			n.resumen_intevencion, n.pabellon, n.es_electiva, n.es_emergencia, n.tuvo_biopsia,
			n.anestesia, n.id_paciente, n.id_medico_encargado, n.eliminado
		FROM "Nota_Operatoria" n ` + where + `
		ORDER BY ` + p.SortBy + ` ` + p.Order + `
		LIMIT @limit OFFSET @offset;`

	rows, err := db.Query(context.Background(), dataQuery, args)
	if err != nil {
		log.Printf("Error getting notas page: %v", err)
		return nil, total, err
	}
	defer rows.Close()

	records := []Notas{}
	for rows.Next() {
		var r Notas
		if err := rows.Scan(&r.ID, &r.DX_Pre_Operatorio, &r.DX_Post_Operatorio, &r.Intervencion_Realizado,
			&r.Fecha_Comienzo, &r.Fecha_Culminacion, &r.Hora_Comienzo, &r.Hora_Culminacion,
			&r.Resumen_Intervencion, &r.Pabellon, &r.Es_Electiva, &r.Es_Emergencia, &r.Tuvo_Biopsia,
			&r.Anestia, &r.ID_Paciente, &r.Medico_Encargado, &r.Eliminado); err != nil {
			log.Printf("Error fetching nota page: %v", err)
			return records, total, err
		}
		records = append(records, r)
	}
	if err := rows.Err(); err != nil {
		return records, total, err
	}

	for i := range records {
		records[i].Medicos, err = getMedicos(db, records[i].ID)
		if err != nil {
			return records, total, err
		}
	}
	return records, total, nil
}

// EsParticipante indica si el usuario es el médico encargado de la nota o parte
// de su equipo quirúrgico. Es la regla que impide que un médico edite o borre
// una operación ajena (HU-22).
func EsParticipante(db *pgxpool.Pool, notaID int, userID string) (bool, error) {
	query := `
		SELECT EXISTS (
			SELECT 1
			FROM "Nota_Operatoria" n
			WHERE n.id = @nota
			AND (
				n.id_medico_encargado::text = @usuario
				OR EXISTS (SELECT 1 FROM "Equipo_Quirurgico" eq WHERE eq.id_nota_operatoria = n.id AND eq.id_medico::text = @usuario)
			)
		);
	`

	var participa bool
	err := db.QueryRow(context.Background(), query, pgx.NamedArgs{"nota": notaID, "usuario": userID}).Scan(&participa)
	if err != nil {
		log.Printf("\n\nError checking nota participation: %v", err)
		return false, err
	}

	return participa, nil
}

// ValidarEquipo comprueba que cada id del equipo corresponda a un médico activo.
// Sin esto un UUID inválido revienta como error de llave foránea (500) en vez de
// decirle al cliente qué mandó mal.
func ValidarEquipo(db *pgxpool.Pool, ids []string) ([]string, error) {
	// Los vacíos no son ids: sincronizarEquipo los descarta igual.
	limpios := []string{}
	for _, id := range ids {
		if id != "" {
			limpios = append(limpios, id)
		}
	}
	ids = limpios

	if len(ids) == 0 {
		return nil, nil
	}

	// Se compara como texto para que un UUID mal formado no aborte la consulta.
	query := `
		SELECT u.id::text
		FROM "Usuarios" u
		WHERE u.id::text = ANY(@ids)
		AND u.rol IN ('medico', 'admin')
		AND u.eliminado = FALSE;
	`

	rows, err := db.Query(context.Background(), query, pgx.NamedArgs{"ids": ids})
	if err != nil {
		log.Printf("\n\nError validating equipo quirurgico: %v", err)
		return nil, err
	}
	defer rows.Close()

	validos := map[string]bool{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		validos[id] = true
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	invalidos := []string{}
	for _, id := range ids {
		if !validos[id] {
			invalidos = append(invalidos, id)
		}
	}

	return invalidos, nil
}

// sincronizarEquipo deja "Equipo_Quirurgico" con exactamente los médicos
// indicados. El encargado siempre queda incluido: es lo que hace que la nota le
// aparezca en "Mis notas" (HU-11), que se consulta a través de esta tabla.
// La columna `rol` se deja en su default ('cirujano').
func sincronizarEquipo(ctx context.Context, tx pgx.Tx, notaID int, encargado string, equipo []string) error {
	_, err := tx.Exec(ctx, `DELETE FROM "Equipo_Quirurgico" WHERE id_nota_operatoria = @id;`, pgx.NamedArgs{"id": notaID})
	if err != nil {
		log.Printf("\n\nError clearing equipo quirurgico: %v", err)
		return err
	}

	agregados := map[string]bool{}
	for _, id := range append([]string{encargado}, equipo...) {
		if id == "" || agregados[id] {
			continue
		}
		agregados[id] = true

		_, err := tx.Exec(ctx,
			`INSERT INTO "Equipo_Quirurgico" (id_nota_operatoria, id_medico) VALUES (@id_nota, @id_usuario);`,
			pgx.NamedArgs{"id_nota": notaID, "id_usuario": id})
		if err != nil {
			log.Printf("\n\nError adding medico to equipo quirurgico: %v", err)
			return err
		}
	}

	return nil
}

// PlazoEdicionDias es la ventana, en días calendario contados desde que se
// registró la nota, dentro de la cual todavía se puede corregir o eliminar
// (HU-13, HU-14). Incluye el día del registro: con 7, una nota del lunes se
// puede editar hasta el domingo.
const PlazoEdicionDias = 7

// CheckNotasDate verifica que la nota siga dentro del plazo de edición.
func CheckNotasDate(id int) error {
	query := `
		SELECT 1
		FROM "Nota_Operatoria"
		WHERE id = @id
		AND created_at::date > CURRENT_DATE - @dias::integer;
	`

	var one int
	err := config.PsqlDB.QueryRow(context.Background(), query,
		pgx.NamedArgs{"id": id, "dias": PlazoEdicionDias}).Scan(&one)
	if err != nil {
		log.Printf("\n\nNota is outside the %d-day edit window or not found: %v", PlazoEdicionDias, err)
		return err
	}
	return nil
}

// Create guarda la nota y su equipo quirúrgico en una sola transacción: una nota
// sin equipo no le aparecería a nadie en "Mis notas".
func (n *Notas) Create(db *pgxpool.Pool) error {
	ctx := context.Background()

	tx, err := db.Begin(ctx)
	if err != nil {
		log.Printf("\n\nError starting transaction: %v", err)
		return err
	}
	defer tx.Rollback(ctx)

	// `eliminado` no se escribe: la baja es exclusiva de Delete.
	query := `
		INSERT INTO "Nota_Operatoria"
			(dx_pre_operatorio, dx_post_operatorio, intervencion_realizada, fecha_comienzo, fecha_culminacion, hora_comienzo, hora_culminacion, resumen_intevencion, pabellon, es_electiva, es_emergencia, tuvo_biopsia, anestesia, id_paciente, id_medico_encargado, client_uuid)
		VALUES
			(@dx_pre_operatorio, @dx_post_operatorio, @intervencion_realizada, @fecha_comienzo, @fecha_culminacion, @hora_comienzo, @hora_culminacion, @resumen_intevencion, @pabellon, @es_electiva, @es_emergencia, @tuvo_biopsia, @anestesia, @id_paciente, @id_medico_encargado, @client_uuid)
		RETURNING id;
	`

	args := pgx.NamedArgs{
		"dx_pre_operatorio":      n.DX_Pre_Operatorio,
		"dx_post_operatorio":     n.DX_Post_Operatorio,
		"intervencion_realizada": n.Intervencion_Realizado,
		"fecha_comienzo":         n.Fecha_Comienzo,
		"fecha_culminacion":      n.Fecha_Culminacion,
		"hora_comienzo":          n.Hora_Comienzo,
		"hora_culminacion":       n.Hora_Culminacion,
		"resumen_intevencion":    n.Resumen_Intervencion,
		"pabellon":               n.Pabellon,
		"es_electiva":            n.Es_Electiva,
		"es_emergencia":          n.Es_Emergencia,
		"tuvo_biopsia":           n.Tuvo_Biopsia,
		"anestesia":              n.Anestia,
		"id_paciente":            n.ID_Paciente,
		"id_medico_encargado":    n.Medico_Encargado,
		// La columna es UNIQUE: si fuera "" chocaría entre sí en todas las
		// notas creadas en línea, así que la ausencia se guarda como NULL.
		"client_uuid": nullSiVacio(n.ClientUUID),
	}

	// El id generado hace falta para poblar equipo_quirurgico.
	if err := tx.QueryRow(ctx, query, args).Scan(&n.ID); err != nil {
		log.Printf("\n\nError creating nota: %v", err)
		return err
	}

	if err := sincronizarEquipo(ctx, tx, n.ID, n.Medico_Encargado, n.Equipo); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		log.Printf("\n\nError committing nota: %v", err)
		return err
	}

	n.Medicos, err = getMedicos(db, n.ID)
	if err != nil {
		return err
	}

	return nil
}

// Update reescribe la nota y reemplaza su equipo quirúrgico, todo en una
// transacción. Requiere n.ID.
func (n *Notas) Update(db *pgxpool.Pool) error {
	ctx := context.Background()

	tx, err := db.Begin(ctx)
	if err != nil {
		log.Printf("\n\nError starting transaction: %v", err)
		return err
	}
	defer tx.Rollback(ctx)

	query := `
		UPDATE "Nota_Operatoria"
		SET
			dx_pre_operatorio = @dx_pre_operatorio,
			dx_post_operatorio = @dx_post_operatorio,
			intervencion_realizada = @intervencion_realizada,
			fecha_comienzo = @fecha_comienzo,
			fecha_culminacion = @fecha_culminacion,
			hora_comienzo = @hora_comienzo,
			hora_culminacion = @hora_culminacion,
			resumen_intevencion = @resumen_intevencion,
			pabellon = @pabellon,
			es_electiva = @es_electiva,
			es_emergencia = @es_emergencia,
			tuvo_biopsia = @tuvo_biopsia,
			anestesia = @anestesia,
			id_paciente = @id_paciente,
			id_medico_encargado = @id_medico_encargado
		WHERE id = @id
		AND eliminado = FALSE;
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
		"resumen_intevencion":    n.Resumen_Intervencion,
		"pabellon":               n.Pabellon,
		"es_electiva":            n.Es_Electiva,
		"es_emergencia":          n.Es_Emergencia,
		"tuvo_biopsia":           n.Tuvo_Biopsia,
		"anestesia":              n.Anestia,
		"id_paciente":            n.ID_Paciente,
		"id_medico_encargado":    n.Medico_Encargado,
	}

	if _, err := tx.Exec(ctx, query, args); err != nil {
		log.Printf("\n\nError updating nota: %v", err)
		return err
	}

	if err := sincronizarEquipo(ctx, tx, n.ID, n.Medico_Encargado, n.Equipo); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		log.Printf("\n\nError committing nota: %v", err)
		return err
	}

	n.Medicos, err = getMedicos(db, n.ID)
	if err != nil {
		return err
	}

	return nil
}

// Delete da de baja la nota de forma lógica (HU-14): la fila se conserva junto a
// su equipo quirúrgico y deja de aparecer en cualquier consulta. Una nota
// operatoria es parte de la historia clínica; no se borra de la base.
func (n *Notas) Delete(db *pgxpool.Pool) error {
	query := `UPDATE "Nota_Operatoria" SET eliminado = TRUE WHERE id = @id;`

	_, err := db.Exec(context.Background(), query, pgx.NamedArgs{"id": n.ID})
	if err != nil {
		log.Printf("\n\nError deleting record: %v", err)
		return err
	}

	return nil
}

// nullSiVacio traduce el "sin valor" de Go (cadena vacía) al NULL de SQL. Hace
// falta en las columnas UNIQUE opcionales: Postgres considera distintos entre sí
// a todos los NULL, pero no a todas las cadenas vacías.
func nullSiVacio(s string) any {
	if s == "" {
		return nil
	}
	return s
}

// BuscarPorClientUUID devuelve la nota que ya se subió con ese identificador de
// dispositivo, o (nil, nil) si todavía no está.
//
// Es el corazón de la sincronización: el médico redacta sin conexión, la nota
// espera en el dispositivo con su client_uuid, y cuando por fin hay red se
// intenta subir. Si el intento anterior llegó a guardarse pero la respuesta se
// perdió en el camino, el reintento cae aquí y devuelve la nota que ya existe en
// vez de crear una segunda copia de la misma cirugía.
func BuscarPorClientUUID(db *pgxpool.Pool, clientUUID string) (*Notas, error) {
	if clientUUID == "" {
		return nil, nil
	}

	query := `
		SELECT id
		FROM "Nota_Operatoria"
		WHERE client_uuid::text = @client_uuid;
	`

	var id int
	// Como texto para que un UUID mal formado responda "no está" en vez de
	// reventar la consulta: el cliente ya recibirá un 400 por el formato.
	err := db.QueryRow(context.Background(), query, pgx.NamedArgs{"client_uuid": clientUUID}).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		log.Printf("\n\nError looking up nota by client_uuid: %v", err)
		return nil, err
	}

	// Una nota subida y luego eliminada sigue contando como "ya entró": lo que
	// no puede pasar es que la cola local la reviva.
	nota := &Notas{ID: id}
	if err := nota.Get(db); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &Notas{ID: id, ClientUUID: clientUUID, Eliminado: true}, nil
		}
		return nil, err
	}
	return nota, nil
}

// Existe indica si la nota está registrada y vigente. Sirve para distinguir un
// 404 de un 403 antes de intentar modificarla.
func Existe(db *pgxpool.Pool, id int) (bool, error) {
	query := `SELECT EXISTS (SELECT 1 FROM "Nota_Operatoria" WHERE id = @id AND eliminado = FALSE);`

	var existe bool
	err := db.QueryRow(context.Background(), query, pgx.NamedArgs{"id": id}).Scan(&existe)
	if err != nil {
		log.Printf("\n\nError checking nota existence: %v", err)
		return false, err
	}

	return existe, nil
}
