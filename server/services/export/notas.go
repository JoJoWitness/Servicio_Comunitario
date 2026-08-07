// Package export arma los reportes descargables del servicio. Hoy solo el
// record quirúrgico del médico en formato .xlsx.
package export

import (
	"fmt"
	"sort"
	"strings"
	"time"
	"unicode"

	"server/models/notas"

	"github.com/xuri/excelize/v2"
)

const (
	hojaRecord  = "Record Quirurgico"
	hojaResumen = "Resumen"

	// Fila donde arranca el encabezado de la tabla. Encima van las cuatro
	// líneas de portada de la planilla del servicio (título con el período,
	// médico, cédula y total de casos).
	filaEncabezado = 8
)

// columnas del record quirúrgico, en el mismo orden y con los mismos rótulos
// que la planilla que el servicio lleva a mano (`docs/RECOR MAYTHE.xlsx`).
var columnas = []struct {
	Titulo string
	Ancho  float64
}{
	{"CASO", 7},
	{"FECHA", 12},
	{"NOMBRE Y APELLIDO", 30},
	{"EDAD", 7},
	{"SEXO", 7},
	{"CEDULA", 18},
	{"DIAGNOSTICO", 40},
	{"INTERVENCION", 44},
	{"CIRUJANO", 26},
	{"AYUDANTE", 28},
}

// Rango es el período exportado. Los extremos en nil significan "sin límite",
// que es como el médico pide su record completo.
type Rango struct {
	From *time.Time
	To   *time.Time
}

// Texto describe el rango para la portada del reporte.
func (r Rango) Texto() string {
	switch {
	case r.From != nil && r.To != nil:
		return fmt.Sprintf("%s al %s", fecha(*r.From), fecha(*r.To))
	case r.From != nil:
		return "desde el " + fecha(*r.From)
	case r.To != nil:
		return "hasta el " + fecha(*r.To)
	default:
		return "historial completo"
	}
}

func fecha(t time.Time) string { return t.Format("02/01/2006") }

// RecordQuirurgico arma el libro con dos hojas: el detalle de cada nota y un
// resumen por procedimiento, que es lo que el médico entrega como constancia de
// actividad. El llamador cierra el archivo.
func RecordQuirurgico(medico, documento string, rango Rango, filas []notas.FilaExport) (*excelize.File, error) {
	f := excelize.NewFile()

	if err := f.SetSheetName(f.GetSheetName(0), hojaRecord); err != nil {
		return nil, err
	}

	estilos, err := nuevosEstilos(f)
	if err != nil {
		return nil, err
	}

	if err := escribirRecord(f, estilos, medico, documento, rango, filas); err != nil {
		return nil, err
	}

	if err := escribirResumen(f, estilos, medico, documento, rango, filas); err != nil {
		return nil, err
	}

	f.SetActiveSheet(0)

	return f, nil
}

// estilos agrupa los IDs que devuelve excelize para no recalcularlos por celda.
type estilos struct {
	Titulo    int
	Subtitulo int
	Cabecera  int
	Texto     int
	Centrado  int
	Fecha     int
	Total     int
	Grupo     int
}

func nuevosEstilos(f *excelize.File) (estilos, error) {
	var e estilos
	var err error

	borde := []excelize.Border{
		{Type: "left", Color: "BFBFBF", Style: 1},
		{Type: "right", Color: "BFBFBF", Style: 1},
		{Type: "top", Color: "BFBFBF", Style: 1},
		{Type: "bottom", Color: "BFBFBF", Style: 1},
	}

	if e.Titulo, err = f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 14},
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center"},
	}); err != nil {
		return e, err
	}

	if e.Subtitulo, err = f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Size: 11, Color: "404040"},
	}); err != nil {
		return e, err
	}

	if e.Cabecera, err = f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF"},
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"1F4E79"}},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border:    borde,
	}); err != nil {
		return e, err
	}

	if e.Texto, err = f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Vertical: "top", WrapText: true},
		Border:    borde,
	}); err != nil {
		return e, err
	}

	if e.Centrado, err = f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "top"},
		Border:    borde,
	}); err != nil {
		return e, err
	}

	// 15 es el formato de fecha "d-mmm-yy"; se sobreescribe con el nuestro.
	if e.Fecha, err = f.NewStyle(&excelize.Style{
		CustomNumFmt: strPtr("dd/mm/yyyy"),
		Alignment:    &excelize.Alignment{Horizontal: "center", Vertical: "top"},
		Border:       borde,
	}); err != nil {
		return e, err
	}

	if e.Total, err = f.NewStyle(&excelize.Style{
		Font:   &excelize.Font{Bold: true},
		Border: borde,
	}); err != nil {
		return e, err
	}

	// Renglón que abre cada familia clínica dentro del record.
	if e.Grupo, err = f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "1F4E79"},
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"DCE6F1"}},
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center"},
		Border:    borde,
	}); err != nil {
		return e, err
	}

	return e, nil
}

