// ホワイトボードのローカル保存（IndexedDB）。
// サーバー・DBには一切送らず、このPCのブラウザ内にだけ保存する。
// localStorage(約5MB)と違いIndexedDBは大容量なので、画像を貼っても余裕がある。

export interface WBItem {
  id: string;
  type: "text" | "image";
  x: number;
  y: number;
  w: number;
  h?: number;        // image用（未指定なら自動）
  text?: string;     // text用
  color?: string;    // text背景色
  src?: string;      // image用 dataURL
  z: number;
}

const DB_NAME = "taskflow_whiteboard";
const STORE = "boards";
const KEY = "default";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadBoard(): Promise<WBItem[]> {
  try {
    const db = await openDB();
    return await new Promise<WBItem[]>((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as WBItem[]) ?? []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function saveBoard(items: WBItem[]): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(items, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* 保存失敗は無視（容量やプライベートモード等） */ }
}
