package notas

import (
	"server/models/usuarios"
	"time"
)

type Notas struct {
	ID                     int                 `json:"id"`
	DX_Pre_Operatorio      string              `json:"dx_pre_operatorio"`
	DX_Post_Operatorio     string              `json:"dx_post_operatorio"`
	Intervencion_Realizado string              `json:"intervencion_realizado"`
	Fecha_Comienzo         time.Time           `json:"fecha_comienzo"`
	Fecha_Culminacion      time.Time           `json:"fecha_culminacion"`
	Hora_Comienzo          time.Time           `json:"hora_comienzo"`
	Hora_Culminacion       time.Time           `json:"hora_culminacion"`
	Resumen_Intervencion   string              `json:"resumen_intervencion"`
	Pabellon               string              `json:"pabellon"`
	Es_Electiva            bool                `json:"es_electiva"`
	Es_Emergencia          bool                `json:"es_emergencia"`
	Tuvo_Biopsia           bool                `json:"tuvo_biopsia"`
	Anestia                string              `json:"anestia"`
	ID_Paciente            int                 `json:"Id_paciente"`
	Medico_Encargado       string              `json:"medico_encargado"`
	Eliminado              bool                `json:"eliminado"`
	Medicos                []usuarios.Usuarios `json:"medicos"`
}
