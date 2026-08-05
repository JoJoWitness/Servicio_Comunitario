package export

import (
	"archive/zip"
	"strings"
	"testing"
	"time"

	"server/models/notas"

	"github.com/xuri/excelize/v2"
)

func fechaTest(s string) time.Time {
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		panic(err)
	}
	return t
}

func filasTest() []notas.FilaExport {
	return []notas.FilaExport{
		{
			ID:                 1,
			Fecha:              fechaTest("2026-03-04"),
			HoraComienzo:       "08:30",
			HoraCulminacion:    "09:15",
			PacienteNombre:     "Emilse Pacheco",
			PacienteDocumento:  "V-12345678",
			PacienteGenero:     "F",
			PacienteNacimiento: fechaTest("1975-11-20"),
			DXPreOperatorio:    "Pterigion temporal OD",
			DXPostOperatorio:   "Pterigion temporal grado II OD",
			Intervencion:       "Exeresis de pterigion temporal GII OD",
			Resumen:            "Asepsia y antisepsia, anestesia local, exeresis y autoinjerto.",
			Pabellon:           "Q2",
			Anestesia:          "Local",
			EsElectiva:         true,
			TuvoBiopsia:        true,
			Cirujano:           "Maythe Chacon",
			Ayudantes:          "Nelson Rosales",
		},
		{
			ID:                 2,
			Fecha:              fechaTest("2026-03-11"),
			HoraComienzo:       "10:00",
			HoraCulminacion:    "10:40",
			PacienteNombre:     "Daniel Mendoza",
			PacienteDocumento:  "V-87654321",
			PacienteGenero:     "M",
			PacienteNacimiento: fechaTest("1990-01-05"),
			DXPreOperatorio:    "Chalazion OD",
			DXPostOperatorio:   "Chalazion OD",
			Intervencion:       "  exeresis de PTERIGION temporal GII OD ",
			Resumen:            "Cura de chalazion sin complicaciones.",
			Pabellon:           "Q1",
			Anestesia:          "Local",
			EsEmergencia:       true,
			Cirujano:           "Maythe Chacon",
		},
	}
}

func TestRecordQuirurgico(t *testing.T) {
	desde := fechaTest("2026-01-01")
	hasta := fechaTest("2026-12-31")
	rango := Rango{From: &desde, To: &hasta}

	f, err := RecordQuirurgico("Maythe Chacon", rango, filasTest())
	if err != nil {
		t.Fatalf("RecordQuirurgico: %v", err)
	}
	defer f.Close()

	hojas := f.GetSheetList()
	if len(hojas) != 2 || hojas[0] != hojaRecord || hojas[1] != hojaResumen {
		t.Fatalf("hojas = %v", hojas)
	}

	// Encabezado en la fila esperada y primera nota justo debajo.
	if v, _ := f.GetCellValue(hojaRecord, "A6"); v != "N°" {
		t.Errorf("A6 = %q, se esperaba el encabezado", v)
	}
	if v, _ := f.GetCellValue(hojaRecord, "E7"); v != "Emilse Pacheco" {
		t.Errorf("E7 = %q", v)
	}

	// La edad es la del día de la cirugía (2026-03-04), no la de hoy.
	if v, _ := f.GetCellValue(hojaRecord, "F7"); v != "50" {
		t.Errorf("edad = %q, se esperaba 50", v)
	}

	if v, _ := f.GetCellValue(hojaRecord, "P7"); v != "Electiva" {
		t.Errorf("tipo fila 1 = %q", v)
	}
	if v, _ := f.GetCellValue(hojaRecord, "P8"); v != "Emergencia" {
		t.Errorf("tipo fila 2 = %q", v)
	}

	// Las dos filas traen la misma intervención escrita distinto: el resumen
	// las cuenta como un solo procedimiento.
	if v, _ := f.GetCellValue(hojaResumen, "A7"); v != "EXERESIS DE PTERIGION TEMPORAL GII OD" {
		t.Errorf("procedimiento = %q", v)
	}
	if v, _ := f.GetCellValue(hojaResumen, "B7"); v != "2" {
		t.Errorf("cantidad = %q, se esperaba 2", v)
	}
	if v, _ := f.GetCellValue(hojaResumen, "B8"); v != "2" {
		t.Errorf("total = %q, se esperaba 2", v)
	}
}

