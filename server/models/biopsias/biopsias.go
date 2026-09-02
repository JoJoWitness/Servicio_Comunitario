package biopsias

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"

	"server/models/notas"
	"server/models/pagination"
	"server/models/usuarios"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Errores que el controlador traduce a códigos HTTP.
var (
	ErrEstado           = errors.New("estado invalido: debe ser tomada, enviada, con_resultado o entregada")
	ErrEnviadaSinFecha  = errors.New("una biopsia enviada necesita fecha de envio")
	ErrResultadoVacio   = errors.New("una biopsia con resultado necesita el texto del informe y su fecha")
	ErrEntregaSinFecha  = errors.New("una biopsia entregada necesita fecha de entrega")
	ErrRol              = errors.New("rol invalido: debe ser origen o seguimiento")
	ErrNotaNoEncontrada = errors.New("nota no encontrada")
	ErrPacienteDistinto = errors.New("la nota y la biopsia son de pacientes distintos")
	ErrYaVinculada      = errors.New("la biopsia ya esta vinculada a esa nota")
	ErrYaTieneOrigen    = errors.New("la biopsia ya tiene una nota de origen")
	ErrRetroceso        = errors.New("solo el administrador o el medico responsable pueden retroceder el estado")
)

// columnas es el SELECT compartido, con la biopsia aliada como `b`, el
// paciente como `p` y el médico responsable como `u`. Escanear con leerBiopsia.
const columnas = `
	b.id, COALESCE(b.client_uuid::text, ''),
	b.id_paciente::text, p.nombre,
	b.id_medico_responsable::text, u.nombres, COALESCE(u.apellidos, ''), u.correo, u.rol,
	COALESCE(b.ojo, ''), b.tejido, b.descripcion_macroscopica, b.diagnostico_presuntivo, b.fecha_toma,
	COALESCE(b.laboratorio, ''), b.fecha_envio, COALESCE(b.numero_patologia, ''),
	COALESCE(b.resultado, ''), b.fecha_resultado, b.fecha_entrega,
	b.estado, b.observaciones, b.eliminado, b.created_at, b.updated_at
`

const desde = `
	FROM "Biopsia" b
	JOIN "Paciente" p ON p.id = b.id_paciente
	JOIN "Usuarios" u ON u.id = b.id_medico_responsable
`

type fila interface {
	Scan(dest ...any) error
}

func leerBiopsia(f fila, b *Biopsia) error {
	var u usuarios.UsuarioData
	if err := f.Scan(
		&b.ID, &b.ClientUUID,
		&b.IDPaciente, &b.PacienteNombre,
		&b.IDMedicoResponsable, &u.Nombres, &u.Apellidos, &u.Correo, &u.Rol,
		&b.Ojo, &b.Tejido, &b.DescripcionMacroscopica, &b.DiagnosticoPresuntivo, &b.FechaToma,
		&b.Laboratorio, &b.FechaEnvio, &b.NumeroPatologia,
		&b.Resultado, &b.FechaResultado, &b.FechaEntrega,
		&b.Estado, &b.Observaciones, &b.Eliminado, &b.CreatedAt, &b.UpdatedAt,
	); err != nil {
		return err
	}
	u.ID = b.IDMedicoResponsable
	b.MedicoResponsable = &u
	return nil
}

// consultar corre un SELECT de `columnas`, escanea y carga los vínculos de
// todas las filas en una sola consulta extra. Devuelve lista vacía, no nil.
func consultar(db *pgxpool.Pool, cuerpo string, args pgx.NamedArgs) ([]Biopsia, error) {
	rows, err := db.Query(context.Background(), `SELECT `+columnas+desde+cuerpo, args)
	if err != nil {
		log.Printf("\n\nError getting biopsias: %v", err)
		return nil, err
	}
	defer rows.Close()

	lista := []Biopsia{}
	for rows.Next() {
		var b Biopsia
		if err := leerBiopsia(rows, &b); err != nil {
			log.Printf("Error scanning biopsia: %v", err)
			return lista, err
		}
		b.Notas = []NotaVinculada{}
		lista = append(lista, b)
	}
	if err := rows.Err(); err != nil {
		return lista, err
	}

	if err := cargarVinculos(db, lista); err != nil {
		return lista, err
	}
	return lista, nil
}

