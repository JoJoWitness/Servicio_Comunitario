package usuarios

import (
	"context"
	"errors"
	"log"
	"server/config"

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
		    contrasena
		FROM 
		    usuarios
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
	err := row.Scan(&u.ID, &u.Nombres, &u.Apellidos, &u.Correo, &u.Rol, &u.Contrasena)
	if err != nil {
		log.Printf("Error scanning usuarios: %v", err)
		return err
	}
	return nil
}

func (u *Usuarios) Create(db *pgxpool.Pool) error {
	query := `
		INSERT INTO users 
			(correo, nombres, apellidos, rol, contrasena) 
		VALUES 
			(@correo, @nombres, @apellidos, @rol, @contrasena)
	`

	args := pgx.NamedArgs{
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
		UPDATE 
			usuarios
		SET 
			correo = @correo, 
			nombres = @nombres,
			apellidos = @apellidos.
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

func (u *Usuarios) Delete(db *pgxpool.Pool) error {
	query := `
		UPDATE 
			usuarios
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
	query := `	
		SELECT 
			u.name,
			u.email
		FROM 
			users u
		WHERE
			is_deleted = FALSE and u.role = 'medico';
	`
	rows, err := config.PsqlDB.Query(context.Background(), query)
	if err != nil {
		log.Printf("\n\nError getting users: %v", err)
		return nil, err
	}
	defer rows.Close()

	var users []Usuarios
	for rows.Next() {
		var user Usuarios

		err := rows.Scan(&user.Nombres, &user.Correo)
		if err != nil {
			log.Printf("Error scanning user: %v", user)
			log.Printf("Error fetching users: %v", err)
			return users, err
		}
		users = append(users, user)
	}

	return users, nil
}

func (u *UsuarioData) Get(db *pgxpool.Pool) error {
	query := `
		SELECT 
			u.nombres,
			u.apellidos,
			u.correo,
			u.rol,
		FROM
			users u
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
