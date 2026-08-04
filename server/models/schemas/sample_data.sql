BEGIN;

-- ============================================================
--  MOCK DATA - Servicio de Oftalmología
--  Hospital Central de San Cristóbal, Táchira - Venezuela
--  Contraseñas (texto plano) -> hash bcrypt guardado:
--    ryuk   / ryuk2026    (admin)
--    roma   / roma2026    (medico)
--    oso    / oso2026     (medico)
--    lobo   / lobo2026    (medico PRINCIPAL)
--    canela / canela2026  (secretaria)
-- ============================================================

-- Usuarios --
INSERT INTO "Usuarios" (id, correo, nombres, apellidos, rol, contrasena, eliminado) VALUES
  ('41297e8a-5864-4dc5-bfa7-c51c6a0a8bea', 'ryuk@test.com', 'Ryuk', 'El Perro', 'admin', '$2b$10$1T0U4IdHgZ908kD3ICHFkOL0c2jWhO/CKD49HkVu5pPYl8SskQ9oi', FALSE),
  ('6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7', 'roma@test.com', 'Roma', 'Romita', 'medico', '$2b$10$28A2AIf7ibQfL9np612frO.9wJ3x/ZTZaIavfOcXfUqGfVoPWLibS', FALSE),
  ('422fcc07-fcf9-441f-9565-0d05516a54f3', 'oso@test.com', 'Oso', 'De la UNET', 'medico', '$2b$10$ayoo5FMkiYxJPKq5u0ZCOu8N73ZmyMKiFdL3Zg4DW0I97nmROhxEu', FALSE),
  ('257991b4-2438-45a4-8008-cbff46c5debd', 'lobo@test.com', 'Lobo', 'CPU', 'medico', '$2b$10$UKIFi6z0JBNS1owUnrZEXulp.54Mga69InvmotYOFDjtDyuPlIM9W', FALSE),
  ('3e61b05e-ff66-485b-86a6-3b8143f0bce8', 'canela@test.com', 'Canela', 'Cenelita', 'secretaria', '$2b$10$V.rq5a58TdXbihdvuryVZ.BuOPZTMxC9lct7e8zd10hZP7z0fH9VW', FALSE);

-- Pacientes (todos residentes en San Cristóbal, Táchira) --
INSERT INTO "Paciente" (id, historia_medica, numero_identifiacion, tipo_documento, nombre, genero, fecha_nacimiento, numero_telefono, direccion, eliminado) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'HC-2025001', 'V-5.412.778', 'V', 'Blanquito', 'M', DATE '1958-03-12', '0276-6272824', 'Av. 7ma con Calle 6, San Cristóbal, Táchira', FALSE),
  ('a0000000-0000-4000-8000-000000000002', 'HC-2025002', 'V-9.845.201', 'V', 'Peluso', 'M', DATE '1971-07-24', '0276-3125506', 'Barrio Obrero, Carrera 21, San Cristóbal, Táchira', FALSE),
  ('a0000000-0000-4000-8000-000000000003', 'HC-2025003', 'V-14.552.930', 'V', 'Gata', 'F', DATE '1985-11-02', '0276-4254657', 'Urb. Pirineos II, Vereda 4, San Cristóbal, Táchira', FALSE),
  ('a0000000-0000-4000-8000-000000000004', 'HC-2025004', 'V-18.221.640', 'V', 'Frida', 'F', DATE '1990-01-19', '0276-3712679', 'La Concordia, Calle 10, San Cristóbal, Táchira', FALSE),
  ('a0000000-0000-4000-8000-000000000005', 'HC-2025005', 'V-6.998.115', 'V', 'Mimi', 'F', DATE '1963-09-30', '0276-6469935', 'Av. Libertador, Res. El Samán, San Cristóbal, Táchira', FALSE),
  ('a0000000-0000-4000-8000-000000000006', 'HC-2025006', 'V-25.803.472', 'V', 'Mia', 'F', DATE '2001-05-14', '0276-3447912', 'Sector Las Lomas, Casa 34, San Cristóbal, Táchira', FALSE),
  ('a0000000-0000-4000-8000-000000000007', 'HC-2025007', 'V-3.774.559', 'V', 'Pelusa', 'F', DATE '1948-12-08', '0276-3161488', 'Av. Ferrero Tamayo, Edif. Tibisay, San Cristóbal, Táchira', FALSE),
  ('a0000000-0000-4000-8000-000000000008', 'HC-2025008', 'V-12.660.084', 'V', 'Campana', 'F', DATE '1979-06-21', '0276-3474582', 'Pueblo Nuevo, Calle Principal, San Cristóbal, Táchira', FALSE),
  ('a0000000-0000-4000-8000-000000000009', 'HC-2025009', 'V-20.117.365', 'V', 'Tom', 'M', DATE '1995-02-27', '0276-4199279', 'Santa Teresa, Carrera 3, San Cristóbal, Táchira', FALSE),
  ('a0000000-0000-4000-8000-000000000010', 'HC-2025010', 'V-4.902.688', 'V', 'Principe', 'M', DATE '1955-10-16', '0276-6081434', 'Av. España, Qta. Los Pinos, San Cristóbal, Táchira', FALSE);