// cargarVinculos rellena Notas de cada biopsia con una consulta para todas.
func cargarVinculos(db *pgxpool.Pool, lista []Biopsia) error {
	if len(lista) == 0 {
		return nil
	}
	ids := make([]int, 0, len(lista))
	indice := map[int]int{}
	for i := range lista {
		ids = append(ids, lista[i].ID)
		indice[lista[i].ID] = i
	}

	query := `
		SELECT nb.id_biopsia, nb.id_nota_operatoria, nb.rol, nb.vinculada_en,
			n.fecha_comienzo, n.intervencion_realizada
		FROM "Nota_Biopsia" nb
		JOIN "Nota_Operatoria" n ON n.id = nb.id_nota_operatoria
		WHERE nb.id_biopsia = ANY(@ids)
		AND n.eliminado = FALSE
		ORDER BY CASE nb.rol WHEN 'origen' THEN 0 ELSE 1 END, n.fecha_comienzo;
	`
	rows, err := db.Query(context.Background(), query, pgx.NamedArgs{"ids": ids})
	if err != nil {
		log.Printf("\n\nError getting biopsia links: %v", err)
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var idBiopsia int
		var v NotaVinculada
		if err := rows.Scan(&idBiopsia, &v.IDNota, &v.Rol, &v.VinculadaEn, &v.FechaComienzo, &v.Intervencion); err != nil {
			return err
		}
		if i, ok := indice[idBiopsia]; ok {
			lista[i].Notas = append(lista[i].Notas, v)
		}
	}
	return rows.Err()
}

// Get carga la biopsia vigente con ese id. pgx.ErrNoRows si no existe o fue
// dada de baja.
func (b *Biopsia) Get(db *pgxpool.Pool) error {
	lista, err := consultar(db, `WHERE b.id = @id AND b.eliminado = FALSE;`, pgx.NamedArgs{"id": b.ID})
	if err != nil {
		return err
	}
	if len(lista) == 0 {
		return pgx.ErrNoRows
	}
	*b = lista[0]
	return nil
}

// Existe indica si la biopsia está registrada y vigente.
func Existe(db *pgxpool.Pool, id int) (bool, error) {
	var existe bool
	err := db.QueryRow(context.Background(),
		`SELECT EXISTS (SELECT 1 FROM "Biopsia" WHERE id = @id AND eliminado = FALSE);`,
		pgx.NamedArgs{"id": id}).Scan(&existe)
	return existe, err
}

// DeNota devuelve las biopsias vigentes vinculadas a esa nota.
func DeNota(db *pgxpool.Pool, notaID int) ([]Biopsia, error) {
	return consultar(db, `
		WHERE b.eliminado = FALSE
		AND EXISTS (SELECT 1 FROM "Nota_Biopsia" nb WHERE nb.id_biopsia = b.id AND nb.id_nota_operatoria = @nota)
		ORDER BY b.fecha_toma DESC, b.id DESC;`, pgx.NamedArgs{"nota": notaID})
}

// DePaciente devuelve las biopsias vigentes del paciente, la más reciente primero.
func DePaciente(db *pgxpool.Pool, pacienteID string) ([]Biopsia, error) {
	return consultar(db, `
		WHERE b.eliminado = FALSE
		AND b.id_paciente::text = @paciente
		ORDER BY b.fecha_toma DESC, b.id DESC;`, pgx.NamedArgs{"paciente": pacienteID})
}

// whereFiltro arma el WHERE del listado de seguimiento.
func whereFiltro(f Filtro, args pgx.NamedArgs) string {
	where := `WHERE b.eliminado = FALSE`
	if len(f.Estados) > 0 {
		where += ` AND b.estado = ANY(@estados)`
		args["estados"] = f.Estados
	}
	if f.MedicoID != "" {
		// Responsable, o participante de cualquier nota vinculada: el mismo
		// criterio de "sus notas" de HU-11, extendido a través del puente.
		where += `
			AND (
				b.id_medico_responsable::text = @medico
				OR EXISTS (
					SELECT 1 FROM "Nota_Biopsia" nb
					JOIN "Nota_Operatoria" n ON n.id = nb.id_nota_operatoria
					WHERE nb.id_biopsia = b.id
					AND (
						n.id_medico_encargado::text = @medico
						OR EXISTS (SELECT 1 FROM "Equipo_Quirurgico" eq WHERE eq.id_nota_operatoria = n.id AND eq.id_medico::text = @medico)
					)
				)
			)`
		args["medico"] = f.MedicoID
	}
	if f.PacienteID != "" {
		where += ` AND b.id_paciente::text = @paciente`
		args["paciente"] = f.PacienteID
	}
	if !f.From.IsZero() {
		where += ` AND b.fecha_toma >= @from`
		args["from"] = f.From
	}
	if !f.To.IsZero() {
		where += ` AND b.fecha_toma <= @to`
		args["to"] = f.To
	}
	if !f.SinResultadoDesde.IsZero() {
		where += ` AND b.fecha_toma <= @sin_resultado_desde AND b.estado IN ('tomada', 'enviada')`
		args["sin_resultado_desde"] = f.SinResultadoDesde
	}
	return where
}

