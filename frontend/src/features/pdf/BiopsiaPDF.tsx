/**
 * Solicitud de biopsia o citología en PDF, generada en el cliente con
 * @react-pdf/renderer.
 *
 * La maquetación reproduce el formulario en papel del servicio
 * (`docs/Biopsia.pdf`): datos del paciente, información sobre la muestra con
 * el esquema de la cara, descripción de la lesión por casillas, responsables
 * de la toma y los laboratorios recomendados. Se rellena con lo que la
 * aplicación ya sabe (paciente, muestra, diagnóstico presuntivo, cirujano y
 * ayudantes) y deja en blanco lo que el médico completa a mano: antecedentes,
 * tipo de biopsia y la descripción clínica de la lesión.
 *
 * Se descarga sola desde el panel de la biopsia, y va anexa a la hoja de la
 * nota operatoria a la que está ligada. Es la solicitud tal cual: el
 * resultado de anatomía patológica no se imprime aquí, vive en el panel.
 */

import {
  Circle,
  Document,
  Image,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import type { Biopsia, Nota, Paciente } from "@/domain/models";
import { formatFechaUI } from "@/lib/datetime";
import { ESTUDIOS_IMAGENES } from "@/domain/catalogosBiopsia";
import type { BiopsiasAnteriores } from "./biopsiasParaPDF";
import {
  NEGRO,
  PieHospital,
  descargarBlob,
  edadEnLaFecha,
  logoHospital,
  logoServicio,
  nombreCompleto,
} from "./comun";

const MARGEN = 36;

/** Laboratorios que recomienda el servicio, transcritos del formulario. */
const LABORATORIOS_RECOMENDADOS = [
  "Unidad de Anatomía Patológica Dra. Marielis Solano Blanco. Av. 19 de abril, con Calle 9, Centro Empresarial Toyotáchira, Piso 2, Ofi. 2-5, San Cristóbal, Teléfono: 04247796715",
  "Dr. Juan Carlos Becker Saravia, Policlínica Táchira, San Cristóbal, Teléfono: 0276-3465501 / 0276-3490484",
  "Dra. Nora Sánchez, Centro Médico Quirúrgico el Samán CA, Redoma del Educador, Av. Libertador, San Cristóbal",
];

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10.5,
    paddingTop: 20,
    // Deja sitio al pie con los datos del hospital, que va en posición
    // absoluta y no empuja el contenido.
    paddingBottom: 34,
    paddingHorizontal: MARGEN,
    color: NEGRO,
  },

  // ── Encabezado ────────────────────────────────────────────────────────
  encabezado: { flexDirection: "row", alignItems: "center" },
  encabezadoLado: { width: "25%" },
  logoHospital: { width: 80, marginLeft: -6 },
  logoServicio: { width: 104, marginLeft: "auto" },
  membrete: {
    width: "50%",
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  titulo: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 10,
  },
  continuacion: {
    fontSize: 8,
    textAlign: "center",
    marginTop: -6,
    marginBottom: 4,
  },

  // ── Secciones y filas ─────────────────────────────────────────────────
  seccion: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 12,
    marginBottom: 8,
  },
  fila: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  filaCasillas: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  etiqueta: { fontFamily: "Helvetica-Bold" },
  etiquetaSubrayada: { fontFamily: "Helvetica-Bold", textDecoration: "underline" },
  // La línea sobre la que se escribe: crece hasta ocupar lo que quede de la
  // fila salvo que se le dé un ancho fijo.
  linea: {
    flexGrow: 1,
    borderBottomWidth: 0.8,
    borderBottomColor: NEGRO,
    marginLeft: 4,
    marginRight: 10,
    paddingHorizontal: 2,
    minHeight: 14,
    justifyContent: "flex-end",
  },
  lineaFija: { flexGrow: 0 },
  // Texto del renglón; el rótulo va en negrita y el dato en redonda, como en
  // la hoja de la nota.
  // Sin `lineHeight`: con uno numérico react-pdf deja el texto flotando por
  // encima de su renglón en vez de apoyarlo sobre la línea.
  valor: {},
  renglon: {
    borderBottomWidth: 0.8,
    borderBottomColor: NEGRO,
    minHeight: 15,
    marginBottom: 9,
    marginRight: 10,
    justifyContent: "flex-end",
    paddingHorizontal: 2,
  },
  parrafo: { textAlign: "justify", marginBottom: 4 },

  // ── Casillas ──────────────────────────────────────────────────────────
  opcion: { flexDirection: "row", alignItems: "center", marginRight: 14 },
  casilla: {
    width: 12,
    height: 12,
    borderWidth: 0.8,
    borderColor: NEGRO,
    marginLeft: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  // `lineHeight: 1` es necesario: con el interlineado por defecto la X mide
  // más que la casilla y el renderizador la recorta entera.
  casillaMarca: { fontSize: 9, fontFamily: "Helvetica-Bold", lineHeight: 1 },

  // ── Muestra: casillas a la izquierda, esquema de la cara a la derecha ──
  // La cara ocupa el tercio derecho desde "Tipo de muestra" hasta el pie,
  // como en el papel, para que quepa un dibujo de la lesión.
  muestra: { flexDirection: "row", alignItems: "flex-start" },
  muestraCasillas: { width: "66%" },
  cara: { width: "34%", alignItems: "center", paddingTop: 4 },

  // ── Recomendaciones ───────────────────────────────────────────────────
  // Un solo `Text` por viñeta: en una fila flex el texto que envuelve se mide
  // más alto de lo que ocupa y el bloque se iba entero a otra hoja.
  vineta: { marginLeft: 10, marginBottom: 3 },
});

