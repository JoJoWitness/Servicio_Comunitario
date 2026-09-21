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
	// Antecedentes para la "Solicitud de biopsia o citología" (v0.5.0).
	// Todos opcionales. Estudios_Imagenes admite rx, tc, rm y eco.
	Ocupacion                string   `json:"ocupacion"`
	Raza                     string   `json:"raza"`
	Antecedentes_Oncologicos string   `json:"antecedentes_oncologicos"`
	Quimioterapia_Ciclos     *int     `json:"quimioterapia_ciclos"`
	Radioterapia_Ciclos      *int     `json:"radioterapia_ciclos"`
	Estudios_Imagenes        []string `json:"estudios_imagenes"`
	Hallazgo_Estudios        string   `json:"hallazgo_estudios"`
	// Tiene_Cedula dice si hay imagen del documento guardada (v0.4.0). El
	// binario nunca viaja en el JSON: se pide aparte a /pacientes/{id}/cedula.
	Tiene_Cedula bool `json:"tiene_cedula"`
	// Cedula_Base64 y Cedula_Content_Type solo se aceptan en el lote de
	// sincronización (POST /sync): el paciente registrado sin conexión sube
	// con su cédula en el mismo viaje. En las lecturas van vacíos y se omiten.
	Cedula_Base64       string `json:"cedula_base64,omitempty"`
	Cedula_Content_Type string `json:"cedula_content_type,omitempty"`
}
type PacientesDates struct {
	ID   string    `json:"id"`
	From time.Time `json:"from"`
	To   time.Time `json:"to"`
}