// GetAllPaged devuelve una página del listado de seguimiento y el total.
func GetAllPaged(db *pgxpool.Pool, f Filtro, p pagination.Params) ([]Biopsia, int, error) {
	args := pgx.NamedArgs{}
	where := whereFiltro(f, args)

	var total int
	if err := db.QueryRow(context.Background(),
		`SELECT COUNT(*) FROM "Biopsia" b `+where, args).Scan(&total); err != nil {
		log.Printf("Error counting biopsias: %v", err)
		return nil, 0, err
	}

	args["limit"] = p.Size
	args["offset"] = p.Offset()
	lista, err := consultar(db, where+`
		ORDER BY `+p.SortBy+` `+p.Order+` NULLS LAST, b.id DESC
		LIMIT @limit OFFSET @offset;`, args)
	return lista, total, err
}

// Pendientes cuenta, para el encabezado de la pantalla de seguimiento, cuántas
// biopsias siguen sin resultado y cuántas de ellas superan `dias` desde la toma.
func Pendientes(db *pgxpool.Pool, medicoID string, dias int) (sinResultado int, atrasadas int, err error) {
	args := pgx.NamedArgs{"dias": dias}
	where := whereFiltro(Filtro{MedicoID: medicoID, Estados: []string{EstadoTomada, EstadoEnviada}}, args)
	err = db.QueryRow(context.Background(), `
		SELECT COUNT(*), COUNT(*) FILTER (WHERE b.fecha_toma <= CURRENT_DATE - @dias::integer)
		FROM "Biopsia" b `+where, args).Scan(&sinResultado, &atrasadas)
	return
}

// ValidarEstado comprueba que el estado sea conocido y que traiga los datos
// que exige. El servidor no infiere: rechaza la combinación inválida.
func (b *Biopsia) ValidarEstado() error {
	if _, ok := rangoEstado[b.Estado]; !ok {
		return ErrEstado
	}
	switch b.Estado {
	case EstadoEnviada:
		if b.FechaEnvio == nil {
			return ErrEnviadaSinFecha
		}
	case EstadoConResultado:
		if b.FechaResultado == nil || strings.TrimSpace(b.Resultado) == "" {
			return ErrResultadoVacio
		}
	case EstadoEntregada:
		if b.FechaEntrega == nil {
			return ErrEntregaSinFecha
		}
	}
	return nil
}

// EsRetroceso dice si pasar de `anterior` al estado de b va hacia atrás.
func (b *Biopsia) EsRetroceso(anterior string) bool {
	return rangoEstado[b.Estado] < rangoEstado[anterior]
}

// LimpiarEstadosAbandonados borra los datos de los estados que quedan por
// delante del actual, tras un retroceso confirmado.
func (b *Biopsia) LimpiarEstadosAbandonados() {
	r := rangoEstado[b.Estado]
	if r < rangoEstado[EstadoEntregada] {
		b.FechaEntrega = nil
	}
	if r < rangoEstado[EstadoConResultado] {
		b.Resultado = ""
		b.FechaResultado = nil
	}
	if r < rangoEstado[EstadoEnviada] {
		b.FechaEnvio = nil
	}
}

func nullSiVacio(s string) any {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return s
}

func (b *Biopsia) args() pgx.NamedArgs {
	return pgx.NamedArgs{
		"id":                       b.ID,
		"id_paciente":              b.IDPaciente,
		"id_medico_responsable":    b.IDMedicoResponsable,
		"ojo":                      nullSiVacio(b.Ojo),
		"tejido":                   strings.TrimSpace(b.Tejido),
		"descripcion_macroscopica": b.DescripcionMacroscopica,
		"diagnostico_presuntivo":   b.DiagnosticoPresuntivo,
		"fecha_toma":               b.FechaToma,
		"laboratorio":              nullSiVacio(b.Laboratorio),
		"fecha_envio":              b.FechaEnvio,
		"numero_patologia":         nullSiVacio(b.NumeroPatologia),
		"resultado":                nullSiVacio(b.Resultado),
		"fecha_resultado":          b.FechaResultado,
		"fecha_entrega":            b.FechaEntrega,
		"estado":                   b.Estado,
		"observaciones":            b.Observaciones,
		"client_uuid":              nullSiVacio(b.ClientUUID),
	}
}

