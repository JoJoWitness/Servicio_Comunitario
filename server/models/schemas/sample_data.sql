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
INSERT INTO usuarios (id, correo, nombres, apellidos, rol, contrasena, eliminado) VALUES
  ('41297e8a-5864-4dc5-bfa7-c51c6a0a8bea', 'ryuk@test.com', 'Ryuk', 'El Perro', 'admin', '$2b$10$1T0U4IdHgZ908kD3ICHFkOL0c2jWhO/CKD49HkVu5pPYl8SskQ9oi', FALSE),
  ('6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7', 'roma@test.com', 'Roma', 'Romita', 'medico', '$2b$10$28A2AIf7ibQfL9np612frO.9wJ3x/ZTZaIavfOcXfUqGfVoPWLibS', FALSE),
  ('422fcc07-fcf9-441f-9565-0d05516a54f3', 'oso@test.com', 'Oso', 'De la UNET', 'medico', '$2b$10$ayoo5FMkiYxJPKq5u0ZCOu8N73ZmyMKiFdL3Zg4DW0I97nmROhxEu', FALSE),
  ('257991b4-2438-45a4-8008-cbff46c5debd', 'lobo@test.com', 'Lobo', 'CPU', 'medico', '$2b$10$UKIFi6z0JBNS1owUnrZEXulp.54Mga69InvmotYOFDjtDyuPlIM9W', FALSE),
  ('3e61b05e-ff66-485b-86a6-3b8143f0bce8', 'canela@test.com', 'Canela', 'Cenelita', 'secretaria', '$2b$10$V.rq5a58TdXbihdvuryVZ.BuOPZTMxC9lct7e8zd10hZP7z0fH9VW', FALSE);

-- Admin (ryuk) --
INSERT INTO admins (user_id, route_id, created_at, role) VALUES
  ('41297e8a-5864-4dc5-bfa7-c51c6a0a8bea', NULL, NOW(), 'admin');

-- Pacientes (todos residentes en San Cristóbal, Táchira) --
INSERT INTO pacientes (historia_medica, numero_identificacion, tipo_documento, nombre, genero, fecha_nacimiento, telefono, direccion, eliminado) VALUES
  ('HC-2025001', 'V-5.412.778', 'V', 'Blanquito', 'M', DATE '1958-03-12', '0276-6272824', 'Av. 7ma con Calle 6, San Cristóbal, Táchira', FALSE),
  ('HC-2025002', 'V-9.845.201', 'V', 'Peluso', 'M', DATE '1971-07-24', '0276-3125506', 'Barrio Obrero, Carrera 21, San Cristóbal, Táchira', FALSE),
  ('HC-2025003', 'V-14.552.930', 'V', 'Gata', 'F', DATE '1985-11-02', '0276-4254657', 'Urb. Pirineos II, Vereda 4, San Cristóbal, Táchira', FALSE),
  ('HC-2025004', 'V-18.221.640', 'V', 'Frida', 'F', DATE '1990-01-19', '0276-3712679', 'La Concordia, Calle 10, San Cristóbal, Táchira', FALSE),
  ('HC-2025005', 'V-6.998.115', 'V', 'Mimi', 'F', DATE '1963-09-30', '0276-6469935', 'Av. Libertador, Res. El Samán, San Cristóbal, Táchira', FALSE),
  ('HC-2025006', 'V-25.803.472', 'V', 'Mia', 'F', DATE '2001-05-14', '0276-3447912', 'Sector Las Lomas, Casa 34, San Cristóbal, Táchira', FALSE),
  ('HC-2025007', 'V-3.774.559', 'V', 'Pelusa', 'F', DATE '1948-12-08', '0276-3161488', 'Av. Ferrero Tamayo, Edif. Tibisay, San Cristóbal, Táchira', FALSE),
  ('HC-2025008', 'V-12.660.084', 'V', 'Campana', 'F', DATE '1979-06-21', '0276-3474582', 'Pueblo Nuevo, Calle Principal, San Cristóbal, Táchira', FALSE),
  ('HC-2025009', 'V-20.117.365', 'V', 'Tom', 'M', DATE '1995-02-27', '0276-4199279', 'Santa Teresa, Carrera 3, San Cristóbal, Táchira', FALSE),
  ('HC-2025010', 'V-4.902.688', 'V', 'Principe', 'M', DATE '1955-10-16', '0276-6081434', 'Av. España, Qta. Los Pinos, San Cristóbal, Táchira', FALSE);

