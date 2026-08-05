package notas

import (
	"context"
	"log"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// FilaExport es una nota ya resuelta para el reporte: en vez de UUIDs trae el
// paciente y los médicos con nombre y apellido, que es lo que se lee en el
// record quirúrgico. No se reutiliza Notas porque esa struct es la del API y
// obligaría a una consulta por nota para el equipo.
type FilaExport struct {
	ID                 int
	Fecha              time.Time
	HoraComienzo       string
	HoraCulminacion    string
	PacienteNombre     string
	PacienteDocumento  string
	PacienteGenero     string
	PacienteNacimiento time.Time
	DXPreOperatorio    string
	DXPostOperatorio   string
	Intervencion       string
	Resumen            string
	Pabellon           string
	Anestesia          string
	EsElectiva         bool
	EsEmergencia       bool
	TuvoBiopsia        bool
	Cirujano           string
	Ayudantes          string
}

// Edad es la que tenía el paciente el día de la operación, no la de hoy: el
// record quirúrgico documenta el acto, y se consulta años después.
func (f FilaExport) Edad() int {
	if f.PacienteNacimiento.IsZero() || f.Fecha.IsZero() {
		return 0
	}

	edad := f.Fecha.Year() - f.PacienteNacimiento.Year()
	// Todavía no cumplía años a la fecha de la cirugía.
	if f.Fecha.YearDay() < f.PacienteNacimiento.YearDay() {
		edad--
	}

	if edad < 0 {
		return 0
	}
	return edad
}

// Tipo distingue electiva de emergencia para las columnas del reporte.
func (f FilaExport) Tipo() string {
	switch {
	case f.EsEmergencia:
		return "Emergencia"
	case f.EsElectiva:
		return "Electiva"
	default:
		return "-"
	}
}

// Biopsia como texto, que es como se lee en una planilla.
func (f FilaExport) Biopsia() string {
	if f.TuvoBiopsia {
		return "Si"
	}
	return "No"
}

// GetNotasExportMedico trae, ya aplanadas, las notas en las que participó el
// médico (encargado o parte del equipo quirúrgico) dentro del rango.
//
// `from` y `to` son opcionales: en nil no acotan, así que el médico puede
// exportar todo su record o solo un período (HU-11 + exportación).
//
// Las horas se piden ya formateadas desde Postgres: escanear un TIME a
// time.Time las deja colgadas de una fecha ficticia (2000-01-01) que en una
// planilla no significa nada.
func GetNotasExportMedico(db *pgxpool.Pool, medicoID string, from, to *time.Time) ([]FilaExport, error) {
	query := `
		SELECT
			n.id,
			n.fecha_comienzo,
			to_char(n.hora_comienzo, 'HH24:MI'),
			to_char(n.hora_culminacion, 'HH24:MI'),
			p.nombre,
			-- El tipo de documento manda, pero parte de los registros ya lo
			-- traen dentro del número ("V-5.412.778"): sin quitarlo sale
			-- "V-V-5.412.778" en la planilla.
			p.tipo_documento || '-' || regexp_replace(p.numero_identifiacion, '^\s*[A-Za-z]\s*-?\s*', ''),
			p.genero,
			p.fecha_nacimiento,
			n.dx_pre_operatorio,
			n.dx_post_operatorio,
			n.intervencion_realizada,
			n.resumen_intevencion,
			n.pabellon,
			n.anestesia,
			n.es_electiva,
			n.es_emergencia,
			n.tuvo_biopsia,
			TRIM(enc.nombres || ' ' || COALESCE(enc.apellidos, '')) AS cirujano,
			COALESCE((
				SELECT string_agg(TRIM(u.nombres || ' ' || COALESCE(u.apellidos, '')), ', ' ORDER BY u.apellidos, u.nombres)
				FROM "Equipo_Quirurgico" eq
				JOIN "Usuarios" u ON u.id = eq.id_medico
				WHERE eq.id_nota_operatoria = n.id
				AND eq.id_medico <> n.id_medico_encargado
			), '') AS ayudantes
		FROM "Nota_Operatoria" n
		JOIN "Paciente" p ON p.id = n.id_paciente
		JOIN "Usuarios" enc ON enc.id = n.id_medico_encargado
		WHERE n.eliminado = FALSE
		AND (
			n.id_medico_encargado::text = @medico
			OR EXISTS (SELECT 1 FROM "Equipo_Quirurgico" eq WHERE eq.id_nota_operatoria = n.id AND eq.id_medico::text = @medico)
		)
		AND (@from::date IS NULL OR n.fecha_comienzo >= @from)
		AND (@to::date IS NULL OR n.fecha_comienzo <= @to)
		ORDER BY n.fecha_comienzo ASC, n.id ASC;
	`

	args := pgx.NamedArgs{"medico": medicoID, "from": from, "to": to}

	rows, err := db.Query(context.Background(), query, args)
	if err != nil {
		log.Printf("\n\nError getting notas para exportar: %v", err)
		return nil, err
	}
	defer rows.Close()

	filas := []FilaExport{}
	for rows.Next() {
		var f FilaExport
		err := rows.Scan(
			&f.ID, &f.Fecha, &f.HoraComienzo, &f.HoraCulminacion,
			&f.PacienteNombre, &f.PacienteDocumento, &f.PacienteGenero, &f.PacienteNacimiento,
			&f.DXPreOperatorio, &f.DXPostOperatorio, &f.Intervencion, &f.Resumen,
			&f.Pabellon, &f.Anestesia, &f.EsElectiva, &f.EsEmergencia, &f.TuvoBiopsia,
			&f.Cirujano, &f.Ayudantes,
		)
		if err != nil {
			log.Printf("Error fetching notas para exportar: %v", err)
			return filas, err
		}
		filas = append(filas, f)
	}

	return filas, rows.Err()
}

// NombreMedico devuelve "Nombres Apellidos" del médico, para encabezar el
// reporte y armar el nombre del archivo. Vacío si el usuario no existe.
func NombreMedico(db *pgxpool.Pool, medicoID string) (string, error) {
	query := `
		SELECT TRIM(nombres || ' ' || COALESCE(apellidos, ''))
		FROM "Usuarios"
		WHERE id::text = @id;
	`

	var nombre string
	err := db.QueryRow(context.Background(), query, pgx.NamedArgs{"id": medicoID}).Scan(&nombre)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", nil
		}
		log.Printf("\n\nError getting nombre del medico: %v", err)
		return "", err
	}

	return strings.TrimSpace(nombre), nil
}
