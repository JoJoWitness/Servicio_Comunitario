package controllers

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"

	"server/config"
	"server/controllers/auth"
	biopsias2 "server/models/biopsias"
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

// SyncRequest es el lote que manda el dispositivo. Las biopsias van después
// de las notas: cada una apunta a su nota de origen por `nota_client_uuid`
// (si la nota también se redactó sin conexión) o por `nota_id`.
type SyncRequest struct {
	Pacientes []pacientes2.Pacientes `json:"pacientes"`
	Notas     []notas2.Notas         `json:"notas"`
	Biopsias  []biopsias2.Biopsia    `json:"biopsias"`
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
	Biopsias  []SyncResultado `json:"biopsias"`
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
		Biopsias:  make([]SyncResultado, 0, len(lote.Biopsias)),
	}

	// Regla 2: los pacientes primero.
	for i := range lote.Pacientes {
		resp.Pacientes = append(resp.Pacientes, subirPaciente(&lote.Pacientes[i], session.UserID))
	}

	for i := range lote.Notas {
		resp.Notas = append(resp.Notas, subirNota(&lote.Notas[i], session.UserID, session.Role))
	}

	// Y las biopsias al final: dependen de que su nota ya esté.
	for i := range lote.Biopsias {
		resp.Biopsias = append(resp.Biopsias, subirBiopsia(&lote.Biopsias[i], session.UserID, session.Role))
	}

	log.Printf("Sync de %s: %d pacientes, %d notas, %d biopsias", session.UserID, len(resp.Pacientes), len(resp.Notas), len(resp.Biopsias))

	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", "200")
	json.NewEncoder(w).Encode(resp)
}

// subirPaciente registra un paciente creado sin conexión. El UUID lo puso el
// dispositivo y se respeta tal cual: así la nota que ya lo referencia sigue
// apuntando al lugar correcto sin necesidad de reescribir nada.
func subirPaciente(p *pacientes2.Pacientes, usuarioID string) SyncResultado {
	res := SyncResultado{ClienteID: p.ID}

	if p.ID == "" {
		res.Estado = SyncError
		res.Motivo = "el paciente no trae id; los registrados sin conexión deben generarlo en el dispositivo"
		return res
	}

	// ¿Ya subido en un intento anterior? La cédula se guarda igual: pudo haber
	// subido el paciente en una pasada que se cortó antes de llegar a ella.
	yaRegistrado := pacientes2.Pacientes{ID: p.ID}
	if err := yaRegistrado.Get(config.PsqlDB); err == nil {
		res.Estado = SyncDuplicado
		res.Motivo = guardarCedulaDelLote(p, usuarioID)
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

	// El paciente ya entró: aunque la cédula falle, el veredicto sigue siendo
	// "creado", o la cola volvería a mandar el paciente entero en cada pasada.
	res.Estado = SyncCreado
	res.Motivo = guardarCedulaDelLote(p, usuarioID)
	return res
}

// guardarCedulaDelLote guarda la imagen que viene en el lote, si viene.
// Devuelve el motivo del fallo en texto llano, o "" si no había imagen o entró
// bien. Acepta el base64 desnudo o con prefijo data URI.
func guardarCedulaDelLote(p *pacientes2.Pacientes, usuarioID string) string {
	if p.Cedula_Base64 == "" {
		return ""
	}

	crudo := p.Cedula_Base64
	if i := strings.Index(crudo, ","); i >= 0 && strings.HasPrefix(crudo, "data:") {
		crudo = crudo[i+1:]
	}

	imagen, err := base64.StdEncoding.DecodeString(crudo)
	if err != nil {
		return "la cédula no se pudo decodificar; vuelve a adjuntarla desde la ficha del paciente"
	}

	if _, err := pacientes2.GuardarCedula(config.PsqlDB, p.ID, imagen, usuarioID); err != nil {
		return "la cédula no se guardó (" + err.Error() + "); vuelve a adjuntarla desde la ficha del paciente"
	}
	return ""
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

// subirBiopsia registra una muestra tomada sin conexión y la vincula a su nota
// de origen. Si la nota todavía no está en el servidor (falló más arriba en
// este mismo lote), la biopsia se queda en la cola: en la pasada siguiente la
// nota entrará como `duplicado` y la biopsia podrá vincularse.
func subirBiopsia(b *biopsias2.Biopsia, usuarioID, rol string) SyncResultado {
	res := SyncResultado{ClienteID: b.ClientUUID}

	if b.ClientUUID == "" {
		res.Estado = SyncError
		res.Motivo = "la biopsia no trae client_uuid; sin él no se puede garantizar que no se duplique"
		return res
	}

	existente, err := biopsias2.BuscarPorClientUUID(config.PsqlDB, b.ClientUUID)
	if err != nil {
		res.Estado = SyncError
		res.Motivo = "no se pudo verificar si la biopsia ya estaba subida"
		return res
	}
	if existente != nil {
		res.Estado = SyncDuplicado
		res.NotaID = existente.ID
		return res
	}

	// Nota de origen: por client_uuid si nació sin conexión, por id si no.
	var nota *notas2.Notas
	switch {
	case b.NotaClientUUID != "":
		nota, err = notas2.BuscarPorClientUUID(config.PsqlDB, b.NotaClientUUID)
		if err != nil {
			res.Estado = SyncError
			res.Motivo = "no se pudo buscar la nota de origen"
			return res
		}
		if nota == nil || nota.Eliminado {
			res.Estado = SyncError
			res.Motivo = "la nota de origen todavía no está en el servidor"
			return res
		}
	case b.NotaID != 0:
		nota = &notas2.Notas{ID: b.NotaID}
		if err := nota.Get(config.PsqlDB); err != nil {
			res.Estado = SyncError
			res.Motivo = "la nota de origen no existe"
			return res
		}
	}

	if nota != nil {
		if b.IDPaciente == "" {
			b.IDPaciente = nota.ID_Paciente
		}
		if b.IDMedicoResponsable == "" {
			b.IDMedicoResponsable = nota.Medico_Encargado
		}
		if b.FechaToma.IsZero() {
			b.FechaToma = nota.Fecha_Comienzo
		}
	}
	if b.IDMedicoResponsable == "" && rol != auth.RolAdmin {
		b.IDMedicoResponsable = usuarioID
	}
	if b.IDPaciente == "" || b.IDMedicoResponsable == "" || b.Tejido == "" {
		res.Estado = SyncError
		res.Motivo = "la biopsia necesita nota de origen (o paciente y médico responsable) y tejido"
		return res
	}

	if err := b.Create(config.PsqlDB); err != nil {
		res.Estado = SyncError
		res.Motivo = "no se pudo guardar la biopsia: " + err.Error()
		return res
	}

	if nota != nil {
		if err := biopsias2.Vincular(config.PsqlDB, nota.ID, b.ID, biopsias2.RolOrigen, usuarioID); err != nil {
			// La biopsia ya entró; el vínculo se puede rehacer a mano desde
			// la nota. No se deja en la cola porque volvería a duplicarse.
			res.Estado = SyncCreado
			res.NotaID = b.ID
			res.Motivo = "la biopsia se guardó pero no se pudo vincular a la nota: " + err.Error()
			return res
		}
	}

	res.Estado = SyncCreado
	res.NotaID = b.ID
	return res
}
