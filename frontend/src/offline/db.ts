/**
 * Almacén local del trabajo sin conexión, sobre IndexedDB.
 *
 * ¿Por qué IndexedDB y no localStorage, que ya se usa para la sesión y los
 * borradores? Por tamaño y por seguridad de escritura. Aquí no se guarda una
 * preferencia: se guardan notas operatorias que todavía no existen en ningún
 * otro lado. localStorage ronda los 5 MB, es síncrono (bloquea la interfaz) y
 * lanza excepción al llenarse — justo cuando más notas hay acumuladas, que es
 * cuando menos se puede perder una. IndexedDB es asíncrono, transaccional y
 * tiene cuota de disco.
 *
 * Este módulo es a propósito un envoltorio mínimo: cuatro operaciones sobre
 * almacenes con clave, sin dependencias nuevas. Todo lo demás (qué se guarda y
 * cuándo) vive en `espejo.ts` y `outbox.ts`.
 */

const NOMBRE_DB = "hcsc-offline";
const VERSION_DB = 1;

/** Notas y pacientes redactados sin conexión, esperando subir. */
export const ALMACEN_PENDIENTES = "pendientes";
/** Copia local de lo último que se leyó del servidor, para poder trabajar sin él. */
export const ALMACEN_ESPEJO = "espejo";

type Almacen = typeof ALMACEN_PENDIENTES | typeof ALMACEN_ESPEJO;

// ---------------------------------------------------------------------------
// Respaldo en memoria
// ---------------------------------------------------------------------------

/**
 * IndexedDB puede no estar: en pruebas, o en una ventana privada donde el
 * navegador la bloquea. En ese caso la aplicación tiene que seguir funcionando
 * —degradada, sin persistir entre recargas— en vez de romperse al arrancar.
 */
const memoria = new Map<Almacen, Map<IDBValidKey, unknown>>([
  [ALMACEN_PENDIENTES, new Map()],
  [ALMACEN_ESPEJO, new Map()],
]);

let dbPrometida: Promise<IDBDatabase | null> | null = null;

function abrir(): Promise<IDBDatabase | null> {
  if (dbPrometida) return dbPrometida;

  dbPrometida = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }

    let solicitud: IDBOpenDBRequest;
    try {
      solicitud = indexedDB.open(NOMBRE_DB, VERSION_DB);
    } catch {
      resolve(null);
      return;
    }

    solicitud.onupgradeneeded = () => {
      const db = solicitud.result;
      if (!db.objectStoreNames.contains(ALMACEN_PENDIENTES)) {
        db.createObjectStore(ALMACEN_PENDIENTES, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(ALMACEN_ESPEJO)) {
        db.createObjectStore(ALMACEN_ESPEJO, { keyPath: "clave" });
      }
    };

    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => resolve(null);
    // Otra pestaña tiene abierta una versión anterior y bloquea la migración.
    solicitud.onblocked = () => resolve(null);
  });

  return dbPrometida;
}

function transaccion(
  db: IDBDatabase,
  almacen: Almacen,
  modo: IDBTransactionMode
): IDBObjectStore {
  return db.transaction(almacen, modo).objectStore(almacen);
}

function esperar<T>(solicitud: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error);
  });
}

// ---------------------------------------------------------------------------
// Operaciones
// ---------------------------------------------------------------------------

/** Guarda (o reemplaza) un registro. La clave sale del `keyPath` del almacén. */
export async function guardar(almacen: Almacen, valor: unknown): Promise<void> {
  const db = await abrir();
  if (!db) {
    const clave = (valor as Record<string, IDBValidKey>)[
      almacen === ALMACEN_PENDIENTES ? "id" : "clave"
    ];
    memoria.get(almacen)!.set(clave, valor);
    return;
  }
  await esperar(transaccion(db, almacen, "readwrite").put(valor));
}

/** Lee un registro por su clave, o `undefined` si no está. */
export async function leer<T>(
  almacen: Almacen,
  clave: IDBValidKey
): Promise<T | undefined> {
  const db = await abrir();
  if (!db) return memoria.get(almacen)!.get(clave) as T | undefined;
  return esperar<T | undefined>(transaccion(db, almacen, "readonly").get(clave));
}

/** Devuelve todos los registros del almacén. */
export async function listar<T>(almacen: Almacen): Promise<T[]> {
  const db = await abrir();
  if (!db) return [...memoria.get(almacen)!.values()] as T[];
  return esperar<T[]>(transaccion(db, almacen, "readonly").getAll());
}

/** Elimina un registro. Borrar lo que no existe no es un error. */
export async function borrar(
  almacen: Almacen,
  clave: IDBValidKey
): Promise<void> {
  const db = await abrir();
  if (!db) {
    memoria.get(almacen)!.delete(clave);
    return;
  }
  await esperar(transaccion(db, almacen, "readwrite").delete(clave));
}
