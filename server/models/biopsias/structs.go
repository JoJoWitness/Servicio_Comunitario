package biopsias

import (
	"time"

	"server/models/usuarios"
)

// Estados del ciclo de una biopsia, en orden. Se puede avanzar de uno en uno
// o saltar (una muestra cargada tarde entra ya con resultado); retroceder solo
// lo hace el admin o el médico responsable, y limpia lo del estado abandonado.
const (
	EstadoTomada       = "tomada"
	EstadoEnviada      = "enviada"
	EstadoConResultado = "con_resultado"
	EstadoEntregada    = "entregada"
)

// Rango numérico de cada estado, para saber si un cambio avanza o retrocede.
var rangoEstado = map[string]int{
	EstadoTomada:       0,
	EstadoEnviada:      1,
	EstadoConResultado: 2,
	EstadoEntregada:    3,
}

// Roles del vínculo nota ↔ biopsia.
const (
	RolOrigen      = "origen"
	RolSeguimiento = "seguimiento"
)

// NotaVinculada es lo que la biopsia sabe de cada nota a la que está ligada:
// lo justo para listarla y enlazarla sin cargar la nota entera.
type NotaVinculada struct {
	IDNota        int       `json:"id_nota_operatoria"`
	Rol           string    `json:"rol"`
	FechaComienzo time.Time `json:"fecha_comienzo"`
	Intervencion  string    `json:"intervencion_realizada"`
	VinculadaEn   time.Time `json:"vinculada_en"`
}

// Biopsia es una muestra enviada a anatomía patológica (PRD 0.5.0).
type Biopsia struct {
	ID int `json:"id"`
	// ClientUUID lo genera el dispositivo cuando se registra sin conexión;
	// es lo que hace inofensivo reintentar la subida.
	ClientUUID          string `json:"client_uuid,omitempty"`
	IDPaciente          string `json:"id_paciente"`
	PacienteNombre      string `json:"paciente_nombre"`
	IDMedicoResponsable string `json:"id_medico_responsable"`
	// MedicoResponsable va resuelto en las lecturas; en escritura basta el id.
	MedicoResponsable *usuarios.UsuarioData `json:"medico_responsable,omitempty"`

	Ojo                     string    `json:"ojo,omitempty"`
	Tejido                  string    `json:"tejido"`
	DescripcionMacroscopica string    `json:"descripcion_macroscopica"`
	DiagnosticoPresuntivo   string    `json:"diagnostico_presuntivo"`
	FechaToma               time.Time `json:"fecha_toma"`

	Laboratorio     string     `json:"laboratorio,omitempty"`
	FechaEnvio      *time.Time `json:"fecha_envio"`
	NumeroPatologia string     `json:"numero_patologia,omitempty"`

	Resultado      string     `json:"resultado,omitempty"`
	FechaResultado *time.Time `json:"fecha_resultado"`
	FechaEntrega   *time.Time `json:"fecha_entrega"`

	Estado        string `json:"estado"`
	Observaciones string `json:"observaciones"`
	Eliminado     bool   `json:"eliminado"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Notas es la lista de vínculos, siempre presente en las lecturas.
	Notas []NotaVinculada `json:"notas"`
	// PuedeEditar: para el usuario de la sesión, si puede cambiar los datos de
	// la muestra (admin, responsable o participante de una nota vinculada).
	// No depende del plazo de la nota ni de su legalización.
	PuedeEditar bool `json:"puede_editar"`
	// PuedeTramitar: si además puede marcarla enviada y cargar el resultado.
	// Incluye a la secretaria, que es quien recibe el informe (PRD 0.5.0, D1).
	PuedeTramitar bool `json:"puede_tramitar"`

	// Solo escritura, para crear y vincular en una sola llamada. Uno de los
	// dos: el id si la nota ya está en el servidor, el client_uuid si se
	// registró sin conexión y todavía puede no haber subido.
	NotaID         int    `json:"nota_id,omitempty"`
	NotaClientUUID string `json:"nota_client_uuid,omitempty"`
}

// Filtro acota el listado de seguimiento. Los campos en cero se ignoran.
type Filtro struct {
	// Estados vacío no filtra; con valores deja solo los que coinciden.
	Estados    []string
	MedicoID   string // responsable o participante de una nota vinculada
	PacienteID string
	From, To   time.Time // sobre fecha_toma
	// SinResultadoDesde: tomadas antes de esa fecha y todavía sin resultado.
	SinResultadoDesde time.Time
}