-- Notas operatorias (30) - reparto ALEATORIO por paciente (minimo 1 c/u) --
INSERT INTO "Nota_Operatoria" (dx_pre_operatorio, dx_post_operatorio, intervencion_realizada, fecha_comienzo, fecha_culminacion, hora_comienzo, hora_culminacion, resumen_intevencion, pabellon, es_electiva, es_emergencia, tuvo_biopsia, anestesia, id_paciente, id_medico_encargado, eliminado) VALUES
  ('Retinopatía diabética', 'Retinopatía diabética', 'Panfotocoagulación + inyección intravítrea', DATE '2025-08-16', DATE '2025-08-16', TIME '09:15:00', TIME '11:00:00', 'Fotocoagulación panretiniana e inyección intravítrea de antiangiogénico.', 'Pabellón 3', TRUE, FALSE, FALSE, 'Tópica', 'a0000000-0000-4000-8000-000000000009', '6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7', FALSE),
  ('Glaucoma de ángulo abierto', 'Glaucoma de ángulo abierto', 'Trabeculectomía', DATE '2025-08-23', DATE '2025-08-23', TIME '14:45:00', TIME '17:30:00', 'Trabeculectomía con mitomicina C para control de presión intraocular.', 'Pabellón 3', TRUE, FALSE, FALSE, 'Peribulbar', 'a0000000-0000-4000-8000-000000000003', '257991b4-2438-45a4-8008-cbff46c5debd', FALSE),
  ('Catarata cortical', 'Catarata cortical', 'Facoemulsificación + LIO', DATE '2025-08-13', DATE '2025-08-13', TIME '11:45:00', TIME '14:45:00', 'Facoemulsificación bimanual con implante de LIO monofocal.', 'Pabellón 2', TRUE, FALSE, FALSE, 'Tópica', 'a0000000-0000-4000-8000-000000000010', '6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7', FALSE),
  ('Retinopatía diabética', 'Retinopatía diabética', 'Panfotocoagulación + inyección intravítrea', DATE '2025-09-27', DATE '2025-09-27', TIME '11:00:00', TIME '12:15:00', 'Fotocoagulación panretiniana e inyección intravítrea de antiangiogénico.', 'Pabellón 3', TRUE, FALSE, FALSE, 'Tópica', 'a0000000-0000-4000-8000-000000000009', '257991b4-2438-45a4-8008-cbff46c5debd', FALSE),
  ('Catarata cortical', 'Catarata cortical', 'Facoemulsificación + LIO', DATE '2025-09-20', DATE '2025-09-20', TIME '14:45:00', TIME '17:30:00', 'Facoemulsificación bimanual con implante de LIO monofocal.', 'Pabellón 2', TRUE, FALSE, FALSE, 'Tópica', 'a0000000-0000-4000-8000-000000000010', '6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7', FALSE),
  ('Catarata cortical', 'Catarata cortical', 'Facoemulsificación + LIO', DATE '2025-09-23', DATE '2025-09-23', TIME '14:45:00', TIME '16:45:00', 'Facoemulsificación bimanual con implante de LIO monofocal.', 'Pabellón 1', TRUE, FALSE, FALSE, 'Tópica', 'a0000000-0000-4000-8000-000000000010', '257991b4-2438-45a4-8008-cbff46c5debd', FALSE),
  ('Pterigión nasal', 'Pterigión nasal', 'Escisión de pterigión + autoinjerto conjuntival', DATE '2025-10-27', DATE '2025-10-27', TIME '11:45:00', TIME '13:00:00', 'Escisión de pterigión con autoinjerto conjuntival fijado con pegamento de fibrina.', 'Pabellón 2', TRUE, FALSE, TRUE, 'Local', 'a0000000-0000-4000-8000-000000000002', '6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7', FALSE),
  ('Pterigión nasal', 'Pterigión nasal', 'Escisión de pterigión + autoinjerto conjuntival', DATE '2025-10-23', DATE '2025-10-23', TIME '15:45:00', TIME '17:15:00', 'Escisión de pterigión con autoinjerto conjuntival fijado con pegamento de fibrina.', 'Pabellón 2', TRUE, FALSE, TRUE, 'Local', 'a0000000-0000-4000-8000-000000000002', '422fcc07-fcf9-441f-9565-0d05516a54f3', FALSE),
  ('Desprendimiento de retina', 'Desprendimiento de retina', 'Vitrectomía pars plana', DATE '2025-10-27', DATE '2025-10-27', TIME '14:30:00', TIME '15:45:00', 'Vitrectomía posterior con endoláser y taponamiento con gas.', 'Pabellón 2', TRUE, FALSE, FALSE, 'Retrobulbar', 'a0000000-0000-4000-8000-000000000006', '257991b4-2438-45a4-8008-cbff46c5debd', FALSE),
  ('Catarata cortical', 'Catarata cortical', 'Facoemulsificación + LIO', DATE '2025-11-04', DATE '2025-11-04', TIME '10:45:00', TIME '13:15:00', 'Facoemulsificación bimanual con implante de LIO monofocal.', 'Pabellón 1', TRUE, FALSE, FALSE, 'Tópica', 'a0000000-0000-4000-8000-000000000010', '257991b4-2438-45a4-8008-cbff46c5debd', FALSE),
  ('Pterigión nasal', 'Pterigión nasal', 'Escisión de pterigión + autoinjerto conjuntival', DATE '2025-11-03', DATE '2025-11-03', TIME '07:00:00', TIME '09:15:00', 'Escisión de pterigión con autoinjerto conjuntival fijado con pegamento de fibrina.', 'Pabellón 1', TRUE, FALSE, TRUE, 'Local', 'a0000000-0000-4000-8000-000000000002', '6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7', FALSE),
  ('Catarata senil', 'Catarata senil', 'Facoemulsificación + LIO', DATE '2025-11-04', DATE '2025-11-04', TIME '07:30:00', TIME '10:30:00', 'Facoemulsificación con implante de lente intraocular plegable en saco capsular.', 'Pabellón 1', TRUE, FALSE, FALSE, 'Tópica', 'a0000000-0000-4000-8000-000000000001', '257991b4-2438-45a4-8008-cbff46c5debd', FALSE),
  ('Retinopatía diabética', 'Retinopatía diabética', 'Panfotocoagulación + inyección intravítrea', DATE '2025-12-01', DATE '2025-12-01', TIME '12:45:00', TIME '15:15:00', 'Fotocoagulación panretiniana e inyección intravítrea de antiangiogénico.', 'Pabellón 3', TRUE, FALSE, FALSE, 'Tópica', 'a0000000-0000-4000-8000-000000000009', '257991b4-2438-45a4-8008-cbff46c5debd', FALSE),
  ('Queratocono', 'Queratocono', 'Crosslinking corneal', DATE '2025-12-08', DATE '2025-12-08', TIME '14:15:00', TIME '17:30:00', 'Crosslinking corneal con riboflavina y luz UVA.', 'Pabellón 1', TRUE, FALSE, FALSE, 'Tópica', 'a0000000-0000-4000-8000-000000000008', '257991b4-2438-45a4-8008-cbff46c5debd', FALSE),
  ('Queratocono', 'Queratocono', 'Crosslinking corneal', DATE '2025-12-14', DATE '2025-12-14', TIME '09:30:00', TIME '10:45:00', 'Crosslinking corneal con riboflavina y luz UVA.', 'Pabellón 2', TRUE, FALSE, FALSE, 'Tópica', 'a0000000-0000-4000-8000-000000000008', '422fcc07-fcf9-441f-9565-0d05516a54f3', FALSE),
  ('Retinopatía diabética', 'Retinopatía diabética', 'Panfotocoagulación + inyección intravítrea', DATE '2026-01-26', DATE '2026-01-26', TIME '09:15:00', TIME '12:45:00', 'Fotocoagulación panretiniana e inyección intravítrea de antiangiogénico.', 'Pabellón 1', TRUE, FALSE, FALSE, 'Tópica', 'a0000000-0000-4000-8000-000000000009', '257991b4-2438-45a4-8008-cbff46c5debd', FALSE),
  ('Queratocono', 'Queratocono', 'Crosslinking corneal', DATE '2026-01-04', DATE '2026-01-04', TIME '13:00:00', TIME '14:30:00', 'Crosslinking corneal con riboflavina y luz UVA.', 'Pabellón 3', TRUE, FALSE, FALSE, 'Tópica', 'a0000000-0000-4000-8000-000000000008', '422fcc07-fcf9-441f-9565-0d05516a54f3', FALSE),
  ('Estrabismo', 'Estrabismo', 'Retroceso de recto medio', DATE '2026-01-12', DATE '2026-01-12', TIME '07:45:00', TIME '08:30:00', 'Cirugía de músculos extraoculares, retroceso del recto medio bilateral.', 'Pabellón 3', TRUE, FALSE, FALSE, 'General', 'a0000000-0000-4000-8000-000000000005', '6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7', FALSE),
  ('Chalazión palpebral', 'Chalazión palpebral', 'Drenaje y curetaje de chalazión', DATE '2026-02-10', DATE '2026-02-10', TIME '14:00:00', TIME '16:45:00', 'Incisión, drenaje y curetaje de chalazión por vía tarsal.', 'Pabellón 2', TRUE, FALSE, TRUE, 'Local', 'a0000000-0000-4000-8000-000000000004', '6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7', FALSE),
  ('Desprendimiento de retina', 'Desprendimiento de retina', 'Vitrectomía pars plana', DATE '2026-02-19', DATE '2026-02-19', TIME '09:15:00', TIME '10:45:00', 'Vitrectomía posterior con endoláser y taponamiento con gas.', 'Pabellón 3', TRUE, FALSE, FALSE, 'Retrobulbar', 'a0000000-0000-4000-8000-000000000006', '422fcc07-fcf9-441f-9565-0d05516a54f3', FALSE),
  ('Pterigión nasal', 'Pterigión nasal', 'Escisión de pterigión + autoinjerto conjuntival', DATE '2026-02-11', DATE '2026-02-11', TIME '14:15:00', TIME '17:00:00', 'Escisión de pterigión con autoinjerto conjuntival fijado con pegamento de fibrina.', 'Pabellón 3', TRUE, FALSE, TRUE, 'Local', 'a0000000-0000-4000-8000-000000000002', '6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7', FALSE),
  ('Chalazión palpebral', 'Chalazión palpebral', 'Drenaje y curetaje de chalazión', DATE '2026-03-13', DATE '2026-03-13', TIME '07:15:00', TIME '08:00:00', 'Incisión, drenaje y curetaje de chalazión por vía tarsal.', 'Pabellón 3', TRUE, FALSE, TRUE, 'Local', 'a0000000-0000-4000-8000-000000000004', '257991b4-2438-45a4-8008-cbff46c5debd', FALSE),
  ('Catarata cortical', 'Catarata cortical', 'Facoemulsificación + LIO', DATE '2026-03-18', DATE '2026-03-18', TIME '07:15:00', TIME '09:45:00', 'Facoemulsificación bimanual con implante de LIO monofocal.', 'Pabellón 1', TRUE, FALSE, FALSE, 'Tópica', 'a0000000-0000-4000-8000-000000000010', '422fcc07-fcf9-441f-9565-0d05516a54f3', FALSE),
  ('Obstrucción lagrimal', 'Obstrucción lagrimal', 'Dacriocistorrinostomía', DATE '2026-03-05', DATE '2026-03-05', TIME '15:15:00', TIME '16:15:00', 'Dacriocistorrinostomía externa con intubación de silicona.', 'Pabellón 3', TRUE, FALSE, FALSE, 'General', 'a0000000-0000-4000-8000-000000000007', '422fcc07-fcf9-441f-9565-0d05516a54f3', FALSE),
  ('Retinopatía diabética', 'Retinopatía diabética', 'Panfotocoagulación + inyección intravítrea', DATE '2026-04-06', DATE '2026-04-06', TIME '13:45:00', TIME '15:45:00', 'Fotocoagulación panretiniana e inyección intravítrea de antiangiogénico.', 'Pabellón 1', TRUE, FALSE, FALSE, 'Tópica', 'a0000000-0000-4000-8000-000000000009', '422fcc07-fcf9-441f-9565-0d05516a54f3', FALSE),
  ('Catarata senil', 'Catarata senil', 'Facoemulsificación + LIO', DATE '2026-04-13', DATE '2026-04-13', TIME '11:30:00', TIME '12:15:00', 'Facoemulsificación con implante de lente intraocular plegable en saco capsular.', 'Pabellón 2', TRUE, FALSE, FALSE, 'Tópica', 'a0000000-0000-4000-8000-000000000001', '257991b4-2438-45a4-8008-cbff46c5debd', FALSE),
  ('Obstrucción lagrimal', 'Obstrucción lagrimal', 'Dacriocistorrinostomía', DATE '2026-04-15', DATE '2026-04-15', TIME '14:30:00', TIME '16:45:00', 'Dacriocistorrinostomía externa con intubación de silicona.', 'Pabellón 1', TRUE, FALSE, FALSE, 'General', 'a0000000-0000-4000-8000-000000000007', '257991b4-2438-45a4-8008-cbff46c5debd', FALSE),
  ('Pterigión nasal', 'Pterigión nasal', 'Escisión de pterigión + autoinjerto conjuntival', DATE '2026-05-11', DATE '2026-05-11', TIME '15:45:00', TIME '17:00:00', 'Escisión de pterigión con autoinjerto conjuntival fijado con pegamento de fibrina.', 'Pabellón 3', TRUE, FALSE, TRUE, 'Local', 'a0000000-0000-4000-8000-000000000002', '257991b4-2438-45a4-8008-cbff46c5debd', FALSE),
  ('Catarata cortical', 'Catarata cortical', 'Facoemulsificación + LIO', DATE '2026-05-26', DATE '2026-05-26', TIME '15:00:00', TIME '17:15:00', 'Facoemulsificación bimanual con implante de LIO monofocal.', 'Pabellón 1', FALSE, TRUE, FALSE, 'Tópica', 'a0000000-0000-4000-8000-000000000010', '422fcc07-fcf9-441f-9565-0d05516a54f3', FALSE),
  ('Chalazión palpebral', 'Chalazión palpebral', 'Drenaje y curetaje de chalazión', DATE '2026-05-15', DATE '2026-05-15', TIME '12:15:00', TIME '14:00:00', 'Incisión, drenaje y curetaje de chalazión por vía tarsal.', 'Pabellón 2', TRUE, FALSE, TRUE, 'Local', 'a0000000-0000-4000-8000-000000000004', '257991b4-2438-45a4-8008-cbff46c5debd', FALSE);

