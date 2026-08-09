package controllers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"server/config"
	"server/controllers/auth"
	notas2 "server/models/notas"
	pacientes2 "server/models/pacientes"
)

// Sincronización de lo que se redactó sin conexión (HU-11 sobre un quirófano sin
// internet).
//
// El médico opera, escribe la nota en el dispositivo y sigue. Puede que la red
// vuelva a los diez minutos o a los tres días, con varias notas y algún paciente
// nuevo esperando. Este endpoint sube todo ese trabajo de una vez.
//
// Tres reglas gobiernan el diseño:
//
//  1. **Cada ítem se juzga solo.** Una nota con un equipo quirúrgico inválido no
//     puede impedir que suban las otras seis. Por eso no hay una transacción que
//     abarque el lote: se responde ítem por ítem y la cola local borra los que
//     entraron y conserva los que fallaron.
//  2. **Los pacientes van primero.** Una nota apunta a su paciente por UUID; si
//     ese paciente se registró sin conexión, tiene que existir en la base antes
//     de que la nota lo referencie, o la llave foránea la rechaza.
//  3. **Reintentar es inofensivo.** Si la conexión se corta después de guardar
//     pero antes de que llegue la respuesta, el siguiente intento manda lo mismo
//     y recibe "duplicado" en vez de crear una segunda copia de la cirugía.
//     Para las notas la llave es `client_uuid`; para los pacientes, el propio
//     UUID que generó el dispositivo.

// Estados posibles de un ítem del lote.
const (
	// SyncCreado: entró a la base en esta pasada.
	SyncCreado = "creado"
	// SyncDuplicado: ya estaba subido. Para la cola local cuenta como éxito.
	SyncDuplicado = "duplicado"
	// SyncError: no se pudo subir. El motivo va en el resultado y el ítem se
	// queda en el dispositivo para que el médico lo corrija.
	SyncError = "error"
)

// SyncRequest es el lote que manda el dispositivo.
type SyncRequest struct {
	Pacientes []pacientes2.Pacientes `json:"pacientes"`
	Notas     []notas2.Notas         `json:"notas"`
}

// SyncResultado es el veredicto de un ítem. `ClienteID` es el identificador con
// el que el dispositivo conoce ese ítem (el UUID del paciente o el `client_uuid`
// de la nota) y es lo que permite a la cola local saber a cuál se refiere.
type SyncResultado struct {
	ClienteID string `json:"cliente_id"`
	Estado    string `json:"estado"`
	// NotaID es el id definitivo que le tocó a la nota en el servidor. Cero
	// para pacientes, cuyo id no cambia: es el mismo que generó el dispositivo.
	NotaID int `json:"nota_id,omitempty"`
	// Motivo explica el fallo en texto llano, para mostrárselo al médico.
	Motivo string `json:"motivo,omitempty"`
}

// SyncResponse mantiene separadas ambas listas para que el cliente no tenga que
// adivinar de qué tipo era cada resultado.
type SyncResponse struct {
	Pacientes []SyncResultado `json:"pacientes"`
	Notas     []SyncResultado `json:"notas"`
}

// SyncPendientes sube el trabajo acumulado sin conexión.
// POST /sync
func SyncPendientes(w http.ResponseWriter, r *http.Request) {
	session, err := auth.GetSessionCookie(w, r)
	if err != nil {
		log.Println("Unable to get cookie ", err)
		http.Error(w, "Unable to get user info", http.StatusUnauthorized)
		return
	}

	var lote SyncRequest
	if err := json.NewDecoder(r.Body).Decode(&lote); err != nil {
		log.Printf("Error decoding sync body: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Request body is not valid JSON"))
		return
	}

	resp := SyncResponse{
		Pacientes: make([]SyncResultado, 0, len(lote.Pacientes)),
		Notas:     make([]SyncResultado, 0, len(lote.Notas)),
	}

	// Regla 2: los pacientes primero.
	for i := range lote.Pacientes {
		resp.Pacientes = append(resp.Pacientes, subirPaciente(&lote.Pacientes[i]))
	}

	for i := range lote.Notas {
		resp.Notas = append(resp.Notas, subirNota(&lote.Notas[i], session.UserID, session.Role))
	}

	log.Printf("Sync de %s: %d pacientes, %d notas", session.UserID, len(resp.Pacientes), len(resp.Notas))

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "200")
	json.NewEncoder(w).Encode(resp)
}

