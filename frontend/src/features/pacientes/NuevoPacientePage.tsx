/**
 * Página de registro de paciente nuevo.
 * Requisitos: 11.1–11.8
 */

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PacienteForm } from "./PacienteForm";
import { useCrearPaciente } from "@/hooks/usePacientes";
import { isApiError } from "@/api/errors";
import type { PacienteFormInput } from "@/domain/validation/paciente.validation";

export default function NuevoPacientePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { mutate: crearPaciente, isPending } = useCrearPaciente();

  // Si venimos desde el formulario de nota, devolver el paciente creado — Req 11.8
  const origenNota = (location.state as { origenNota?: boolean } | null)?.origenNota;

  const handleSubmit = (data: PacienteFormInput) => {
    setErrorMsg(null);

    const nuevoPaciente = {
      id: "",
      historiaMedica: data.historiaMedica,
      tipoDocumento: data.tipoDocumento,
      numeroIdentificacion: data.numeroIdentificacion,
      nombre: data.nombre,
      genero: data.genero,
      fechaNacimiento: new Date(data.fechaNacimiento),
      telefono: data.telefono,
      direccion: data.direccion,
      eliminado: false,
    };

    crearPaciente(nuevoPaciente, {
      onSuccess: (pacienteCreado) => {
        if (origenNota) {
          // Requisito 11.8: retornar al formulario de nota con el paciente seleccionado
          navigate(-1);
          // El estado se pasa para que el formulario de nota lo reciba
          navigate("/notas/nuevo", {
            state: { pacienteSeleccionado: pacienteCreado },
            replace: true,
          });
        } else {
          navigate(`/pacientes/${pacienteCreado.id}`);
        }
      },
      onError: (err) => {
        if (isApiError(err)) {
          if (err.status === 400) {
            // Requisito 11.6: historia médica duplicada
            setErrorMsg("Ya existe un paciente con esa historia médica.");
          } else if (err.status === 500) {
            // Requisito 11.7: posible identificación duplicada
            setErrorMsg(
              "No se pudo registrar el paciente. Es posible que el número de identificación ya esté en uso."
            );
          } else {
            setErrorMsg(err.body || "Error al registrar el paciente.");
          }
        } else {
          setErrorMsg("Error inesperado. Intenta de nuevo.");
        }
      },
    });
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-lg p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Registrar paciente nuevo</CardTitle>
          </CardHeader>
          <CardContent>
            <PacienteForm
              onSubmit={handleSubmit}
              isPending={isPending}
              errorMsg={errorMsg}
              submitLabel="Registrar paciente"
            />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
