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

-- Notas operatorias (30). Diagnósticos y procedimientos salen tal cual del
-- catálogo de seed.sql, y el resumen se arma con las técnicas por defecto de
-- cada procedimiento: es la misma composición que hará la pantalla.
-- Dos quedan en estado 'diferida' para que ese caso no se pruebe solo en teoría.
INSERT INTO "Nota_Operatoria" (dx_pre_operatorio, dx_post_operatorio, intervencion_realizada,
    fecha_comienzo, fecha_culminacion, hora_comienzo, hora_culminacion, resumen_intevencion,
    pabellon, es_electiva, es_emergencia, tuvo_biopsia, anestesia,
    id_paciente, id_medico_encargado, ojo, estado, eliminado) VALUES
  ('Epitelización de vía lagrimal', 'Epitelización de vía lagrimal', 'Recanalización de vías lagrimales',
   DATE '2025-08-09', DATE '2025-08-09', TIME '14:45:00', TIME '16:15:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, blefaróstato, se realiza lavado de superficie con iodopovidona al 10 % durante 3 minutos, se procede a dilatar puntos lagrimales superiores e inferiores con dilatador de vía lagrimal, se procede a permeabilizar vía lagrimal introduciendo sonda de Bowman N.° 2, se comprueba permeabilidad introduciendo cánula unida a inyectadora cargada con 5 cc de solución salina al 0,9 %, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 3', TRUE, FALSE, FALSE, 'Local',
   'a0000000-0000-4000-8000-000000000003', '422fcc07-fcf9-441f-9565-0d05516a54f3', 'AO', 'realizada', FALSE),
  ('Catarata', 'Catarata', 'Extracción extracapsular de catarata + implante de LIO',
   DATE '2025-08-19', DATE '2025-08-19', TIME '15:00:00', TIME '17:00:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, Tegaderm, blefaróstato, aclaramiento con solución Ringer lactato, se procede a realizar perilimbotomía superior en 180°, cauterización de vasos sangrantes, se delinea surco con cuchillete 15°, se profundiza con crescent, se abre puerto principal en H12, inyección de azul tripán con posterior aclaramiento, se inyecta viscoelástico en cámara anterior, capsulotomía anterior en abrelatas, extracción de núcleo con maniobra de presión contra presión, implante de LIO en saco capsular, remoción de restos cristalinianos con cánula de Simcoe, remoción de viscoelástico, se invaginan puntos, se inyecta miochol, se administra antibiótico subconjuntival, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 1', TRUE, FALSE, FALSE, 'Local',
   'a0000000-0000-4000-8000-000000000009', '6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7', 'OD', 'realizada', FALSE),
  ('Catarata', 'Catarata', 'Extracción extracapsular de catarata + implante de LIO',
   DATE '2025-08-31', DATE '2025-08-31', TIME '08:45:00', TIME '10:15:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, Tegaderm, blefaróstato, aclaramiento con solución Ringer lactato, se procede a realizar perilimbotomía superior en 180°, cauterización de vasos sangrantes, se delinea surco con cuchillete 15°, se profundiza con crescent, se abre puerto principal en H12, inyección de azul tripán con posterior aclaramiento, se inyecta viscoelástico en cámara anterior, capsulotomía anterior en abrelatas, extracción de núcleo con maniobra de presión contra presión, implante de LIO en saco capsular, remoción de restos cristalinianos con cánula de Simcoe, remoción de viscoelástico, se invaginan puntos, se inyecta miochol, se administra antibiótico subconjuntival, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 2', TRUE, FALSE, FALSE, 'Local',
   'a0000000-0000-4000-8000-000000000007', '6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7', 'OD', 'realizada', FALSE),
  ('Prolapso uveal', 'Prolapso uveal', 'Reposición uveal + rafia corneoescleral',
   DATE '2025-09-05', DATE '2025-09-05', TIME '15:45:00', TIME '18:15:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, Tegaderm, blefaróstato, se profundiza con crescent, se inyecta viscoelástico en cámara anterior, reposición de úvea con espátula de iris, se invaginan puntos, se administra antibiótico subconjuntival, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 3', FALSE, TRUE, FALSE, 'Local',
   'a0000000-0000-4000-8000-000000000003', '422fcc07-fcf9-441f-9565-0d05516a54f3', 'OI', 'realizada', FALSE),
  ('Glaucoma primario de ángulo estrecho', 'Glaucoma primario de ángulo estrecho', 'Trabeculectomía',
   DATE '2025-09-13', DATE '2025-09-13', TIME '15:45:00', TIME '17:15:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, Tegaderm, blefaróstato, se procede a realizar lavado ocular con iodopovidona al 2 %, posterior lavado con 80 cc de solución Ringer, aclaramiento con solución Ringer lactato, cauterización de vasos sangrantes, se divulsiona conjuntiva en base de fórnix, tenectomía, esclerotomía con cuchillete 15° en charnela cuadrada, se profundiza con crescent, se administra mitomicina tópica durante 3 minutos, se procede a aperturar puertos laterales H3 y H9, se realiza iridectomía en H12, iridotomía con pinza punch de Kelly, asepsia final, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 2', TRUE, FALSE, FALSE, 'Local',
   'a0000000-0000-4000-8000-000000000007', '422fcc07-fcf9-441f-9565-0d05516a54f3', 'OD', 'realizada', FALSE),
  ('Catarata', 'Catarata', 'Extracción extracapsular de catarata + implante de LIO',
   DATE '2025-09-17', DATE '2025-09-17', TIME '07:15:00', TIME '09:45:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, Tegaderm, blefaróstato, aclaramiento con solución Ringer lactato, se procede a realizar perilimbotomía superior en 180°, cauterización de vasos sangrantes, se delinea surco con cuchillete 15°, se profundiza con crescent, se abre puerto principal en H12, inyección de azul tripán con posterior aclaramiento, se inyecta viscoelástico en cámara anterior, capsulotomía anterior en abrelatas, extracción de núcleo con maniobra de presión contra presión, implante de LIO en saco capsular, remoción de restos cristalinianos con cánula de Simcoe, remoción de viscoelástico, se invaginan puntos, se inyecta miochol, se administra antibiótico subconjuntival, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 3', TRUE, FALSE, FALSE, 'Local',
   'a0000000-0000-4000-8000-000000000006', '422fcc07-fcf9-441f-9565-0d05516a54f3', 'OI', 'realizada', FALSE),
  ('Glaucoma primario de ángulo estrecho', 'Glaucoma primario de ángulo estrecho', 'Trabeculectomía',
   DATE '2025-09-26', DATE '2025-09-26', TIME '10:30:00', TIME '13:00:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, Tegaderm, blefaróstato, se procede a realizar lavado ocular con iodopovidona al 2 %, posterior lavado con 80 cc de solución Ringer, aclaramiento con solución Ringer lactato, cauterización de vasos sangrantes, se divulsiona conjuntiva en base de fórnix, tenectomía, esclerotomía con cuchillete 15° en charnela cuadrada, se profundiza con crescent, se administra mitomicina tópica durante 3 minutos, se procede a aperturar puertos laterales H3 y H9, se realiza iridectomía en H12, iridotomía con pinza punch de Kelly, asepsia final, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 2', TRUE, FALSE, FALSE, 'Local',
   'a0000000-0000-4000-8000-000000000002', '257991b4-2438-45a4-8008-cbff46c5debd', 'OI', 'realizada', FALSE),
  ('Catarata', 'Catarata', 'Extracción extracapsular de catarata + implante de LIO',
   DATE '2025-10-07', DATE '2025-10-07', TIME '14:00:00', TIME '15:15:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, Tegaderm, blefaróstato, aclaramiento con solución Ringer lactato, se procede a realizar perilimbotomía superior en 180°, cauterización de vasos sangrantes, se delinea surco con cuchillete 15°, se profundiza con crescent, se abre puerto principal en H12, inyección de azul tripán con posterior aclaramiento, se inyecta viscoelástico en cámara anterior, capsulotomía anterior en abrelatas, extracción de núcleo con maniobra de presión contra presión, implante de LIO en saco capsular, remoción de restos cristalinianos con cánula de Simcoe, remoción de viscoelástico, se invaginan puntos, se inyecta miochol, se administra antibiótico subconjuntival, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 2', TRUE, FALSE, FALSE, 'Local',
   'a0000000-0000-4000-8000-000000000004', '6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7', 'OI', 'realizada', FALSE),
  ('Catarata', 'Catarata', 'Extracción extracapsular de catarata + implante de LIO',
   DATE '2025-10-18', DATE '2025-10-18', TIME '11:45:00', TIME '12:45:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, Tegaderm, blefaróstato, aclaramiento con solución Ringer lactato, se procede a realizar perilimbotomía superior en 180°, cauterización de vasos sangrantes, se delinea surco con cuchillete 15°, se profundiza con crescent, se abre puerto principal en H12, inyección de azul tripán con posterior aclaramiento, se inyecta viscoelástico en cámara anterior, capsulotomía anterior en abrelatas, extracción de núcleo con maniobra de presión contra presión, implante de LIO en saco capsular, remoción de restos cristalinianos con cánula de Simcoe, remoción de viscoelástico, se invaginan puntos, se inyecta miochol, se administra antibiótico subconjuntival, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 3', TRUE, FALSE, FALSE, 'Local',
   'a0000000-0000-4000-8000-000000000009', '422fcc07-fcf9-441f-9565-0d05516a54f3', 'OI', 'realizada', FALSE),
  ('Catarata', 'Catarata', 'Extracción extracapsular de catarata + implante de LIO',
   DATE '2025-10-23', DATE '2025-10-23', TIME '11:45:00', TIME '13:00:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, Tegaderm, blefaróstato, aclaramiento con solución Ringer lactato, se procede a realizar perilimbotomía superior en 180°, cauterización de vasos sangrantes, se delinea surco con cuchillete 15°, se profundiza con crescent, se abre puerto principal en H12, inyección de azul tripán con posterior aclaramiento, se inyecta viscoelástico en cámara anterior, capsulotomía anterior en abrelatas, extracción de núcleo con maniobra de presión contra presión, implante de LIO en saco capsular, remoción de restos cristalinianos con cánula de Simcoe, remoción de viscoelástico, se invaginan puntos, se inyecta miochol, se administra antibiótico subconjuntival, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 1', TRUE, FALSE, FALSE, 'Local',
   'a0000000-0000-4000-8000-000000000005', '257991b4-2438-45a4-8008-cbff46c5debd', 'OD', 'realizada', FALSE),
  ('Glaucoma primario de ángulo estrecho', 'Glaucoma primario de ángulo estrecho', 'Trabeculectomía',
   DATE '2025-11-02', DATE '2025-11-02', TIME '09:45:00', TIME '10:30:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, Tegaderm, blefaróstato, se procede a realizar lavado ocular con iodopovidona al 2 %, posterior lavado con 80 cc de solución Ringer, aclaramiento con solución Ringer lactato, cauterización de vasos sangrantes, se divulsiona conjuntiva en base de fórnix, tenectomía, esclerotomía con cuchillete 15° en charnela cuadrada, se profundiza con crescent, se administra mitomicina tópica durante 3 minutos, se procede a aperturar puertos laterales H3 y H9, se realiza iridectomía en H12, iridotomía con pinza punch de Kelly, asepsia final, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 1', TRUE, FALSE, FALSE, 'Local',
   'a0000000-0000-4000-8000-000000000002', '422fcc07-fcf9-441f-9565-0d05516a54f3', 'OD', 'realizada', FALSE),
  ('Chalazión palpebral', 'Chalazión palpebral', 'Drenaje de chalazión',
   DATE '2025-11-14', DATE '2025-11-14', TIME '08:15:00', TIME '09:15:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, se procede a realizar colocación y fijación de pinza de chalazión delimitando el área de lesión, se realiza incisión vertical de 1 mm en región subtarsal, se realiza limpieza del área con cureta de chalazión, se coloca dexametasona subconjuntival, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 3', TRUE, FALSE, TRUE, 'Local',
   'a0000000-0000-4000-8000-000000000002', '6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7', 'OD', 'diferida', FALSE),
  ('Pterigión temporal grado II', 'Pterigión temporal grado II', 'Exéresis de pterigión',
   DATE '2025-11-26', DATE '2025-11-26', TIME '11:30:00', TIME '12:30:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, blefaróstato, se realiza lavado de superficie con iodopovidona al 10 % durante 3 minutos, se infiltra 0.3 cc de lidocaína subconjuntival, queratoplastia de cabeza de pterigión, se realiza fijación de plastia mediante 7 puntos separados de nylon 10-0, tenectomía, verificación de hemostasia, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 2', TRUE, FALSE, TRUE, 'Local',
   'a0000000-0000-4000-8000-000000000010', '257991b4-2438-45a4-8008-cbff46c5debd', 'OD', 'realizada', FALSE),
  ('Pterigión nasal grado II', 'Pterigión nasal grado II', 'Exéresis de pterigión',
   DATE '2025-12-07', DATE '2025-12-07', TIME '09:15:00', TIME '10:45:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, blefaróstato, se realiza lavado de superficie con iodopovidona al 10 % durante 3 minutos, se infiltra 0.3 cc de lidocaína subconjuntival, queratoplastia de cabeza de pterigión, se realiza fijación de plastia mediante 7 puntos separados de nylon 10-0, tenectomía, verificación de hemostasia, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 3', TRUE, FALSE, TRUE, 'Local',
   'a0000000-0000-4000-8000-000000000001', '257991b4-2438-45a4-8008-cbff46c5debd', 'OD', 'realizada', FALSE),
  ('Catarata', 'Catarata', 'Extracción extracapsular de catarata + implante de LIO',
   DATE '2025-12-19', DATE '2025-12-19', TIME '11:00:00', TIME '12:30:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, Tegaderm, blefaróstato, aclaramiento con solución Ringer lactato, se procede a realizar perilimbotomía superior en 180°, cauterización de vasos sangrantes, se delinea surco con cuchillete 15°, se profundiza con crescent, se abre puerto principal en H12, inyección de azul tripán con posterior aclaramiento, se inyecta viscoelástico en cámara anterior, capsulotomía anterior en abrelatas, extracción de núcleo con maniobra de presión contra presión, implante de LIO en saco capsular, remoción de restos cristalinianos con cánula de Simcoe, remoción de viscoelástico, se invaginan puntos, se inyecta miochol, se administra antibiótico subconjuntival, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 1', TRUE, FALSE, FALSE, 'Local',
   'a0000000-0000-4000-8000-000000000005', '257991b4-2438-45a4-8008-cbff46c5debd', 'OD', 'realizada', FALSE),
  ('Endotropía infantil', 'Endotropía infantil', 'Retroceso del recto medio',
   DATE '2025-12-27', DATE '2025-12-27', TIME '14:45:00', TIME '15:45:00',
   'Bajo anestesia general, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, Tegaderm, blefaróstato, se realiza lavado de superficie con iodopovidona al 10 % durante 3 minutos, se procede a fijar globo ocular en H12 y H6 con sutura seda 4-0, se realiza bolsillo conjuntival, se procede a realizar incisiones relajantes, se corta músculo sobrante con tijera Westcott, para realización de sutura flotante, se coloca dexametasona subconjuntival, se realiza sutura epiescleral de fijación muscular, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 2', TRUE, FALSE, FALSE, 'General',
   'a0000000-0000-4000-8000-000000000005', '6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7', 'OD', 'realizada', FALSE),
  ('Catarata madura', 'Catarata madura', 'Extracción extracapsular de catarata + implante de LIO',
   DATE '2026-01-01', DATE '2026-01-01', TIME '14:00:00', TIME '14:45:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, Tegaderm, blefaróstato, aclaramiento con solución Ringer lactato, se procede a realizar perilimbotomía superior en 180°, cauterización de vasos sangrantes, se delinea surco con cuchillete 15°, se profundiza con crescent, se abre puerto principal en H12, inyección de azul tripán con posterior aclaramiento, se inyecta viscoelástico en cámara anterior, capsulotomía anterior en abrelatas, extracción de núcleo con maniobra de presión contra presión, implante de LIO en saco capsular, remoción de restos cristalinianos con cánula de Simcoe, remoción de viscoelástico, se invaginan puntos, se inyecta miochol, se administra antibiótico subconjuntival, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 3', TRUE, FALSE, FALSE, 'Local',
   'a0000000-0000-4000-8000-000000000006', '422fcc07-fcf9-441f-9565-0d05516a54f3', 'OI', 'realizada', FALSE),
  ('Glaucoma congénito', 'Glaucoma congénito', 'Trabeculectomía',
   DATE '2026-01-05', DATE '2026-01-05', TIME '07:45:00', TIME '09:00:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, Tegaderm, blefaróstato, se procede a realizar lavado ocular con iodopovidona al 2 %, posterior lavado con 80 cc de solución Ringer, aclaramiento con solución Ringer lactato, cauterización de vasos sangrantes, se divulsiona conjuntiva en base de fórnix, tenectomía, esclerotomía con cuchillete 15° en charnela cuadrada, se profundiza con crescent, se administra mitomicina tópica durante 3 minutos, se procede a aperturar puertos laterales H3 y H9, se realiza iridectomía en H12, iridotomía con pinza punch de Kelly, asepsia final, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 2', TRUE, FALSE, FALSE, 'Local',
   'a0000000-0000-4000-8000-000000000006', '422fcc07-fcf9-441f-9565-0d05516a54f3', 'OI', 'realizada', FALSE),
  ('Glaucoma crónico', 'Glaucoma crónico', 'Trabeculectomía',
   DATE '2026-01-10', DATE '2026-01-10', TIME '15:45:00', TIME '17:45:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, Tegaderm, blefaróstato, se procede a realizar lavado ocular con iodopovidona al 2 %, posterior lavado con 80 cc de solución Ringer, aclaramiento con solución Ringer lactato, cauterización de vasos sangrantes, se divulsiona conjuntiva en base de fórnix, tenectomía, esclerotomía con cuchillete 15° en charnela cuadrada, se profundiza con crescent, se administra mitomicina tópica durante 3 minutos, se procede a aperturar puertos laterales H3 y H9, se realiza iridectomía en H12, iridotomía con pinza punch de Kelly, asepsia final, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 1', TRUE, FALSE, FALSE, 'Local',
   'a0000000-0000-4000-8000-000000000009', '257991b4-2438-45a4-8008-cbff46c5debd', 'OD', 'realizada', FALSE),
  ('Pterigión nasal grado II', 'Pterigión nasal grado II', 'Exéresis de pterigión',
   DATE '2026-01-22', DATE '2026-01-22', TIME '10:45:00', TIME '12:45:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, blefaróstato, se realiza lavado de superficie con iodopovidona al 10 % durante 3 minutos, se infiltra 0.3 cc de lidocaína subconjuntival, queratoplastia de cabeza de pterigión, se realiza fijación de plastia mediante 7 puntos separados de nylon 10-0, tenectomía, verificación de hemostasia, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 2', TRUE, FALSE, TRUE, 'Local',
   'a0000000-0000-4000-8000-000000000004', '257991b4-2438-45a4-8008-cbff46c5debd', 'OI', 'realizada', FALSE),
  ('Catarata', 'Catarata', 'Facoemulsificación + implante de LIO',
   DATE '2026-01-29', DATE '2026-01-29', TIME '08:45:00', TIME '09:30:00',
   'Bajo anestesia tópica, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, Tegaderm, blefaróstato, se procede a aperturar puertos laterales H3 y H9, inyección de azul tripán con posterior aclaramiento, se inyecta viscoelástico en cámara anterior, se abre puerto principal en H12, capsulorrexis circular continua, hidrodisección, facoemulsificación bajo técnica de stop and chop, remoción de viscoelástico, se hidratan puertos laterales, se inyecta miochol, se administra antibiótico subconjuntival, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 3', TRUE, FALSE, FALSE, 'Tópica',
   'a0000000-0000-4000-8000-000000000008', '6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7', 'OD', 'realizada', FALSE),
  ('Catarata', 'Catarata', 'Extracción extracapsular de catarata + implante de LIO',
   DATE '2026-02-02', DATE '2026-02-02', TIME '07:45:00', TIME '10:15:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, Tegaderm, blefaróstato, aclaramiento con solución Ringer lactato, se procede a realizar perilimbotomía superior en 180°, cauterización de vasos sangrantes, se delinea surco con cuchillete 15°, se profundiza con crescent, se abre puerto principal en H12, inyección de azul tripán con posterior aclaramiento, se inyecta viscoelástico en cámara anterior, capsulotomía anterior en abrelatas, extracción de núcleo con maniobra de presión contra presión, implante de LIO en saco capsular, remoción de restos cristalinianos con cánula de Simcoe, remoción de viscoelástico, se invaginan puntos, se inyecta miochol, se administra antibiótico subconjuntival, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 2', TRUE, FALSE, FALSE, 'Local',
   'a0000000-0000-4000-8000-000000000003', '257991b4-2438-45a4-8008-cbff46c5debd', 'OD', 'realizada', FALSE),
  ('Pterigión nasal grado II', 'Pterigión nasal grado II', 'Exéresis de pterigión',
   DATE '2026-02-06', DATE '2026-02-06', TIME '09:15:00', TIME '11:15:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, blefaróstato, se realiza lavado de superficie con iodopovidona al 10 % durante 3 minutos, se infiltra 0.3 cc de lidocaína subconjuntival, queratoplastia de cabeza de pterigión, se realiza fijación de plastia mediante 7 puntos separados de nylon 10-0, tenectomía, verificación de hemostasia, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 1', TRUE, FALSE, TRUE, 'Local',
   'a0000000-0000-4000-8000-000000000010', '257991b4-2438-45a4-8008-cbff46c5debd', 'OD', 'realizada', FALSE),
  ('Glaucoma crónico', 'Glaucoma crónico', 'Trabeculectomía',
   DATE '2026-02-12', DATE '2026-02-12', TIME '14:30:00', TIME '16:00:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, Tegaderm, blefaróstato, se procede a realizar lavado ocular con iodopovidona al 2 %, posterior lavado con 80 cc de solución Ringer, aclaramiento con solución Ringer lactato, cauterización de vasos sangrantes, se divulsiona conjuntiva en base de fórnix, tenectomía, esclerotomía con cuchillete 15° en charnela cuadrada, se profundiza con crescent, se administra mitomicina tópica durante 3 minutos, se procede a aperturar puertos laterales H3 y H9, se realiza iridectomía en H12, iridotomía con pinza punch de Kelly, asepsia final, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 1', TRUE, FALSE, FALSE, 'Local',
   'a0000000-0000-4000-8000-000000000008', '422fcc07-fcf9-441f-9565-0d05516a54f3', 'OI', 'realizada', FALSE),
  ('Endotropía infantil', 'Endotropía infantil', 'Retroceso del recto medio',
   DATE '2026-02-20', DATE '2026-02-20', TIME '09:30:00', TIME '10:30:00',
   'Bajo anestesia general, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, Tegaderm, blefaróstato, se realiza lavado de superficie con iodopovidona al 10 % durante 3 minutos, se procede a fijar globo ocular en H12 y H6 con sutura seda 4-0, se realiza bolsillo conjuntival, se procede a realizar incisiones relajantes, se corta músculo sobrante con tijera Westcott, para realización de sutura flotante, se coloca dexametasona subconjuntival, se realiza sutura epiescleral de fijación muscular, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 2', TRUE, FALSE, FALSE, 'General',
   'a0000000-0000-4000-8000-000000000010', '422fcc07-fcf9-441f-9565-0d05516a54f3', 'OI', 'diferida', FALSE),
  ('Glaucoma primario de ángulo estrecho', 'Glaucoma primario de ángulo estrecho', 'Trabeculectomía',
   DATE '2026-03-02', DATE '2026-03-02', TIME '11:45:00', TIME '12:45:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, Tegaderm, blefaróstato, se procede a realizar lavado ocular con iodopovidona al 2 %, posterior lavado con 80 cc de solución Ringer, aclaramiento con solución Ringer lactato, cauterización de vasos sangrantes, se divulsiona conjuntiva en base de fórnix, tenectomía, esclerotomía con cuchillete 15° en charnela cuadrada, se profundiza con crescent, se administra mitomicina tópica durante 3 minutos, se procede a aperturar puertos laterales H3 y H9, se realiza iridectomía en H12, iridotomía con pinza punch de Kelly, asepsia final, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 3', TRUE, FALSE, FALSE, 'Local',
   'a0000000-0000-4000-8000-000000000001', '422fcc07-fcf9-441f-9565-0d05516a54f3', 'OI', 'realizada', FALSE),
  ('Epitelización de vía lagrimal', 'Epitelización de vía lagrimal', 'Recanalización de vías lagrimales',
   DATE '2026-03-13', DATE '2026-03-13', TIME '08:30:00', TIME '09:15:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, blefaróstato, se realiza lavado de superficie con iodopovidona al 10 % durante 3 minutos, se procede a dilatar puntos lagrimales superiores e inferiores con dilatador de vía lagrimal, se procede a permeabilizar vía lagrimal introduciendo sonda de Bowman N.° 2, se comprueba permeabilidad introduciendo cánula unida a inyectadora cargada con 5 cc de solución salina al 0,9 %, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 1', TRUE, FALSE, FALSE, 'Local',
   'a0000000-0000-4000-8000-000000000008', '6c6f6076-16d3-4bcd-a1c5-73cf6191c6d7', 'AO', 'realizada', FALSE),
  ('Traumatismo ocular abierto penetrante', 'Traumatismo ocular abierto penetrante', 'Exploración quirúrgica',
   DATE '2026-03-17', DATE '2026-03-17', TIME '08:45:00', TIME '11:15:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, Tegaderm, blefaróstato, se realiza lavado de superficie con iodopovidona al 10 % durante 3 minutos, aclaramiento con solución Ringer lactato, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 2', FALSE, TRUE, FALSE, 'Local',
   'a0000000-0000-4000-8000-000000000007', '257991b4-2438-45a4-8008-cbff46c5debd', 'OI', 'realizada', FALSE),
  ('Catarata', 'Catarata', 'Facoemulsificación + implante de LIO',
   DATE '2026-03-23', DATE '2026-03-23', TIME '07:30:00', TIME '08:30:00',
   'Bajo anestesia tópica, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, Tegaderm, blefaróstato, se procede a aperturar puertos laterales H3 y H9, inyección de azul tripán con posterior aclaramiento, se inyecta viscoelástico en cámara anterior, se abre puerto principal en H12, capsulorrexis circular continua, hidrodisección, facoemulsificación bajo técnica de stop and chop, remoción de viscoelástico, se hidratan puertos laterales, se inyecta miochol, se administra antibiótico subconjuntival, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 3', TRUE, FALSE, FALSE, 'Tópica',
   'a0000000-0000-4000-8000-000000000001', '257991b4-2438-45a4-8008-cbff46c5debd', 'OI', 'realizada', FALSE),
  ('Catarata madura', 'Catarata madura', 'Extracción extracapsular de catarata + implante de LIO',
   DATE '2026-04-04', DATE '2026-04-04', TIME '10:00:00', TIME '12:00:00',
   'Bajo anestesia local, previa asepsia y antisepsia del área operatoria, colocación de campos quirúrgicos estériles, Tegaderm, blefaróstato, aclaramiento con solución Ringer lactato, se procede a realizar perilimbotomía superior en 180°, cauterización de vasos sangrantes, se delinea surco con cuchillete 15°, se profundiza con crescent, se abre puerto principal en H12, inyección de azul tripán con posterior aclaramiento, se inyecta viscoelástico en cámara anterior, capsulotomía anterior en abrelatas, extracción de núcleo con maniobra de presión contra presión, implante de LIO en saco capsular, remoción de restos cristalinianos con cánula de Simcoe, remoción de viscoelástico, se invaginan puntos, se inyecta miochol, se administra antibiótico subconjuntival, antibiótico tópico, parchado ocular, acto culminado sin complicaciones.',
   'Pabellón 3', TRUE, FALSE, FALSE, 'Local',
   'a0000000-0000-4000-8000-000000000004', '257991b4-2438-45a4-8008-cbff46c5debd', 'OI', 'realizada', FALSE);

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

-- Los catálogos clínicos (diagnósticos, procedimientos y técnicas) ya no se
-- siembran aquí: son datos reales del servicio y viven en seed.sql.

END;
