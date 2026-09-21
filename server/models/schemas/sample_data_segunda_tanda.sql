-- Segunda tanda de datos de ejemplo (v0.5.0) para una base que ya tiene
-- cargado sample_data.sql hasta la primera tanda de 3 biopsias.
-- Se puede ejecutar más de una vez: si las tres notas ya existen, no hace nada.
BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Nota_Operatoria"
             WHERE intervencion_realizada = 'Drenaje de chalazión'
               AND fecha_comienzo = DATE '2026-05-15') THEN
    RAISE EXCEPTION 'La segunda tanda ya está cargada' USING ERRCODE = 'unique_violation';
  END IF;
END $$;

-- Tres notas más con biopsia (v0.5.0), para ver el ciclo completo en pantalla.
-- Cada una recibe su biopsia en el bloque "Biopsias de muestra (segunda tanda)".
INSERT INTO "Nota_Operatoria" (dx_pre_operatorio, dx_post_operatorio, intervencion_realizada,
    fecha_comienzo, fecha_culminacion, hora_comienzo, hora_culminacion, resumen_intevencion,
    pabellon, es_electiva, es_emergencia, tuvo_biopsia, anestesia,
    id_paciente, id_medico_encargado, ojo, estado, eliminado) VALUES
  ('Chalazión palpebral', 'Chalazión palpebral', 'Drenaje de chalazión',
   DATE '2026-05-15', DATE '2026-05-15', TIME '08:00:00', TIME '08:40:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, se procede a realizar colocación y fijación de pinza de chalazión delimitando el área de lesión, se realiza incisión vertical de 1 mm en región subtarsal, se realiza limpieza del área con cureta de chalazión, se coloca dexametasona subconjuntival, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 2', TRUE, FALSE, TRUE, 'Local',
   'a0000000-0000-4000-8000-000000000005', '6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7', 'OD', 'realizada', FALSE),
  ('Pterigión nasal grado III', 'Pterigión nasal grado III', 'Exéresis de pterigión',
   DATE '2026-06-10', DATE '2026-06-10', TIME '10:30:00', TIME '12:00:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, blefaróstato, se realiza lavado de superficie con iodopovidona al 10 % durante 3 minutos, se infiltra 0.3 cc de lidocaína subconjuntival, queratoplastia de cabeza de pterigión, se realiza fijación de plastia mediante 7 puntos separados de nylon 10-0, tenectomía, verificación de hemostasia, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 1', TRUE, FALSE, TRUE, 'Local',
   'a0000000-0000-4000-8000-000000000004', '422fcc07-fcf9-441f-9565-0d05516a54f3', 'OI', 'realizada', FALSE),
  ('Quiste sebáceo palpebral', 'Quiste sebáceo palpebral', 'Exéresis de quiste sebáceo palpebral',
   DATE '2026-08-27', DATE '2026-08-27', TIME '09:00:00', TIME '10:10:00',
   'Bajo anestesia general, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, cauterización de vasos sangrantes, asepsia final, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 3', TRUE, FALSE, TRUE, 'General',
   'a0000000-0000-4000-8000-000000000007', '257991b4-2438-45a4-8008-cbff46c5debd', 'OI', 'realizada', FALSE);

-- Equipo quirúrgico solo de las tres notas nuevas (las demás ya lo tienen).
INSERT INTO "Equipo_Quirurgico" (id_nota_operatoria, id_medico, rol)
SELECT n.id, n.id_medico_encargado, 'cirujano'
  FROM "Nota_Operatoria" n
 WHERE n.fecha_comienzo IN (DATE '2026-05-15', DATE '2026-06-10', DATE '2026-08-27')
   AND n.intervencion_realizada IN ('Drenaje de chalazión', 'Exéresis de pterigión', 'Exéresis de quiste sebáceo palpebral')
   AND NOT EXISTS (SELECT 1 FROM "Equipo_Quirurgico" e WHERE e.id_nota_operatoria = n.id);

-- Biopsias de muestra (segunda tanda): los casos que faltaban para ver el
-- ciclo entero. Se buscan por intervención y fecha, no por id.
DO $$
DECLARE
  n_chalazion RECORD;
  n_pterigion RECORD;
  n_previa    RECORD;
  n_quiste    RECORD;
  b_id INTEGER;
