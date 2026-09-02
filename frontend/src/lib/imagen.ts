/**
 * Preparar una foto para subirla como cédula.
 *
 * Una foto de teléfono pesa varios MB y viene girada según cómo se sostuvo la
 * cámara. Para imprimirla al tamaño de un carnet sobran píxeles, así que se
 * reduce y se recomprime aquí, antes de que salga por la red del hospital:
 * cuesta menos subirla, el servidor la acepta (tope de 1 MB) y el PDF no
 * arrastra megabytes por hoja.
 */

/** Lado largo máximo tras redimensionar. Sobra para imprimir a 85,6 mm. */
export const LADO_MAXIMO_CEDULA = 1600;

/** Calidad JPEG de salida. Con 0.8 una cédula queda alrededor de 200–400 KB. */
const CALIDAD_JPEG = 0.8;

/** Tipos que el servidor acepta. Se validan por los bytes allá; aquí por tipo. */
export const TIPOS_IMAGEN_CEDULA = ["image/jpeg", "image/png", "image/webp"];

export class ImagenInvalidaError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ImagenInvalidaError";
  }
}

/**
 * Reduce la imagen a `LADO_MAXIMO_CEDULA` en su lado largo, aplica la
 * orientación EXIF y la devuelve como JPEG.
 *
 * `createImageBitmap` con `imageOrientation: "from-image"` es lo que endereza
 * la foto: sin eso, una cédula fotografiada en vertical saldría acostada en
 * la hoja. Está en toda WebView moderna, incluida la de Tauri.
 */
export async function normalizarImagen(archivo: Blob): Promise<Blob> {
  if (!TIPOS_IMAGEN_CEDULA.includes(archivo.type)) {
    throw new ImagenInvalidaError(
      "El archivo debe ser una imagen JPEG, PNG o WebP."
    );
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  } catch {
    throw new ImagenInvalidaError("No se pudo leer la imagen.");
  }

  try {
    const escala = Math.min(
      1,
      LADO_MAXIMO_CEDULA / Math.max(bitmap.width, bitmap.height)
    );
    const ancho = Math.max(1, Math.round(bitmap.width * escala));
    const alto = Math.max(1, Math.round(bitmap.height * escala));

    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext("2d");
    if (!ctx) throw new ImagenInvalidaError("No se pudo procesar la imagen.");

    // Fondo blanco: un PNG con transparencia se vería negro al pasar a JPEG.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(bitmap, 0, 0, ancho, alto);

    const blob = await new Promise<Blob | null>((resolve) =>
      lienzo.toBlob(resolve, "image/jpeg", CALIDAD_JPEG)
    );
    if (!blob) throw new ImagenInvalidaError("No se pudo convertir la imagen.");
    return blob;
  } finally {
    bitmap.close();
  }
}

/** Blob → base64 sin prefijo, para meterlo en el lote de sincronización. */
export function blobABase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(lector.error);
    lector.onload = () => {
      const resultado = String(lector.result);
      resolve(resultado.slice(resultado.indexOf(",") + 1));
    };
    lector.readAsDataURL(blob);
  });
}

/** Blob → data URI, que es lo que `Image` de react-pdf sabe pintar. */
export function blobADataURI(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(lector.error);
    lector.onload = () => resolve(String(lector.result));
    lector.readAsDataURL(blob);
  });
}
