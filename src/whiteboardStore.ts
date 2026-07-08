// ホワイトボードのローカル保存（IndexedDB）。
// サーバー・DBには一切送らず、このPCのブラウザ内にだけ保存する。

export type WBShape = "rect" | "round" | "ellipse" | "diamond";

export interface WBItem {
  id: string;
  type: "text" | "image";
  x: number;
  y: number;
  w: number;
  h?: number;
  text?: string;
  color?: string;
  shape?: WBShape;   // text用の形状
  src?: string;      // image用 dataURL
  z: number;
}

export interface WBConnection {
  id: string;
  from: string;   // item id
  to: string;     // item id
}

export interface BoardData {
  items: WBItem[];
  connections: WBConnection[];
}

export interface BoardMeta { id: string; title: string; }
export interface WBIndex { boards: BoardMeta[]; activeId: string; }

const DB_NAME = "taskflow_whiteboard";
const STORE = "boards";
const META_KEY = "meta";

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

function get<T>(key: string): Promise<T | undefined> {
  return openDB().then(db => new Promise<T | undefined>((resolve) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => resolve(undefined);
  })).catch(() => undefined);
}
function put(key: string, val: unknown): Promise<void> {
  return openDB().then(db => new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(val, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  })).catch(() => {});
}
function del(key: string): Promise<void> {
  return openDB().then(db => new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  })).catch(() => {});
}

const boardKey = (id: string) => `b_${id}`;

export async function loadIndex(): Promise<WBIndex> {
  const meta = await get<WBIndex>(META_KEY);
  if (meta && meta.boards?.length) return meta;
  // 旧バージョン（単一ボード "default"）からの移行
  const legacy = await get<WBItem[]>("default");
  const id = "board1";
  const idx: WBIndex = { boards: [{ id, title: "ボード1" }], activeId: id };
  await put(META_KEY, idx);
  if (legacy && legacy.length) await put(boardKey(id), { items: legacy, connections: [] });
  return idx;
}

export async function saveIndex(idx: WBIndex): Promise<void> { await put(META_KEY, idx); }
export async function loadBoardData(id: string): Promise<BoardData> {
  return (await get<BoardData>(boardKey(id))) ?? { items: [], connections: [] };
}
export async function saveBoardData(id: string, data: BoardData): Promise<void> { await put(boardKey(id), data); }
export async function deleteBoardData(id: string): Promise<void> { await del(boardKey(id)); }
