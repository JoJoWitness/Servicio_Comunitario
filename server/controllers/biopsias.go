package controllers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"

	"server/config"
	"server/controllers/auth"
	biopsias2 "server/models/biopsias"
	notas2 "server/models/notas"
	"server/models/pagination"

	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5"
)

// Biopsias (PRD 0.5.0). La muestra vive aparte de la nota y tiene sus propias
// reglas: no le aplican ni el plazo de edición ni la legalización de la nota,
// porque el informe de patología llega semanas después de cerrarla.

// diasAtraso es a partir de cuántos días sin resultado una biopsia cuenta
// como atrasada en el encabezado de seguimiento.
const diasAtraso = 30

func idBiopsia(r *http.Request, clave string) (int, bool) {
	id, err := strconv.Atoi(mux.Vars(r)[clave])
	return id, err == nil
}

func responderJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Add("Status-Code", strconv.Itoa(status))
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// completarPermisosBiopsias rellena puede_editar / puede_tramitar. Escribe la
// respuesta de error cuando devuelve false.
func completarPermisosBiopsias(w http.ResponseWriter, r *http.Request, lista []biopsias2.Biopsia) bool {
	session, err := auth.GetSessionCookie(w, r)
	if err != nil {
		http.Error(w, "Unable to get user info", http.StatusUnauthorized)
		return false
	}
	if err := biopsias2.CompletarPermisos(config.PsqlDB, lista, session.UserID, session.Role); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to resolve permissions"))
		return false
	}
	return true
}

// responderBiopsia relee la biopsia, completa permisos y la devuelve.
func responderBiopsia(w http.ResponseWriter, r *http.Request, id int, status int) {
	b := biopsias2.Biopsia{ID: id}
	if err := b.Get(config.PsqlDB); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte("biopsia no encontrada"))
			return
		}
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get biopsia"))
		return
	}
	lote := []biopsias2.Biopsia{b}
	if !completarPermisosBiopsias(w, r, lote) {
		return
	}
	responderJSON(w, status, lote[0])
}

// escribirErrorBiopsia traduce los errores del modelo a códigos HTTP.
func escribirErrorBiopsia(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, biopsias2.ErrNotaNoEncontrada):
		w.WriteHeader(http.StatusNotFound)
	case errors.Is(err, biopsias2.ErrYaVinculada), errors.Is(err, biopsias2.ErrYaTieneOrigen):
		w.WriteHeader(http.StatusConflict)
	case errors.Is(err, biopsias2.ErrRetroceso):
		w.Header().Set(CabeceraMotivo, MotivoNoParticipante)
		w.WriteHeader(http.StatusForbidden)
	case errors.Is(err, biopsias2.ErrEstado), errors.Is(err, biopsias2.ErrEnviadaSinFecha),
		errors.Is(err, biopsias2.ErrResultadoVacio), errors.Is(err, biopsias2.ErrEntregaSinFecha),
		errors.Is(err, biopsias2.ErrRol), errors.Is(err, biopsias2.ErrPacienteDistinto),
		errors.Is(err, biopsias2.ErrDescriptor):
		w.WriteHeader(http.StatusBadRequest)
	case errors.Is(err, pgx.ErrNoRows):
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte("biopsia no encontrada"))
		return
	default:
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to process biopsia"))
		return
	}
	w.Write([]byte(err.Error()))
}

// filtroBiopsias lee el query string del listado de seguimiento.
func filtroBiopsias(r *http.Request) (biopsias2.Filtro, error) {
	var f biopsias2.Filtro
	q := r.URL.Query()

	if crudo := strings.TrimSpace(q.Get("estado")); crudo != "" {
		for e := range strings.SplitSeq(crudo, ",") {
			if e = strings.TrimSpace(e); e != "" {
				f.Estados = append(f.Estados, e)
			}
		}
	}
	f.MedicoID = q.Get("medico")
	f.PacienteID = q.Get("paciente")

	var err error
	if f.From, err = parseFecha(q.Get("from")); err != nil {
		return f, errors.New("el parametro 'from' debe ser una fecha YYYY-MM-DD o RFC3339")
	}
	if f.To, err = parseFecha(q.Get("to")); err != nil {
		return f, errors.New("el parametro 'to' debe ser una fecha YYYY-MM-DD o RFC3339")
	}
	if f.SinResultadoDesde, err = parseFecha(q.Get("sin_resultado_desde")); err != nil {
		return f, errors.New("el parametro 'sin_resultado_desde' debe ser una fecha YYYY-MM-DD o RFC3339")
	}
	return f, nil
}

