/**
 * Piezas que comparten los documentos PDF del servicio: logos, membrete,
 * helpers de datos y la descarga del Blob. Viven aparte para que la hoja de la
 * nota y la solicitud de biopsia no se importen entre sí.
 */

import { StyleSheet, Text, View } from "@react-pdf/renderer";

/*
 * Los logos se incrustan como data URI (`?inline`) en vez de referenciarse por
 * URL: el PDF se arma en el cliente y así no depende de que la imagen siga
 * descargable en el momento de generarlo. `Image` de react-pdf no admite SVG,
 * de ahí que el logo del servicio se use rasterizado aquí y en vectorial en la
 * interfaz.
 */
import logoHospital from "@/assets/logo-hospital.png?inline";
import logoServicio from "@/assets/logo-servicio.png?inline";

export { logoHospital, logoServicio };

export const NEGRO = "#000";

/** Membrete del hospital, transcrito del papel timbrado oficial. */
export const PIE_HOSPITAL = [
  "EDIFICIO HOSPITAL CENTRAL, AVENIDA LUCIO OQUENDO, LA CONCORDIA, SAN CRISTÓBAL, ESTADO TÁCHIRA, VENEZUELA · APARTADO POSTAL 5001 · RIF G-20000922-5",
  "TELF. FAX (058) 0276 3478224 · CENTRAL (058) 0276 3477176 · Direccionhcsc2017@gmail.com · oficinarrhhosp@gmail.com · Instagram: @hospitalcentralsancristobal",
];

const styles = StyleSheet.create({
  // Los datos del membrete oficial del hospital, como en el papel timbrado.
  // En dos renglones pequeños para que la hoja siga cabiendo en una carta.
  pie: {
    position: "absolute",
    bottom: 10,
    borderTopWidth: 0.5,
    borderTopColor: NEGRO,
    paddingTop: 3,
    fontSize: 6.5,
    lineHeight: 1.25,
    textAlign: "center",
  },
});

/**
 * Pie de página fijo con la dirección y el contacto del hospital. `margen` es
 * el margen horizontal de la página, para que el filete coincida con el texto.
 */
export function PieHospital({ margen }: { margen: number }) {
  return (
    <View style={[styles.pie, { left: margen, right: margen }]} fixed>
      {PIE_HOSPITAL.map((linea) => (
        <Text key={linea}>{linea}</Text>
      ))}
    </View>
  );
}

/**
 * Edad del paciente en una fecha dada (la de la operación o la de la toma de
 * la muestra), que es la que registran los formularios, no la edad actual.
 */
export function edadEnLaFecha(nacimiento: Date, fecha: Date): number {
  let edad = fecha.getUTCFullYear() - nacimiento.getUTCFullYear();
  const cumpleAun =
    fecha.getUTCMonth() < nacimiento.getUTCMonth() ||
    (fecha.getUTCMonth() === nacimiento.getUTCMonth() &&
      fecha.getUTCDate() < nacimiento.getUTCDate());
  if (cumpleAun) edad -= 1;
  return Math.max(edad, 0);
}

export function nombreCompleto(m: { nombres: string; apellidos: string }): string {
  return `${m.nombres} ${m.apellidos}`.trim();
}

/** Dispara la descarga de un Blob con el nombre de archivo indicado. */
export function descargarBlob(blob: Blob, nombreArchivo: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
