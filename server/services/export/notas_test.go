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
			Familia:            "Pterigion",
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
			Familia:            "Chalazion",
		},
	}
}

func TestRecordQuirurgico(t *testing.T) {
	desde := fechaTest("2026-01-01")
	hasta := fechaTest("2026-12-31")
	rango := Rango{From: &desde, To: &hasta}

	f, err := RecordQuirurgico("Maythe Chacon", "V-25.023.116", rango, filasTest())
	if err != nil {
		t.Fatalf("RecordQuirurgico: %v", err)
	}
	defer f.Close()

	hojas := f.GetSheetList()
	if len(hojas) != 2 || hojas[0] != hojaRecord || hojas[1] != hojaResumen {
		t.Fatalf("hojas = %v", hojas)
	}

	// Portada de la planilla: título con el período, médico y cédula.
	if v, _ := f.GetCellValue(hojaRecord, "A5"); v != "MEDICO: Maythe Chacon" {
		t.Errorf("A5 = %q", v)
	}
	if v, _ := f.GetCellValue(hojaRecord, "A6"); v != "CEDULA: V-25.023.116" {
		t.Errorf("A6 = %q", v)
	}

	// Encabezado en la fila 8, con los rótulos de la planilla del servicio.
	if v, _ := f.GetCellValue(hojaRecord, "A8"); v != "CASO" {
		t.Errorf("A8 = %q, se esperaba el encabezado", v)
	}
	if v, _ := f.GetCellValue(hojaRecord, "C8"); v != "NOMBRE Y APELLIDO" {
		t.Errorf("C8 = %q", v)
	}

	// Fila 9: título del primer grupo. Fila 10: su primer caso.
	if v, _ := f.GetCellValue(hojaRecord, "A9"); v != "PTERIGION" {
		t.Errorf("A9 = %q, se esperaba el grupo", v)
	}
	if v, _ := f.GetCellValue(hojaRecord, "A10"); v != "1" {
		t.Errorf("caso = %q", v)
	}
	if v, _ := f.GetCellValue(hojaRecord, "C10"); v != "Emilse Pacheco" {
		t.Errorf("C10 = %q", v)
	}

	// La edad es la del día de la cirugía (2026-03-04), no la de hoy.
	if v, _ := f.GetCellValue(hojaRecord, "D10"); v != "50" {
		t.Errorf("edad = %q, se esperaba 50", v)
	}

	// Segundo grupo con su propio título y la numeración de casos corrida.
	if v, _ := f.GetCellValue(hojaRecord, "A11"); v != "CHALAZION" {
		t.Errorf("A11 = %q, se esperaba el segundo grupo", v)
	}
	if v, _ := f.GetCellValue(hojaRecord, "A12"); v != "2" {
		t.Errorf("segundo caso = %q, la numeracion no debe reiniciarse", v)
	}

	// El resumen cuenta por familia clínica, igual que el record.
	if v, _ := f.GetCellValue(hojaResumen, "A9"); v != "CHALAZION" {
		t.Errorf("procedimiento = %q", v)
	}
	if v, _ := f.GetCellValue(hojaResumen, "B9"); v != "1" {
		t.Errorf("cantidad = %q", v)
	}
	if v, _ := f.GetCellValue(hojaResumen, "A11"); v != "TOTAL" {
		t.Errorf("A11 = %q, se esperaba TOTAL", v)
	}
	if v, _ := f.GetCellValue(hojaResumen, "B11"); v != "2" {
		t.Errorf("total = %q, se esperaba 2", v)
	}
}

func TestRecordQuirurgicoSinNotas(t *testing.T) {
	f, err := RecordQuirurgico("Maythe Chacon", "V-25.023.116", Rango{}, nil)
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
	if v, _ := f.GetCellValue(hojaRecord, "A4"); v != "RECORD QUIRURGICO historial completo" {
		t.Errorf("A4 = %q", v)
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
	f, err := RecordQuirurgico("Maythe Chacon", "V-25.023.116", Rango{}, filasTest())
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
	f, err := RecordQuirurgico("Maythe Chacon", "V-25.023.116", Rango{}, filasTest())
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

	if v, _ := abierto.GetCellValue(hojaRecord, "A4"); v != "RECORD QUIRURGICO historial completo" {
		t.Errorf("A4 = %q", v)
	}
}