func strPtr(s string) *string { return &s }

// escribirRecord vuelca el detalle: una fila por nota operatoria.
func escribirRecord(f *excelize.File, e estilos, medico, documento string, rango Rango, filas []notas.FilaExport) error {
	if err := portada(f, e, hojaRecord, "RECORD QUIRURGICO", medico, documento, rango, len(filas), len(columnas)); err != nil {
		return err
	}

	for i, c := range columnas {
		celda, err := excelize.CoordinatesToCellName(i+1, filaEncabezado)
		if err != nil {
			return err
		}
		if err := f.SetCellValue(hojaRecord, celda, c.Titulo); err != nil {
			return err
		}

		col, err := excelize.ColumnNumberToName(i + 1)
		if err != nil {
			return err
		}
		if err := f.SetColWidth(hojaRecord, col, col, c.Ancho); err != nil {
			return err
		}
	}

	ultimaCol, err := excelize.ColumnNumberToName(len(columnas))
	if err != nil {
		return err
	}

	if err := f.SetCellStyle(hojaRecord, "A"+fmt.Sprint(filaEncabezado), ultimaCol+fmt.Sprint(filaEncabezado), e.Cabecera); err != nil {
		return err
	}
	if err := f.SetRowHeight(hojaRecord, filaEncabezado, 30); err != nil {
		return err
	}

	// El cuerpo va agrupado por familia clínica, con un renglón de título por
	// grupo, y la numeración de casos corre de principio a fin sin reiniciarse:
	// así es como está armada la planilla del servicio.
	n := filaEncabezado
	caso := 0
	familiaActual := ""

	for _, fila := range agruparPorFamilia(filas) {
		if familia := fila.FamiliaOSinClasificar(); familia != familiaActual {
			familiaActual = familia
			n++
			if err := f.SetCellValue(hojaRecord, fmt.Sprintf("A%d", n), familia); err != nil {
				return err
			}
			if err := f.SetCellStyle(hojaRecord, fmt.Sprintf("A%d", n), ultimaCol+fmt.Sprint(n), e.Grupo); err != nil {
				return err
			}
		}

		caso++
		n++

		valores := []any{
			caso,
			fila.Fecha,
			fila.PacienteNombre,
			fila.Edad(),
			fila.PacienteGenero,
			fila.PacienteDocumento,
			fila.DXPreOperatorio,
			fila.Intervencion,
			fila.Cirujano,
			fila.Ayudantes,
		}

		for c, v := range valores {
			celda, err := excelize.CoordinatesToCellName(c+1, n)
			if err != nil {
				return err
			}
			if err := f.SetCellValue(hojaRecord, celda, v); err != nil {
				return err
			}
			if err := f.SetCellStyle(hojaRecord, celda, celda, estiloColumna(e, c)); err != nil {
				return err
			}
		}
	}

	// El encabezado queda fijo y filtrable: el record de un residente son
	// cientos de filas.
	if err := f.SetPanes(hojaRecord, &excelize.Panes{
		Freeze:      true,
		Split:       false,
		XSplit:      0,
		YSplit:      filaEncabezado,
		TopLeftCell: fmt.Sprintf("A%d", filaEncabezado+1),
		ActivePane:  "bottomLeft",
	}); err != nil {
		return err
	}

	if len(filas) > 0 {
		rangoTabla := fmt.Sprintf("A%d:%s%d", filaEncabezado, ultimaCol, n)
		if err := f.AutoFilter(hojaRecord, rangoTabla, nil); err != nil {
			return err
		}
	}

	return nil
}

