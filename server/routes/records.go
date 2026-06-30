package routes

import (
	"net/http"
	"server/controllers/records"

	"server/controllers/auth"

	"github.com/gorilla/mux"
)

func RecordsRoutes() http.Handler {
	r := mux.NewRouter()

	// Protect routes to only be accesible by admins
	p := r.PathPrefix("").Subrouter()
	p.Use(auth.Admins)

	r.HandleFunc("/records", records.GetRecord).Methods("GET")
	p.HandleFunc("/records", records.CreateRecord).Methods("POST")
	p.HandleFunc("/records", records.UpdateRecord).Methods("PUT")
	p.HandleFunc("/records", records.DeleteRecord).Methods("DELETE")

	//r.HandleFunc("/records_by_semesters", records.GetAllRecordsBySemesters).Methods("GET")
	r.HandleFunc("/records_by_date", records.GetAllRecordsByDate).Methods("GET")

	r.HandleFunc("/records_by_route", records.GetRouteRecord).Methods("GET")
	r.HandleFunc("/records_by_route/date", records.GetRouteRecordsByDate).Methods("GET")
	r.HandleFunc("/records_by_route/semester", records.GetRouteRecordsBySemester).Methods("GET")

	// Only checks users owns records
	r.HandleFunc("/records_by_user", records.GetUserRecord).Methods("GET")
	r.HandleFunc("/records_by_user/date", records.GetUserRecordsByDate).Methods("GET")
	//r.HandleFunc("/records_by_user/semester", records.GetUserRecordsBySemester).Methods("GET")

	//With Filter approach
	r.HandleFunc("/records/filters", records.GetFiltersOptions).Methods("GET")
	r.HandleFunc("/records/filters/search", records.GetFilteredRecords).Methods("POST")

	//Usage stats
	r.HandleFunc("/records/stats/routes", records.GetRoutesStats).Methods("POST")
	r.HandleFunc("/records/stats/usage", records.GetUsageStats).Methods("POST")
	//r.HandleFunc("/records/stats/stops", records.GetStopStats).Methods("POST")

	return r
}