// GetAllBiopsias devuelve el listado de seguimiento, paginado.
// GET /biopsias?estado=&medico=&paciente=&from=&to=&sin_resultado_desde=
func GetAllBiopsias(w http.ResponseWriter, r *http.Request) {
	filtro, err := filtroBiopsias(r)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(err.Error()))
		return
	}

	allowedSort := map[string]string{
		"fecha_toma":      "b.fecha_toma",
		"estado":          "b.estado",
		"fecha_resultado": "b.fecha_resultado",
	}
	p := parsePaginationParams(r, allowedSort, "b.fecha_toma")

	lista, total, err := biopsias2.GetAllPaged(config.PsqlDB, filtro, p)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get biopsias"))
		return
	}
	if !completarPermisosBiopsias(w, r, lista) {
		return
	}

	// Contadores del encabezado, con el mismo filtro de médico que la lista.
	sinResultado, atrasadas, err := biopsias2.Pendientes(config.PsqlDB, filtro.MedicoID, diasAtraso)
	if err != nil {
		log.Printf("Error counting biopsias pendientes: %v", err)
	}

	responderJSON(w, http.StatusOK, struct {
		Data []biopsias2.Biopsia `json:"data"`
		Meta pagination.Meta     `json:"meta"`
		// Resumen para el encabezado de la pantalla de seguimiento.
		SinResultado int `json:"sin_resultado"`
		Atrasadas    int `json:"atrasadas"`
		DiasAtraso   int `json:"dias_atraso"`
	}{lista, pagination.NewMeta(total, p), sinResultado, atrasadas, diasAtraso})
}

// GetBiopsia devuelve una biopsia con sus vínculos.
// GET /biopsias/{id}
func GetBiopsia(w http.ResponseWriter, r *http.Request) {
	id, ok := idBiopsia(r, "id")
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("param {:id} must be an integer"))
		return
	}
	responderBiopsia(w, r, id, http.StatusOK)
}

// GetBiopsiasDeNota lista las biopsias vinculadas a una nota.
// GET /notas/{id}/biopsias
func GetBiopsiasDeNota(w http.ResponseWriter, r *http.Request) {
	id, ok := idBiopsia(r, "id")
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("param {:id} must be an integer"))
		return
	}
	if !notaVigente(w, id) {
		return
	}
	lista, err := biopsias2.DeNota(config.PsqlDB, id)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get biopsias"))
		return
	}
	if !completarPermisosBiopsias(w, r, lista) {
		return
	}
	responderJSON(w, http.StatusOK, lista)
}

// GetBiopsiasDePaciente lista las biopsias de un paciente.
// GET /pacientes/{id}/biopsias
func GetBiopsiasDePaciente(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	lista, err := biopsias2.DePaciente(config.PsqlDB, id)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get biopsias"))
		return
	}
	if !completarPermisosBiopsias(w, r, lista) {
		return
	}
	responderJSON(w, http.StatusOK, lista)
}

// vincularConPermiso liga la biopsia a la nota si quien pide es admin o
// participante de esa nota. Escribe la respuesta de error cuando devuelve false.
func vincularConPermiso(w http.ResponseWriter, r *http.Request, notaID, biopsiaID int, rol string) bool {
	session, err := auth.GetSessionCookie(w, r)
	if err != nil {
		http.Error(w, "Unable to get user info", http.StatusUnauthorized)
		return false
	}
	if !notaVigente(w, notaID) {
		return false
	}
	if !puedeModificar(w, r, notaID) {
		return false
	}
	if err := biopsias2.Vincular(config.PsqlDB, notaID, biopsiaID, rol, session.UserID); err != nil {
		escribirErrorBiopsia(w, err)
		return false
	}
	return true
}