// agruparPorFamilia deja juntas las notas de la misma familia clínica,
// conservando el orden cronológico dentro de cada grupo. Los grupos salen por
// orden de aparición y "SIN CLASIFICAR" al final, para que no encabece la
// planilla cuando hay diagnósticos escritos a mano.
func agruparPorFamilia(filas []notas.FilaExport) []notas.FilaExport {
	orden := map[string]int{}
	for _, fila := range filas {
		familia := fila.FamiliaOSinClasificar()
		if _, visto := orden[familia]; !visto {
			orden[familia] = len(orden)
		}
	}

	agrupadas := make([]notas.FilaExport, len(filas))
	copy(agrupadas, filas)

	peso := func(familia string) int {
		if familia == "SIN CLASIFICAR" {
			return len(orden) + 1
		}
		return orden[familia]
	}

	sort.SliceStable(agrupadas, func(i, j int) bool {
		return peso(agrupadas[i].FamiliaOSinClasificar()) <
			peso(agrupadas[j].FamiliaOSinClasificar())
	})

	return agrupadas
}

// estiloColumna centra las columnas cortas y deja el resto con ajuste de texto.
func estiloColumna(e estilos, indice int) int {
	switch indice {
	case 1: // FECHA
		return e.Fecha
	case 0, 3, 4: // CASO, EDAD, SEXO
		return e.Centrado
	default:
		return e.Texto
	}
}

// escribirResumen cuenta las intervenciones del período, que es el dato que se
// entrega en los reportes de actividad del servicio.
func escribirResumen(f *excelize.File, e estilos, medico, documento string, rango Rango, filas []notas.FilaExport) error {
	if _, err := f.NewSheet(hojaResumen); err != nil {
		return err
	}

	if err := portada(f, e, hojaResumen, "RESUMEN DE ACTIVIDAD", medico, documento, rango, len(filas), 2); err != nil {
		return err
	}

	if err := f.SetColWidth(hojaResumen, "A", "A", 52); err != nil {
		return err
	}
	if err := f.SetColWidth(hojaResumen, "B", "B", 14); err != nil {
		return err
	}

	if err := f.SetCellValue(hojaResumen, fmt.Sprintf("A%d", filaEncabezado), "PROCEDIMIENTO"); err != nil {
		return err
	}
	if err := f.SetCellValue(hojaResumen, fmt.Sprintf("B%d", filaEncabezado), "CANTIDAD"); err != nil {
		return err
	}
	if err := f.SetCellStyle(hojaResumen, fmt.Sprintf("A%d", filaEncabezado), fmt.Sprintf("B%d", filaEncabezado), e.Cabecera); err != nil {
		return err
	}

	// Se agrupa por intervención normalizada (sin mayúsculas ni espacios de
	// más) porque hoy el campo es texto libre: "Exeresis de pterigion  " y
	// "EXERESIS DE PTERIGION" son el mismo procedimiento.
	type conteo struct {
		Nombre   string
		Cantidad int
	}
	indice := map[string]*conteo{}
	orden := []*conteo{}

	var electivas, emergencias, biopsias int
	for _, fila := range filas {
		// Se cuenta por familia clínica (PTERIGIONES, CHALAZION…), que es la
		// unidad en la que el servicio reporta su actividad, y la misma con la
		// que se agrupa el record.
		clave := fila.FamiliaOSinClasificar()

		if c, ok := indice[clave]; ok {
			c.Cantidad++
		} else {
			c := &conteo{Nombre: clave, Cantidad: 1}
			indice[clave] = c
			orden = append(orden, c)
		}

		if fila.EsEmergencia {
			emergencias++
		} else if fila.EsElectiva {
			electivas++
		}
		if fila.TuvoBiopsia {
			biopsias++
		}
	}

	// De mayor a menor; a igual cantidad, alfabético, para que dos
	// exportaciones del mismo período salgan idénticas.
	sort.SliceStable(orden, func(i, j int) bool {
		if orden[i].Cantidad != orden[j].Cantidad {
			return orden[i].Cantidad > orden[j].Cantidad
		}
		return orden[i].Nombre < orden[j].Nombre
	})

	n := filaEncabezado
	for _, c := range orden {
		n++
		if err := f.SetCellValue(hojaResumen, fmt.Sprintf("A%d", n), c.Nombre); err != nil {
			return err
		}
		if err := f.SetCellValue(hojaResumen, fmt.Sprintf("B%d", n), c.Cantidad); err != nil {
			return err
		}
		if err := f.SetCellStyle(hojaResumen, fmt.Sprintf("A%d", n), fmt.Sprintf("A%d", n), e.Texto); err != nil {
			return err
		}
		if err := f.SetCellStyle(hojaResumen, fmt.Sprintf("B%d", n), fmt.Sprintf("B%d", n), e.Centrado); err != nil {
			return err
		}
	}

	n++
	if err := f.SetCellValue(hojaResumen, fmt.Sprintf("A%d", n), "TOTAL"); err != nil {
		return err
	}
	if err := f.SetCellValue(hojaResumen, fmt.Sprintf("B%d", n), len(filas)); err != nil {
		return err
	}
	if err := f.SetCellStyle(hojaResumen, fmt.Sprintf("A%d", n), fmt.Sprintf("B%d", n), e.Total); err != nil {
		return err
	}

	// El rango que alimenta la gráfica de procedimientos, antes de que el TOTAL
	// entre en juego: incluirlo aplastaría las barras contra una sola barra
	// gigante.
	procDesde, procHasta := filaEncabezado+1, n-1

	// Bloque aparte con el desglose que pide el reporte del servicio.
	n += 2
	desglose := [][]any{
		{"Electivas", electivas},
		{"Emergencias", emergencias},
		{"Con biopsia", biopsias},
		{"Sin biopsia", len(filas) - biopsias},
	}
	for _, d := range desglose {
		if err := f.SetCellValue(hojaResumen, fmt.Sprintf("A%d", n), d[0]); err != nil {
			return err
		}
		if err := f.SetCellValue(hojaResumen, fmt.Sprintf("B%d", n), d[1]); err != nil {
			return err
		}
		if err := f.SetCellStyle(hojaResumen, fmt.Sprintf("A%d", n), fmt.Sprintf("A%d", n), e.Texto); err != nil {
			return err
		}
		if err := f.SetCellStyle(hojaResumen, fmt.Sprintf("B%d", n), fmt.Sprintf("B%d", n), e.Centrado); err != nil {
			return err
		}
		n++
	}

	// Actividad mes a mes: es la otra lectura del record, cuánto se operó y
	// cuándo. Va en su propio bloque porque una gráfica solo puede apuntar a
	// celdas, no a valores calculados en memoria.
	n++
	mesDesde, mesHasta, err := escribirMeses(f, e, filas, n)
	if err != nil {
		return err
	}

	return graficasResumen(f, procDesde, procHasta, mesDesde, mesHasta)
}

