package notas

import (
	"server/models/usuarios"
	"time"
)

type Notas struct {
	ID                     int       `json:"id"`
	DX_Pre_Operatorio      string    `json:"dx_pre_operatorio"`
	DX_Post_Operatorio     string    `json:"dx_post_operatorio"`
	Intervencion_Realizado string    `json:"intervencion_realizado"`
	Fecha_Comienzo         time.Time `json:"fecha_comienzo"`
	Fecha_Culminacion      time.Time `json:"fecha_culminacion"`
	Hora_Comienzo          time.Time `json:"hora_comienzo"`
	Hora_Culminacion       time.Time `json:"hora_culminacion"`
	Resumen_Intervencion   string    `json:"resumen_intervencion"`
	// Comentarios es el texto libre que el médico agrega a la intervención. Se
	// guarda en su propia columna, pero al leer la nota (pantalla, PDF,
	// reporte) va concatenado al final del resumen, tras "Observaciones:".
	Comentarios      string `json:"comentarios"`
	Pabellon         string `json:"pabellon"`
	Es_Electiva      bool   `json:"es_electiva"`
	Es_Emergencia    bool   `json:"es_emergencia"`
	Tuvo_Biopsia     bool   `json:"tuvo_biopsia"`
	Anestia          string `json:"anestia"`
	ID_Paciente      string `json:"Id_paciente"`
	Medico_Encargado string `json:"medico_encargado"`
	Eliminado        bool   `json:"eliminado"`
	// Medicos es el equipo quirúrgico tal como se devuelve en los GET: datos
	// completos de cada médico, traídos de equipo_quirurgico.
	Medicos []usuarios.Usuarios `json:"medicos"`
	// Equipo son los UUID que se mandan al crear o actualizar la nota (HU-15).
	// El médico encargado se agrega solo, no hace falta repetirlo aquí.
	Equipo []string `json:"equipo"`
	// ClientUUID lo genera el dispositivo cuando la nota se redacta sin
	// conexión. Al subirla, es lo que permite reconocer que una nota ya entró y
	// no volver a insertarla. Vacío en las notas creadas en línea.
	ClientUUID string `json:"client_uuid,omitempty"`

	// Legalizada registra que la nota impresa ya pasó por el trámite físico:
	// firmada, sellada y archivada en la historia. Es un estado administrativo,
	// no un dato clínico, y por eso tiene su propio endpoint (PATCH
	// /notas/{id}/legalizada): ni Create ni Update lo escriben, y una edición
	// sincronizada tarde no puede pisar una legalización hecha entre medio.
	Legalizada bool `json:"legalizada"`
	// LegalizadaEn y LegalizadaPor dejan constancia de quién y cuándo. Van a
	// NULL al desactivar el interruptor.
	LegalizadaEn  *time.Time `json:"legalizada_en,omitempty"`
	LegalizadaPor string     `json:"legalizada_por,omitempty"`

	// CreatedAt es el momento del registro en el servidor: la referencia del
	// plazo de edición. Para una nota redactada sin conexión es cuando subió,
	// no cuando se escribió.
	CreatedAt time.Time `json:"created_at"`
	// EditableHasta es el último día calendario (YYYY-MM-DD, zona del servidor)
	// en que la nota admite cambios según el plazo vigente. Se calcula en SQL
	// para que coincida exactamente con lo que CheckNotasDate va a decidir.
	EditableHasta string `json:"editable_hasta"`
	// PuedeEditar resume, para el usuario de la sesión, si PUT/DELETE van a
	// pasar: vigente, no legalizada, en plazo, y admin o participante. Lo
	// calcula CompletarPermisos por petición; así el cliente no tiene que
	// replicar la regla de participación.
	PuedeEditar bool `json:"puede_editar"`
	// enPlazo es el veredicto del plazo tal como lo dio la base. No viaja: al
	// cliente le basta con `puede_editar` y `editable_hasta`.
	enPlazo bool
}

// FiltroNotas acota la vista global del servicio (HU-16, HU-17). Los campos en
// cero se ignoran, así que el filtro vacío devuelve todas las notas vigentes.
type FiltroNotas struct {
	MedicoID   string
	PacienteID string
	From       time.Time
	To         time.Time
	// Legalizada en nil no filtra; con valor deja solo las que coinciden. Es
	// el filtro "Pendientes / Legalizadas" de la vista de secretaría.
	Legalizada *bool
}
