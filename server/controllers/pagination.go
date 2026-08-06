package controllers

import (
	"net/http"
	"server/models/pagination"
	"strconv"
	"strings"
)

const defaultPage = 1
const defaultSize = 20

// parsePaginationParams lee page, size, sortBy y order del query string.
// sortBy y order se validan contra las listas blancas del llamador para evitar
// inyección SQL.
func parsePaginationParams(r *http.Request, allowedSortBy map[string]string, defaultSortBy string) pagination.Params {
	q := r.URL.Query()

	page, err := strconv.Atoi(q.Get("page"))
	if err != nil || page < 1 {
		page = defaultPage
	}

	size, err := strconv.Atoi(q.Get("size"))
	if err != nil || size < 1 || size > 100 {
		size = defaultSize
	}

	order := "DESC"
	if strings.ToUpper(q.Get("order")) == "ASC" {
		order = "ASC"
	}

	rawSortBy := q.Get("sortBy")
	sortBy, ok := allowedSortBy[rawSortBy]
	if !ok {
		sortBy = defaultSortBy
	}

	return pagination.Params{
		Page:   page,
		Size:   size,
		SortBy: sortBy,
		Order:  order,
	}
}