// mesesCortos evita depender del locale: el formato de Go es en inglés y el
// reporte lo lee el servicio en español.
var mesesCortos = [...]string{"ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"}

// escribirMeses vuelca el conteo de operaciones por mes y devuelve el rango de
// filas ocupado, para que la gráfica lo apunte.
func escribirMeses(f *excelize.File, e estilos, filas []notas.FilaExport, inicio int) (int, int, error) {
	if err := f.SetCellValue(hojaResumen, fmt.Sprintf("A%d", inicio), "MES"); err != nil {
		return 0, 0, err
	}
	if err := f.SetCellValue(hojaResumen, fmt.Sprintf("B%d", inicio), "OPERACIONES"); err != nil {
		return 0, 0, err
	}
	if err := f.SetCellStyle(hojaResumen, fmt.Sprintf("A%d", inicio), fmt.Sprintf("B%d", inicio), e.Cabecera); err != nil {
		return 0, 0, err
	}

	// Clave ordenable (2026-03) y etiqueta legible (mar 2026).
	conteo := map[string]int{}
	claves := []string{}
	for _, fila := range filas {
		if fila.Fecha.IsZero() {
			continue
		}
		clave := fila.Fecha.Format("2006-01")
		if _, visto := conteo[clave]; !visto {
			claves = append(claves, clave)
		}
		conteo[clave]++
	}
	sort.Strings(claves)

	n := inicio
	for _, clave := range claves {
		n++
		mes, err := time.Parse("2006-01", clave)
		if err != nil {
			return 0, 0, err
		}
		etiqueta := fmt.Sprintf("%s %d", mesesCortos[int(mes.Month())-1], mes.Year())

		if err := f.SetCellValue(hojaResumen, fmt.Sprintf("A%d", n), etiqueta); err != nil {
			return 0, 0, err
		}
		if err := f.SetCellValue(hojaResumen, fmt.Sprintf("B%d", n), conteo[clave]); err != nil {
			return 0, 0, err
		}
		if err := f.SetCellStyle(hojaResumen, fmt.Sprintf("A%d", n), fmt.Sprintf("A%d", n), e.Texto); err != nil {
			return 0, 0, err
		}
		if err := f.SetCellStyle(hojaResumen, fmt.Sprintf("B%d", n), fmt.Sprintf("B%d", n), e.Centrado); err != nil {
			return 0, 0, err
		}
	}

	return inicio + 1, n, nil
}