-- Notas operatorias (30) - reparto ALEATORIO por paciente (minimo 1 c/u) --
INSERT INTO notas (dx_pre_operatorio, dx_post_operatorio, intervencion_realizada, fecha_comienzo, fecha_culminacion, hora_comienzo, hora_culminacion, resumen_intervencion, pabellon, es_electiva, es_emergencia, tuvo_biopsia, anestia, id_paciente, medico_encargado, eliminado) VALUES
  ('Retinopatía diabética', 'Retinopatía diabética', 'Panfotocoagulación + inyección intravítrea', DATE '2025-08-16', DATE '2025-08-16', TIMESTAMPTZ '2025-08-16 09:15:00-04', TIMESTAMPTZ '2025-08-16 11:00:00-04', 'Fotocoagulación panretiniana e inyección intravítrea de antiangiogénico.', 'Pabellón 3', TRUE, FALSE, FALSE, 'Tópica', 9, '6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7', FALSE),
  ('Glaucoma de ángulo abierto', 'Glaucoma de ángulo abierto', 'Trabeculectomía', DATE '2025-08-23', DATE '2025-08-23', TIMESTAMPTZ '2025-08-23 14:45:00-04', TIMESTAMPTZ '2025-08-23 17:30:00-04', 'Trabeculectomía con mitomicina C para control de presión intraocular.', 'Pabellón 3', TRUE, FALSE, FALSE, 'Peribulbar', 3, '257991b4-2438-45a4-8008-cbff46c5debd', FALSE),
  ('Catarata cortical', 'Catarata cortical', 'Facoemulsificación + LIO', DATE '2025-08-13', DATE '2025-08-13', TIMESTAMPTZ '2025-08-13 11:45:00-04', TIMESTAMPTZ '2025-08-13 14:45:00-04', 'Facoemulsificación bimanual con implante de LIO monofocal.', 'Pabellón 2', TRUE, FALSE, FALSE, 'Tópica', 10, '6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7', FALSE),
  ('Retinopatía diabética', 'Retinopatía diabética', 'Panfotocoagulación + inyección intravítrea', DATE '2025-09-27', DATE '2025-09-27', TIMESTAMPTZ '2025-09-27 11:00:00-04', TIMESTAMPTZ '2025-09-27 12:15:00-04', 'Fotocoagulación panretiniana e inyección intravítrea de antiangiogénico.', 'Pabellón 3', TRUE, FALSE, FALSE, 'Tópica', 9, '257991b4-2438-45a4-8008-cbff46c5debd', FALSE),
  ('Catarata cortical', 'Catarata cortical', 'Facoemulsificación + LIO', DATE '2025-09-20', DATE '2025-09-20', TIMESTAMPTZ '2025-09-20 14:45:00-04', TIMESTAMPTZ '2025-09-20 17:30:00-04', 'Facoemulsificación bimanual con implante de LIO monofocal.', 'Pabellón 2', TRUE, FALSE, FALSE, 'Tópica', 10, '6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7', FALSE),
  ('Catarata cortical', 'Catarata cortical', 'Facoemulsificación + LIO', DATE '2025-09-23', DATE '2025-09-23', TIMESTAMPTZ '2025-09-23 14:45:00-04', TIMESTAMPTZ '2025-09-23 16:45:00-04', 'Facoemulsificación bimanual con implante de LIO monofocal.', 'Pabellón 1', TRUE, FALSE, FALSE, 'Tópica', 10, '257991b4-2438-45a4-8008-cbff46c5debd', FALSE),
  ('Pterigión nasal', 'Pterigión nasal', 'Escisión de pterigión + autoinjerto conjuntival', DATE '2025-10-27', DATE '2025-10-27', TIMESTAMPTZ '2025-10-27 11:45:00-04', TIMESTAMPTZ '2025-10-27 13:00:00-04', 'Escisión de pterigión con autoinjerto conjuntival fijado con pegamento de fibrina.', 'Pabellón 2', TRUE, FALSE, TRUE, 'Local', 2, '6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7', FALSE),
  ('Pterigión nasal', 'Pterigión nasal', 'Escisión de pterigión + autoinjerto conjuntival', DATE '2025-10-23', DATE '2025-10-23', TIMESTAMPTZ '2025-10-23 15:45:00-04', TIMESTAMPTZ '2025-10-23 17:15:00-04', 'Escisión de pterigión con autoinjerto conjuntival fijado con pegamento de fibrina.', 'Pabellón 2', TRUE, FALSE, TRUE, 'Local', 2, '422fcc07-fcf9-441f-9565-0d05516a54f3', FALSE),
  ('Desprendimiento de retina', 'Desprendimiento de retina', 'Vitrectomía pars plana', DATE '2025-10-27', DATE '2025-10-27', TIMESTAMPTZ '2025-10-27 14:30:00-04', TIMESTAMPTZ '2025-10-27 15:45:00-04', 'Vitrectomía posterior con endoláser y taponamiento con gas.', 'Pabellón 2', TRUE, FALSE, FALSE, 'Retrobulbar', 6, '257991b4-2438-45a4-8008-cbff46c5debd', FALSE),
  ('Catarata cortical', 'Catarata cortical', 'Facoemulsificación + LIO', DATE '2025-11-04', DATE '2025-11-04', TIMESTAMPTZ '2025-11-04 10:45:00-04', TIMESTAMPTZ '2025-11-04 13:15:00-04', 'Facoemulsificación bimanual con implante de LIO monofocal.', 'Pabellón 1', TRUE, FALSE, FALSE, 'Tópica', 10, '257991b4-2438-45a4-8008-cbff46c5debd', FALSE),
  ('Pterigión nasal', 'Pterigión nasal', 'Escisión de pterigión + autoinjerto conjuntival', DATE '2025-11-03', DATE '2025-11-03', TIMESTAMPTZ '2025-11-03 07:00:00-04', TIMESTAMPTZ '2025-11-03 09:15:00-04', 'Escisión de pterigión con autoinjerto conjuntival fijado con pegamento de fibrina.', 'Pabellón 1', TRUE, FALSE, TRUE, 'Local', 2, '6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7', FALSE),
  ('Catarata senil', 'Catarata senil', 'Facoemulsificación + LIO', DATE '2025-11-04', DATE '2025-11-04', TIMESTAMPTZ '2025-11-04 07:30:00-04', TIMESTAMPTZ '2025-11-04 10:30:00-04', 'Facoemulsificación con implante de lente intraocular plegable en saco capsular.', 'Pabellón 1', TRUE, FALSE, FALSE, 'Tópica', 1, '257991b4-2438-45a4-8008-cbff46c5debd', FALSE),
  ('Retinopatía diabética', 'Retinopatía diabética', 'Panfotocoagulación + inyección intravítrea', DATE '2025-12-01', DATE '2025-12-01', TIMESTAMPTZ '2025-12-01 12:45:00-04', TIMESTAMPTZ '2025-12-01 15:15:00-04', 'Fotocoagulación panretiniana e inyección intravítrea de antiangiogénico.', 'Pabellón 3', TRUE, FALSE, FALSE, 'Tópica', 9, '257991b4-2438-45a4-8008-cbff46c5debd', FALSE),
  ('Queratocono', 'Queratocono', 'Crosslinking corneal', DATE '2025-12-08', DATE '2025-12-08', TIMESTAMPTZ '2025-12-08 14:15:00-04', TIMESTAMPTZ '2025-12-08 17:30:00-04', 'Crosslinking corneal con riboflavina y luz UVA.', 'Pabellón 1', TRUE, FALSE, FALSE, 'Tópica', 8, '257991b4-2438-45a4-8008-cbff46c5debd', FALSE),
  ('Queratocono', 'Queratocono', 'Crosslinking corneal', DATE '2025-12-14', DATE '2025-12-14', TIMESTAMPTZ '2025-12-14 09:30:00-04', TIMESTAMPTZ '2025-12-14 10:45:00-04', 'Crosslinking corneal con riboflavina y luz UVA.', 'Pabellón 2', TRUE, FALSE, FALSE, 'Tópica', 8, '422fcc07-fcf9-441f-9565-0d05516a54f3', FALSE),
  ('Retinopatía diabética', 'Retinopatía diabética', 'Panfotocoagulación + inyección intravítrea', DATE '2026-01-26', DATE '2026-01-26', TIMESTAMPTZ '2026-01-26 09:15:00-04', TIMESTAMPTZ '2026-01-26 12:45:00-04', 'Fotocoagulación panretiniana e inyección intravítrea de antiangiogénico.', 'Pabellón 1', TRUE, FALSE, FALSE, 'Tópica', 9, '257991b4-2438-45a4-8008-cbff46c5debd', FALSE),
  ('Queratocono', 'Queratocono', 'Crosslinking corneal', DATE '2026-01-04', DATE '2026-01-04', TIMESTAMPTZ '2026-01-04 13:00:00-04', TIMESTAMPTZ '2026-01-04 14:30:00-04', 'Crosslinking corneal con riboflavina y luz UVA.', 'Pabellón 3', TRUE, FALSE, FALSE, 'Tópica', 8, '422fcc07-fcf9-441f-9565-0d05516a54f3', FALSE),
  ('Estrabismo', 'Estrabismo', 'Retroceso de recto medio', DATE '2026-01-12', DATE '2026-01-12', TIMESTAMPTZ '2026-01-12 07:45:00-04', TIMESTAMPTZ '2026-01-12 08:30:00-04', 'Cirugía de músculos extraoculares, retroceso del recto medio bilateral.', 'Pabellón 3', TRUE, FALSE, FALSE, 'General', 5, '6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7', FALSE),
  ('Chalazión palpebral', 'Chalazión palpebral', 'Drenaje y curetaje de chalazión', DATE '2026-02-10', DATE '2026-02-10', TIMESTAMPTZ '2026-02-10 14:00:00-04', TIMESTAMPTZ '2026-02-10 16:45:00-04', 'Incisión, drenaje y curetaje de chalazión por vía tarsal.', 'Pabellón 2', TRUE, FALSE, TRUE, 'Local', 4, '6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7', FALSE),
  ('Desprendimiento de retina', 'Desprendimiento de retina', 'Vitrectomía pars plana', DATE '2026-02-19', DATE '2026-02-19', TIMESTAMPTZ '2026-02-19 09:15:00-04', TIMESTAMPTZ '2026-02-19 10:45:00-04', 'Vitrectomía posterior con endoláser y taponamiento con gas.', 'Pabellón 3', TRUE, FALSE, FALSE, 'Retrobulbar', 6, '422fcc07-fcf9-441f-9565-0d05516a54f3', FALSE),
  ('Pterigión nasal', 'Pterigión nasal', 'Escisión de pterigión + autoinjerto conjuntival', DATE '2026-02-11', DATE '2026-02-11', TIMESTAMPTZ '2026-02-11 14:15:00-04', TIMESTAMPTZ '2026-02-11 17:00:00-04', 'Escisión de pterigión con autoinjerto conjuntival fijado con pegamento de fibrina.', 'Pabellón 3', TRUE, FALSE, TRUE, 'Local', 2, '6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7', FALSE),
  ('Chalazión palpebral', 'Chalazión palpebral', 'Drenaje y curetaje de chalazión', DATE '2026-03-13', DATE '2026-03-13', TIMESTAMPTZ '2026-03-13 07:15:00-04', TIMESTAMPTZ '2026-03-13 08:00:00-04', 'Incisión, drenaje y curetaje de chalazión por vía tarsal.', 'Pabellón 3', TRUE, FALSE, TRUE, 'Local', 4, '257991b4-2438-45a4-8008-cbff46c5debd', FALSE),
  ('Catarata cortical', 'Catarata cortical', 'Facoemulsificación + LIO', DATE '2026-03-18', DATE '2026-03-18', TIMESTAMPTZ '2026-03-18 07:15:00-04', TIMESTAMPTZ '2026-03-18 09:45:00-04', 'Facoemulsificación bimanual con implante de LIO monofocal.', 'Pabellón 1', TRUE, FALSE, FALSE, 'Tópica', 10, '422fcc07-fcf9-441f-9565-0d05516a54f3', FALSE),
  ('Obstrucción lagrimal', 'Obstrucción lagrimal', 'Dacriocistorrinostomía', DATE '2026-03-05', DATE '2026-03-05', TIMESTAMPTZ '2026-03-05 15:15:00-04', TIMESTAMPTZ '2026-03-05 16:15:00-04', 'Dacriocistorrinostomía externa con intubación de silicona.', 'Pabellón 3', TRUE, FALSE, FALSE, 'General', 7, '422fcc07-fcf9-441f-9565-0d05516a54f3', FALSE),
  ('Retinopatía diabética', 'Retinopatía diabética', 'Panfotocoagulación + inyección intravítrea', DATE '2026-04-06', DATE '2026-04-06', TIMESTAMPTZ '2026-04-06 13:45:00-04', TIMESTAMPTZ '2026-04-06 15:45:00-04', 'Fotocoagulación panretiniana e inyección intravítrea de antiangiogénico.', 'Pabellón 1', TRUE, FALSE, FALSE, 'Tópica', 9, '422fcc07-fcf9-441f-9565-0d05516a54f3', FALSE),
  ('Catarata senil', 'Catarata senil', 'Facoemulsificación + LIO', DATE '2026-04-13', DATE '2026-04-13', TIMESTAMPTZ '2026-04-13 11:30:00-04', TIMESTAMPTZ '2026-04-13 12:15:00-04', 'Facoemulsificación con implante de lente intraocular plegable en saco capsular.', 'Pabellón 2', TRUE, FALSE, FALSE, 'Tópica', 1, '257991b4-2438-45a4-8008-cbff46c5debd', FALSE),
  ('Obstrucción lagrimal', 'Obstrucción lagrimal', 'Dacriocistorrinostomía', DATE '2026-04-15', DATE '2026-04-15', TIMESTAMPTZ '2026-04-15 14:30:00-04', TIMESTAMPTZ '2026-04-15 16:45:00-04', 'Dacriocistorrinostomía externa con intubación de silicona.', 'Pabellón 1', TRUE, FALSE, FALSE, 'General', 7, '257991b4-2438-45a4-8008-cbff46c5debd', FALSE),
  ('Pterigión nasal', 'Pterigión nasal', 'Escisión de pterigión + autoinjerto conjuntival', DATE '2026-05-11', DATE '2026-05-11', TIMESTAMPTZ '2026-05-11 15:45:00-04', TIMESTAMPTZ '2026-05-11 17:00:00-04', 'Escisión de pterigión con autoinjerto conjuntival fijado con pegamento de fibrina.', 'Pabellón 3', TRUE, FALSE, TRUE, 'Local', 2, '257991b4-2438-45a4-8008-cbff46c5debd', FALSE),
  ('Catarata cortical', 'Catarata cortical', 'Facoemulsificación + LIO', DATE '2026-05-26', DATE '2026-05-26', TIMESTAMPTZ '2026-05-26 15:00:00-04', TIMESTAMPTZ '2026-05-26 17:15:00-04', 'Facoemulsificación bimanual con implante de LIO monofocal.', 'Pabellón 1', FALSE, TRUE, FALSE, 'Tópica', 10, '422fcc07-fcf9-441f-9565-0d05516a54f3', FALSE),
  ('Chalazión palpebral', 'Chalazión palpebral', 'Drenaje y curetaje de chalazión', DATE '2026-05-15', DATE '2026-05-15', TIMESTAMPTZ '2026-05-15 12:15:00-04', TIMESTAMPTZ '2026-05-15 14:00:00-04', 'Incisión, drenaje y curetaje de chalazión por vía tarsal.', 'Pabellón 2', TRUE, FALSE, TRUE, 'Local', 4, '257991b4-2438-45a4-8008-cbff46c5debd', FALSE);

-- Equipo quirúrgico: médico encargado de cada nota + Lobo como ayudante en pares --
DO $$
DECLARE r RECORD; lobo_id UUID := '257991b4-2438-45a4-8008-cbff46c5debd';
BEGIN
  FOR r IN SELECT id, medico_encargado FROM notas ORDER BY id LOOP
    INSERT INTO equipo_quirurgico (id_nota, id_usuario) VALUES (r.id, r.medico_encargado);
    IF r.medico_encargado <> lobo_id AND (r.id % 2 = 0) THEN
      INSERT INTO equipo_quirurgico (id_nota, id_usuario) VALUES (r.id, lobo_id);
    END IF;
  END LOOP;
END $$;

END;
