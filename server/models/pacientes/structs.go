package pacientes

import (
	"time"
)

type Pacientes struct {
	ID                     string    `json:"id"`
	Historia_Medica        string    `json:"historia_medica"`
	Numero_Indentificacion string    `json:"numero_identificacion"`
	Tipo_Documento         string    `json:"tipo_documento"`
	Nombre                 string    `json:"nombre"`
	Genero                 string    `json:"genero"`
	Fecha_Nacimiento       time.Time `json:"fecha_nacimiento"`
	Telefono               string    `json:"telefono"`
	Direccion              string    `json:"direccion"`
	Eliminado              bool      `json:"eliminado"`
}
type PacientesDates struct {
	ID   string    `json:"id"`
	From time.Time `json:"from"`
	To   time.Time `json:"to"`
}