// azulSerie es el mismo azul del encabezado de las tablas: una sola serie no
// necesita más de un color, y repetir el de la cabecera hace que la hoja se lea
// como un solo documento.
const azulSerie = "2E75B6"

// altoFila es el alto por defecto de una fila en píxeles. Sirve para anclar la
// segunda gráfica debajo de la primera sin que se solapen.
const altoFila = 20

// graficasResumen dibuja las dos gráficas del reporte: qué se operó y cuándo.
// Los rangos llegan como filas ya escritas porque una gráfica de Excel solo sabe
// apuntar a celdas.
func graficasResumen(f *excelize.File, procDesde, procHasta, mesDesde, mesHasta int) error {
	// Excel, por defecto, pinta cada barra de un color distinto cuando hay una
	// sola serie. El color pasaría a significar el puesto en el ranking, que no
	// significa nada: una sola serie, un solo color.
	variarColores := false

	// Columnas verticales, del alto y ancho del original, y colocadas a la
	// derecha de la tabla en vez de debajo: es la disposición del record que
	// lleva el servicio (`docs/RECOR MAYTHE.xlsx`, Hoja2). Las categorías son
	// familias clínicas ("PTERIGIONES", "CHALAZION"), nombres cortos que en
	// vertical se leen sin girar.
	const anchoGrafica, altoGrafica = 480, 300

	if procHasta >= procDesde {
		if err := f.AddChart(hojaResumen, "D8", &excelize.Chart{
			Type: excelize.Col,
			Series: []excelize.ChartSeries{{
				Name:       fmt.Sprintf("'%s'!$B$%d", hojaResumen, filaEncabezado),
				Categories: fmt.Sprintf("'%s'!$A$%d:$A$%d", hojaResumen, procDesde, procHasta),
				Values:     fmt.Sprintf("'%s'!$B$%d:$B$%d", hojaResumen, procDesde, procHasta),
				Fill:       excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{azulSerie}},
			}},
			Title:      excelize.ChartTitle{Paragraph: []excelize.RichTextRun{{Text: "RECORD QUIRURGICO"}}},
			Dimension:  excelize.ChartDimension{Width: anchoGrafica, Height: altoGrafica},
			VaryColors: &variarColores,
			// Una sola serie: la leyenda solo repetiría el título.
			Legend: excelize.ChartLegend{Position: "none"},
			// El original no rotula las barras: la altura y la rejilla bastan,
			// y la cifra exacta está en la tabla de al lado.
			PlotArea: excelize.ChartPlotArea{ShowVal: false},
			YAxis:    excelize.ChartAxis{MajorGridLines: true},
		}); err != nil {
			return err
		}
	}

	if mesHasta >= mesDesde {
		// La de meses no está en el original, pero se dibuja igual para que las
		// dos se lean como del mismo documento.
		ancla := 8 + altoGrafica/altoFila + 2
		if err := f.AddChart(hojaResumen, fmt.Sprintf("D%d", ancla), &excelize.Chart{
			Type: excelize.Col,
			Series: []excelize.ChartSeries{{
				Name:       fmt.Sprintf("'%s'!$B$%d", hojaResumen, mesDesde-1),
				Categories: fmt.Sprintf("'%s'!$A$%d:$A$%d", hojaResumen, mesDesde, mesHasta),
				Values:     fmt.Sprintf("'%s'!$B$%d:$B$%d", hojaResumen, mesDesde, mesHasta),
				Fill:       excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{azulSerie}},
			}},
			Title:      excelize.ChartTitle{Paragraph: []excelize.RichTextRun{{Text: "OPERACIONES POR MES"}}},
			Dimension:  excelize.ChartDimension{Width: anchoGrafica, Height: altoGrafica},
			VaryColors: &variarColores,
			Legend:     excelize.ChartLegend{Position: "none"},
			PlotArea:   excelize.ChartPlotArea{ShowVal: false},
			YAxis:      excelize.ChartAxis{MajorGridLines: true},
		}); err != nil {
			return err
		}
	}

	return nil
}

