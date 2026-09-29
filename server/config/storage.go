package config

import (
	"context"
	"log"
	"time"

	"server/services/storage"
)

// Archivos es el bucket de las fotos de cédula. nil cuando no hay bucket
// configurado: las fotos se guardan en la base, como en v0.4.0.
var Archivos *storage.Almacen

// InitStorage lee la configuración del bucket del entorno. Una configuración
// rota (URL inválida) tumba el arranque; un bucket inalcanzable solo se avisa,
// porque el servicio de notas no depende de él.
func InitStorage() {
	ctx, cancelar := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancelar()

	almacen, err := storage.DesdeEntorno(ctx)
	if err != nil {
		log.Fatalf("Unable to configure file storage: %v", err)
	}
	if almacen == nil {
		log.Println("Sin bucket configurado (BUCKET_NAME): las fotos de cedula se guardan en la base")
		return
	}

	if err := almacen.Comprobar(ctx); err != nil {
		log.Printf("Aviso: no se pudo verificar el bucket %q: %v", almacen.Bucket(), err)
	} else {
		log.Printf("Bucket %q listo para las fotos de cedula", almacen.Bucket())
	}
	Archivos = almacen
}