// CreateBiopsia registra una muestra. Con `nota_id` o `nota_client_uuid` la
// crea y la vincula como origen en una sola llamada; el paciente y el médico
// responsable se toman de la nota si no vienen.
// POST /biopsias
func CreateBiopsia(w http.ResponseWriter, r *http.Request) {
	session, err := auth.GetSessionCookie(w, r)
	if err != nil {
		http.Error(w, "Unable to get user info", http.StatusUnauthorized)
		return
	}

	var b biopsias2.Biopsia
	if err := json.NewDecoder(r.Body).Decode(&b); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Request body is not valid JSON"))
		return
	}

	// Reintento de una subida sin conexión que ya entró.
	if existente, err := biopsias2.BuscarPorClientUUID(config.PsqlDB, b.ClientUUID); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to create biopsia"))
		return
	} else if existente != nil {
		responderBiopsia(w, r, existente.ID, http.StatusOK)
		return
	}

	// Resolver la nota de origen, si viene.
	notaID := b.NotaID
	if notaID == 0 && b.NotaClientUUID != "" {
		nota, err := notas2.BuscarPorClientUUID(config.PsqlDB, b.NotaClientUUID)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte("Unable to create biopsia"))
			return
		}
		if nota == nil || nota.Eliminado {
			// La nota todavía no subió: el cliente encola y reintenta.
			w.WriteHeader(http.StatusConflict)
			w.Write([]byte("la nota de origen todavia no esta en el servidor"))
			return
		}
		notaID = nota.ID
	}

	if notaID != 0 {
		nota := notas2.Notas{ID: notaID}
		if err := nota.Get(config.PsqlDB); err != nil {
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte("nota no encontrada"))
			return
		}
		if !puedeModificar(w, r, notaID) {
			return
		}
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

	if b.IDPaciente == "" || strings.TrimSpace(b.Tejido) == "" || b.FechaToma.IsZero() {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("faltan datos: id_paciente (o nota_id), tejido y fecha_toma son obligatorios"))
		return
	}

	// El responsable tiene que ser un médico activo; el admin registra pero no
	// figura. Sin responsable explícito y sin nota, se asume el de la sesión.
	if b.IDMedicoResponsable == "" {
		if session.Role == auth.RolAdmin {
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte("falta el medico responsable"))
			return
		}
		b.IDMedicoResponsable = session.UserID
	}
	if !validarEquipo(w, []string{b.IDMedicoResponsable}) {
		return
	}

	if err := b.Create(config.PsqlDB); err != nil {
		escribirErrorBiopsia(w, err)
		return
	}

	if notaID != 0 {
		if err := biopsias2.Vincular(config.PsqlDB, notaID, b.ID, biopsias2.RolOrigen, session.UserID); err != nil {
			escribirErrorBiopsia(w, err)
			return
		}
	}

	responderBiopsia(w, r, b.ID, http.StatusCreated)
}

// camposTramite son los que la secretaria puede tocar: envío y resultado.
func aplicarTramite(actual *biopsias2.Biopsia, cuerpo biopsias2.Biopsia) {
	actual.Laboratorio = cuerpo.Laboratorio
	actual.FechaEnvio = cuerpo.FechaEnvio
	actual.NumeroPatologia = cuerpo.NumeroPatologia
	actual.Resultado = cuerpo.Resultado
	actual.FechaResultado = cuerpo.FechaResultado
	actual.Observaciones = cuerpo.Observaciones
	actual.Estado = cuerpo.Estado
}