-- Equipo quirúrgico: médico encargado de cada nota + Lobo como ayudante en pares --
DO $$
DECLARE r RECORD; lobo_id UUID := '257991b4-2438-45a4-8008-cbff46c5debd';
BEGIN
  FOR r IN SELECT id, id_medico_encargado FROM "Nota_Operatoria" ORDER BY id LOOP
    INSERT INTO "Equipo_Quirurgico" (id_nota_operatoria, id_medico, rol) VALUES (r.id, r.id_medico_encargado, 'cirujano');
    IF r.id_medico_encargado <> lobo_id AND (r.id % 2 = 0) THEN
      INSERT INTO "Equipo_Quirurgico" (id_nota_operatoria, id_medico, rol) VALUES (r.id, lobo_id, 'ayudante');
    END IF;
  END LOOP;
END $$;

-- Catálogos (HU-19): alimentan el autocompletado de la nota --
INSERT INTO "Diagnosticos" (procedimientos, resumen) VALUES
  ('Catarata senil', 'Opacificación del cristalino asociada a la edad.'),
  ('Catarata cortical', 'Opacidad en la corteza del cristalino.'),
  ('Glaucoma de ángulo abierto', 'Neuropatía óptica con presión intraocular elevada.'),
  ('Retinopatía diabética', 'Microangiopatía retiniana secundaria a diabetes.'),
  ('Pterigión nasal', 'Crecimiento fibrovascular conjuntival sobre la córnea.'),
  ('Desprendimiento de retina', 'Separación de la retina neurosensorial del epitelio pigmentario.'),
  ('Queratocono', 'Ectasia corneal progresiva.'),
  ('Chalazión palpebral', 'Inflamación granulomatosa de la glándula de Meibomio.'),
  ('Obstrucción lagrimal', 'Obstrucción de la vía lagrimal excretora.'),
  ('Estrabismo', 'Desalineación de los ejes visuales.');