// Create inserta la biopsia (sin vínculos: ver Vincular) y la relee entera.
func (b *Biopsia) Create(db *pgxpool.Pool) error {
	if b.Estado == "" {
		b.Estado = EstadoTomada
	}
	if err := b.ValidarEstado(); err != nil {
		return err
	}

	query := `
		INSERT INTO "Biopsia"
			(id_paciente, id_medico_responsable, ojo, tejido, descripcion_macroscopica, diagnostico_presuntivo,
			 fecha_toma, laboratorio, fecha_envio, numero_patologia, resultado, fecha_resultado, fecha_entrega,
			 estado, observaciones, client_uuid)
		VALUES
			(@id_paciente::uuid, @id_medico_responsable::uuid, @ojo, @tejido, @descripcion_macroscopica, @diagnostico_presuntivo,
			 @fecha_toma, @laboratorio, @fecha_envio, @numero_patologia, @resultado, @fecha_resultado, @fecha_entrega,
			 @estado, @observaciones, @client_uuid::uuid)
		RETURNING id;
	`
	if err := db.QueryRow(context.Background(), query, b.args()).Scan(&b.ID); err != nil {
		log.Printf("\n\nError creating biopsia: %v", err)
		return err
	}
	return b.Get(db)
}

// Update reescribe la biopsia. No toca id_paciente ni client_uuid.
func (b *Biopsia) Update(db *pgxpool.Pool) error {
	if err := b.ValidarEstado(); err != nil {
		return err
	}

	query := `
		UPDATE "Biopsia" SET
			id_medico_responsable = @id_medico_responsable::uuid,
			ojo = @ojo,
			tejido = @tejido,
			descripcion_macroscopica = @descripcion_macroscopica,
			diagnostico_presuntivo = @diagnostico_presuntivo,
			fecha_toma = @fecha_toma,
			laboratorio = @laboratorio,
			fecha_envio = @fecha_envio,
			numero_patologia = @numero_patologia,
			resultado = @resultado,
			fecha_resultado = @fecha_resultado,
			fecha_entrega = @fecha_entrega,
			estado = @estado,
			observaciones = @observaciones,
			updated_at = NOW()
		WHERE id = @id AND eliminado = FALSE;
	`
	if _, err := db.Exec(context.Background(), query, b.args()); err != nil {
		log.Printf("\n\nError updating biopsia: %v", err)
		return err
	}
	return b.Get(db)
}

// Delete da de baja lógica: la fila y sus vínculos se conservan.
func Delete(db *pgxpool.Pool, id int) error {
	_, err := db.Exec(context.Background(),
		`UPDATE "Biopsia" SET eliminado = TRUE, updated_at = NOW() WHERE id = @id;`,
		pgx.NamedArgs{"id": id})
	if err != nil {
		log.Printf("\n\nError deleting biopsia: %v", err)
	}
	return err
}

// BuscarPorClientUUID devuelve la biopsia ya subida con ese identificador de
// dispositivo (aunque esté dada de baja: lo que no puede pasar es que la cola
// la reviva), o nil si todavía no está.
func BuscarPorClientUUID(db *pgxpool.Pool, clientUUID string) (*Biopsia, error) {
	if clientUUID == "" {
		return nil, nil
	}
	var id int
	err := db.QueryRow(context.Background(),
		`SELECT id FROM "Biopsia" WHERE client_uuid::text = @c;`,
		pgx.NamedArgs{"c": clientUUID}).Scan(&id)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	b := &Biopsia{ID: id}
	if err := b.Get(db); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &Biopsia{ID: id, ClientUUID: clientUUID, Eliminado: true}, nil
		}
		return nil, err
	}
	return b, nil
}