BEGIN
  SELECT id, id_paciente, id_medico_encargado, fecha_comienzo INTO n_chalazion
    FROM "Nota_Operatoria" WHERE intervencion_realizada = 'Drenaje de chalazión'
      AND fecha_comienzo = DATE '2026-05-15' AND eliminado = FALSE ORDER BY id LIMIT 1;
  SELECT id, id_paciente, id_medico_encargado, fecha_comienzo INTO n_pterigion
    FROM "Nota_Operatoria" WHERE intervencion_realizada = 'Exéresis de pterigión'
      AND fecha_comienzo = DATE '2026-06-10' AND eliminado = FALSE ORDER BY id LIMIT 1;
  SELECT id, id_paciente, id_medico_encargado, fecha_comienzo INTO n_quiste
    FROM "Nota_Operatoria" WHERE intervencion_realizada = 'Exéresis de quiste sebáceo palpebral'
      AND fecha_comienzo = DATE '2026-08-27' AND eliminado = FALSE ORDER BY id LIMIT 1;

  -- Entregada: el ciclo completo, resultado benigno ya en manos de la paciente.
  IF n_chalazion.id IS NOT NULL THEN
    INSERT INTO "Biopsia" (id_paciente, id_medico_responsable, ojo, tejido, descripcion_macroscopica,
        diagnostico_presuntivo, fecha_toma, laboratorio, fecha_envio, numero_patologia,
        resultado, fecha_resultado, fecha_entrega, observaciones, estado)
    VALUES (n_chalazion.id_paciente, n_chalazion.id_medico_encargado, 'OD', 'Chalazión',
        'Material caseoso y cápsula de párpado superior, 6 mm', 'Chalazión recidivante',
        n_chalazion.fecha_comienzo, 'Anatomía Patológica HCSC', n_chalazion.fecha_comienzo + 1,
        'AP-' || to_char(n_chalazion.fecha_comienzo, 'YYYY') || '-0731',
        'Inflamación granulomatosa lipogranulomatosa compatible con chalazión. Sin evidencia de malignidad.',
        n_chalazion.fecha_comienzo + 19, n_chalazion.fecha_comienzo + 26,
        'Informe entregado a la paciente en consulta de control.', 'entregada')
    RETURNING id INTO b_id;
    INSERT INTO "Nota_Biopsia" (id_nota_operatoria, id_biopsia, rol, vinculada_por)
      VALUES (n_chalazion.id, b_id, 'origen', n_chalazion.id_medico_encargado);
  END IF;

  -- Con resultado que cambia el manejo (neoplasia de superficie ocular). La
  -- muestra salió de la exéresis de enero de la misma paciente (nota ya
  -- existente, rol origen) y la exéresis de junio es la reintervención por
  -- márgenes comprometidos (rol seguimiento). La nota de junio queda con la
  -- casilla marcada y sin registro propio: muestra el aviso ámbar a propósito.
  IF n_pterigion.id IS NOT NULL THEN
    SELECT id, id_paciente, id_medico_encargado, fecha_comienzo INTO n_previa
      FROM "Nota_Operatoria" WHERE id_paciente = n_pterigion.id_paciente
        AND intervencion_realizada = 'Exéresis de pterigión' AND id <> n_pterigion.id
        AND fecha_comienzo < n_pterigion.fecha_comienzo AND eliminado = FALSE
      ORDER BY fecha_comienzo DESC LIMIT 1;
    IF n_previa.id IS NOT NULL THEN
      INSERT INTO "Biopsia" (id_paciente, id_medico_responsable, ojo, tejido, descripcion_macroscopica,
          diagnostico_presuntivo, fecha_toma, laboratorio, fecha_envio, numero_patologia,
          resultado, fecha_resultado, observaciones, estado)
      VALUES (n_previa.id_paciente, n_previa.id_medico_encargado, 'OI', 'Pterigión',
          'Tejido fibrovascular de 7 × 4 mm con zona leucoplásica en el borde nasal', 'Pterigión nasal',
          n_previa.fecha_comienzo, 'Anatomía Patológica HCSC', n_previa.fecha_comienzo + 1,
          'AP-' || to_char(n_previa.fecha_comienzo, 'YYYY') || '-0142',
          'Neoplasia escamosa de superficie ocular (OSSN) con displasia moderada. Borde nasal comprometido. Se sugiere ampliación de márgenes y control estrecho.',
          n_previa.fecha_comienzo + 22,
          'Reintervenida el ' || to_char(n_pterigion.fecha_comienzo, 'DD/MM/YYYY') || ' para ampliar márgenes.', 'con_resultado')
      RETURNING id INTO b_id;
      INSERT INTO "Nota_Biopsia" (id_nota_operatoria, id_biopsia, rol, vinculada_por)
        VALUES (n_previa.id, b_id, 'origen', n_previa.id_medico_encargado);
      UPDATE "Nota_Operatoria" SET tuvo_biopsia = TRUE WHERE id = n_previa.id;
      INSERT INTO "Nota_Biopsia" (id_nota_operatoria, id_biopsia, rol, vinculada_por)
        VALUES (n_pterigion.id, b_id, 'seguimiento', n_pterigion.id_medico_encargado);
    END IF;
  END IF;

  -- Enviada hace pocos días a un laboratorio externo, todavía sin número de
  -- patología: aparece en seguimiento pero no en las atrasadas.
  IF n_quiste.id IS NOT NULL THEN
    INSERT INTO "Biopsia" (id_paciente, id_medico_responsable, ojo, tejido, descripcion_macroscopica,
        diagnostico_presuntivo, fecha_toma, laboratorio, fecha_envio, estado)
    VALUES (n_quiste.id_paciente, n_quiste.id_medico_encargado, 'OI', 'Lesión palpebral',
        'Lesión nodular perlada de párpado inferior, 5 mm, con telangiectasias', 'Carcinoma basocelular (sospecha)',
        n_quiste.fecha_comienzo, 'Laboratorio externo', n_quiste.fecha_comienzo + 1, 'enviada')
    RETURNING id INTO b_id;
    INSERT INTO "Nota_Biopsia" (id_nota_operatoria, id_biopsia, rol, vinculada_por)
      VALUES (n_quiste.id, b_id, 'origen', n_quiste.id_medico_encargado);
  END IF;
END
$$;

COMMIT;
