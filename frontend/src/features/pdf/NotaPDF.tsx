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
 *
 * Desde v0.4.0, si el paciente tiene la cédula digitalizada, se imprime abajo
 * a la izquierda, a tamaño real de carnet, con su base alineada a la línea de
 * firma del médico tratante: exactamente donde se pegaba la fotocopia.
 *
 * Desde v0.5.0, detrás de la hoja van las solicitudes de biopsia de las
 * muestras ligadas a la nota (`BiopsiaPDF.tsx`), para que el legajo salga
 * completo en una sola descarga.
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
import type { Biopsia, Nota, Paciente } from "@/domain/models";
import { formatFechaUI } from "@/lib/datetime";
import { resumenConObservaciones } from "@/lib/resumen";
import { PaginasBiopsia } from "./BiopsiaPDF";
import { anterioresDe } from "./biopsiasParaPDF";
import {
  NEGRO,
  PieHospital,
  descargarBlob,
  edadEnLaFecha,
  logoHospital,
  logoServicio,
  nombreCompleto,
} from "./comun";

const MARGEN = 28;

// Medidas de la cédula en la hoja (ISO ID-1 a tamaño real, 85,6 × 54 mm) y
// de una línea de firma: borde de 1 pt + 3 pt de aire + 11 pt de rótulo.
const ANCHO_CEDULA = 243;
const ALTO_CEDULA = 153;
const ALTO_LINEA_FIRMA = 15;

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9.5,
    paddingTop: 20,
    // Deja sitio al pie con los datos del hospital, que va en posición
    // absoluta y no empuja el contenido.
    paddingBottom: 34,
    paddingHorizontal: MARGEN,
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
    fontSize: 12,
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
    marginBottom: 5,
  },
  fila: { flexDirection: "row" },
  filaSeparada: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: NEGRO,
  },
  celda: { paddingHorizontal: 4, paddingVertical: 3, flexGrow: 1 },
  // Reparte la fila a mitad y mitad. Con el `flexBasis` por defecto (auto) el
  // ancho arranca en el del contenido y la celda con más texto se lleva más
  // espacio. Solo se usa en celdas que comparten fila: dentro de una caja, que
  // apila en columna, `flexBasis: 0` anularía el alto del contenido.
  celdaMitad: { flexBasis: 0 },
  celdaDividida: {
    borderLeftWidth: 1,
    borderLeftColor: NEGRO,
  },
  etiqueta: { fontSize: 9.5 },
  // El contenido va en redonda: en el formulario lo que distingue al dato del
  // rótulo es que el rótulo está en mayúsculas, no el grosor. Poner en negrita
  // todo lo escrito deja la hoja sin jerarquía y cuesta leer los párrafos.
  valor: {},
  // Solo el nombre del paciente se resalta: es el dato con el que se busca la
  // hoja en el archivo.
  valorDestacado: { fontFamily: "Helvetica-Bold" },
  // Los diagnósticos y la intervención se escriben debajo de su rótulo y
  // necesitan alto suficiente para varias líneas.
  bloqueTexto: { minHeight: 50 },
  bloqueTextoCorto: { minHeight: 38 },

  // ── Casillas de verificación ──────────────────────────────────────────
  casillaFila: { flexDirection: "row", alignItems: "center" },
  casilla: {
    width: 16,
    height: 14,
    borderWidth: 1,
    borderColor: NEGRO,
    marginLeft: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  // `lineHeight: 1` es necesario: con el interlineado por defecto la X mide
  // más que la casilla y el renderizador la recorta entera.
  casillaMarca: { fontSize: 9.5, fontFamily: "Helvetica-Bold", lineHeight: 1 },

  // ── Equipo quirúrgico ─────────────────────────────────────────────────
  tituloEquipo: {
    fontSize: 9.5,
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
    paddingVertical: 4,
  },

  // ── Resumen ───────────────────────────────────────────────────────────
  tituloResumen: {
    fontSize: 11.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginTop: 2,
    marginBottom: 4,
  },
  parrafoResumen: {
    fontSize: 11,
    textAlign: "justify",
    lineHeight: 1.35,
  },

  // ── Firmas ────────────────────────────────────────────────────────────
  // Van apiladas en la mitad derecha. El lado izquierdo es el de la cédula del
  // paciente: si está digitalizada se imprime ahí; si no, queda libre para
  // pegar la fotocopia, como siempre.
  firmas: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 14,
  },
  columnaCedula: { width: "50%" },
  // Cédula venezolana (ISO ID-1, 85,6 × 54 mm) a tamaño real, para que se lea
  // como la fotocopia. Cabe con un resumen largo porque la letra de la hoja
  // es algo menor. El borde fino delimita el espacio como lo haría el filo
  // de la fotocopia.
  cajaCedula: {
    width: ANCHO_CEDULA,
    height: ALTO_CEDULA,
    borderWidth: 0.5,
    borderColor: NEGRO,
    padding: 1,
  },
  imagenCedula: { width: "100%", height: "100%", objectFit: "contain" },
  columnaFirmas: { width: "45%" },
  lineaFirma: {
    borderTopWidth: 1,
    borderTopColor: NEGRO,
    paddingTop: 3,
    marginTop: 48,
  },
  segundaFirma: { marginTop: 52 },
  // Con cédula, las dos firmas van al lado de la imagen y reparten su misma
  // altura: la del anestesiólogo queda alineada con la base de la cédula. Así
  // el bloque no mide más que la cédula y la hoja sigue cabiendo en una carta.
  columnaFirmasConCedula: { height: ALTO_CEDULA },
  lineaFirmaConCedula: { marginTop: 50 },
  segundaFirmaConCedula: {
    marginTop: ALTO_CEDULA - 50 - 2 * ALTO_LINEA_FIRMA,
  },
  pieFirma: { fontSize: 11, textAlign: "center" },
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
function Dato({
  etiqueta,
  valor,
  destacado = false,
}: {
  etiqueta: string;
  valor?: string;
  destacado?: boolean;
}) {
  return (
    <Text style={styles.etiqueta}>
      {etiqueta}{" "}
      <Text style={destacado ? styles.valorDestacado : styles.valor}>
        {valor && valor.trim() ? valor : "—"}
      </Text>
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
// Documento PDF — Req 25.3
// ---------------------------------------------------------------------------

interface NotaDocumentProps {
  nota: Nota;
  paciente: Paciente;
  /**
   * Imagen de la cédula del paciente como data URI, si está digitalizada.
   * Ausente, la hoja sale con el hueco en blanco para la fotocopia.
   */
  cedula?: string;
  /**
   * Biopsias ligadas a la nota. Cada una agrega su solicitud detrás de la
   * hoja; sin ninguna, el documento es la hoja sola, como siempre.
   */
  biopsias?: Biopsia[];
  /**
   * Todas las biopsias del paciente, para marcar "Biopsias anteriores" en
   * cada solicitud. Ausente, esas casillas quedan en blanco.
   */
  biopsiasDelPaciente?: Biopsia[];
}

/** Una hoja de nota operatoria, reutilizable en documentos de varias notas. */
function PaginaNota({ nota, paciente, cedula }: NotaDocumentProps) {
  const cirujano = nota.medicos.find((m) => m.id === nota.medicoEncargado);
  const ayudantes = nota.medicos.filter((m) => m.id !== nota.medicoEncargado);
  // El papel reserva tres renglones de ayudantes; se mantienen aunque estén
  // vacíos para que la hoja impresa conserve siempre la misma altura.
  const renglonesAyudantes = Math.max(ayudantes.length, 3);

  const anestesiaLocal = nota.anestesia?.trim().toLowerCase() === "local";
  const anestesiaGeneral = nota.anestesia?.trim().toLowerCase() === "general";

  // Carta: es el papel con el que trabaja el servicio.
  return (
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
                <Dato etiqueta="NOMBRE Y APELLIDO" valor={paciente.nombre} destacado />
              </View>
              <View style={styles.filaSeparada}>
                <View style={[styles.celda, styles.celdaMitad]}>
                  <Dato
                    etiqueta="EDAD"
                    valor={`${edadEnLaFecha(
                      paciente.fechaNacimiento,
                      nota.fechaComienzo
                    )} AÑOS`}
                  />
                </View>
                <View style={[styles.celda, styles.celdaMitad, styles.celdaDividida]}>
                  <Dato etiqueta="GÉNERO" valor={paciente.genero} />
                </View>
              </View>
              <View style={styles.filaSeparada}>
                <View style={[styles.celda, styles.celdaMitad]}>
                  <Dato etiqueta="HISTORIA N°" valor={paciente.historiaMedica} />
                </View>
                <View style={[styles.celda, styles.celdaMitad, styles.celdaDividida]}>
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
                <View style={[styles.celda, styles.celdaMitad]}>
                  <Text style={styles.etiqueta}>COMIENZO DE INTERVENCIÓN</Text>
                </View>
                <View style={[styles.celda, styles.celdaMitad, styles.celdaDividida]}>
                  <Text style={styles.etiqueta}>
                    CULMINACIÓN DE INTERVENCIÓN
                  </Text>
                </View>
              </View>
              <View style={styles.filaSeparada}>
                <View style={[styles.celda, styles.celdaMitad]}>
                  <Dato
                    etiqueta="FECHA"
                    valor={formatFechaUI(nota.fechaComienzo)}
                  />
                </View>
                <View style={[styles.celda, styles.celdaMitad, styles.celdaDividida]}>
                  <Dato
                    etiqueta="FECHA"
                    valor={formatFechaUI(nota.fechaCulminacion)}
                  />
                </View>
              </View>
              <View style={styles.filaSeparada}>
                <View style={[styles.celda, styles.celdaMitad]}>
                  <Dato etiqueta="HORA" valor={nota.horaComienzo} />
                </View>
                <View style={[styles.celda, styles.celdaMitad, styles.celdaDividida]}>
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
                <View style={[styles.celda, styles.celdaMitad]}>
                  <CampoCasilla etiqueta="ELECTIVA" marcada={nota.esElectiva} />
                </View>
                <View style={[styles.celda, styles.celdaMitad, styles.celdaDividida]}>
                  <Text style={styles.etiqueta}>BIOPSIA</Text>
                </View>
              </View>
              <View style={styles.filaSeparada}>
                <View style={[styles.celda, styles.celdaMitad]}>
                  <CampoCasilla
                    etiqueta="EMERGENCIA"
                    marcada={nota.esEmergencia}
                  />
                </View>
                <View
                  style={[
                    styles.celda,
                    styles.celdaMitad,
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
                <View style={[styles.celda, styles.celdaMitad]}>
                  <CampoCasilla etiqueta="GENERAL" marcada={anestesiaGeneral} />
                </View>
                <View style={[styles.celda, styles.celdaMitad, styles.celdaDividida]}>
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
        {/* Los comentarios del médico cierran el relato, tras "Observaciones:". */}
        <Text style={styles.parrafoResumen}>
          {resumenConObservaciones(nota.resumenIntervencion, nota.comentarios)}
        </Text>

        {/* ── Firmas y cédula ── */}
        <View style={styles.firmas} wrap={false}>
          <View style={styles.columnaCedula}>
            {cedula && (
              <View style={styles.cajaCedula}>
                <Image src={cedula} style={styles.imagenCedula} />
              </View>
            )}
          </View>
          <View style={[styles.columnaFirmas, cedula ? styles.columnaFirmasConCedula : {}]}>
            <View style={[styles.lineaFirma, cedula ? styles.lineaFirmaConCedula : {}]}>
              <Text style={styles.pieFirma}>MÉDICO TRATANTE</Text>
            </View>
            <View style={[styles.lineaFirma, cedula ? styles.segundaFirmaConCedula : styles.segundaFirma]}>
              <Text style={styles.pieFirma}>ANESTESIÓLOGO</Text>
            </View>
          </View>
        </View>

        {/* ── Pie: dirección y contacto del hospital ── */}
        <PieHospital margen={MARGEN} />
    </Page>
  );
}

/** La hoja de la nota seguida de la solicitud de cada biopsia ligada. */
function HojasNota({ nota, paciente, cedula, biopsias = [], biopsiasDelPaciente }: NotaDocumentProps) {
  return (
    <>
      <PaginaNota nota={nota} paciente={paciente} cedula={cedula} />
      {biopsias.map((b) => (
        <PaginasBiopsia
          key={b.id ?? b.clientUuid ?? `${b.tejido}-${b.fechaToma.getTime()}`}
          biopsia={b}
          paciente={paciente}
          nota={nota}
          anteriores={anterioresDe(b, biopsiasDelPaciente)}
        />
      ))}
    </>
  );
}

/** Documento de una sola nota. */
function NotaDocument(props: NotaDocumentProps) {
  return (
    <Document
      title={`Nota operatoria — ${props.paciente.nombre}`}
      author="HCSC Oftalmología"
    >
      <HojasNota {...props} />
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Función de descarga — genera el Blob y dispara la descarga
// ---------------------------------------------------------------------------

/**
 * Genera y descarga el PDF de la nota operatoria.
 *
 * @param nota     - Objeto Nota completo con medicos[]
 * @param paciente - Objeto Paciente correspondiente
 * @param cedula   - Imagen de la cédula como data URI, si la hay
 * @param biopsias - Biopsias ligadas a la nota; cada una anexa su solicitud
 */
export async function descargarNotaPDF(
  nota: Nota,
  paciente: Paciente,
  cedula?: string,
  biopsias: Biopsia[] = [],
  biopsiasDelPaciente?: Biopsia[]
): Promise<void> {
  const blob = await pdf(
    <NotaDocument
      nota={nota}
      paciente={paciente}
      cedula={cedula}
      biopsias={biopsias}
      biopsiasDelPaciente={biopsiasDelPaciente}
    />
  ).toBlob();
  descargarBlob(blob, `nota-${nota.id ?? "nueva"}-${paciente.historiaMedica}.pdf`);
}

// ---------------------------------------------------------------------------
// Varias notas en un solo documento
// ---------------------------------------------------------------------------

export interface NotaConPaciente {
  nota: Nota;
  paciente: Paciente;
  /** Cédula del paciente como data URI, si está digitalizada. */
  cedula?: string;
  /** Biopsias ligadas a la nota, si las hay. */
  biopsias?: Biopsia[];
  /** Todas las del paciente, para "Biopsias anteriores". */
  biopsiasDelPaciente?: Biopsia[];
}

/**
 * Documento con una hoja por nota. Un único archivo en vez de una descarga por
 * nota: el navegador bloquea las descargas múltiples seguidas, y un solo PDF se
 * imprime de corrido.
 */
function NotasDocument({ items }: { items: NotaConPaciente[] }) {
  return (
    <Document title="Notas operatorias" author="HCSC Oftalmología">
      {items.map(({ nota, paciente, cedula, biopsias, biopsiasDelPaciente }) => (
        <HojasNota
          key={nota.id ?? `${paciente.id}-${nota.fechaComienzo.getTime()}`}
          nota={nota}
          paciente={paciente}
          cedula={cedula}
          biopsias={biopsias}
          biopsiasDelPaciente={biopsiasDelPaciente}
        />
      ))}
    </Document>
  );
}

/** Genera y descarga un PDF con todas las notas indicadas. */
export async function descargarNotasPDF(
  items: NotaConPaciente[]
): Promise<void> {
  if (items.length === 0) return;

  // Cronológico, como se archiva en papel: quien selecciona en pantalla no lo
  // hace en orden, y el PDF no debería depender de eso.
  const ordenados = [...items].sort(
    (a, b) => a.nota.fechaComienzo.getTime() - b.nota.fechaComienzo.getTime()
  );

  const blob = await pdf(<NotasDocument items={ordenados} />).toBlob();
  const sufijo =
    items.length === 1
      ? `nota-${ordenados[0]!.nota.id ?? "nueva"}`
      : `${items.length}-notas`;
  descargarBlob(blob, `notas-operatorias-${sufijo}.pdf`);
}

export { NotaDocument };
