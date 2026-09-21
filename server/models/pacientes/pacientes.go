package pacientes

import (
	"context"
	"errors"
	"log"
	"server/config"
	"server/models/pagination"
	"slices"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// columnas de "Paciente", en el orden en que las escanean Get y GetAllPacientes.
// Ojo con dos nombres del esquema: la cédula es `numero_identifiacion` (con el
// typo) y el teléfono es `numero_telefono`.
const columnas = `
	id,
	historia_medica,
	numero_identifiacion,
	tipo_documento,
	nombre,
	genero,
	fecha_nacimiento,
	numero_telefono,
	direccion,
	eliminado,
	EXISTS (SELECT 1 FROM "Paciente_Cedula" c WHERE c.id_paciente = "Paciente".id),
	telefono_alternativo,
	ocupacion,
	raza,
	antecedentes_oncologicos,
	quimioterapia_ciclos,
	radioterapia_ciclos,
	estudios_imagenes,
	hallazgo_estudios
`

// EstudiosImagenes son los valores que admite estudios_imagenes.
var EstudiosImagenes = []string{"rx", "tc", "rm", "eco"}

// normalizarAntecedentes recorta los textos, descarta estudios desconocidos y
// ciclos negativos, y deja la lista sin nil para que el JSON sea `[]`.
func (u *Pacientes) normalizarAntecedentes() {
	u.Telefono_Alternativo = strings.TrimSpace(u.Telefono_Alternativo)
	u.Ocupacion = strings.TrimSpace(u.Ocupacion)
	u.Raza = strings.TrimSpace(u.Raza)
	u.Antecedentes_Oncologicos = strings.TrimSpace(u.Antecedentes_Oncologicos)
	u.Hallazgo_Estudios = strings.TrimSpace(u.Hallazgo_Estudios)
	if u.Quimioterapia_Ciclos != nil && *u.Quimioterapia_Ciclos < 0 {
		u.Quimioterapia_Ciclos = nil
	}
	if u.Radioterapia_Ciclos != nil && *u.Radioterapia_Ciclos < 0 {
		u.Radioterapia_Ciclos = nil
	}
	limpios := make([]string, 0, len(u.Estudios_Imagenes))
	for _, e := range u.Estudios_Imagenes {
		e = strings.TrimSpace(strings.ToLower(e))
		if slices.Contains(EstudiosImagenes, e) && !slices.Contains(limpios, e) {
			limpios = append(limpios, e)
		}
	}
	u.Estudios_Imagenes = limpios
}

func (u *Pacientes) Get(db *pgxpool.Pool) error {
	if u.ID == "" && u.Historia_Medica == "" {
		return errors.New("ID or Medical History must be provided to retrieve a patient")
	}

	query := `
		SELECT ` + columnas + `
		FROM "Paciente"
		WHERE eliminado = FALSE
	`

	args := pgx.NamedArgs{}

	if u.ID != "" {
		// Como texto para que un UUID mal formado no aborte la consulta.
		query += " AND id::text = @id"
		args["id"] = u.ID
	} else if u.Historia_Medica != "" {
		query += " AND historia_medica = @historia_medica"
		args["historia_medica"] = u.Historia_Medica
	}

	row := db.QueryRow(context.Background(), query, args)
	err := row.Scan(&u.ID, &u.Historia_Medica, &u.Numero_Indentificacion, &u.Tipo_Documento, &u.Nombre, &u.Genero, &u.Fecha_Nacimiento, &u.Telefono, &u.Direccion, &u.Eliminado, &u.Tiene_Cedula,
		&u.Telefono_Alternativo, &u.Ocupacion, &u.Raza, &u.Antecedentes_Oncologicos, &u.Quimioterapia_Ciclos, &u.Radioterapia_Ciclos, &u.Estudios_Imagenes, &u.Hallazgo_Estudios)
	if err != nil {
		log.Printf("Error scanning pacientes: %v", err)
		return err
	}
	return nil
}

func (u *Pacientes) Create(db *pgxpool.Pool) error {
	// El id es UUID y la tabla no lo genera sola: lo pone el servidor.
	if u.ID == "" {
		id, err := uuid.NewV7()
		if err != nil {
			log.Printf("Error generating paciente id: %v\n", err)
			return err
		}
		u.ID = id.String()
	}

	u.normalizarAntecedentes()

	// `eliminado` no se escribe: la baja es exclusiva de Delete.
	query := `
		INSERT INTO "Paciente"
			(id, historia_medica, numero_identifiacion, tipo_documento, nombre, genero, fecha_nacimiento, numero_telefono, direccion,
			 telefono_alternativo, ocupacion, raza, antecedentes_oncologicos, quimioterapia_ciclos, radioterapia_ciclos, estudios_imagenes, hallazgo_estudios)
		VALUES
			(@id, @historia_medica, @numero_identificacion, @tipo_documento, @nombre, @genero, @fecha_nacimiento, @telefono, @direccion,
			 @telefono_alternativo, @ocupacion, @raza, @antecedentes_oncologicos, @quimioterapia_ciclos, @radioterapia_ciclos, @estudios_imagenes, @hallazgo_estudios)
	`

	args := u.args()

	_, err := db.Exec(context.Background(), query, args)
	if err != nil {
		log.Printf("Error creating paciente: %v\n", err)
		return err
	}

	return nil
}

func (u *Pacientes) Update(db *pgxpool.Pool) error {
	query := `
		UPDATE "Paciente"
		SET
			historia_medica = @historia_medica,
			numero_identifiacion = @numero_identificacion,
			tipo_documento = @tipo_documento,
			nombre = @nombre,
			genero = @genero,
			fecha_nacimiento = @fecha_nacimiento,
			numero_telefono = @telefono,
			direccion = @direccion,
			telefono_alternativo = @telefono_alternativo,
			ocupacion = @ocupacion,
			raza = @raza,
			antecedentes_oncologicos = @antecedentes_oncologicos,
			quimioterapia_ciclos = @quimioterapia_ciclos,
			radioterapia_ciclos = @radioterapia_ciclos,
			estudios_imagenes = @estudios_imagenes,
			hallazgo_estudios = @hallazgo_estudios
		WHERE
			id::text = @id
			AND eliminado = FALSE;
	`
	u.normalizarAntecedentes()
	args := u.args()

	_, err := db.Exec(context.Background(), query, args)
	if err != nil {
		log.Printf("Error updating paciente: %v\n", err)
		return err
	}

	return nil
}

// args son los parámetros con nombre que comparten Create y Update.
func (u *Pacientes) args() pgx.NamedArgs {
	return pgx.NamedArgs{
		"id":                       u.ID,
		"historia_medica":          u.Historia_Medica,
		"numero_identificacion":    u.Numero_Indentificacion,
		"tipo_documento":           u.Tipo_Documento,
		"nombre":                   u.Nombre,
		"genero":                   u.Genero,
		"fecha_nacimiento":         u.Fecha_Nacimiento,
		"telefono":                 u.Telefono,
		"direccion":                u.Direccion,
		"telefono_alternativo":     u.Telefono_Alternativo,
		"ocupacion":                u.Ocupacion,
		"raza":                     u.Raza,
		"antecedentes_oncologicos": u.Antecedentes_Oncologicos,
		"quimioterapia_ciclos":     u.Quimioterapia_Ciclos,
		"radioterapia_ciclos":      u.Radioterapia_Ciclos,
		"estudios_imagenes":        u.Estudios_Imagenes,
		"hallazgo_estudios":        u.Hallazgo_Estudios,
	}
}

func (u *Pacientes) Delete(db *pgxpool.Pool) error {
	query := `
		UPDATE "Paciente"
		SET
			eliminado = TRUE
		WHERE
			id::text = @id;
	`

	_, err := db.Exec(context.Background(), query, pgx.NamedArgs{"id": u.ID})
	if err != nil {
		log.Printf("Error deleting paciente: %v\n", err)
		return err
	}

	return nil
}

func GetAllPacientes() ([]Pacientes, error) {
	query := `
		SELECT ` + columnas + `
		FROM "Paciente"
		WHERE eliminado = FALSE
		ORDER BY nombre;
	`
	rows, err := config.PsqlDB.Query(context.Background(), query)
	if err != nil {
		log.Printf("\n\nError getting pacientes: %v", err)
		return nil, err
	}
	defer rows.Close()

	pacientes := []Pacientes{}
	for rows.Next() {
		var paciente Pacientes

		err := rows.Scan(&paciente.ID, &paciente.Historia_Medica, &paciente.Numero_Indentificacion, &paciente.Tipo_Documento, &paciente.Nombre, &paciente.Genero, &paciente.Fecha_Nacimiento, &paciente.Telefono, &paciente.Direccion, &paciente.Eliminado, &paciente.Tiene_Cedula,
			&paciente.Telefono_Alternativo, &paciente.Ocupacion, &paciente.Raza, &paciente.Antecedentes_Oncologicos, &paciente.Quimioterapia_Ciclos, &paciente.Radioterapia_Ciclos, &paciente.Estudios_Imagenes, &paciente.Hallazgo_Estudios)
		if err != nil {
			log.Printf("Error scanning paciente: %v", paciente)
			log.Printf("Error fetching pacientes: %v", err)
			return pacientes, err
		}
		pacientes = append(pacientes, paciente)
	}

	return pacientes, rows.Err()
}

// FiltrosPacientes acota el listado paginado. Los campos vacíos se ignoran.
type FiltrosPacientes struct {
	Nombre         string // ILIKE en nombre
	Documento      string // ILIKE en numero_identifiacion
	HistoriaMedica string // ILIKE en historia_medica
	Genero         string // coincidencia exacta ("M" | "F")
}

// GetAllPacientesPaged devuelve una página de pacientes activos y el total de
// registros para paginación server-side. Aplica los filtros opcionales.
func GetAllPacientesPaged(f FiltrosPacientes, p pagination.Params) ([]Pacientes, int, error) {
	where := `WHERE eliminado = FALSE`
	args := pgx.NamedArgs{}

	if f.Nombre != "" {
		where += ` AND LOWER(nombre) LIKE LOWER(@nombre)`
		args["nombre"] = "%" + f.Nombre + "%"
	}
	if f.Documento != "" {
		where += ` AND LOWER(numero_identifiacion) LIKE LOWER(@documento)`
		args["documento"] = "%" + f.Documento + "%"
	}
	if f.HistoriaMedica != "" {
		where += ` AND LOWER(historia_medica) LIKE LOWER(@historia_medica)`
		args["historia_medica"] = "%" + f.HistoriaMedica + "%"
	}
	if f.Genero != "" {
		where += ` AND genero = @genero`
		args["genero"] = f.Genero
	}

	var total int
	if err := config.PsqlDB.QueryRow(context.Background(),
		`SELECT COUNT(*) FROM "Paciente" `+where, args).Scan(&total); err != nil {
		log.Printf("Error counting pacientes: %v", err)
		return nil, 0, err
	}

	args["limit"] = p.Size
	args["offset"] = p.Offset()
	query := `SELECT ` + columnas + `
		FROM "Paciente"
		` + where + `
		ORDER BY ` + p.SortBy + ` ` + p.Order + `
		LIMIT @limit OFFSET @offset;`

	rows, err := config.PsqlDB.Query(context.Background(), query, args)
	if err != nil {
		log.Printf("Error getting pacientes page: %v", err)
		return nil, total, err
	}
	defer rows.Close()

	pacientes := []Pacientes{}
	for rows.Next() {
		var pac Pacientes
		if err := rows.Scan(&pac.ID, &pac.Historia_Medica, &pac.Numero_Indentificacion,
			&pac.Tipo_Documento, &pac.Nombre, &pac.Genero,
			&pac.Fecha_Nacimiento, &pac.Telefono, &pac.Direccion, &pac.Eliminado, &pac.Tiene_Cedula,
			&pac.Telefono_Alternativo, &pac.Ocupacion, &pac.Raza, &pac.Antecedentes_Oncologicos, &pac.Quimioterapia_Ciclos, &pac.Radioterapia_Ciclos, &pac.Estudios_Imagenes, &pac.Hallazgo_Estudios); err != nil {
			log.Printf("Error scanning paciente: %v", err)
			return pacientes, total, err
		}
		pacientes = append(pacientes, pac)
	}
	return pacientes, total, rows.Err()
}