INSERT INTO "Procedimientos" (intervencion, resumen) VALUES
  ('Facoemulsificación + LIO', 'Extracción del cristalino por ultrasonido con implante de lente intraocular.'),
  ('Trabeculectomía', 'Creación de una vía de drenaje para reducir la presión intraocular.'),
  ('Panfotocoagulación + inyección intravítrea', 'Fotocoagulación panretiniana con antiangiogénico intravítreo.'),
  ('Escisión de pterigión + autoinjerto conjuntival', 'Resección del pterigión con autoinjerto de conjuntiva.'),
  ('Vitrectomía pars plana', 'Extracción del vítreo por vía pars plana.'),
  ('Crosslinking corneal', 'Refuerzo del colágeno corneal con riboflavina y luz UVA.'),
  ('Drenaje y curetaje de chalazión', 'Incisión, drenaje y curetaje por vía tarsal.'),
  ('Dacriocistorrinostomía', 'Comunicación entre el saco lagrimal y la fosa nasal.'),
  ('Retroceso de recto medio', 'Debilitamiento del músculo recto medio.');

INSERT INTO "Intervencion" (tecnica) VALUES
  ('Facoemulsificación bimanual'),
  ('Trabeculectomía con mitomicina C'),
  ('Autoinjerto con pegamento de fibrina'),
  ('Endoláser con taponamiento de gas'),
  ('Sutura continua'),
  ('Sutura discontinua'),
  ('Intubación de silicona');

END;
