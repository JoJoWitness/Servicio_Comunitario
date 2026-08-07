/**
 * Documento PDF de una nota operatoria.
 * Generado completamente en cliente con @react-pdf/renderer.
 *
 * Requisitos: 25.1, 25.2, 25.3
 * - Obtiene datos combinando GET /notas/{id} + GET /pacientes/{id}
 * - No llama a ningún endpoint de backend extra
 *
 * La maquetación reproduce el formulario en papel del servicio
 * (`docs/NoraOpetaroria.jpeg`): dos columnas de recuadros —identificación del
 * paciente y diagnósticos a la izquierda, tipo de intervención y equipo
 * quirúrgico a la derecha—, el resumen a ancho completo debajo y las firmas al
 * pie. Así la nota impresa se archiva junto a las antiguas sin desentonar.
 */

import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import type { Nota, Paciente } from "@/domain/models";
import { formatFechaUI } from "@/lib/datetime";

/*
 * Los logos se incrustan como data URI (`?inline`) en vez de referenciarse por
 * URL: el PDF se arma en el cliente y así no depende de que la imagen siga
 * descargable en el momento de generarlo. `Image` de react-pdf no admite SVG,
 * de ahí que el logo del servicio se use rasterizado aquí y en vectorial en la
 * interfaz.
 */
import logoHospital from "@/assets/logo-hospital.png?inline";
import logoServicio from "@/assets/logo-servicio.png?inline";

const NEGRO = "#000";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 28,
    color: NEGRO,
  },

  // ── Encabezado ────────────────────────────────────────────────────────
  encabezado: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  encabezadoLado: { width: "27%" },
  // El PNG del hospital es cuadrado y trae bastante margen propio, por eso
  // necesita más ancho que el del servicio para verse del mismo tamaño.
  logoHospital: { width: 92, marginLeft: -8 },
  logoServicio: { width: 118, marginLeft: "auto" },
  titulo: {
    width: "46%",
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },

  // ── Rejilla de dos columnas ───────────────────────────────────────────
  columnas: { flexDirection: "row" },
  columnaIzq: { width: "48%", paddingRight: 6 },
  columnaDer: { width: "52%" },

  // ── Recuadros ─────────────────────────────────────────────────────────
  caja: {
    borderWidth: 1,
    borderColor: NEGRO,
    marginBottom: 6,
  },
  fila: { flexDirection: "row" },
  filaSeparada: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: NEGRO,
  },
  celda: { paddingHorizontal: 4, paddingVertical: 3, flexGrow: 1 },
  celdaDividida: {
    borderLeftWidth: 1,
    borderLeftColor: NEGRO,
  },
  etiqueta: { fontSize: 7 },
  valor: { fontFamily: "Helvetica-Bold" },
  // Los diagnósticos y la intervención se escriben debajo de su rótulo y
  // necesitan alto suficiente para varias líneas.
  bloqueTexto: { minHeight: 46 },
  bloqueTextoCorto: { minHeight: 34 },

  // ── Casillas de verificación ──────────────────────────────────────────
  casillaFila: { flexDirection: "row", alignItems: "center" },
  casilla: {
    width: 13,
    height: 11,
    borderWidth: 1,
    borderColor: NEGRO,
    marginLeft: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  // `lineHeight: 1` es necesario: con el interlineado por defecto la X mide
  // más que la casilla y el renderizador la recorta entera.
  casillaMarca: { fontSize: 8, fontFamily: "Helvetica-Bold", lineHeight: 1 },

  // ── Equipo quirúrgico ─────────────────────────────────────────────────
  tituloEquipo: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    paddingVertical: 3,
    borderTopWidth: 1,
    borderTopColor: NEGRO,
  },
  lineaEquipo: {
    borderTopWidth: 1,
    borderTopColor: NEGRO,
    paddingHorizontal: 4,
    paddingVertical: 5,
  },

  // ── Resumen ───────────────────────────────────────────────────────────
  tituloResumen: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 6,
  },
  parrafoResumen: {
    fontSize: 8,
    textAlign: "justify",
    lineHeight: 1.5,
  },

  // ── Firmas ────────────────────────────────────────────────────────────
  // Van apiladas en la mitad derecha: el lado izquierdo queda libre porque es
  // donde se pega la copia de la cédula del paciente.
  firmas: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 46,
  },
  columnaFirmas: { width: "45%" },
  lineaFirma: {
    borderTopWidth: 1,
    borderTopColor: NEGRO,
    paddingTop: 3,
  },
  segundaFirma: { marginTop: 44 },
  pieFirma: { fontSize: 8, textAlign: "center" },
});

