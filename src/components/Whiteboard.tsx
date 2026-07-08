import { useEffect, useRef, useState, useLayoutEffect, useCallback } from "react";
import {
  loadIndex, saveIndex, loadBoardData, saveBoardData, deleteBoardData,
  type WBItem, type WBConnection, type WBShape, type WBIndex,
} from "../whiteboardStore";
import { fileToCompressedDataUrl } from "../imageUtils";

const CANVAS_W = 4000;
const CANVAS_H = 3000;
const TEXT_COLORS = ["#fff3bf", "#d3f9d8", "#d0ebff", "#ffd8a8", "#eebefa", "#ffffff"];
const SHAPES: { id: WBShape; label: string }[] = [
  { id: "rect", label: "□" }, { id: "round", label: "▢" }, { id: "ellipse", label: "○" }, { id: "diamond", label: "◇" },
];

let seq = 0;
const uid = (p = "wb") => `${p}_${Date.now().toString(36)}${(seq++).toString(36)}`;

function shapeStyle(shape: WBShape | undefined): React.CSSProperties {
  switch (shape) {
    case "round": return { borderRadius: 16 };
    case "ellipse": return { borderRadius: "50%" };
    case "diamond": return { clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)" };
    default: return { borderRadius: 6 };
  }
}

export default function Whiteboard() {
  const [index, setIndex] = useState<WBIndex | null>(null);
  const [items, setItems] = useState<WBItem[]>([]);
  const [connections, setConnections] = useState<WBConnection[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [connectDraft, setConnectDraft] = useState<{ from: string; x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const elRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const saveTimer = useRef<number | null>(null);
  const activeIdRef = useRef<string>("");

  // 初回ロード
  useEffect(() => {
    loadIndex().then(async (idx) => {
      setIndex(idx);
      activeIdRef.current = idx.activeId;
      const data = await loadBoardData(idx.activeId);
      setItems(data.items); setConnections(data.connections);
      seq = data.items.reduce((m, it) => Math.max(m, it.z ?? 0), 0) + 1;
      setLoaded(true);
    });
  }, []);

  // 現在ボードの自動保存（IndexedDB）
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveBoardData(activeIdRef.current, { items, connections }), 400);
  }, [items, connections, loaded]);

  // アイテムの高さを測って矢印の始点/終点に使う
  useLayoutEffect(() => {
    const next: Record<string, number> = {};
    let changed = false;
    for (const it of items) {
      const el = elRefs.current[it.id];
      const h = el ? el.offsetHeight : (heights[it.id] ?? 40);
      next[it.id] = h;
      if (h !== heights[it.id]) changed = true;
    }
    if (changed || Object.keys(next).length !== Object.keys(heights).length) setHeights(next);
  }); // 毎レンダー測定

  const topZ = () => items.reduce((m, it) => Math.max(m, it.z ?? 0), 0) + 1;

  // ── ボード（タブ）操作 ──
  const switchBoard = async (id: string) => {
    if (id === activeIdRef.current) return;
    await saveBoardData(activeIdRef.current, { items, connections });
    const data = await loadBoardData(id);
    activeIdRef.current = id;
    setSelectedId(null); setEditingId(null);
    setItems(data.items); setConnections(data.connections);
    seq = data.items.reduce((m, it) => Math.max(m, it.z ?? 0), 0) + 1;
    setIndex((idx) => idx && { ...idx, activeId: id });
    if (index) saveIndex({ ...index, activeId: id });
  };
  const addBoard = () => {
    if (!index) return;
    const id = uid("board");
    const idx: WBIndex = { boards: [...index.boards, { id, title: `ボード${index.boards.length + 1}` }], activeId: id };
    saveBoardData(activeIdRef.current, { items, connections });
    saveBoardData(id, { items: [], connections: [] });
    activeIdRef.current = id;
    setIndex(idx); saveIndex(idx);
    setItems([]); setConnections([]); setSelectedId(null); setEditingId(null);
  };
  const renameBoard = (id: string, title: string) => {
    setIndex((idx) => {
      if (!idx) return idx;
      const next = { ...idx, boards: idx.boards.map(b => b.id === id ? { ...b, title } : b) };
      saveIndex(next);
      return next;
    });
  };
  const deleteBoard = (id: string) => {
    if (!index || index.boards.length <= 1) return;
    if (!window.confirm("このボードを削除しますか？（元に戻せません）")) return;
    const remaining = index.boards.filter(b => b.id !== id);
    const nextActive = id === activeIdRef.current ? remaining[0].id : activeIdRef.current;
    deleteBoardData(id);
    const idx: WBIndex = { boards: remaining, activeId: nextActive };
    setIndex(idx); saveIndex(idx);
    if (id === activeIdRef.current) {
      activeIdRef.current = nextActive;
      loadBoardData(nextActive).then(d => { setItems(d.items); setConnections(d.connections); });
      setSelectedId(null); setEditingId(null);
    }
  };

  // ── アイテム操作 ──
  const viewCenter = () => {
    const el = containerRef.current;
    if (!el) return { x: 400, y: 300 };
    return { x: el.scrollLeft + el.clientWidth / 2 - 90, y: el.scrollTop + el.clientHeight / 2 - 40 };
  };
  const addText = () => {
    const { x, y } = viewCenter();
    const id = uid();
    setItems((prev) => [...prev, { id, type: "text", x, y, w: 180, text: "", color: TEXT_COLORS[0], shape: "rect", z: topZ() }]);
    setSelectedId(id); setEditingId(id);
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
    setConnections((prev) => prev.filter((c) => c.from !== id && c.to !== id));
    setSelectedId((s) => (s === id ? null : s));
    setEditingId((e) => (e === id ? null : e));
  };

  // 画像ペースト
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (editingId) return;
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

  // Deleteキー
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingId) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) { e.preventDefault(); remove(selectedId); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, editingId]);

  // ドラッグ移動
  const startDrag = (e: React.PointerEvent, it: WBItem) => {
    if (editingId === it.id) return;
    e.stopPropagation(); e.preventDefault();
    const sx = e.clientX, sy = e.clientY, ox = it.x, oy = it.y, id = it.id;
    setSelectedId(id); update(id, { z: topZ() });
    const move = (ev: PointerEvent) => update(id, { x: ox + (ev.clientX - sx), y: oy + (ev.clientY - sy) });
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  // 画像リサイズ
  const startResize = (e: React.PointerEvent, it: WBItem) => {
    e.stopPropagation(); e.preventDefault();
    const sx = e.clientX, ow = it.w, id = it.id;
    const move = (ev: PointerEvent) => update(id, { w: Math.max(60, ow + (ev.clientX - sx)) });
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };

  const toCanvas = (clientX: number, clientY: number) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  };

  // 矢印の作成（接続ハンドルからドラッグ→相手の上で離す）
  const startConnect = (e: React.PointerEvent, fromId: string) => {
    e.stopPropagation(); e.preventDefault();
    const move = (ev: PointerEvent) => {
      const p = toCanvas(ev.clientX, ev.clientY);
      setConnectDraft({ from: fromId, x: p.x, y: p.y });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      const p = toCanvas(ev.clientX, ev.clientY);
      const target = items.find(it => it.id !== fromId && p.x >= it.x && p.x <= it.x + it.w && p.y >= it.y && p.y <= it.y + (heights[it.id] ?? 40));
      if (target) {
        setConnections(prev => prev.some(c => c.from === fromId && c.to === target.id) ? prev
          : [...prev, { id: uid("c"), from: fromId, to: target.id }]);
      }
      setConnectDraft(null);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };

  const center = (it: WBItem) => ({ x: it.x + it.w / 2, y: it.y + (heights[it.id] ?? 40) / 2 });

  return (
    <div className="flex h-full flex-col">
      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-1.5 scrollbar-none">
        {index?.boards.map((b) => (
          <BoardTab key={b.id} title={b.title} active={b.id === index.activeId}
            onClick={() => switchBoard(b.id)}
            onRename={(t) => renameBoard(b.id, t)}
            onDelete={index.boards.length > 1 ? () => deleteBoard(b.id) : undefined}
          />
        ))}
        <button onClick={addBoard} title="ボードを追加" className="shrink-0 rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">＋</button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
        <button onClick={addText} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V4h16v3M9 20h6M12 4v16"/></svg>
          テキスト追加
        </button>
        <span className="text-xs text-slate-400">画像は <kbd className="rounded border border-slate-300 bg-slate-50 px-1">Ctrl+V</kbd>／矢印は選択→上の●からドラッグ</span>
        <span className="ml-auto text-[11px] text-slate-400">このPC内に保存</span>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative flex-1 overflow-auto bg-slate-100"
        onPointerDown={() => { setSelectedId(null); }}>
        <div ref={canvasRef} className="relative"
          style={{ width: CANVAS_W, height: CANVAS_H, backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
          {/* Arrows */}
          <svg className="pointer-events-none absolute left-0 top-0" width={CANVAS_W} height={CANVAS_H}>
            <defs>
              <marker id="wb-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L8,3 L0,6 Z" fill="#64748b" />
              </marker>
            </defs>
            {connections.map((c) => {
              const a = items.find(i => i.id === c.from), b = items.find(i => i.id === c.to);
              if (!a || !b) return null;
              const p1 = center(a), p2 = center(b);
              return (
                <g key={c.id} className="pointer-events-auto cursor-pointer" onClick={(e) => { e.stopPropagation(); setConnections(prev => prev.filter(x => x.id !== c.id)); }}>
                  <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="transparent" strokeWidth={12} />
                  <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#64748b" strokeWidth={2} markerEnd="url(#wb-arrow)" />
                </g>
              );
            })}
            {connectDraft && (() => {
              const a = items.find(i => i.id === connectDraft.from); if (!a) return null;
              const p1 = center(a);
              return <line x1={p1.x} y1={p1.y} x2={connectDraft.x} y2={connectDraft.y} stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 3" markerEnd="url(#wb-arrow)" />;
            })()}
          </svg>

          {items.map((it) => {
            const selected = selectedId === it.id;
            return (
              <div key={it.id} ref={(el) => { elRefs.current[it.id] = el; }}
                className={`absolute ${selected ? "ring-2 ring-blue-400" : ""}`}
                style={{ left: it.x, top: it.y, width: it.w, zIndex: it.z, ...(it.type === "text" ? shapeStyle(it.shape) : { borderRadius: 8 }) }}
                onPointerDown={(e) => startDrag(e, it)}
                onClick={(e) => { e.stopPropagation(); setSelectedId(it.id); }}
              >
                {/* 接続ハンドル */}
                {selected && (
                  <span onPointerDown={(e) => startConnect(e, it.id)} title="矢印でつなぐ"
                    className="absolute left-1/2 -top-3 z-10 flex h-5 w-5 -translate-x-1/2 cursor-crosshair items-center justify-center rounded-full border-2 border-white bg-slate-500 text-white shadow">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  </span>
                )}

                {it.type === "text" ? (
                  editingId === it.id ? (
                    <textarea autoFocus value={it.text ?? ""}
                      onChange={(e) => update(it.id, { text: e.target.value })}
                      onBlur={() => { setEditingId(null); if (!(it.text ?? "").trim()) remove(it.id); }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="w-full resize-none p-2 text-center text-sm text-slate-800 shadow outline-none"
                      style={{ background: it.color ?? "#fff3bf", minHeight: 60, ...shapeStyle(it.shape) }} />
                  ) : (
                    <div onDoubleClick={() => setEditingId(it.id)}
                      className="flex min-h-[48px] cursor-move items-center justify-center whitespace-pre-wrap break-words p-3 text-center text-sm text-slate-800 shadow"
                      style={{ background: it.color ?? "#fff3bf", ...shapeStyle(it.shape) }}>
                      {(it.text ?? "").trim() || <span className="text-slate-400">ダブルクリックで編集</span>}
                    </div>
                  )
                ) : (
                  <div className="relative cursor-move">
                    <img src={it.src} alt="" draggable={false} className="block w-full rounded-lg shadow" />
                    {selected && (
                      <span onPointerDown={(e) => startResize(e, it)}
                        className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-white bg-blue-500 shadow" />
                    )}
                  </div>
                )}

                {/* テキスト選択時：形状＋色 */}
                {selected && it.type === "text" && editingId !== it.id && (
                  <div className="absolute left-0 top-full mt-1 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow" onPointerDown={(e) => e.stopPropagation()}>
                    {SHAPES.map((s) => (
                      <button key={s.id} onClick={(e) => { e.stopPropagation(); update(it.id, { shape: s.id }); }}
                        className={`flex h-5 w-5 items-center justify-center rounded text-xs ${it.shape === s.id ? "bg-blue-100 text-blue-600" : "text-slate-500 hover:bg-slate-100"}`}>{s.label}</button>
                    ))}
                    <span className="mx-0.5 w-px bg-slate-200" />
                    {TEXT_COLORS.map((c) => (
                      <button key={c} onClick={(e) => { e.stopPropagation(); update(it.id, { color: c }); }}
                        className="h-5 w-5 rounded-full border border-slate-300" style={{ background: c }} />
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

function BoardTab({ title, active, onClick, onRename, onDelete }: {
  title: string; active: boolean; onClick: () => void; onRename: (t: string) => void; onDelete?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(title);
  useEffect(() => { setVal(title); }, [title]);
  return (
    <div className={`group flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition ${active ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
      {editing ? (
        <input autoFocus value={val} onChange={(e) => setVal(e.target.value)}
          onBlur={() => { setEditing(false); if (val.trim()) onRename(val.trim()); else setVal(title); }}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setVal(title); setEditing(false); } }}
          className="w-24 rounded bg-white px-1 text-slate-800 outline-none" />
      ) : (
        <button onClick={onClick} onDoubleClick={() => setEditing(true)} title="ダブルクリックで名前変更">{title}</button>
      )}
      {onDelete && (
        <button onClick={onDelete} title="ボードを削除"
          className={`opacity-0 group-hover:opacity-100 ${active ? "text-white/80 hover:text-white" : "text-slate-400 hover:text-red-500"}`}>×</button>
      )}
    </div>
  );
}
