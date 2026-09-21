package biopsias

import (
	"errors"
	"fmt"
	"strings"
)

// Vocabularios de la "Solicitud de biopsia o citología". Coinciden con los
// CHECK del esquema y con `domain/catalogosBiopsia.ts` en el cliente.
var (
	TiposBiopsia     = []string{"incisional", "excisional", "trucut"}
	TiposCitologia   = []string{"impronta", "respronta", "aspiracion_aguja_fina"}
	CentrosToma      = []string{"hcsc", "ivss", "otro"}
	TiposMuestra     = []string{"cavidad_orbitaria", "globo_ocular", "conjuntiva", "parpado", "mejilla", "nariz", "ceja", "frente", "cornea", "otro"}
	Ubicaciones      = []string{"superior", "inferior"}
	Bordes           = []string{"definidos", "indefinidos", "irregulares"}
	Colores          = []string{"hiperpigmentada", "hipopigmentada", "aframbuesada", "salmon", "negra", "violacea", "amarilla", "nacarada", "blanca", "homogenea", "heterogenea"}
	Tamanos          = []string{"menor_0_5mm", "0_5_1mm", "1_2mm", "2_5mm", "otro"}
	Alturas          = []string{"plana", "sobreelevada", "ulcerada", "pediculada"}
	CambiosAsociados = []string{"descamacion", "queratosis", "telangiectasias"}
)

// ErrDescriptor es un valor fuera del vocabulario; el controlador lo traduce a 400.
var ErrDescriptor = errors.New("descriptor de la biopsia invalido")

func enLista(valor string, lista []string) bool {
	for _, v := range lista {
		if v == valor {
			return true
		}
	}
	return false
}

func validarUno(campo, valor string, lista []string) error {
	if valor == "" || enLista(valor, lista) {
		return nil
	}
	return fmt.Errorf("%w: %s no admite %q", ErrDescriptor, campo, valor)
}

// limpiarLista quita vacíos y repetidos, valida contra el vocabulario y
// devuelve siempre una lista no nil (para que el JSON sea `[]`, no `null`).
func limpiarLista(campo string, valores []string, lista []string) ([]string, error) {
	limpia := make([]string, 0, len(valores))
	vistos := map[string]bool{}
	for _, v := range valores {
		v = strings.TrimSpace(v)
		if v == "" || vistos[v] {
			continue
		}
		if !enLista(v, lista) {
			return nil, fmt.Errorf("%w: %s no admite %q", ErrDescriptor, campo, v)
		}
		vistos[v] = true
		limpia = append(limpia, v)
	}
	return limpia, nil
}

// NormalizarDescriptores valida los campos de la solicitud contra su
// vocabulario, recorta los textos y deja las listas sin nil. Un valor
// desconocido devuelve ErrDescriptor.
func (b *Biopsia) NormalizarDescriptores() error {
	if b.CentroToma == "" {
		b.CentroToma = "hcsc"
	}
	for _, c := range []struct {
		campo string
		valor string
		lista []string
	}{
		{"tipo_biopsia", b.TipoBiopsia, TiposBiopsia},
		{"tipo_citologia", b.TipoCitologia, TiposCitologia},
		{"centro_toma", b.CentroToma, CentrosToma},
		{"tipo_muestra", b.TipoMuestra, TiposMuestra},
		{"bordes", b.Bordes, Bordes},
		{"tamano", b.Tamano, Tamanos},
		{"altura", b.Altura, Alturas},
	} {
		if err := validarUno(c.campo, c.valor, c.lista); err != nil {
			return err
		}
	}

	var err error
	if b.Ubicacion, err = limpiarLista("ubicacion", b.Ubicacion, Ubicaciones); err != nil {
		return err
	}
	if b.Color, err = limpiarLista("color", b.Color, Colores); err != nil {
		return err
	}
	if b.CambiosAsociados, err = limpiarLista("cambios_asociados", b.CambiosAsociados, CambiosAsociados); err != nil {
		return err
	}

	b.CentroTomaOtro = strings.TrimSpace(b.CentroTomaOtro)
	b.TipoMuestraOtro = strings.TrimSpace(b.TipoMuestraOtro)
	b.ColorOtro = strings.TrimSpace(b.ColorOtro)
	b.TamanoOtro = strings.TrimSpace(b.TamanoOtro)
	b.TratamientosPreviosCual = strings.TrimSpace(b.TratamientosPreviosCual)
	// Los "otro" solo tienen sentido con su casilla.
	if b.CentroToma != "otro" {
		b.CentroTomaOtro = ""
	}
	if b.TipoMuestra != "otro" {
		b.TipoMuestraOtro = ""
	}
	if b.Tamano != "otro" {
		b.TamanoOtro = ""
	}
	if b.TratamientosPrevios == nil || !*b.TratamientosPrevios {
		b.TratamientosPreviosCual = ""
	}
	return nil
}

// sinNil devuelve la lista tal cual, o una vacía si venía nil de la base.
func sinNil(l []string) []string {
	if l == nil {
		return []string{}
	}
	return l
}