// subirPaciente registra un paciente creado sin conexión. El UUID lo puso el
// dispositivo y se respeta tal cual: así la nota que ya lo referencia sigue
// apuntando al lugar correcto sin necesidad de reescribir nada.
func subirPaciente(p *pacientes2.Pacientes) SyncResultado {
	res := SyncResultado{ClienteID: p.ID}

	if p.ID == "" {
		res.Estado = SyncError
		res.Motivo = "el paciente no trae id; los registrados sin conexión deben generarlo en el dispositivo"
		return res
	}

	// ¿Ya subido en un intento anterior?
	yaRegistrado := pacientes2.Pacientes{ID: p.ID}
	if err := yaRegistrado.Get(config.PsqlDB); err == nil {
		res.Estado = SyncDuplicado
		return res
	}

	// Mismo número de historia con otro id: son dos registros peleando por el
	// mismo paciente, probablemente porque lo dieron de alta en dos equipos.
	// Eso no lo resuelve la máquina.
	porHistoria := pacientes2.Pacientes{Historia_Medica: p.Historia_Medica}
	if err := porHistoria.Get(config.PsqlDB); err == nil {
		res.Estado = SyncError
		res.Motivo = fmt.Sprintf(
			"la historia médica %q ya está registrada a nombre de %q; verifica si es el mismo paciente",
			p.Historia_Medica, porHistoria.Nombre)
		return res
	}

	if err := p.Create(config.PsqlDB); err != nil {
		res.Estado = SyncError
		res.Motivo = "no se pudo registrar el paciente: " + err.Error()
		return res
	}

	res.Estado = SyncCreado
	return res
}

// subirNota registra una nota redactada sin conexión. `rol` es el de quien
// sube el lote: el admin puede subir notas, pero no queda como encargado de
// las que no traigan uno, porque no puede figurar en ninguna.
func subirNota(n *notas2.Notas, usuarioID, rol string) SyncResultado {
	res := SyncResultado{ClienteID: n.ClientUUID}

	// Regla 3: sin client_uuid no hay forma de reconocer un reintento, y una
	// nota operatoria duplicada en la historia clínica es peor que un rechazo.
	if n.ClientUUID == "" {
		res.Estado = SyncError
		res.Motivo = "la nota no trae client_uuid; sin él no se puede garantizar que no se duplique"
		return res
	}

	if n.Medico_Encargado == "" && rol != auth.RolAdmin {
		n.Medico_Encargado = usuarioID
	}
	if n.Medico_Encargado == "" {
		res.Estado = SyncError
		res.Motivo = "la nota no indica médico encargado; el administrador no puede figurar en una nota operatoria"
		return res
	}

	existente, err := notas2.BuscarPorClientUUID(config.PsqlDB, n.ClientUUID)
	if err != nil {
		res.Estado = SyncError
		res.Motivo = "no se pudo verificar si la nota ya estaba subida"
		return res
	}
	if existente != nil {
		res.Estado = SyncDuplicado
		res.NotaID = existente.ID
		return res
	}

	invalidos, err := notas2.ValidarEquipo(config.PsqlDB, append([]string{n.Medico_Encargado}, n.Equipo...))
	if err != nil {
		res.Estado = SyncError
		res.Motivo = "no se pudo validar el equipo quirúrgico"
		return res
	}
	if len(invalidos) > 0 {
		res.Estado = SyncError
		res.Motivo = fmt.Sprintf("equipo quirúrgico inválido, solo un médico activo puede figurar en la nota (el administrador no): %v", invalidos)
		return res
	}

	if err := n.Create(config.PsqlDB); err != nil {
		res.Estado = SyncError
		// El fallo típico aquí es la llave foránea del paciente: la nota se
		// redactó para alguien que todavía no llegó a la base (su alta falló
		// más arriba en este mismo lote).
		res.Motivo = "no se pudo guardar la nota: " + err.Error()
		return res
	}

	res.Estado = SyncCreado
	res.NotaID = n.ID
	return res
}
