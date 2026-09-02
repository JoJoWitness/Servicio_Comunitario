/**
 * Tejidos que el servicio manda a anatomía patológica, ordenados por
 * frecuencia. Es una lista de sugerencias, no un catálogo: el campo admite
 * texto libre (PRD 0.5.0, D4).
 */
export const TEJIDOS_BIOPSIA: string[] = [
  "Pterigión",
  "Pterigión recidivante",
  "Lesión conjuntival",
  "Lesión palpebral",
  "Chalazión",
  "Papiloma",
  "Nevus",
  "Carcinoma basocelular (sospecha)",
  "Carcinoma escamocelular (sospecha)",
  "Quiste dermoide",
  "Tumor orbitario",
  "Córnea (botón corneal)",
  "Iris",
  "Cristalino",
  "Glándula lagrimal",
  "Saco lagrimal",
  "Otro",
];

/** Laboratorios habituales, como sugerencia. */
export const LABORATORIOS_BIOPSIA: string[] = [
  "Anatomía Patológica HCSC",
  "Laboratorio externo",
];