// ---------------------------------------------------------------------------
// Piezas del formulario
// ---------------------------------------------------------------------------

/** Casilla del formulario; lleva una X cuando el dato está marcado. */
function Casilla({ marcada }: { marcada: boolean }) {
  return (
    <View style={styles.casilla}>
      {marcada && <Text style={styles.casillaMarca}>X</Text>}
    </View>
  );
}

/** "Incisional [ ]": rótulo seguido de su casilla, como en el papel. */
function Opcion({ etiqueta, marcada = false }: { etiqueta: string; marcada?: boolean }) {
  return (
    <View style={styles.opcion}>
      <Text>{etiqueta}</Text>
      <Casilla marcada={marcada} />
    </View>
  );
}

/**
 * Rótulo y renglón para escribir. Con `ancho` el renglón mide eso; sin él,
 * ocupa lo que quede de la fila. Si el dato existe se imprime sobre la línea.
 */
function Linea({
  etiqueta,
  valor,
  ancho,
  subrayada = false,
}: {
  etiqueta: string;
  valor?: string;
  ancho?: number;
  subrayada?: boolean;
}) {
  return (
    <>
      <Text style={subrayada ? styles.etiquetaSubrayada : styles.etiqueta}>{etiqueta}</Text>
      <View style={[styles.linea, ancho ? { ...styles.lineaFija, width: ancho } : {}]}>
        <Text style={styles.valor}>{valor?.trim() ?? ""}</Text>
      </View>
    </>
  );
}

/** Renglones en blanco (o con texto en el primero) para escribir a mano. */
function Renglones({ n, texto }: { n: number; texto?: string }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <View key={i} style={styles.renglon}>
          <Text style={styles.valor}>{i === 0 ? texto?.trim() ?? "" : ""}</Text>
        </View>
      ))}
    </>
  );
}

/**
 * Esquema de la cara del formulario, para que el médico marque dónde está la
 * lesión. El ojo de la muestra se dibuja con trazo grueso: el derecho del
 * paciente queda a la izquierda de quien mira, como en el papel.
 */
