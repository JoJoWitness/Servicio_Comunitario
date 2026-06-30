package usuarios

import (
	"context"
	"log"
	"server/config"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type adminsByRoute struct {
	Routes map[string][]string `json:"routes"`
}

func (a *Admin) Get(db *pgxpool.Pool) error {
	query := `
		SELECT 
			user_id, 
			route_id, 
			created_at, 
			role 
		FROM 
			admins 
		WHERE 
			user_id = @user_id;
	`
	row := db.QueryRow(context.Background(), query, pgx.NamedArgs{"user_id": a.UserID})

	err := row.Scan(&a.UserID, &a.RouteID, &a.CreatedAt, &a.Role)
	if err != nil {
		log.Printf("Error scanning admin: %v", err)
		return err
	}

	return nil
}

// Cordinators
func GetAllAdmins() (*adminsByRoute, error) {
	query := `
		SELECT
			routes.name,
			users.name,
			users.email
		FROM
			routes
		INNER JOIN admins ON routes.id = admins.route_id
		INNER JOIN users ON users.id = admins.user_id;
	`

	rows, err := config.PsqlDB.Query(context.Background(), query)
	if err != nil {
		log.Printf("\n\nError getting coordinators: %v", err)
		return nil, err
	}
	defer rows.Close()

	admins := &adminsByRoute{Routes: make(map[string][]string)}

	for rows.Next() {
		var routeName string
		var email string

		err := rows.Scan(&routeName, &email)
		if err != nil {
			log.Printf("Error scanning row: %v", err)
			return nil, err
		}

		// Check if route exists in map, append email otherwise
		emails, ok := admins.Routes[routeName]
		if !ok {
			emails = make([]string, 0)
		}
		emails = append(emails, email)
		admins.Routes[routeName] = emails
	}

	return admins, nil
}
func GetCoordinatorsByRoute(route int) (*adminsByRoute, error) {
	query := `
		SELECT
			routes.name ,
			users.name,
			users.email
		FROM
			routes
		INNER JOIN admins ON routes.id = admins.route_id
		INNER JOIN users ON users.id = admins.user_id
		WHERE routes.id = @route_id;
	`

	rows, err := config.PsqlDB.Query(context.Background(), query, pgx.NamedArgs{"route_id": route})
	if err != nil {
		log.Printf("\n\nError getting coordinators: %v", err)
		return nil, err
	}
	defer rows.Close()

	coordinators := &adminsByRoute{Routes: make(map[string][]string)}

	for rows.Next() {
		var routeName string
		var email string

		err := rows.Scan(&routeName, &email)
		if err != nil {
			log.Printf("Error scanning row: %v", err)
			return nil, err
		}

		// Check if route exists in map, append email otherwise
		emails, ok := coordinators.Routes[routeName]
		if !ok {
			emails = make([]string, 0)
		}
		emails = append(emails, email)
		coordinators.Routes[routeName] = emails
	}

	return coordinators, nil
}

func GetAdminsByRole(role string) (*adminsByRoute, error) {
	// query := `
	// 	SELECT
	// 		routes.name ,
	// 		users.name,
	// 		users.email
	// 	FROM
	// 		routes
	// 	INNER JOIN admins ON routes.id = admins.route_id
	// 	INNER JOIN users ON users.id = admins.user_id
	// 	WHERE admins.role = @role;
	// `

	a := &adminsByRoute{Routes: make(map[string][]string)}
	return a, nil
}
