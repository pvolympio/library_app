const DB_NAME = "entrelinhas_epub_store";
const DB_VERSION = 1;
const STORE_NAME = "epubs";

export interface StoredEpubRecord {
  id: string;
  fileName: string;
  fileSize: number;
  data: ArrayBuffer;
  updatedAt: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB não está disponível neste ambiente."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error("Falha ao abrir IndexedDB"));
    };
  });

  return dbPromise;
}

export async function saveEpubBinary(
  bookId: string,
  data: ArrayBuffer,
  fileName: string,
  fileSize?: number,
): Promise<void> {
  const db = await openDatabase();
  const record: StoredEpubRecord = {
    id: bookId,
    fileName,
    fileSize: fileSize ?? data.byteLength,
    data,
    updatedAt: new Date().toISOString(),
  };

  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(record);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Erro ao salvar EPUB no banco"));
  });
}

export async function getEpubBinary(bookId: string): Promise<ArrayBuffer | null> {
  const db = await openDatabase();
  return new Promise<ArrayBuffer | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(bookId);

    request.onsuccess = () => {
      const result = request.result as StoredEpubRecord | undefined;
      resolve(result ? result.data : null);
    };
    request.onerror = () => reject(request.error ?? new Error("Erro ao ler EPUB"));
  });
}

export async function getEpubMetadata(
  bookId: string,
): Promise<{ fileName: string; fileSize: number; updatedAt: string } | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(bookId);

    request.onsuccess = () => {
      const result = request.result as StoredEpubRecord | undefined;
      if (!result) {
        resolve(null);
        return;
      }
      resolve({
        fileName: result.fileName,
        fileSize: result.fileSize,
        updatedAt: result.updatedAt,
      });
    };
    request.onerror = () => reject(request.error ?? new Error("Erro ao ler metadados do EPUB"));
  });
}

export async function hasEpubBinary(bookId: string): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise<boolean>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.count(IDBKeyRange.only(bookId));

      request.onsuccess = () => resolve(request.result > 0);
      request.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export async function deleteEpubBinary(bookId: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(bookId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Erro ao excluir EPUB"));
    });
  } catch {
    // Falha silenciosa caso o banco não esteja disponível
  }
}

export async function listStoredEpubIds(): Promise<string[]> {
  try {
    const db = await openDatabase();
    return new Promise<string[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAllKeys();

      request.onsuccess = () => resolve((request.result as string[]) ?? []);
      request.onerror = () => reject(request.error ?? new Error("Erro ao listar chaves de EPUB"));
    });
  } catch {
    return [];
  }
}

