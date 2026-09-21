-- Descriptores de la solicitud de biopsia y antecedentes del paciente para
-- los datos de prueba (v0.5.0). Es idempotente (solo UPDATE por tejido y
-- estado), así que se puede correr cuantas veces haga falta, también sobre
-- una base que ya tenía cargados los datos de prueba.
BEGIN;

UPDATE "Biopsia" SET
  tipo_biopsia = 'excisional', tipo_muestra = 'conjuntiva', ubicacion = '{}',
  bordes = 'definidos', color = '{salmon,homogenea}', tamano = 'otro', tamano_otro = '5 x 3 mm',
  altura = 'sobreelevada', cambios_asociados = '{telangiectasias}', tratamientos_previos = FALSE
WHERE tejido = 'Pterigión' AND estado = 'enviada' AND eliminado = FALSE;

UPDATE "Biopsia" SET
  tipo_biopsia = 'excisional', tipo_muestra = 'conjuntiva',
  bordes = 'definidos', color = '{hiperpigmentada,homogenea}', tamano = '2_5mm',
  altura = 'plana', tratamientos_previos = FALSE
WHERE tejido = 'Lesión conjuntival' AND eliminado = FALSE;

UPDATE "Biopsia" SET
  tipo_biopsia = 'incisional', tipo_muestra = 'parpado', ubicacion = '{inferior}',
  bordes = 'irregulares', color = '{nacarada}', tamano = '2_5mm', altura = 'sobreelevada',
  cambios_asociados = '{telangiectasias,queratosis}', tratamientos_previos = TRUE,
  tratamientos_previos_cual = 'Antibiótico tópico dos semanas, sin respuesta'
WHERE tejido = 'Lesión palpebral' AND estado = 'enviada' AND eliminado = FALSE;

UPDATE "Biopsia" SET
  tipo_biopsia = 'excisional', tipo_muestra = 'parpado', ubicacion = '{superior}',
  bordes = 'definidos', color = '{amarilla}', tamano = 'otro', tamano_otro = '6 mm',
  altura = 'sobreelevada', tratamientos_previos = TRUE,
  tratamientos_previos_cual = 'Compresas tibias y drenaje previo'
WHERE tejido = 'Chalazión' AND eliminado = FALSE;

UPDATE "Biopsia" SET
  tipo_biopsia = 'excisional', tipo_muestra = 'conjuntiva',
  bordes = 'irregulares', color = '{blanca,heterogenea}', color_otro = 'zona leucoplásica nasal',
  tamano = 'otro', tamano_otro = '7 x 4 mm', altura = 'sobreelevada',
  cambios_asociados = '{queratosis}', tratamientos_previos = FALSE
WHERE tejido = 'Pterigión' AND estado = 'con_resultado' AND eliminado = FALSE;

-- Antecedentes de la paciente reintervenida por OSSN y de la del chalazión.
UPDATE "Paciente" SET
  ocupacion = 'Agricultora', raza = 'Mestiza',
  antecedentes_oncologicos = 'Madre con carcinoma basocelular facial. Exposición solar prolongada.',
  estudios_imagenes = '{eco}', hallazgo_estudios = 'Ecografía ocular sin extensión intraocular.'
WHERE id = 'a0000000-0000-4000-8000-000000000004';

UPDATE "Paciente" SET
  ocupacion = 'Docente', raza = 'Mestiza'
WHERE id = 'a0000000-0000-4000-8000-000000000005';

COMMIT;
