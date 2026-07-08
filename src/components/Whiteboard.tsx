import { useEffect, useRef, useState, useCallback } from "react";
import { loadBoard, saveBoard, type WBItem } from "../whiteboardStore";
import { fileToCompressedDataUrl } from "../imageUtils";

const CANVAS_W = 4000;
const CANVAS_H = 3000;
const TEXT_COLORS = ["#fff3bf", "#d3f9d8", "#d0ebff", "#ffd8a8", "#eebefa", "#ffffff"];

let seq = 0;
const uid = () => `wb_${Date.now().toString(36)}${(seq++).toString(36)}`;

export default function Whiteboard() {
  const [items, setItems] = useState<WBItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<number | null>(null);

  // 読み込み
  useEffect(() => {
    loadBoard().then((data) => {
      setItems(data);
      setLoaded(true);
      const maxZ = data.reduce((m, it) => Math.max(m, it.z ?? 0), 0);
      seq = maxZ + 1;
    });
  }, []);

  // 自動保存（IndexedDB、デバウンス）
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveBoard(items), 400);
  }, [items, loaded]);

  const topZ = () => items.reduce((m, it) => Math.max(m, it.z ?? 0), 0) + 1;

  const viewCenter = () => {
    const el = containerRef.current;
    if (!el) return { x: 400, y: 300 };
    return { x: el.scrollLeft + el.clientWidth / 2 - 90, y: el.scrollTop + el.clientHeight / 2 - 40 };
  };

  const addText = () => {
    const { x, y } = viewCenter();
    const id = uid();
    setItems((prev) => [...prev, { id, type: "text", x, y, w: 200, text: "", color: TEXT_COLORS[0], z: topZ() }]);
    setSelectedId(id);
    setEditingId(id);
  };

  const addImage = useCallback((src: string) => {
    setItems((prev) => {
      const el = containerRef.current;
      const cx = el ? el.scrollLeft + el.clientWidth / 2 - 160 : 400;
      const cy = el ? el.scrollTop + el.clientHeight / 2 - 120 : 300;
      const maxZ = prev.reduce((m, it) => Math.max(m, it.z ?? 0), 0) + 1;
      return [...prev, { id: uid(), type: "image", x: cx, y: cy, w: 320, src, z: maxZ }];
    });
  }, []);

  const update = (id: string, patch: Partial<WBItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setSelectedId((s) => (s === id ? null : s));
    setEditingId((e) => (e === id ? null : e));
  };

  // 画像の貼り付け（Ctrl+V）
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (editingId) return; // テキスト編集中は通常の貼り付け
      const item = Array.from(e.clipboardData?.items ?? []).find((it) => it.type.startsWith("image/"));
      if (!item) return;
      const file = item.getAsFile();
      if (!file) return;
      e.preventDefault();
      fileToCompressedDataUrl(file, 1600, 0.8).then(addImage);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [editingId, addImage]);

  // Delete キーで選択アイテム削除
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingId) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        remove(selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, editingId]);

  // ── ドラッグ移動（window監視方式。pointer captureだと親のmoveが来ないため） ──
  const startDrag = (e: React.PointerEvent, it: WBItem) => {
    if (editingId === it.id) return;
    e.stopPropagation();
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, ox = it.x, oy = it.y, id = it.id;
    setSelectedId(id);
    update(id, { z: topZ() });
    const move = (ev: PointerEvent) => update(id, { x: ox + (ev.clientX - sx), y: oy + (ev.clientY - sy) });
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // ── 画像リサイズ ──
  const startResize = (e: React.PointerEvent, it: WBItem) => {
    e.stopPropagation();
    e.preventDefault();
    const sx = e.clientX, ow = it.w, id = it.id;
    const move = (ev: PointerEvent) => update(id, { w: Math.max(60, ow + (ev.clientX - sx)) });
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
        <button onClick={addText}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>
          テキスト追加
        </button>
        <span className="text-xs text-slate-400">画像は <kbd className="rounded border border-slate-300 bg-slate-50 px-1">Ctrl+V</kbd> で貼り付け</span>
        {selectedId && (
          <button onClick={() => remove(selectedId)}
            className="ml-auto flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-50">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            削除
          </button>
        )}
        <span className={`text-[11px] text-slate-400 ${selectedId ? "" : "ml-auto"}`}>ローカル保存（このPC内）</span>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-auto bg-slate-100"
        onPointerDown={() => { setSelectedId(null); }}
      >
        <div
          className="relative"
          style={{
            width: CANVAS_W, height: CANVAS_H,
            backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        >
          {items.map((it) => {
            const selected = selectedId === it.id;
            return (
              <div
                key={it.id}
                className={`absolute ${selected ? "ring-2 ring-blue-400" : ""}`}
                style={{ left: it.x, top: it.y, width: it.w, zIndex: it.z }}
                onPointerDown={(e) => startDrag(e, it)}
                onClick={(e) => { e.stopPropagation(); setSelectedId(it.id); }}
              >
                {it.type === "text" ? (
                  editingId === it.id ? (
                    <textarea
                      autoFocus
                      value={it.text ?? ""}
                      onChange={(e) => update(it.id, { text: e.target.value })}
                      onBlur={() => { setEditingId(null); if (!(it.text ?? "").trim()) remove(it.id); }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="w-full resize-none rounded-lg p-2 text-sm text-slate-800 shadow outline-none"
                      style={{ background: it.color ?? "#fff3bf", minHeight: 60 }}
                    />
                  ) : (
                    <div
                      onDoubleClick={() => setEditingId(it.id)}
                      className="cursor-move whitespace-pre-wrap break-words rounded-lg p-2 text-sm text-slate-800 shadow"
                      style={{ background: it.color ?? "#fff3bf", minHeight: 40 }}
                    >
                      {(it.text ?? "").trim() || <span className="text-slate-400">ダブルクリックで編集</span>}
                    </div>
                  )
                ) : (
                  <div className="relative cursor-move">
                    <img src={it.src} alt="" draggable={false} className="w-full rounded-lg shadow" style={{ display: "block" }} />
                    {selected && (
                      <span
                        onPointerDown={(e) => startResize(e, it)}
                        className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-white bg-blue-500 shadow"
                      />
                    )}
                  </div>
                )}
                {selected && it.type === "text" && editingId !== it.id && (
                  <div className="mt-1 flex gap-1">
                    {TEXT_COLORS.map((c) => (
                      <button key={c} onClick={(e) => { e.stopPropagation(); update(it.id, { color: c }); }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded-full border border-slate-300" style={{ background: c }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
