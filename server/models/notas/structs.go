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
	Pabellon               string    `json:"pabellon"`
	Es_Electiva            bool      `json:"es_electiva"`
	Es_Emergencia          bool      `json:"es_emergencia"`
	Tuvo_Biopsia           bool      `json:"tuvo_biopsia"`
	Anestia                string    `json:"anestia"`
	ID_Paciente            string    `json:"Id_paciente"`
	Medico_Encargado       string    `json:"medico_encargado"`
	Eliminado              bool      `json:"eliminado"`
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
}

// FiltroNotas acota la vista global del servicio (HU-16, HU-17). Los campos en
// cero se ignoran, así que el filtro vacío devuelve todas las notas vigentes.
type FiltroNotas struct {
	MedicoID   string
	PacienteID string
	From       time.Time
	To         time.Time
}
