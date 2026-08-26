/**
 * Local file vault (IndexedDB).
 * Later: same API can swap to Supabase/S3 storage when account sync lands —
 * resource metadata stays in app data; blobs live in the vault/cloud.
 */

const DB_NAME = "qts-planner-files";
const DB_VERSION = 1;
const STORE = "files";

/** Soft cap so one browser profile doesn’t fill disk by accident */
export const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;

export type StoredFileMeta = {
  id: string;
  name: string;
  mime: string;
  size: number;
  createdAt: string;
};

type FileRecord = StoredFileMeta & { blob: Blob };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

function idbReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function putFile(file: File): Promise<StoredFileMeta> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `File is too large (max ${formatFileSize(MAX_UPLOAD_BYTES)}).`,
    );
  }
  const meta: StoredFileMeta = {
    id: `file-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    mime: file.type || "application/octet-stream",
    size: file.size,
    createdAt: new Date().toISOString(),
  };
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    const record: FileRecord = { ...meta, blob: file };
    await idbReq(tx.objectStore(STORE).put(record));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("put failed"));
    });
  } finally {
    db.close();
  }
  return meta;
}

export async function getFileRecord(id: string): Promise<FileRecord | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const row = await idbReq(tx.objectStore(STORE).get(id));
    return (row as FileRecord | undefined) ?? null;
  } finally {
    db.close();
  }
}

export async function deleteStoredFile(id: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    await idbReq(tx.objectStore(STORE).delete(id));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("delete failed"));
    });
  } finally {
    db.close();
  }
}

/** Store a Blob (e.g. MediaRecorder output) in the vault. */
export async function putBlob(
  blob: Blob,
  name: string,
  mime?: string,
): Promise<StoredFileMeta> {
  const type = mime || blob.type || "application/octet-stream";
  const file = new File([blob], name, { type });
  return putFile(file);
}

/** Object URL for in-app playback; caller must revoke. */
export async function createFileObjectUrl(id: string): Promise<string> {
  const record = await getFileRecord(id);
  if (!record) throw new Error("File not found in vault.");
  return URL.createObjectURL(record.blob);
}

/** Open an uploaded file in a new tab (blob URL). */
export async function openStoredFile(id: string): Promise<void> {
  const url = await createFileObjectUrl(id);
  const record = await getFileRecord(id);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    const a = document.createElement("a");
    a.href = url;
    a.download = record?.name ?? "download";
    a.rel = "noopener";
    a.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
