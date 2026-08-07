package controllers

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"server/config"
	"server/controllers/auth"
	notas2 "server/models/notas"
	"server/services/export"
)

// ExportNotasMedico descarga en .xlsx el record quirúrgico del médico de la
// sesión: todas las notas en las que participó, sea como encargado o como parte
// del equipo quirúrgico.
//
// El rango es opcional (`?from=&to=`, YYYY-MM-DD o RFC3339). Sin parámetros baja
// el historial completo; con uno solo, queda abierto por ese lado.
//
// El médico exporta siempre lo suyo: el `medico` de la sesión no se puede
// sobreescribir desde el query string, salvo que quien pida sea admin
// (`?medico=<uuid>`), que es como el jefe de servicio arma los reportes.
func ExportNotasMedico(w http.ResponseWriter, r *http.Request) {
	session, err := auth.GetSessionCookie(w, r)
	if err != nil {
		log.Println("Unable to get cookie ", err)
		http.Error(w, "Unable to get user info", http.StatusUnauthorized)
		return
	}

	medicoID := session.UserID
	if otro := r.URL.Query().Get("medico"); otro != "" && otro != session.UserID {
		if session.Role != auth.RolAdmin {
			http.Error(w, "forbidden, cada medico solo exporta sus propias notas", http.StatusForbidden)
			return
		}
		medicoID = otro
	}

	rango, err := rangoOpcionalDesdeQuery(r)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(err.Error()))
		return
	}

	nombre, err := notas2.NombreMedico(config.PsqlDB, medicoID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get medico"))
		return
	}
	if nombre == "" {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte("medico no encontrado"))
		return
	}

	filas, err := notas2.GetNotasExportMedico(config.PsqlDB, medicoID, rango.From, rango.To)
	if err != nil {
		log.Printf("Error getting notas para exportar: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to get notas"))
		return
	}

	// La cédula del médico no está en "Usuarios": la planilla del servicio la
	// lleva escrita a mano, y el sistema nunca la pidió. Se manda vacía y la
	// portada omite el renglón.
	archivo, err := export.RecordQuirurgico(nombre, "", rango, filas)
	if err != nil {
		log.Printf("Error building xlsx: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Unable to build export"))
		return
	}
	defer archivo.Close()

	// Las cabeceras van antes del cuerpo: una vez que empieza a escribirse el
	// .xlsx ya no se puede responder un error.
	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", export.NombreArchivo(nombre, rango)))
	// Sin esto el frontend, al ir por CORS, no puede leer el nombre del archivo.
	w.Header().Set("Access-Control-Expose-Headers", "Content-Disposition")
	w.Header().Set("Cache-Control", "no-store")

	if err := archivo.Write(w); err != nil {
		// El status ya salió: solo queda dejar rastro en el log.
		log.Printf("Error writing xlsx: %v", err)
	}
}

// rangoOpcionalDesdeQuery lee `?from=&to=` cuando ambos son opcionales. Los
// extremos ausentes quedan en nil, que el modelo interpreta como "sin límite".
func rangoOpcionalDesdeQuery(r *http.Request) (export.Rango, error) {
	var rango export.Rango
	query := r.URL.Query()

	from, err := parseFecha(query.Get("from"))
	if err != nil {
		return rango, errors.New("el parametro 'from' debe ser una fecha YYYY-MM-DD o RFC3339")
	}
	if !from.IsZero() {
		rango.From = &from
	}

	to, err := parseFecha(query.Get("to"))
	if err != nil {
		return rango, errors.New("el parametro 'to' debe ser una fecha YYYY-MM-DD o RFC3339")
	}
	if !to.IsZero() {
		// Se toma el día completo: un rango que termina el 31 tiene que incluir
		// lo operado el 31.
		to = time.Date(to.Year(), to.Month(), to.Day(), 23, 59, 59, 0, to.Location())
		rango.To = &to
	}

	if rango.From != nil && rango.To != nil && rango.To.Before(*rango.From) {
		return rango, errors.New("el parametro 'to' no puede ser anterior a 'from'")
	}

	return rango, nil
}