// ---------------------------------------------------------------------------
// Piezas reutilizables
// ---------------------------------------------------------------------------

/** Casilla del formulario; lleva una X cuando el dato está marcado. */
function Casilla({ marcada }: { marcada: boolean }) {
  return (
    <View style={styles.casilla}>
      {marcada && <Text style={styles.casillaMarca}>X</Text>}
    </View>
  );
}

/** Rótulo seguido de su casilla, como en el papel: "ELECTIVA [X]". */
function CampoCasilla({
  etiqueta,
  marcada,
}: {
  etiqueta: string;
  marcada: boolean;
}) {
  return (
    <View style={styles.casillaFila}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <Casilla marcada={marcada} />
    </View>
  );
}

/** Rótulo y valor en la misma línea, el formato de los datos cortos. */
function Dato({ etiqueta, valor }: { etiqueta: string; valor?: string }) {
  return (
    <Text style={styles.etiqueta}>
      {etiqueta}{" "}
      <Text style={styles.valor}>{valor && valor.trim() ? valor : "—"}</Text>
    </Text>
  );
}

/** Rótulo arriba y el texto debajo, para los campos largos. */
function Bloque({
  etiqueta,
  valor,
  corto = false,
}: {
  etiqueta: string;
  valor?: string;
  corto?: boolean;
}) {
  return (
    <View
      style={[
        styles.celda,
        corto ? styles.bloqueTextoCorto : styles.bloqueTexto,
      ]}
    >
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <Text style={styles.valor}>{valor?.trim() ? valor : ""}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Helpers de datos
// ---------------------------------------------------------------------------

/**
 * Edad del paciente el día de la operación, que es la que registra el
 * formulario, no la edad actual.
 */
function edadEnLaFecha(nacimiento: Date, fecha: Date): number {
  let edad = fecha.getUTCFullYear() - nacimiento.getUTCFullYear();
  const cumpleAun =
    fecha.getUTCMonth() < nacimiento.getUTCMonth() ||
    (fecha.getUTCMonth() === nacimiento.getUTCMonth() &&
      fecha.getUTCDate() < nacimiento.getUTCDate());
  if (cumpleAun) edad -= 1;
  return Math.max(edad, 0);
}

function nombreCompleto(m: { nombres: string; apellidos: string }): string {
  return `${m.nombres} ${m.apellidos}`.trim();
}

// ---------------------------------------------------------------------------
// Documento PDF — Req 25.3
// ---------------------------------------------------------------------------

interface NotaDocumentProps {
  nota: Nota;
  paciente: Paciente;
}

function NotaDocument({ nota, paciente }: NotaDocumentProps) {
  const cirujano = nota.medicos.find((m) => m.id === nota.medicoEncargado);
  const ayudantes = nota.medicos.filter((m) => m.id !== nota.medicoEncargado);
  // El papel reserva tres renglones de ayudantes; se mantienen aunque estén
  // vacíos para que la hoja impresa conserve siempre la misma altura.
  const renglonesAyudantes = Math.max(ayudantes.length, 3);

  const anestesiaLocal = nota.anestesia?.trim().toLowerCase() === "local";
  const anestesiaGeneral = nota.anestesia?.trim().toLowerCase() === "general";

  return (
    <Document
      title={`Nota operatoria — ${paciente.nombre}`}
      author="HCSC Oftalmología"
    >
      {/* Carta: es el papel con el que trabaja el servicio. */}
      <Page size="LETTER" style={styles.page}>
        {/* ── Encabezado ── */}
        <View style={styles.encabezado}>
          <View style={styles.encabezadoLado}>
            <Image src={logoHospital} style={styles.logoHospital} />
          </View>
          <Text style={styles.titulo}>NOTA OPERATORIA</Text>
          <View style={styles.encabezadoLado}>
            <Image src={logoServicio} style={styles.logoServicio} />
          </View>
        </View>

        <View style={styles.columnas}>
          {/* ── Columna izquierda: paciente y diagnósticos ── */}
          <View style={styles.columnaIzq}>
            <View style={styles.caja}>
              <View style={styles.celda}>
                <Dato etiqueta="NOMBRE Y APELLIDO" valor={paciente.nombre} />
              </View>
              <View style={styles.filaSeparada}>
                <View style={styles.celda}>
                  <Dato
                    etiqueta="EDAD"
                    valor={`${edadEnLaFecha(
                      paciente.fechaNacimiento,
                      nota.fechaComienzo
                    )} AÑOS`}
                  />
                </View>
                <View style={[styles.celda, styles.celdaDividida]}>
                  <Dato etiqueta="GÉNERO" valor={paciente.genero} />
                </View>
              </View>
              <View style={styles.filaSeparada}>
                <View style={styles.celda}>
                  <Dato etiqueta="HISTORIA N°" valor={paciente.historiaMedica} />
                </View>
                <View style={[styles.celda, styles.celdaDividida]}>
                  <Dato
                    etiqueta="C.I."
                    valor={`${paciente.tipoDocumento}-${paciente.numeroIdentificacion}`}
                  />
                </View>
              </View>
              <View style={styles.filaSeparada}>
                <View style={styles.celda}>
                  <Dato etiqueta="PROCEDENCIA:" valor={paciente.direccion} />
                </View>
              </View>
              <View style={styles.filaSeparada}>
                <View style={styles.celda}>
                  <Dato etiqueta="TELÉFONO:" valor={paciente.telefono} />
                </View>
              </View>
            </View>

            <View style={styles.caja}>
              <Bloque
                etiqueta="DX PRE-OPERATORIO"
                valor={nota.dxPreOperatorio}
              />
              <View style={styles.filaSeparada}>
                <Bloque
                  etiqueta="DX POST-OPERATORIO"
                  valor={nota.dxPostOperatorio}
                />
              </View>
              <View style={styles.filaSeparada}>
                <Bloque
                  etiqueta="INTERVENCIÓN REALIZADA"
                  valor={nota.intervencionRealizada}
                />
              </View>
            </View>

            <View style={styles.caja}>
              <View style={styles.fila}>
                <View style={styles.celda}>
                  <Text style={styles.etiqueta}>COMIENZO DE INTERVENCIÓN</Text>
                </View>
                <View style={[styles.celda, styles.celdaDividida]}>
                  <Text style={styles.etiqueta}>
                    CULMINACIÓN DE INTERVENCIÓN
                  </Text>
                </View>
              </View>
              <View style={styles.filaSeparada}>
                <View style={styles.celda}>
                  <Dato
                    etiqueta="FECHA"
                    valor={formatFechaUI(nota.fechaComienzo)}
                  />
                </View>
                <View style={[styles.celda, styles.celdaDividida]}>
                  <Dato
                    etiqueta="FECHA"
                    valor={formatFechaUI(nota.fechaCulminacion)}
                  />
                </View>
              </View>
              <View style={styles.filaSeparada}>
                <View style={styles.celda}>
                  <Dato etiqueta="HORA" valor={nota.horaComienzo} />
                </View>
                <View style={[styles.celda, styles.celdaDividida]}>
                  <Dato etiqueta="HORA" valor={nota.horaCulminacion} />
                </View>
              </View>
            </View>
          </View>

          {/* ── Columna derecha: tipo de intervención y equipo ── */}
          <View style={styles.columnaDer}>
            <View style={styles.caja}>
              <View style={styles.celda}>
                <Dato etiqueta="SERVICIO" valor="OFTALMOLOGÍA" />
              </View>

              <View style={styles.filaSeparada}>
                <View style={styles.celda}>
                  <CampoCasilla etiqueta="ELECTIVA" marcada={nota.esElectiva} />
                </View>
                <View style={[styles.celda, styles.celdaDividida]}>
                  <Text style={styles.etiqueta}>BIOPSIA</Text>
                </View>
              </View>
              <View style={styles.filaSeparada}>
                <View style={styles.celda}>
                  <CampoCasilla
                    etiqueta="EMERGENCIA"
                    marcada={nota.esEmergencia}
                  />
                </View>
                <View
                  style={[
                    styles.celda,
                    styles.celdaDividida,
                    styles.casillaFila,
                  ]}
                >
                  <CampoCasilla etiqueta="SÍ" marcada={nota.tuvoBiopsia} />
                  <View style={{ width: 16 }} />
                  <CampoCasilla etiqueta="NO" marcada={!nota.tuvoBiopsia} />
                </View>
              </View>

              <Text style={styles.tituloEquipo}>EQUIPO QUIRÚRGICO</Text>

              <View style={styles.lineaEquipo}>
                <Dato
                  etiqueta="CIRUJANO"
                  valor={cirujano ? nombreCompleto(cirujano) : undefined}
                />
              </View>
              {Array.from({ length: renglonesAyudantes }, (_, i) => (
                <View key={i} style={styles.lineaEquipo}>
                  <Dato
                    etiqueta="AYUDANTE:"
                    valor={
                      ayudantes[i] ? nombreCompleto(ayudantes[i]!) : undefined
                    }
                  />
                </View>
              ))}

              <View style={styles.lineaEquipo}>
                <Dato etiqueta="ANESTESIA" valor={nota.anestesia} />
              </View>
              <View style={styles.filaSeparada}>
                <View style={styles.celda}>
                  <CampoCasilla etiqueta="GENERAL" marcada={anestesiaGeneral} />
                </View>
                <View style={[styles.celda, styles.celdaDividida]}>
                  <CampoCasilla etiqueta="LOCAL" marcada={anestesiaLocal} />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── Resumen a ancho completo ── */}
        <Text style={styles.tituloResumen}>
          RESUMEN DE LA INTERVENCIÓN REALIZADA
        </Text>
        <Text style={styles.parrafoResumen}>{nota.resumenIntervencion}</Text>

        {/* ── Firmas ── */}
        <View style={styles.firmas}>
          <View style={styles.columnaFirmas}>
            <View style={styles.lineaFirma}>
              <Text style={styles.pieFirma}>MÉDICO TRATANTE</Text>
            </View>
            <View style={[styles.lineaFirma, styles.segundaFirma]}>
              <Text style={styles.pieFirma}>ANESTESIÓLOGO</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Función de descarga — genera el Blob y dispara la descarga
// ---------------------------------------------------------------------------

/**
 * Genera y descarga el PDF de la nota operatoria.
 *
 * @param nota    - Objeto Nota completo con medicos[]
 * @param paciente - Objeto Paciente correspondiente
 */
export async function descargarNotaPDF(
  nota: Nota,
  paciente: Paciente
): Promise<void> {
  const blob = await pdf(
    <NotaDocument nota={nota} paciente={paciente} />
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nota-${nota.id ?? "nueva"}-${paciente.historiaMedica}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export { NotaDocument };