function Cara({ derecho, izquierdo }: { derecho: boolean; izquierdo: boolean }) {
  const trazo = (marcado: boolean) => (marcado ? 2.2 : 0.9);
  // Proporciones de una cara real sobre un lienzo de 160 × 200: la cabeza es
  // un óvalo algo más ancho arriba, los ojos van a media altura y separados
  // un ojo entre sí, la nariz termina a dos tercios y la boca a cuatro
  // quintos. El derecho del paciente queda a la izquierda de quien mira.
  return (
    <Svg width={168} height={210} viewBox="0 0 160 200">
      {/* Cabeza: más ancha a la altura de las sienes, mentón más estrecho */}
      <Path
        d="M80 8 C124 8 142 48 142 92 C142 140 116 192 80 192 C44 192 18 140 18 92 C18 48 36 8 80 8 Z"
        stroke={NEGRO}
        strokeWidth={1}
        fill="none"
      />
      {/* Orejas, entre la línea de los ojos y la base de la nariz */}
      <Path d="M18 96 C8 92 8 118 20 122" stroke={NEGRO} strokeWidth={0.9} fill="none" />
      <Path d="M142 96 C152 92 152 118 140 122" stroke={NEGRO} strokeWidth={0.9} fill="none" />
      {/* Cejas */}
      <Path d="M36 82 Q54 72 72 82" stroke={NEGRO} strokeWidth={1.3} fill="none" />
      <Path d="M88 82 Q106 72 124 82" stroke={NEGRO} strokeWidth={1.3} fill="none" />
      {/* Ojos a media altura; el derecho del paciente a la izquierda */}
      <Path d="M38 100 Q54 88 70 100 Q54 112 38 100 Z" stroke={NEGRO} strokeWidth={trazo(derecho)} fill="none" />
      <Path d="M90 100 Q106 88 122 100 Q106 112 90 100 Z" stroke={NEGRO} strokeWidth={trazo(izquierdo)} fill="none" />
      <Circle cx={54} cy={100} r={5.5} stroke={NEGRO} strokeWidth={0.9} fill="none" />
      <Circle cx={106} cy={100} r={5.5} stroke={NEGRO} strokeWidth={0.9} fill="none" />
      <Circle cx={54} cy={100} r={2.4} fill={NEGRO} />
      <Circle cx={106} cy={100} r={2.4} fill={NEGRO} />
      {/* Nariz: puente y base con las alas */}
      <Path d="M80 104 L76 130" stroke={NEGRO} strokeWidth={0.9} fill="none" />
      <Path d="M66 136 Q72 142 80 138 Q88 142 94 136" stroke={NEGRO} strokeWidth={0.9} fill="none" />
      {/* Boca */}
      <Path d="M58 158 Q80 168 102 158" stroke={NEGRO} strokeWidth={1} fill="none" />
      <Path d="M62 156 Q80 152 98 156" stroke={NEGRO} strokeWidth={0.7} fill="none" />
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Helpers de datos
// ---------------------------------------------------------------------------

/** Casilla de "Tipo de muestra" que corresponde al tejido, si es evidente. */
type TipoMuestra =
  | "orbita"
  | "globo"
  | "conjuntiva"
  | "parpado"
  | "mejilla"
  | "nariz"
  | "ceja"
  | "frente"
  | "cornea";

function tipoDeMuestra(b: Biopsia): TipoMuestra | undefined {
  // Lo cargado manda; la heurística por el tejido es solo respaldo para las
  // biopsias registradas antes de que existiera el campo.
  switch (b.tipoMuestra) {
    case "cavidad_orbitaria": return "orbita";
    case "globo_ocular": return "globo";
    case "conjuntiva": return "conjuntiva";
    case "parpado": return "parpado";
    case "mejilla": return "mejilla";
    case "nariz": return "nariz";
    case "ceja": return "ceja";
    case "frente": return "frente";
    case "cornea": return "cornea";
    case "otro": return undefined;
  }
  const t = b.tejido.toLowerCase();
  if (t.includes("pterigi") || t.includes("conjuntiv")) return "conjuntiva";
  if (t.includes("palpebr") || t.includes("párpado") || t.includes("parpado") || t.includes("chalaz"))
    return "parpado";
  if (t.includes("córnea") || t.includes("cornea") || t.includes("corneal")) return "cornea";
  if (t.includes("orbit")) return "orbita";
  if (t.includes("globo")) return "globo";
  if (t.includes("mejilla")) return "mejilla";
  if (t.includes("nariz") || t.includes("nasal ")) return "nariz";
  if (t.includes("ceja")) return "ceja";
  if (t.includes("frente")) return "frente";
  return undefined;
}

/**
 * Las cuatro casillas de "Ubicación". Lo marcado manda; a falta de lado, se
 * toma del ojo de la muestra, y a falta de altura, de lo que digan el tejido
 * y la descripción (biopsias anteriores al campo).
 */
function ubicacion(b: Biopsia): {
  superior: boolean;
  inferior: boolean;
  derecho: boolean;
  izquierdo: boolean;
} {
  const u = new Set<string>(b.ubicacion);
  const texto = `${b.tejido} ${b.descripcionMacroscopica}`.toLowerCase();
  const hayAltura = u.has("superior") || u.has("inferior");
  const hayLado = u.has("derecho") || u.has("izquierdo");
  return {
    superior: hayAltura ? u.has("superior") : texto.includes("superior"),
    inferior: hayAltura ? u.has("inferior") : texto.includes("inferior"),
    derecho: hayLado ? u.has("derecho") : b.ojo === "OD" || b.ojo === "AO",
    izquierdo: hayLado ? u.has("izquierdo") : b.ojo === "OI" || b.ojo === "AO",
  };
}

const numero = (n?: number) => (n === undefined ? undefined : String(n));

function fecha(d?: Date): string | undefined {
  return d ? formatFechaUI(d) : undefined;
}

// ---------------------------------------------------------------------------
// Documento
// ---------------------------------------------------------------------------

export interface DatosBiopsiaPDF {
  biopsia: Biopsia;
  paciente: Paciente;
  /**
   * Nota operatoria en la que se tomó la muestra, para los ayudantes. Sin
   * ella, los renglones de ayudante quedan en blanco.
   */
  nota?: Nota;
  /**
   * Biopsias anteriores del paciente, calculadas de lo registrado. Marcan
   * NO / SÍ y el resultado; si no se sabe, las casillas quedan vacías.
   */
  anteriores?: BiopsiasAnteriores;
}

function Encabezado({ continuacion }: { continuacion?: boolean }) {
  return (
    <>
      <View style={styles.encabezado}>
        <View style={styles.encabezadoLado}>
          <Image src={logoHospital} style={styles.logoHospital} />
        </View>
        <Text style={styles.membrete}>
          HOSPITAL CENTRAL DE SAN CRISTÓBAL{"\n"}
          SERVICIO DE OFTALMOLOGÍA{"\n"}
          CIRUGÍA PLÁSTICA OCULAR Y ÓRBITA
        </Text>
        <View style={styles.encabezadoLado}>
          <Image src={logoServicio} style={styles.logoServicio} />
        </View>
      </View>
      <Text style={styles.titulo}>SOLICITUD DE BIOPSIA O CITOLOGÍA</Text>
      {continuacion && <Text style={styles.continuacion}>(continuación)</Text>}
    </>
  );
}

/** Las dos hojas de la solicitud, reutilizables dentro de otros documentos. */
export function PaginasBiopsia({ biopsia, paciente, nota, anteriores }: DatosBiopsiaPDF) {
  const b = biopsia;
  const responsable = b.medicoResponsable ? nombreCompleto(b.medicoResponsable) : undefined;
  const ayudantes = (nota?.medicos ?? [])
    .filter((m) => m.id !== b.idMedicoResponsable)
    .map(nombreCompleto);
  const tipo = tipoDeMuestra(b);
  const { superior, inferior, derecho, izquierdo } = ubicacion(b);
  const colores = new Set<string>(b.color);
  const cambios = new Set<string>(b.cambiosAsociados);
  const estudios = new Set<string>(paciente.estudiosImagenes);
  const referencia = `${paciente.nombre} · ${b.tejido} · tomada el ${formatFechaUI(b.fechaToma)}`;

  return (
    <>
      {/* ── Hoja 1: paciente y muestra ── */}
      <Page size="LETTER" style={styles.page}>
        <Encabezado />

        <Text style={styles.seccion}>1. Datos del Paciente</Text>
        <View style={styles.fila}>
          <Linea etiqueta="Nombres y Apellidos:" valor={paciente.nombre} />
        </View>
        <View style={styles.fila}>
          <Text style={styles.etiqueta}>CI: </Text>
          <Opcion etiqueta="V" marcada={paciente.tipoDocumento === "V"} />
          <Opcion etiqueta="E" marcada={paciente.tipoDocumento === "E"} />
          <Linea etiqueta="" valor={paciente.numeroIdentificacion} ancho={110} />
          <Linea etiqueta="Fecha de Nacimiento:" valor={fecha(paciente.fechaNacimiento)} ancho={72} />
          <Linea
            etiqueta="Edad:"
            valor={`${edadEnLaFecha(paciente.fechaNacimiento, b.fechaToma)}`}
            ancho={34}
          />
        </View>
        <View style={styles.fila}>
          <Text style={styles.etiqueta}>Sexo: </Text>
          <Opcion etiqueta="F" marcada={paciente.genero === "F"} />
          <Opcion etiqueta="M" marcada={paciente.genero === "M"} />
          <Linea etiqueta="Ocupación:" valor={paciente.ocupacion} />
          <Linea etiqueta="Raza:" valor={paciente.raza} ancho={100} />
        </View>
        <View style={styles.fila}>
          <Linea etiqueta="Teléfonos:" valor={paciente.telefono} ancho={170} />
          <Linea etiqueta="/" valor={paciente.telefonoAlternativo} />
        </View>

        <Text style={styles.etiqueta}>
          Antecedentes Oncológicos del paciente / familiar (padres - hijos - hermanos) u otros de importancia:
        </Text>
        <Renglones n={2} texto={paciente.antecedentesOncologicos} />

        <View style={styles.filaCasillas}>
          <Text style={styles.etiqueta}>Biopsias anteriores: </Text>
          <Opcion etiqueta="NO" marcada={anteriores?.cantidad === 0} />
          <Opcion etiqueta="SÍ" marcada={anteriores !== undefined && anteriores.cantidad > 0} />
          <Linea etiqueta="Resultado:" valor={anteriores?.resultado} />
        </View>
        <View style={styles.fila}>
          <Linea etiqueta="Quimioterapia: #ciclos" valor={numero(paciente.quimioterapiaCiclos)} ancho={70} />
          <Linea etiqueta="Radioterapia: #ciclos" valor={numero(paciente.radioterapiaCiclos)} ancho={70} />
        </View>
        <View style={styles.filaCasillas}>
          <Text style={styles.etiqueta}>Estudios de Imágenes: </Text>
          {ESTUDIOS_IMAGENES.map((e) => (
            <Opcion key={e.value} etiqueta={e.label} marcada={estudios.has(e.value)} />
          ))}
        </View>
        <View style={styles.fila}>
          <Linea etiqueta="Hallazgo de importancia estudio:" valor={paciente.hallazgoEstudios} />
        </View>
        <Renglones n={1} />

        <Text style={styles.seccion}>2. Información sobre la Muestra</Text>
        <View style={styles.filaCasillas}>
          <Text style={styles.etiqueta}>Biopsia: </Text>
          <Opcion etiqueta="Incisional" marcada={b.tipoBiopsia === "incisional"} />
          <Opcion etiqueta="Excisional" marcada={b.tipoBiopsia === "excisional"} />
          <Opcion etiqueta="Trucut" marcada={b.tipoBiopsia === "trucut"} />
        </View>
        <View style={styles.filaCasillas}>
          <Text style={styles.etiqueta}>Citología: </Text>
          <Opcion etiqueta="Impronta" marcada={b.tipoCitologia === "impronta"} />
          <Opcion etiqueta="Respronta" marcada={b.tipoCitologia === "respronta"} />
          <Opcion etiqueta="Aspiración aguja fina" marcada={b.tipoCitologia === "aspiracion_aguja_fina"} />
        </View>
        <View style={styles.filaCasillas}>
          <Text style={styles.etiqueta}>Centro Médico donde se toma de la muestra: </Text>
          <Opcion etiqueta="HCSC" marcada={b.centroToma === "hcsc"} />
          <Opcion etiqueta="IVSS" marcada={b.centroToma === "ivss"} />
          <Linea etiqueta="Otro:" valor={b.centroToma === "otro" ? b.centroTomaOtro : undefined} ancho={90} />
        </View>
        <View style={styles.fila}>
          <Linea etiqueta="Fecha toma de la muestra:" valor={fecha(b.fechaToma)} ancho={130} />
        </View>

        <View style={styles.muestra}>
          <View style={styles.muestraCasillas}>
            <Text style={[styles.etiqueta, { marginBottom: 5 }]}>Tipo de Muestra:</Text>
            <View style={styles.filaCasillas}>
              <Opcion etiqueta="Cavidad Orbitaria" marcada={tipo === "orbita"} />
              <Opcion etiqueta="Globo Ocular" marcada={tipo === "globo"} />
              <Opcion etiqueta="Conjuntiva" marcada={tipo === "conjuntiva"} />
            </View>
            <View style={styles.filaCasillas}>
              <Opcion etiqueta="Párpado" marcada={tipo === "parpado"} />
              <Opcion etiqueta="Mejilla" marcada={tipo === "mejilla"} />
              <Opcion etiqueta="Nariz" marcada={tipo === "nariz"} />
              <Opcion etiqueta="Ceja" marcada={tipo === "ceja"} />
              <Opcion etiqueta="Frente" marcada={tipo === "frente"} />
            </View>
            <View style={styles.filaCasillas}>
              <Opcion etiqueta="Córnea" marcada={tipo === "cornea"} />
              <Linea
                etiqueta="Otro:"
                valor={b.tipoMuestra === "otro" ? b.tipoMuestraOtro || b.tejido : tipo ? undefined : b.tejido}
                ancho={150}
              />
            </View>
            <Text style={[styles.etiqueta, { marginTop: 4, marginBottom: 5 }]}>Ubicación:</Text>
            <View style={styles.filaCasillas}>
              <Opcion etiqueta="Superior" marcada={superior} />
              <Opcion etiqueta="Inferior" marcada={inferior} />
            </View>
            <View style={styles.filaCasillas}>
              <Opcion etiqueta="Derecho" marcada={derecho} />
              <Opcion etiqueta="Izquierdo" marcada={izquierdo} />
            </View>
          </View>
          <View style={styles.cara}>
            <Cara derecho={derecho} izquierdo={izquierdo} />
          </View>
        </View>

        <PieHospital margen={MARGEN} />
      </Page>

      {/* ── Hoja 2: descripción de la lesión, responsables y laboratorios ── */}
      <Page size="LETTER" style={styles.page}>
        <Encabezado continuacion />
        <Text style={[styles.etiqueta, { fontSize: 8, marginBottom: 2 }]}>{referencia}</Text>

        <Text style={styles.seccion}>Descripción de la lesión:</Text>
        <View style={styles.filaCasillas}>
          <Text style={styles.etiquetaSubrayada}>Bordes:</Text>
          <Text>  </Text>
          <Opcion etiqueta="Definidos" marcada={b.bordes === "definidos"} />
          <Opcion etiqueta="Indefinidos" marcada={b.bordes === "indefinidos"} />
          <Opcion etiqueta="Irregulares" marcada={b.bordes === "irregulares"} />
        </View>
        <View style={styles.filaCasillas}>
          <Text style={styles.etiquetaSubrayada}>Color:</Text>
          <Text>  </Text>
          <Opcion etiqueta="Hiperpigmentada" marcada={colores.has("hiperpigmentada")} />
          <Opcion etiqueta="Hipopigmentada" marcada={colores.has("hipopigmentada")} />
          <Opcion etiqueta="Aframbuesada" marcada={colores.has("aframbuesada")} />
        </View>
        <View style={styles.filaCasillas}>
          <Opcion etiqueta="Salmón" marcada={colores.has("salmon")} />
          <Opcion etiqueta="Negra" marcada={colores.has("negra")} />
          <Opcion etiqueta="Violácea" marcada={colores.has("violacea")} />
          <Opcion etiqueta="Amarilla" marcada={colores.has("amarilla")} />
          <Opcion etiqueta="Nacarada" marcada={colores.has("nacarada")} />
          <Opcion etiqueta="Blanca" marcada={colores.has("blanca")} />
        </View>
        <View style={styles.filaCasillas}>
          <Opcion etiqueta="Homogénea" marcada={colores.has("homogenea")} />
          <Opcion etiqueta="Heterogénea" marcada={colores.has("heterogenea")} />
          <Linea etiqueta="Otro:" valor={b.colorOtro} ancho={180} />
        </View>
        <View style={styles.filaCasillas}>
          <Text style={styles.etiquetaSubrayada}>Tamaño:</Text>
          <Text>  </Text>
          <Opcion etiqueta="< 0,5mm" marcada={b.tamano === "menor_0_5mm"} />
          <Opcion etiqueta="0,5-1mm" marcada={b.tamano === "0_5_1mm"} />
          <Opcion etiqueta="1-2mm" marcada={b.tamano === "1_2mm"} />
          <Opcion etiqueta="2-5mm" marcada={b.tamano === "2_5mm"} />
          <Linea etiqueta="Otro:" valor={b.tamano === "otro" ? b.tamanoOtro : undefined} ancho={110} />
        </View>
        <View style={styles.filaCasillas}>
          <Text style={styles.etiquetaSubrayada}>Altura:</Text>
          <Text>  </Text>
          <Opcion etiqueta="Plana" marcada={b.altura === "plana"} />
          <Opcion etiqueta="Sobreelevada" marcada={b.altura === "sobreelevada"} />
          <Opcion etiqueta="Ulcerada" marcada={b.altura === "ulcerada"} />
          <Opcion etiqueta="Pediculada" marcada={b.altura === "pediculada"} />
        </View>
        <View style={styles.filaCasillas}>
          <Text style={styles.etiquetaSubrayada}>Cambios asociados:</Text>
          <Text>  </Text>
          <Opcion etiqueta="Descamación" marcada={cambios.has("descamacion")} />
          <Opcion etiqueta="Queratosis" marcada={cambios.has("queratosis")} />
          <Opcion etiqueta="Telangectasias" marcada={cambios.has("telangiectasias")} />
        </View>
        <View style={styles.filaCasillas}>
          <Text style={styles.etiquetaSubrayada}>Recibió la lesión tratamientos previos:</Text>
          <Text>  </Text>
          <Opcion etiqueta="NO" marcada={b.tratamientosPrevios === false} />
          <Opcion etiqueta="SÍ" marcada={b.tratamientosPrevios === true} />
        </View>
        <View style={styles.fila}>
          <Linea etiqueta="¿Cuál?" valor={b.tratamientosPrevios ? b.tratamientosPreviosCual : undefined} />
        </View>

        <Text style={[styles.etiquetaSubrayada, { marginBottom: 4 }]}>Diagnóstico presuntivo:</Text>
        <Renglones n={3} texto={b.diagnosticoPresuntivo} />

        <Text style={styles.seccion}>Datos del Responsable de tomar la muestra:</Text>
        {/* Renglones cortos: la mitad derecha queda libre para el sello. */}
        <View style={styles.fila}>
          <Linea etiqueta="Cirujano:" valor={responsable} ancho={230} />
        </View>
        <View style={styles.fila}>
          <Linea etiqueta="Ayudante:" valor={ayudantes[0]} ancho={230} />
        </View>
        <View style={styles.fila}>
          <Linea etiqueta="Ayudante:" valor={ayudantes[1]} ancho={230} />
        </View>
        <View style={styles.fila}>
          <Linea etiqueta="Sello:" ancho={200} />
        </View>

        <Text style={[styles.parrafo, { marginTop: 10, marginBottom: 4 }]}>
          Puede procesar su muestra en el laboratorio de patología de su preferencia.
        </Text>
        <Text style={[styles.etiquetaSubrayada, { marginBottom: 4 }]}>Nosotros recomendamos:</Text>
        {LABORATORIOS_RECOMENDADOS.map((lab) => (
          <Text key={lab} style={styles.vineta}>
            {"•  "}
            {lab}
          </Text>
        ))}

        <PieHospital margen={MARGEN} />
      </Page>
    </>
  );
}

function BiopsiaDocument(datos: DatosBiopsiaPDF) {
  return (
    <Document
      title={`Solicitud de biopsia — ${datos.paciente.nombre}`}
      author="HCSC Oftalmología"
    >
      <PaginasBiopsia {...datos} />
    </Document>
  );
}

/** Genera y descarga la solicitud de una biopsia. */
export async function descargarBiopsiaPDF(datos: DatosBiopsiaPDF): Promise<void> {
  const blob = await pdf(<BiopsiaDocument {...datos} />).toBlob();
  descargarBlob(
    blob,
    `biopsia-${datos.biopsia.id ?? "nueva"}-${datos.paciente.historiaMedica}.pdf`
  );
}
