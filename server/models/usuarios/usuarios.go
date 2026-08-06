package usuarios

import (
	"context"
	"errors"
	"log"
	"server/config"
	"server/models/pagination"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func (u *Usuarios) Get(db *pgxpool.Pool) error {
	if u.ID == "" && u.Correo == "" {
		return errors.New("ID or Email must be provided to retrieve a user")
	}

	query := `
		SELECT 
		    id,
		    correo,
		    nombres,
			apellidos,
		    rol,
		    contrasena,
		    eliminado
		FROM "Usuarios"
		WHERE TRUE
	`

	args := pgx.NamedArgs{}

	if u.ID != "" {
		query += " AND id = @id"
		args["id"] = u.ID
	} else if u.Correo != "" {
		query += " AND correo = @correo"
		args["correo"] = u.Correo
	}

	row := db.QueryRow(context.Background(), query, args)
	err := row.Scan(&u.ID, &u.Correo, &u.Nombres, &u.Apellidos, &u.Rol, &u.Contrasena, &u.Eliminado)
	if err != nil {
		log.Printf("Error scanning usuarios: %v", err)
		return err
	}
	return nil
}

func (u *Usuarios) Create(db *pgxpool.Pool) error {
	query := `
		INSERT INTO "Usuarios"
			(id, correo, nombres, apellidos, rol, contrasena)
		VALUES
			(@id, @correo, @nombres, @apellidos, @rol, @contrasena)
	`

	args := pgx.NamedArgs{
		"id":         u.ID,
		"correo":     u.Correo,
		"nombres":    u.Nombres,
		"apellidos":  u.Apellidos,
		"rol":        u.Rol,
		"contrasena": u.Contrasena,
	}

	_, err := db.Exec(context.Background(), query, args)
	if err != nil {
		log.Printf("Error creating usuario: %v\n", err)
		return err
	}

	return nil
}

func (u *Usuarios) Update(db *pgxpool.Pool) error {
	query := `
		UPDATE "Usuarios"
		SET 
			correo = @correo,
			nombres = @nombres,
			apellidos = @apellidos,
			rol = @rol,
			contrasena = @contrasena
		WHERE
			id = @id;
	`
	args := pgx.NamedArgs{
		"id":         u.ID,
		"correo":     u.Correo,
		"nombres":    u.Nombres,
		"apellidos":  u.Apellidos,
		"rol":        u.Rol,
		"contrasena": u.Contrasena,
	}

	_, err := db.Exec(context.Background(), query, args)
	if err != nil {
		log.Printf("Error updating usuario: %v\n", err)
		return err
	}

	return nil
}

// UpdateContrasena cambia solo la contraseña. Update() reescribe todos los
// campos, así que no sirve para esto: borraría correo, nombres y rol.
// Recibe el hash ya calculado, nunca la contraseña en texto plano.
func (u *Usuarios) UpdateContrasena(db *pgxpool.Pool, hash string) error {
	query := `
		UPDATE "Usuarios"
		SET
			contrasena = @contrasena
		WHERE
			id = @id
			AND eliminado = FALSE;
	`

	tag, err := db.Exec(context.Background(), query,
		pgx.NamedArgs{"id": u.ID, "contrasena": hash})
	if err != nil {
		log.Printf("Error updating contrasena: %v\n", err)
		return err
	}

	if tag.RowsAffected() == 0 {
		return errors.New("usuario no encontrado o dado de baja")
	}

	u.Contrasena = hash
	return nil
}

func (u *Usuarios) Delete(db *pgxpool.Pool) error {
	query := `
		UPDATE "Usuarios"
		SET 
			eliminado = TRUE 
		WHERE 
			id = @id;
	`

	_, err := db.Exec(context.Background(), query, pgx.NamedArgs{"id": u.ID})
	if err != nil {
		log.Printf("Error deleting usuario: %v\n", err)
		return err
	}

	return nil
}

func GetAllMedics() ([]Usuarios, error) {
	// Devuelve todos los usuarios activos con su rol para que el frontend
	// pueda poblar el selector de equipo quirúrgico y el panel de administración.
	query := `
		SELECT
			u.id,
			u.nombres,
			u.apellidos,
			u.correo,
			u.rol
		FROM "Usuarios" u
		WHERE
			u.eliminado = FALSE
		ORDER BY
			u.apellidos, u.nombres;
	`
	rows, err := config.PsqlDB.Query(context.Background(), query)
	if err != nil {
		log.Printf("\n\nError getting users: %v", err)
		return nil, err
	}
	defer rows.Close()

	users := []Usuarios{}
	for rows.Next() {
		var user Usuarios

		err := rows.Scan(&user.ID, &user.Nombres, &user.Apellidos, &user.Correo, &user.Rol)
		if err != nil {
			log.Printf("Error scanning user: %v", user)
			log.Printf("Error fetching users: %v", err)
			return users, err
		}
		users = append(users, user)
	}

	return users, nil
}

// FiltrosUsuarios acota el listado paginado de usuarios. Los campos vacíos se ignoran.
type FiltrosUsuarios struct {
	Nombre string // ILIKE en nombres || apellidos
	Correo string // ILIKE en correo
	Rol    string // coincidencia exacta ("admin" | "medico" | "secretaria")
}

// GetAllMedicsPaged devuelve una página de usuarios activos y el total de
// registros para paginación server-side. Aplica los filtros opcionales.
func GetAllMedicsPaged(f FiltrosUsuarios, p pagination.Params) ([]Usuarios, int, error) {
	where := `WHERE u.eliminado = FALSE`
	args := pgx.NamedArgs{}

	if f.Nombre != "" {
		where += ` AND (LOWER(u.nombres) LIKE LOWER(@nombre) OR LOWER(u.apellidos) LIKE LOWER(@nombre))`
		args["nombre"] = "%" + f.Nombre + "%"
	}
	if f.Correo != "" {
		where += ` AND LOWER(u.correo) LIKE LOWER(@correo)`
		args["correo"] = "%" + f.Correo + "%"
	}
	if f.Rol != "" {
		where += ` AND u.rol = @rol`
		args["rol"] = f.Rol
	}

	var total int
	if err := config.PsqlDB.QueryRow(context.Background(),
		`SELECT COUNT(*) FROM "Usuarios" u `+where, args).Scan(&total); err != nil {
		log.Printf("Error counting usuarios: %v", err)
		return nil, 0, err
	}

	args["limit"] = p.Size
	args["offset"] = p.Offset()
	query := `
		SELECT u.id, u.nombres, u.apellidos, u.correo, u.rol
		FROM "Usuarios" u
		` + where + `
		ORDER BY ` + p.SortBy + ` ` + p.Order + `
		LIMIT @limit OFFSET @offset;`

	rows, err := config.PsqlDB.Query(context.Background(), query, args)
	if err != nil {
		log.Printf("Error getting usuarios page: %v", err)
		return nil, total, err
	}
	defer rows.Close()

	users := []Usuarios{}
	for rows.Next() {
		var u Usuarios
		if err := rows.Scan(&u.ID, &u.Nombres, &u.Apellidos, &u.Correo, &u.Rol); err != nil {
			log.Printf("Error scanning usuario: %v", err)
			return users, total, err
		}
		users = append(users, u)
	}
	return users, total, rows.Err()
}

func (u *UsuarioData) Get(db *pgxpool.Pool) error {
	query := `
		SELECT
			u.nombres,
			u.apellidos,
			u.correo,
			u.rol
		FROM "Usuarios" u
		WHERE
			u.id = @id;
	`
	row := db.QueryRow(context.Background(), query, pgx.NamedArgs{"id": u.ID})

	// Scan the result into the UserData struct
	err := row.Scan(
		&u.Nombres,
		&u.Apellidos,
		&u.Correo,
		&u.Rol,
	)
	if err != nil {
		log.Printf("Error scanning user data: %v\n", err)
		return err
	}

	return nil
}