// Vincular liga la biopsia a la nota con el rol dado. Valida que la nota
// exista, que sea del mismo paciente, que la pareja no esté ya vinculada y que
// no haya dos notas de origen. Con rol origen marca `tuvo_biopsia` en la nota.
func Vincular(db *pgxpool.Pool, notaID, biopsiaID int, rol, usuarioID string) error {
	if rol == "" {
		rol = RolOrigen
	}
	if rol != RolOrigen && rol != RolSeguimiento {
		return ErrRol
	}

	pacienteNota, err := notas.PacienteDeNota(db, notaID)
	if err != nil {
		return err
	}
	if pacienteNota == "" {
		return ErrNotaNoEncontrada
	}

	var pacienteBiopsia string
	if err := db.QueryRow(context.Background(),
		`SELECT id_paciente::text FROM "Biopsia" WHERE id = @id AND eliminado = FALSE;`,
		pgx.NamedArgs{"id": biopsiaID}).Scan(&pacienteBiopsia); err != nil {
		return err
	}
	if pacienteBiopsia != pacienteNota {
		return ErrPacienteDistinto
	}

	var yaVinculada, tieneOrigen bool
	if err := db.QueryRow(context.Background(), `
		SELECT
			EXISTS (SELECT 1 FROM "Nota_Biopsia" WHERE id_biopsia = @b AND id_nota_operatoria = @n),
			EXISTS (SELECT 1 FROM "Nota_Biopsia" nb JOIN "Nota_Operatoria" n ON n.id = nb.id_nota_operatoria
				WHERE nb.id_biopsia = @b AND nb.rol = 'origen' AND n.eliminado = FALSE);`,
		pgx.NamedArgs{"b": biopsiaID, "n": notaID}).Scan(&yaVinculada, &tieneOrigen); err != nil {
		return err
	}
	if yaVinculada {
		return ErrYaVinculada
	}
	if rol == RolOrigen && tieneOrigen {
		return ErrYaTieneOrigen
	}

	_, err = db.Exec(context.Background(), `
		INSERT INTO "Nota_Biopsia" (id_nota_operatoria, id_biopsia, rol, vinculada_por)
		VALUES (@n, @b, @rol, @u::uuid);`,
		pgx.NamedArgs{"n": notaID, "b": biopsiaID, "rol": rol, "u": nullSiVacio(usuarioID)})
	if err != nil {
		log.Printf("\n\nError linking biopsia: %v", err)
		return err
	}

	if rol == RolOrigen {
		return notas.MarcarTuvoBiopsia(db, notaID)
	}
	return nil
}

// Desvincular quita el vínculo. No toca `tuvo_biopsia` (PRD 0.5.0, D3).
func Desvincular(db *pgxpool.Pool, notaID, biopsiaID int) error {
	_, err := db.Exec(context.Background(),
		`DELETE FROM "Nota_Biopsia" WHERE id_nota_operatoria = @n AND id_biopsia = @b;`,
		pgx.NamedArgs{"n": notaID, "b": biopsiaID})
	if err != nil {
		log.Printf("\n\nError unlinking biopsia: %v", err)
	}
	return err
}

// participaEnLote dice, en una consulta, en cuáles de esas biopsias el usuario
// es responsable o participa en alguna nota vinculada.
func participaEnLote(db *pgxpool.Pool, ids []int, userID string) (map[int]bool, error) {
	participa := map[int]bool{}
	if len(ids) == 0 {
		return participa, nil
	}
	rows, err := db.Query(context.Background(), `
		SELECT b.id FROM "Biopsia" b
		WHERE b.id = ANY(@ids)
		AND (
			b.id_medico_responsable::text = @u
			OR EXISTS (
				SELECT 1 FROM "Nota_Biopsia" nb
				JOIN "Nota_Operatoria" n ON n.id = nb.id_nota_operatoria
				WHERE nb.id_biopsia = b.id
				AND (
					n.id_medico_encargado::text = @u
					OR EXISTS (SELECT 1 FROM "Equipo_Quirurgico" eq WHERE eq.id_nota_operatoria = n.id AND eq.id_medico::text = @u)
				)
			)
		);`, pgx.NamedArgs{"ids": ids, "u": userID})
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		participa[id] = true
	}
	return participa, rows.Err()
}

// CompletarPermisos rellena PuedeEditar y PuedeTramitar para quien pregunta.
// `rol` es el de la sesión (admin | medico | secretaria).
func CompletarPermisos(db *pgxpool.Pool, lista []Biopsia, userID, rol string) error {
	participa := map[int]bool{}
	if rol == "medico" {
		ids := make([]int, 0, len(lista))
		for _, b := range lista {
			ids = append(ids, b.ID)
		}
		var err error
		if participa, err = participaEnLote(db, ids, userID); err != nil {
			return err
		}
	}
	for i := range lista {
		b := &lista[i]
		switch rol {
		case "admin":
			b.PuedeEditar, b.PuedeTramitar = true, true
		case "medico":
			b.PuedeEditar = participa[b.ID]
			b.PuedeTramitar = participa[b.ID]
		case "secretaria":
			b.PuedeEditar = false
			b.PuedeTramitar = true
		}
	}
	return nil
}

// Describir arma el texto corto de una biopsia para mensajes y logs.
func (b *Biopsia) Describir() string {
	if b.NumeroPatologia != "" {
		return fmt.Sprintf("%s (%s)", b.Tejido, b.NumeroPatologia)
	}
	return b.Tejido
}