// portada escribe el bloque de identificación que va sobre la tabla: qué es el
// documento, de qué médico y de qué período. Sin esto una planilla impresa no
// se puede atribuir a nadie.
// Fila donde arranca el bloque de portada. Deja libres las tres primeras, como
// la planilla del servicio, que reserva ese hueco para el membrete.
const primeraFilaPortada = 4

func portada(
	f *excelize.File,
	e estilos,
	hoja, titulo, medico, documento string,
	rango Rango,
	casos, ancho int,
) error {
	ultima, err := excelize.ColumnNumberToName(ancho)
	if err != nil {
		return err
	}

	lineas := []struct {
		Valor  string
		Estilo int
	}{
		{titulo + " " + rango.Texto(), e.Titulo},
		{"MEDICO: " + medico, e.Subtitulo},
	}

	// El sistema no guarda la cédula del médico, así que el renglón solo
	// aparece cuando quien llama tiene el dato: mejor omitirlo que imprimir
	// "CEDULA:" en blanco.
	if strings.TrimSpace(documento) != "" {
		lineas = append(lineas, struct {
			Valor  string
			Estilo int
		}{"CEDULA: " + documento, e.Subtitulo})
	}

	lineas = append(lineas, struct {
		Valor  string
		Estilo int
	}{fmt.Sprintf("CASOS: %d · Generado: %s", casos, time.Now().Format("02/01/2006 15:04")), e.Subtitulo})

	for i, l := range lineas {
		n := primeraFilaPortada + i
		celda := fmt.Sprintf("A%d", n)
		if err := f.SetCellValue(hoja, celda, l.Valor); err != nil {
			return err
		}
		if err := f.SetCellStyle(hoja, celda, celda, l.Estilo); err != nil {
			return err
		}
		if err := f.MergeCell(hoja, celda, fmt.Sprintf("%s%d", ultima, n)); err != nil {
			return err
		}
	}

	return f.SetRowHeight(hoja, primeraFilaPortada, 22)
}

// NombreArchivo arma el nombre con el que se descarga el reporte. Se mantiene
// en ASCII: el header Content-Disposition no lleva acentos sin codificar.
func NombreArchivo(medico string, rango Rango) string {
	partes := []string{"record-quirurgico"}

	if slug := slug(medico); slug != "" {
		partes = append(partes, slug)
	}

	switch {
	case rango.From != nil && rango.To != nil:
		partes = append(partes, rango.From.Format("2006-01-02")+"_"+rango.To.Format("2006-01-02"))
	case rango.From != nil:
		partes = append(partes, "desde-"+rango.From.Format("2006-01-02"))
	case rango.To != nil:
		partes = append(partes, "hasta-"+rango.To.Format("2006-01-02"))
	default:
		partes = append(partes, "completo")
	}

	return strings.Join(partes, "-") + ".xlsx"
}

// slug reduce el nombre del médico a minúsculas sin acentos ni separadores
// raros, para usarlo en el nombre del archivo.
func slug(s string) string {
	var b strings.Builder
	guion := false

	for _, r := range strings.ToLower(s) {
		switch {
		case r >= 'a' && r <= 'z', unicode.IsDigit(r):
			b.WriteRune(r)
			guion = false
		case r == 'á', r == 'à', r == 'ä', r == 'â':
			b.WriteRune('a')
			guion = false
		case r == 'é', r == 'è', r == 'ë', r == 'ê':
			b.WriteRune('e')
			guion = false
		case r == 'í', r == 'ì', r == 'ï', r == 'î':
			b.WriteRune('i')
			guion = false
		case r == 'ó', r == 'ò', r == 'ö', r == 'ô':
			b.WriteRune('o')
			guion = false
		case r == 'ú', r == 'ù', r == 'ü', r == 'û':
			b.WriteRune('u')
			guion = false
		case r == 'ñ':
			b.WriteRune('n')
			guion = false
		default:
			if !guion && b.Len() > 0 {
				b.WriteRune('-')
				guion = true
			}
		}
	}

	return strings.Trim(b.String(), "-")
}