// UpdateBiopsia reescribe la biopsia según el permiso de quien pide:
//   - admin y médico responsable: todo, incluido retroceder de estado;
//   - médico participante de una nota vinculada: todo menos retroceder;
//   - secretaria: solo el trámite (envío, número de patología, resultado) y
//     solo hacia adelante hasta con_resultado (PRD 0.5.0, D1).
//
// PUT /biopsias/{id}
func UpdateBiopsia(w http.ResponseWriter, r *http.Request) {
	id, ok := idBiopsia(r, "id")
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("param {:id} must be an integer"))
		return
	}
	session, err := auth.GetSessionCookie(w, r)
	if err != nil {
		http.Error(w, "Unable to get user info", http.StatusUnauthorized)
		return
	}

	actual := biopsias2.Biopsia{ID: id}
	if err := actual.Get(config.PsqlDB); err != nil {
		escribirErrorBiopsia(w, err)
		return
	}
	lote := []biopsias2.Biopsia{actual}
	if !completarPermisosBiopsias(w, r, lote) {
		return
	}
	actual = lote[0]

	var cuerpo biopsias2.Biopsia
	if err := json.NewDecoder(r.Body).Decode(&cuerpo); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("Request body is not valid JSON"))
		return
	}
	if cuerpo.Estado == "" {
		cuerpo.Estado = actual.Estado
	}

	estadoAnterior := actual.Estado
	esResponsable := actual.IDMedicoResponsable == session.UserID
	retrocede := cuerpo.EsRetroceso(estadoAnterior)

	switch {
	case session.Role == auth.RolSecretaria:
		if !actual.PuedeTramitar {
			w.Header().Set(CabeceraMotivo, MotivoNoParticipante)
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		if retrocede || cuerpo.Estado == biopsias2.EstadoEntregada {
			w.Header().Set(CabeceraMotivo, MotivoNoParticipante)
			http.Error(w, "la secretaria solo puede marcar la biopsia como enviada o cargar su resultado", http.StatusForbidden)
			return
		}
		aplicarTramite(&actual, cuerpo)
	case actual.PuedeEditar:
		if retrocede && session.Role != auth.RolAdmin && !esResponsable {
			escribirErrorBiopsia(w, biopsias2.ErrRetroceso)
			return
		}
		// Reemplazo completo, conservando lo que el body no puede cambiar.
		cuerpo.ID = actual.ID
		cuerpo.IDPaciente = actual.IDPaciente
		cuerpo.ClientUUID = actual.ClientUUID
		if cuerpo.IDMedicoResponsable == "" {
			cuerpo.IDMedicoResponsable = actual.IDMedicoResponsable
		}
		if cuerpo.FechaToma.IsZero() {
			cuerpo.FechaToma = actual.FechaToma
		}
		if strings.TrimSpace(cuerpo.Tejido) == "" {
			cuerpo.Tejido = actual.Tejido
		}
		actual = cuerpo
	default:
		w.Header().Set(CabeceraMotivo, MotivoNoParticipante)
		http.Error(w, "forbidden, solo el equipo de la nota o el medico responsable puede modificar esta biopsia", http.StatusForbidden)
		return
	}

	if retrocede {
		actual.LimpiarEstadosAbandonados()
	}
	if !validarEquipo(w, []string{actual.IDMedicoResponsable}) {
		return
	}
	if err := actual.Update(config.PsqlDB); err != nil {
		escribirErrorBiopsia(w, err)
		return
	}
	responderBiopsia(w, r, id, http.StatusOK)
}

// DeleteBiopsia da de baja lógica. Solo admin o médico responsable.
// DELETE /biopsias/{id}
func DeleteBiopsia(w http.ResponseWriter, r *http.Request) {
	id, ok := idBiopsia(r, "id")
	if !ok {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("param {:id} must be an integer"))
		return
	}
	session, err := auth.GetSessionCookie(w, r)
	if err != nil {
		http.Error(w, "Unable to get user info", http.StatusUnauthorized)
		return
	}
	actual := biopsias2.Biopsia{ID: id}
	if err := actual.Get(config.PsqlDB); err != nil {
		escribirErrorBiopsia(w, err)
		return
	}
	if session.Role != auth.RolAdmin && actual.IDMedicoResponsable != session.UserID {
		w.Header().Set(CabeceraMotivo, MotivoNoParticipante)
		http.Error(w, "forbidden, solo el administrador o el medico responsable puede dar de baja la biopsia", http.StatusForbidden)
		return
	}
	if err := biopsias2.Delete(config.PsqlDB, id); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to delete biopsia"))
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// VincularBiopsia liga una biopsia existente a la nota.
// POST /notas/{id}/biopsias/{idBiopsia}  {"rol": "seguimiento"}
func VincularBiopsia(w http.ResponseWriter, r *http.Request) {
	notaID, ok1 := idBiopsia(r, "id")
	biopsiaID, ok2 := idBiopsia(r, "idBiopsia")
	if !ok1 || !ok2 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("params must be integers"))
		return
	}
	var cuerpo struct {
		Rol string `json:"rol"`
	}
	if r.ContentLength != 0 {
		if err := json.NewDecoder(r.Body).Decode(&cuerpo); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte("Request body is not valid JSON"))
			return
		}
	}
	if !vincularConPermiso(w, r, notaID, biopsiaID, cuerpo.Rol) {
		return
	}
	responderBiopsia(w, r, biopsiaID, http.StatusOK)
}

// DesvincularBiopsia quita el vínculo. No toca tuvo_biopsia.
// DELETE /notas/{id}/biopsias/{idBiopsia}
func DesvincularBiopsia(w http.ResponseWriter, r *http.Request) {
	notaID, ok1 := idBiopsia(r, "id")
	biopsiaID, ok2 := idBiopsia(r, "idBiopsia")
	if !ok1 || !ok2 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("params must be integers"))
		return
	}
	if !notaVigente(w, notaID) || !puedeModificar(w, r, notaID) {
		return
	}
	if err := biopsias2.Desvincular(config.PsqlDB, notaID, biopsiaID); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to unlink biopsia"))
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
