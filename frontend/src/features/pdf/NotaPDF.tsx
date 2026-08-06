/**
 * Documento PDF de una nota operatoria.
 * Generado completamente en cliente con @react-pdf/renderer.
 *
 * Requisitos: 25.1, 25.2, 25.3
 * - Obtiene datos combinando GET /notas/{id} + GET /pacientes/{id}
 * - No llama a ningún endpoint de backend extra
 * - Incluye: encabezado del hospital, datos del paciente, campos de la nota
 *   y equipo quirúrgico completo desde nota.medicos[]
 */

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import type { Nota, Paciente } from "@/domain/models";
import { formatFechaUI } from "@/lib/datetime";

// ---------------------------------------------------------------------------
// Estilos
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 48,
    color: "#111",
  },

  // Encabezado del hospital
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#1e3a5f",
    marginBottom: 16,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a5f",
  },
  headerSubtitle: {
    fontSize: 10,
    color: "#555",
    marginTop: 2,
  },
  headerDocTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginTop: 6,
    textAlign: "center",
    color: "#1e3a5f",
  },

  // Sección
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a5f",
    borderBottomWidth: 1,
    borderBottomColor: "#c8d6e5",
    paddingBottom: 3,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Grid de campos
  row: {
    flexDirection: "row",
    marginBottom: 4,
    flexWrap: "wrap",
  },
  field: {
    flex: 1,
    minWidth: "45%",
    marginBottom: 4,
    paddingRight: 8,
  },
  fieldFull: {
    flex: 1,
    width: "100%",
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 8,
    color: "#666",
    marginBottom: 1,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  fieldValue: {
    fontSize: 10,
  },

  // Badges / chips
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  badge: {
    borderWidth: 1,
    borderColor: "#bbb",
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 8,
    color: "#444",
  },

  // Equipo
  medicoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  medicoBullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#1e3a5f",
    marginRight: 6,
  },
  medicoNombre: {
    fontSize: 10,
  },
  medicoEncargadoLabel: {
    fontSize: 8,
    color: "#888",
    marginLeft: 6,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 8,
    color: "#999",
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Campo({
  label,
  valor,
  full = false,
}: {
  label: string;
  valor?: string | null;
  full?: boolean;
}) {
  if (!valor) return null;
  return (
    <View style={full ? styles.fieldFull : styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{valor}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Documento PDF — Req 25.3
// ---------------------------------------------------------------------------

interface NotaDocumentProps {
  nota: Nota;
  paciente: Paciente;
}

function NotaDocument({ nota, paciente }: NotaDocumentProps) {
  const fechaGeneracion = formatFechaUI(new Date());

  return (
    <Document
      title={`Nota operatoria — ${paciente.nombre}`}
      author="HCSC Oftalmología"
    >
      <Page size="A4" style={styles.page}>
        {/* ── Encabezado del hospital — Req 25.3 ── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            Hospital Central de San Cristóbal
          </Text>
          <Text style={styles.headerSubtitle}>
            Servicio de Oftalmología — Departamento Quirúrgico
          </Text>
          <Text style={styles.headerDocTitle}>NOTA OPERATORIA</Text>
        </View>

        {/* ── Datos del paciente — Req 25.3 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del paciente</Text>
          <View style={styles.row}>
            <Campo label="Nombre completo" valor={paciente.nombre} />
            <Campo
              label="Documento"
              valor={`${paciente.tipoDocumento}-${paciente.numeroIdentificacion}`}
            />
            <Campo label="Historia médica" valor={paciente.historiaMedica} />
            <Campo
              label="Fecha de nacimiento"
              valor={formatFechaUI(paciente.fechaNacimiento)}
            />
            {paciente.telefono && (
              <Campo label="Teléfono" valor={paciente.telefono} />
            )}
          </View>
        </View>

        {/* ── Datos de la intervención — Req 25.3 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Intervención</Text>
          <View style={styles.row}>
            <Campo
              label="Fecha de comienzo"
              valor={formatFechaUI(nota.fechaComienzo)}
            />
            <Campo
              label="Fecha de culminación"
              valor={formatFechaUI(nota.fechaCulminacion)}
            />
            <Campo label="Hora inicio" valor={nota.horaComienzo} />
            <Campo label="Hora culminación" valor={nota.horaCulminacion} />
            <Campo label="Pabellón" valor={nota.pabellon} />
            <Campo label="Anestesia" valor={nota.anestesia} />
          </View>

          <View style={styles.row}>
            <Campo
              label="Diagnóstico preoperatorio"
              valor={nota.dxPreOperatorio}
              full
            />
          </View>
          {nota.dxPostOperatorio && (
            <View style={styles.row}>
              <Campo
                label="Diagnóstico postoperatorio"
                valor={nota.dxPostOperatorio}
                full
              />
            </View>
          )}
          <View style={styles.row}>
            <Campo
              label="Intervención realizada"
              valor={nota.intervencionRealizada}
              full
            />
          </View>
          {nota.resumenIntervencion && (
            <View style={styles.row}>
              <Campo
                label="Resumen de la intervención"
                valor={nota.resumenIntervencion}
                full
              />
            </View>
          )}

          {/* Tipo de intervención */}
          <View style={styles.badgeRow}>
            {nota.esElectiva && (
              <Text style={styles.badge}>Electiva</Text>
            )}
            {nota.esEmergencia && (
              <Text style={styles.badge}>Emergencia</Text>
            )}
            {nota.tuvoBiopsia && (
              <Text style={styles.badge}>Con biopsia</Text>
            )}
          </View>
        </View>

        {/* ── Equipo quirúrgico — Req 25.3 (un miembro por cada medicos[]) ── */}
        {nota.medicos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Equipo quirúrgico</Text>
            {nota.medicos.map((m) => (
              <View key={m.id} style={styles.medicoRow}>
                <View style={styles.medicoBullet} />
                <Text style={styles.medicoNombre}>
                  {m.nombres} {m.apellidos}
                </Text>
                {m.id === nota.medicoEncargado && (
                  <Text style={styles.medicoEncargadoLabel}>(Encargado)</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            HCSC — Servicio de Oftalmología
          </Text>
          <Text style={styles.footerText}>
            Generado el {fechaGeneracion}
          </Text>
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
