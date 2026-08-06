// Package pagination provee tipos y utilidades para paginación y ordenamiento
// server-side reutilizables por todos los módulos.
package pagination

import "math"

// Params agrupa los query parameters de paginación y ordenamiento.
type Params struct {
	Page   int    // >= 1
	Size   int    // >= 1
	SortBy string // nombre de columna ya validado/sanitizado
	Order  string // "ASC" | "DESC"
}

// Offset calcula el OFFSET de la consulta SQL.
func (p Params) Offset() int {
	return (p.Page - 1) * p.Size
}

// Meta es la metadata incluida en cada respuesta paginada.
type Meta struct {
	TotalItems  int `json:"totalItems"`
	TotalPages  int `json:"totalPages"`
	CurrentPage int `json:"currentPage"`
	PageSize    int `json:"pageSize"`
}

// NewMeta calcula la metadata a partir del total de ítems y los parámetros.
func NewMeta(totalItems int, p Params) Meta {
	totalPages := int(math.Ceil(float64(totalItems) / float64(p.Size)))
	if totalPages < 1 {
		totalPages = 1
	}
	return Meta{
		TotalItems:  totalItems,
		TotalPages:  totalPages,
		CurrentPage: p.Page,
		PageSize:    p.Size,
	}
}