func TestRecordQuirurgicoSinNotas(t *testing.T) {
	f, err := RecordQuirurgico("Maythe Chacon", Rango{}, nil)
	if err != nil {
		t.Fatalf("RecordQuirurgico: %v", err)
	}
	defer f.Close()

	// Un médico sin notas en el período recibe la planilla vacía, no un error.
	filas, err := f.GetRows(hojaRecord)
	if err != nil {
		t.Fatalf("GetRows: %v", err)
	}
	if len(filas) != filaEncabezado {
		t.Errorf("filas = %d, se esperaban %d (portada + encabezado)", len(filas), filaEncabezado)
	}
	if v, _ := f.GetCellValue(hojaRecord, "A3"); v != "Periodo: historial completo" {
		t.Errorf("A3 = %q", v)
	}
}

func TestNombreArchivo(t *testing.T) {
	desde := fechaTest("2026-01-01")
	hasta := fechaTest("2026-06-30")

	casos := []struct {
		nombre string
		rango  Rango
		quiero string
	}{
		{"Maythe Chacón Ramírez", Rango{From: &desde, To: &hasta}, "record-quirurgico-maythe-chacon-ramirez-2026-01-01_2026-06-30.xlsx"},
		{"Maythe Chacón", Rango{}, "record-quirurgico-maythe-chacon-completo.xlsx"},
		{"Maythe Chacón", Rango{From: &desde}, "record-quirurgico-maythe-chacon-desde-2026-01-01.xlsx"},
	}

	for _, c := range casos {
		if got := NombreArchivo(c.nombre, c.rango); got != c.quiero {
			t.Errorf("NombreArchivo(%q) = %q, se esperaba %q", c.nombre, got, c.quiero)
		}
	}
}

func TestResumenLlevaGraficas(t *testing.T) {
	f, err := RecordQuirurgico("Maythe Chacon", Rango{}, filasTest())
	if err != nil {
		t.Fatalf("RecordQuirurgico: %v", err)
	}
	defer f.Close()

	ruta := t.TempDir() + "/record.xlsx"
	if err := f.SaveAs(ruta); err != nil {
		t.Fatalf("SaveAs: %v", err)
	}

	// Las gráficas viven en partes propias del zip; si no se escribieron, Excel
	// abre la hoja sin nada aunque el resto del libro esté bien.
	z, err := zip.OpenReader(ruta)
	if err != nil {
		t.Fatalf("OpenReader: %v", err)
	}
	defer z.Close()

	var graficas, dibujos int
	for _, file := range z.File {
		switch {
		case strings.HasPrefix(file.Name, "xl/charts/chart"):
			graficas++
		case strings.HasPrefix(file.Name, "xl/drawings/drawing"):
			dibujos++
		}
	}

	if graficas != 2 {
		t.Errorf("graficas = %d, se esperaban 2 (procedimientos y meses)", graficas)
	}
	if dibujos == 0 {
		t.Error("el libro no trae el dibujo que ancla las graficas a la hoja")
	}

	// El bloque de meses es el que alimenta la segunda gráfica: las dos notas
	// de prueba son de marzo de 2026.
	filas, err := f.GetRows(hojaResumen)
	if err != nil {
		t.Fatalf("GetRows: %v", err)
	}
	var encontrado bool
	for _, fila := range filas {
		if len(fila) >= 2 && fila[0] == "mar 2026" && fila[1] == "2" {
			encontrado = true
		}
	}
	if !encontrado {
		t.Error("falta la fila 'mar 2026' = 2 en el bloque de meses")
	}
}

// El archivo generado tiene que abrirse como un .xlsx válido después de
// escribirse: es lo único que garantiza que el médico pueda abrirlo en Excel.
func TestArchivoSeAbre(t *testing.T) {
	f, err := RecordQuirurgico("Maythe Chacon", Rango{}, filasTest())
	if err != nil {
		t.Fatalf("RecordQuirurgico: %v", err)
	}
	defer f.Close()

	ruta := t.TempDir() + "/record.xlsx"
	if err := f.SaveAs(ruta); err != nil {
		t.Fatalf("SaveAs: %v", err)
	}

	abierto, err := excelize.OpenFile(ruta)
	if err != nil {
		t.Fatalf("OpenFile: %v", err)
	}
	defer abierto.Close()

	if v, _ := abierto.GetCellValue(hojaRecord, "A1"); v != "RECORD QUIRURGICO" {
		t.Errorf("A1 = %q", v)
	}
}
