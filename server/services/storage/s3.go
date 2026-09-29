// Package storage guarda y sirve archivos en un bucket S3 (Railway Bucket,
// MinIO en desarrollo, o cualquier servicio compatible).
//
// Guarda las fotos de cédula de los pacientes, que hasta v0.5.0 iban como BYTEA
// en Postgres: cada foto pesa cientos de KB y el respaldo de la base crecía con
// ellas. Aquí solo viven los bytes; la fila de "Paciente_Cedula" guarda la
// clave con la que se piden.
package storage

import (
	"context"
	"errors"
	"io"
	"os"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

// ErrNoEncontrado: la clave no existe en el bucket.
var ErrNoEncontrado = errors.New("el archivo no existe en el almacen")

// Almacen es un bucket listo para leer y escribir.
type Almacen struct {
	cliente *s3.Client
	bucket  string
}

// Objeto es un archivo abierto para lectura. Hay que cerrarlo.
type Objeto struct {
	io.ReadCloser
	Tamano      int64
	ContentType string
}

// primeraNoVacia devuelve el valor de la primera variable de entorno con algo.
func primeraNoVacia(variables ...string) string {
	for _, v := range variables {
		if valor := strings.TrimSpace(os.Getenv(v)); valor != "" {
			return valor
		}
	}
	return ""
}

// DesdeEntorno construye el almacén con las variables de entorno. Acepta los
// nombres estándar del SDK de AWS (AWS_ENDPOINT_URL, AWS_ACCESS_KEY_ID,
// AWS_SECRET_ACCESS_KEY, AWS_REGION) y los que expone un Bucket de Railway
// (ENDPOINT, ACCESS_KEY_ID, SECRET_ACCESS_KEY, REGION, BUCKET), así que en
// Railway basta con referenciar las variables del bucket sin renombrarlas.
//
// El nombre del bucket sale de BUCKET_NAME, AWS_S3_BUCKET_NAME o BUCKET. Sin
// ninguno, devuelve (nil, nil): la función de adjuntos queda apagada y el
// resto del servidor arranca igual.
//
// AWS_S3_URL_STYLE=path fuerza direcciones tipo endpoint/bucket/clave, que es
// lo que entiende MinIO; por defecto se usa bucket.endpoint/clave (Railway).
func DesdeEntorno(ctx context.Context) (*Almacen, error) {
	bucket := primeraNoVacia("BUCKET_NAME", "AWS_S3_BUCKET_NAME", "BUCKET")
	if bucket == "" {
		return nil, nil
	}

	endpoint := primeraNoVacia("AWS_ENDPOINT_URL", "ENDPOINT")
	region := primeraNoVacia("AWS_REGION", "AWS_DEFAULT_REGION", "REGION")
	if region == "" {
		region = "auto"
	}
	accessKey := primeraNoVacia("AWS_ACCESS_KEY_ID", "ACCESS_KEY_ID")
	secret := primeraNoVacia("AWS_SECRET_ACCESS_KEY", "SECRET_ACCESS_KEY")

	opciones := []func(*awsconfig.LoadOptions) error{awsconfig.WithRegion(region)}
	if accessKey != "" && secret != "" {
		opciones = append(opciones,
			awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKey, secret, "")))
	}

	cfg, err := awsconfig.LoadDefaultConfig(ctx, opciones...)
	if err != nil {
		return nil, err
	}

	cliente := s3.NewFromConfig(cfg, func(o *s3.Options) {
		if endpoint != "" {
			o.BaseEndpoint = aws.String(endpoint)
		}
		o.UsePathStyle = strings.EqualFold(os.Getenv("AWS_S3_URL_STYLE"), "path")
		// Los checksums CRC que el SDK añade por defecto no los aceptan todos
		// los servicios compatibles con S3; solo cuando la operación lo exige.
		o.RequestChecksumCalculation = aws.RequestChecksumCalculationWhenRequired
		o.ResponseChecksumValidation = aws.ResponseChecksumValidationWhenRequired
	})

	return &Almacen{cliente: cliente, bucket: bucket}, nil
}

// Bucket es el nombre del bucket configurado.
func (a *Almacen) Bucket() string { return a.bucket }

// Comprobar verifica que el bucket exista y las credenciales sirvan.
func (a *Almacen) Comprobar(ctx context.Context) error {
	_, err := a.cliente.HeadBucket(ctx, &s3.HeadBucketInput{Bucket: aws.String(a.bucket)})
	return err
}

// Guardar sube (o reemplaza) el objeto con esa clave.
func (a *Almacen) Guardar(ctx context.Context, clave, contentType string, datos io.Reader, tamano int64) error {
	_, err := a.cliente.PutObject(ctx, &s3.PutObjectInput{
		Bucket:        aws.String(a.bucket),
		Key:           aws.String(clave),
		Body:          datos,
		ContentLength: aws.Int64(tamano),
		ContentType:   aws.String(contentType),
	})
	return err
}

// Abrir devuelve el objeto para leerlo en streaming.
func (a *Almacen) Abrir(ctx context.Context, clave string) (*Objeto, error) {
	salida, err := a.cliente.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(a.bucket),
		Key:    aws.String(clave),
	})
	if err != nil {
		var noExiste *types.NoSuchKey
		if errors.As(err, &noExiste) {
			return nil, ErrNoEncontrado
		}
		return nil, err
	}
	return &Objeto{
		ReadCloser:  salida.Body,
		Tamano:      aws.ToInt64(salida.ContentLength),
		ContentType: aws.ToString(salida.ContentType),
	}, nil
}

// Borrar elimina el objeto. Borrar lo que no existe no es error.
func (a *Almacen) Borrar(ctx context.Context, clave string) error {
	_, err := a.cliente.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(a.bucket),
		Key:    aws.String(clave),
	})
	return err
}
