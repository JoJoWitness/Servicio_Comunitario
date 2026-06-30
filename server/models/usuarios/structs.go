package usuarios

import "time"

type Usuarios struct {
	ID          string  `json:"id"`
	UserPointer *string `json:"user_pointer"`
	Correo      string  `json:"correo"`
	Nombres     string  `json:"nombres"`
	Apellidos   string  `json:"apellidos"`
	Rol         string  `json:"rol"`
	Contrasena  string  `json:"contrasena"`
	Eliminado   bool    `json:"eliminado"`
}

type UsuarioData struct {
	ID        string `json:"id"`
	Nombres   string `json:"nombres"`
	Apellidos string `json:"apellidos"`
	Correo    string `json:"correo"`
	Rol       string `json:"rol"`
}

type UsuarioNotasDates struct {
	ID   string    `json:"id"`
	From time.Time `json:"from"`
	To   time.Time `json:"to"`
}
type Admin struct {
	UserID    string    `json:"user_id"`
	Role      string    `json:"role"`
	RouteID   *int      `json:"route_id"`
	CreatedAt time.Time `json:"createdAt"`
}
