import { useEffect, useRef, useState, useLayoutEffect, useCallback } from "react";
import {
  loadIndex, saveIndex, loadBoardData, saveBoardData, deleteBoardData,
  type WBItem, type WBConnection, type WBStroke, type WBShape, type WBIndex,
} from "../whiteboardStore";
import { fileToCompressedDataUrl } from "../imageUtils";

const CANVAS_W = 12000;
const CANVAS_H = 9000;
const ORIGIN_X = 4800; // 起点（初期表示は中央あたり）
const ORIGIN_Y = 3600;
const TEXT_COLORS = ["#fff3bf", "#d3f9d8", "#d0ebff", "#ffd8a8", "#eebefa", "#ffffff"];
const PEN_COLORS = ["#1e293b", "#e11d48", "#2563eb", "#16a34a", "#f59e0b", "#9333ea"];
const SHAPES: { id: WBShape; label: string }[] = [
  { id: "rect", label: "□" }, { id: "round", label: "▢" }, { id: "ellipse", label: "○" }, { id: "diamond", label: "◇" },
];

let seq = 0;
const uid = (p = "wb") => `${p}_${Date.now().toString(36)}${(seq++).toString(36)}`;
const strokePath = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");

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
  const [drawings, setDrawings] = useState<WBStroke[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [connectDraft, setConnectDraft] = useState<{ from: string; x: number; y: number } | null>(null);
  const [liveStroke, setLiveStroke] = useState<{ points: { x: number; y: number }[]; color: string; width: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState<"select" | "pen">("select");
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const elRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const saveTimer = useRef<number | null>(null);
  const activeIdRef = useRef<string>("");
  const zoomRef = useRef(1); zoomRef.current = zoom;
  const toolRef = useRef(tool); toolRef.current = tool;
  const penColorRef = useRef(penColor); penColorRef.current = penColor;
  const pendingScroll = useRef<{ cx: number; cy: number; nz: number } | null>(null);
  const didInitScroll = useRef(false);

  // 初回ロード
  useEffect(() => {
    loadIndex().then(async (idx) => {
      setIndex(idx); activeIdRef.current = idx.activeId;
      const data = await loadBoardData(idx.activeId);
      setItems(data.items); setConnections(data.connections); setDrawings(data.drawings ?? []);
      seq = data.items.reduce((m, it) => Math.max(m, it.z ?? 0), 0) + 1;
      setLoaded(true);
    });
  }, []);

  // 初期スクロール：内容があればその中心へ、無ければ既定の中央へ
  useEffect(() => {
    if (loaded && !didInitScroll.current && containerRef.current) {
      const el = containerRef.current;
      let cx = ORIGIN_X, cy = ORIGIN_Y;
      if (items.length) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        items.forEach(it => { minX = Math.min(minX, it.x); minY = Math.min(minY, it.y); maxX = Math.max(maxX, it.x + it.w); maxY = Math.max(maxY, it.y + (it.h ?? 120)); });
        cx = (minX + maxX) / 2; cy = (minY + maxY) / 2;
      }
      el.scrollLeft = cx - el.clientWidth / 2;
      el.scrollTop = cy - el.clientHeight / 2;
      didInitScroll.current = true;
    }
  }, [loaded, items]);

  // 自動保存
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveBoardData(activeIdRef.current, { items, connections, drawings }), 400);
  }, [items, connections, drawings, loaded]);

  // 高さ測定（矢印用）
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
  });

  // ズームの中心維持
  useLayoutEffect(() => {
    const ps = pendingScroll.current;
    if (!ps || !containerRef.current) return;
    const el = containerRef.current;
    el.scrollLeft = ps.cx * ps.nz - el.clientWidth / 2;
    el.scrollTop = ps.cy * ps.nz - el.clientHeight / 2;
    pendingScroll.current = null;
  }, [zoom]);

  const topZ = () => items.reduce((m, it) => Math.max(m, it.z ?? 0), 0) + 1;
  const toCanvas = (cx: number, cy: number) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: (cx - r.left) / zoomRef.current, y: (cy - r.top) / zoomRef.current };
  };
  const applyZoom = (nz: number) => {
    nz = Math.min(2, Math.max(0.25, Math.round(nz * 100) / 100));
    const el = containerRef.current;
    if (el) pendingScroll.current = { cx: (el.scrollLeft + el.clientWidth / 2) / zoomRef.current, cy: (el.scrollTop + el.clientHeight / 2) / zoomRef.current, nz };
    setZoom(nz);
  };

  // ── ボード（タブ）操作 ──
  const persistCurrent = () => saveBoardData(activeIdRef.current, { items, connections, drawings });
  const switchBoard = async (id: string) => {
    if (id === activeIdRef.current) return;
    await persistCurrent();
    const data = await loadBoardData(id);
    activeIdRef.current = id;
    setSelectedId(null); setEditingId(null);
    setItems(data.items); setConnections(data.connections); setDrawings(data.drawings ?? []);
    seq = data.items.reduce((m, it) => Math.max(m, it.z ?? 0), 0) + 1;
    setIndex((idx) => { if (!idx) return idx; const n = { ...idx, activeId: id }; saveIndex(n); return n; });
  };
  const addBoard = () => {
    if (!index) return;
    const id = uid("board");
    const idx: WBIndex = { boards: [...index.boards, { id, title: `ボード${index.boards.length + 1}` }], activeId: id };
    persistCurrent();
    saveBoardData(id, { items: [], connections: [], drawings: [] });
    activeIdRef.current = id;
    setIndex(idx); saveIndex(idx);
    setItems([]); setConnections([]); setDrawings([]); setSelectedId(null); setEditingId(null);
  };
  const renameBoard = (id: string, title: string) =>
    setIndex((idx) => { if (!idx) return idx; const n = { ...idx, boards: idx.boards.map(b => b.id === id ? { ...b, title } : b) }; saveIndex(n); return n; });
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
      loadBoardData(nextActive).then(d => { setItems(d.items); setConnections(d.connections); setDrawings(d.drawings ?? []); });
      setSelectedId(null); setEditingId(null);
    }
  };

  // ── アイテム ──
  const viewCenterCanvas = () => {
    const el = containerRef.current;
    if (!el) return { x: ORIGIN_X, y: ORIGIN_Y };
    return { x: (el.scrollLeft + el.clientWidth / 2) / zoomRef.current, y: (el.scrollTop + el.clientHeight / 2) / zoomRef.current };
  };
  const addText = () => {
    const c = viewCenterCanvas(); const id = uid();
    setItems((prev) => [...prev, { id, type: "text", x: c.x - 90, y: c.y - 30, w: 180, text: "", color: TEXT_COLORS[0], shape: "rect", z: topZ() }]);
    setSelectedId(id); setEditingId(id); setTool("select");
  };
  const addImage = useCallback((src: string) => {
    setItems((prev) => {
      const el = containerRef.current;
      const cx = el ? (el.scrollLeft + el.clientWidth / 2) / zoomRef.current - 160 : ORIGIN_X;
      const cy = el ? (el.scrollTop + el.clientHeight / 2) / zoomRef.current - 120 : ORIGIN_Y;
      const maxZ = prev.reduce((m, it) => Math.max(m, it.z ?? 0), 0) + 1;
      return [...prev, { id: uid(), type: "image", x: cx, y: cy, w: 320, src, z: maxZ }];
    });
  }, []);
  const update = (id: string, patch: Partial<WBItem>) => setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setConnections((prev) => prev.filter((c) => c.from !== id && c.to !== id));
    setSelectedId((s) => (s === id ? null : s)); setEditingId((e) => (e === id ? null : e));
  };

  // 画像ペースト
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (editingId) return;
      const item = Array.from(e.clipboardData?.items ?? []).find((it) => it.type.startsWith("image/"));
      if (!item) return;
      const file = item.getAsFile(); if (!file) return;
      e.preventDefault(); fileToCompressedDataUrl(file, 1600, 0.8).then(addImage);
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

  // ドラッグ移動（ズーム考慮）
  const startDrag = (e: React.PointerEvent, it: WBItem) => {
    if (tool === "pen") return;                 // ペン時はアイテムを貫通して描画
    if (editingId === it.id) return;
    e.stopPropagation(); e.preventDefault();
    const sx = e.clientX, sy = e.clientY, ox = it.x, oy = it.y, id = it.id, z = zoomRef.current;
    setSelectedId(id); update(id, { z: topZ() });
    const move = (ev: PointerEvent) => update(id, { x: ox + (ev.clientX - sx) / z, y: oy + (ev.clientY - sy) / z });
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  const startResize = (e: React.PointerEvent, it: WBItem) => {
    e.stopPropagation(); e.preventDefault();
    const sx = e.clientX, ow = it.w, id = it.id, z = zoomRef.current;
    const move = (ev: PointerEvent) => update(id, { w: Math.max(60, ow + (ev.clientX - sx) / z) });
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  const startConnect = (e: React.PointerEvent, fromId: string) => {
    e.stopPropagation(); e.preventDefault();
    const move = (ev: PointerEvent) => { const p = toCanvas(ev.clientX, ev.clientY); setConnectDraft({ from: fromId, x: p.x, y: p.y }); };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      const p = toCanvas(ev.clientX, ev.clientY);
      const target = items.find(it => it.id !== fromId && p.x >= it.x && p.x <= it.x + it.w && p.y >= it.y && p.y <= it.y + (heights[it.id] ?? 40));
      if (target) setConnections(prev => prev.some(c => c.from === fromId && c.to === target.id) ? prev : [...prev, { id: uid("c"), from: fromId, to: target.id }]);
      setConnectDraft(null);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };

  // 背景でのポインタ操作：選択モード=パン、ペンモード=描画
  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if (toolRef.current === "pen") {
      const first = toCanvas(e.clientX, e.clientY);
      const pts = [first]; const color = penColorRef.current; const width = 3;
      setLiveStroke({ points: [first], color, width });
      const move = (ev: PointerEvent) => { pts.push(toCanvas(ev.clientX, ev.clientY)); setLiveStroke({ points: [...pts], color, width }); };
      const up = () => {
        window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
        if (pts.length > 1) setDrawings(prev => [...prev, { id: uid("d"), points: pts, color, width }]);
        setLiveStroke(null);
      };
      window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
      return;
    }
    // パン
    setSelectedId(null);
    const el = containerRef.current!; const sl = el.scrollLeft, st = el.scrollTop, sx = e.clientX, sy = e.clientY;
    const move = (ev: PointerEvent) => { el.scrollLeft = sl - (ev.clientX - sx); el.scrollTop = st - (ev.clientY - sy); };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    applyZoom(zoomRef.current * (e.deltaY < 0 ? 1.1 : 0.9));
  };

  const center = (it: WBItem) => ({ x: it.x + it.w / 2, y: it.y + (heights[it.id] ?? 40) / 2 });

  // ── 印刷（内容の範囲をcanvasに描画して印刷） ──
  const printBoard = async () => {
    if (!items.length && !drawings.length) { alert("印刷する内容がありません。"); return; }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const acc = (x: number, y: number) => { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); };
    items.forEach(it => { const h = heights[it.id] ?? 40; acc(it.x, it.y); acc(it.x + it.w, it.y + h); });
    drawings.forEach(s => s.points.forEach(p => acc(p.x, p.y)));
    const pad = 40; minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    const W = Math.min(6000, Math.ceil(maxX - minX)), H = Math.min(6000, Math.ceil(maxY - minY));
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
    ctx.translate(-minX, -minY);
    // 描画（ペン）
    drawings.forEach(s => {
      ctx.strokeStyle = s.color; ctx.lineWidth = s.width; ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.beginPath(); s.points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke();
    });
    // 矢印
    ctx.strokeStyle = "#64748b"; ctx.fillStyle = "#64748b"; ctx.lineWidth = 2;
    connections.forEach(c => {
      const a = items.find(i => i.id === c.from), b = items.find(i => i.id === c.to); if (!a || !b) return;
      const p1 = center(a), p2 = center(b);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
      const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      ctx.beginPath(); ctx.moveTo(p2.x, p2.y);
      ctx.lineTo(p2.x - 10 * Math.cos(ang - 0.4), p2.y - 10 * Math.sin(ang - 0.4));
      ctx.lineTo(p2.x - 10 * Math.cos(ang + 0.4), p2.y - 10 * Math.sin(ang + 0.4));
      ctx.closePath(); ctx.fill();
    });
    // アイテム
    const sorted = [...items].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
    for (const it of sorted) {
      const h = heights[it.id] ?? 48;
      if (it.type === "image" && it.src) {
        try {
          const img = await new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = it.src!; });
          const ih = it.w * (img.height / img.width);
          ctx.drawImage(img, it.x, it.y, it.w, ih);
        } catch { /* skip */ }
      } else if (it.type === "text") {
        ctx.fillStyle = it.color ?? "#fff3bf";
        if (it.shape === "ellipse") { ctx.beginPath(); ctx.ellipse(it.x + it.w / 2, it.y + h / 2, it.w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.beginPath(); ctx.rect(it.x, it.y, it.w, h); ctx.fill(); }
        ctx.fillStyle = "#1e293b"; ctx.font = "14px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const lines = (it.text ?? "").split("\n");
        const lh = 18; const startY = it.y + h / 2 - (lines.length - 1) * lh / 2;
        lines.forEach((ln, i) => ctx.fillText(ln, it.x + it.w / 2, startY + i * lh, it.w - 12));
      }
    }
    const url = cv.toDataURL("image/png");
    const w = window.open("", "_blank");
    if (!w) { alert("ポップアップがブロックされました。印刷を許可してください。"); return; }
    w.document.write(`<html><head><title>ホワイトボード印刷</title></head><body style="margin:0"><img src="${url}" style="max-width:100%" onload="setTimeout(()=>{window.print();},200)"/></body></html>`);
    w.document.close();
  };

  return (
    <div className="flex h-full flex-col">
      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-1.5 scrollbar-none">
        {index?.boards.map((b) => (
          <BoardTab key={b.id} title={b.title} active={b.id === index.activeId}
            onClick={() => switchBoard(b.id)} onRename={(t) => renameBoard(b.id, t)}
            onDelete={index.boards.length > 1 ? () => deleteBoard(b.id) : undefined} />
        ))}
        <button onClick={addBoard} title="ボードを追加" className="shrink-0 rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">＋</button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
          <button onClick={() => setTool("select")} className={`rounded-md px-2 py-1 text-xs font-semibold ${tool === "select" ? "bg-white text-slate-700 shadow-sm" : "text-slate-400"}`}>選択/移動</button>
          <button onClick={() => setTool("pen")} className={`rounded-md px-2 py-1 text-xs font-semibold ${tool === "pen" ? "bg-white text-slate-700 shadow-sm" : "text-slate-400"}`}>ペン</button>
        </div>
        <button onClick={addText} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">＋テキスト</button>
        {tool === "pen" && (
          <div className="flex items-center gap-1">
            {PEN_COLORS.map(c => (
              <button key={c} onClick={() => setPenColor(c)} className={`h-5 w-5 rounded-full border-2 ${penColor === c ? "border-slate-800" : "border-white"} shadow`} style={{ background: c }} />
            ))}
          </div>
        )}
        {/* Zoom */}
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => applyZoom(zoom - 0.1)} className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">－</button>
          <span className="w-10 text-center text-xs text-slate-500">{Math.round(zoom * 100)}%</span>
          <button onClick={() => applyZoom(zoom + 0.1)} className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">＋</button>
          <button onClick={() => applyZoom(1)} className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">100%</button>
        </div>
        <button onClick={printBoard} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>
          印刷
        </button>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative flex-1 overflow-auto bg-slate-100"
        style={{ cursor: tool === "pen" ? "crosshair" : "grab" }}
        onWheel={onWheel} onPointerDown={onCanvasPointerDown}>
        <div ref={canvasRef} className="relative"
          style={{ width: CANVAS_W, height: CANVAS_H, transform: `scale(${zoom})`, transformOrigin: "0 0",
            backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
          {/* Arrows + drawings */}
          <svg className="pointer-events-none absolute left-0 top-0" width={CANVAS_W} height={CANVAS_H}>
            <defs><marker id="wb-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,3 L0,6 Z" fill="#64748b" /></marker></defs>
            {drawings.map((s) => (
              <g key={s.id} className={tool === "select" ? "pointer-events-auto cursor-pointer" : ""}
                onClick={(e) => { if (tool !== "select") return; e.stopPropagation(); setDrawings(prev => prev.filter(x => x.id !== s.id)); }}>
                <path d={strokePath(s.points)} stroke={s.color} strokeWidth={s.width} fill="none" strokeLinejoin="round" strokeLinecap="round" />
              </g>
            ))}
            {liveStroke && <path d={strokePath(liveStroke.points)} stroke={liveStroke.color} strokeWidth={liveStroke.width} fill="none" strokeLinejoin="round" strokeLinecap="round" />}
            {connections.map((c) => {
              const a = items.find(i => i.id === c.from), b = items.find(i => i.id === c.to); if (!a || !b) return null;
              const p1 = center(a), p2 = center(b);
              return (
                <g key={c.id} className={tool === "select" ? "pointer-events-auto cursor-pointer" : ""} onClick={(e) => { if (tool !== "select") return; e.stopPropagation(); setConnections(prev => prev.filter(x => x.id !== c.id)); }}>
                  <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="transparent" strokeWidth={12} />
                  <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#64748b" strokeWidth={2} markerEnd="url(#wb-arrow)" />
                </g>
              );
            })}
            {connectDraft && (() => { const a = items.find(i => i.id === connectDraft.from); if (!a) return null; const p1 = center(a); return <line x1={p1.x} y1={p1.y} x2={connectDraft.x} y2={connectDraft.y} stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 3" markerEnd="url(#wb-arrow)" />; })()}
          </svg>

          {items.map((it) => {
            const selected = selectedId === it.id;
            return (
              <div key={it.id} ref={(el) => { elRefs.current[it.id] = el; }}
                className={`absolute ${selected ? "ring-2 ring-blue-400" : ""} ${tool === "pen" ? "pointer-events-none" : ""}`}
                style={{ left: it.x, top: it.y, width: it.w, zIndex: it.z, ...(it.type === "text" ? shapeStyle(it.shape) : { borderRadius: 8 }) }}
                onPointerDown={(e) => startDrag(e, it)} onClick={(e) => { e.stopPropagation(); setSelectedId(it.id); }}>
                {selected && tool === "select" && (
                  <span onPointerDown={(e) => startConnect(e, it.id)} title="矢印でつなぐ"
                    className="absolute left-1/2 -top-3 z-10 flex h-5 w-5 -translate-x-1/2 cursor-crosshair items-center justify-center rounded-full border-2 border-white bg-slate-500 text-white shadow">
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  </span>
                )}
                {it.type === "text" ? (
                  editingId === it.id ? (
                    <textarea autoFocus value={it.text ?? ""} onChange={(e) => update(it.id, { text: e.target.value })}
                      onBlur={() => { setEditingId(null); if (!(it.text ?? "").trim()) remove(it.id); }} onPointerDown={(e) => e.stopPropagation()}
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
                    {selected && <span onPointerDown={(e) => startResize(e, it)} className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-white bg-blue-500 shadow" />}
                  </div>
                )}
                {selected && it.type === "text" && editingId !== it.id && (
                  <div className="absolute left-0 top-full mt-1 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow" onPointerDown={(e) => e.stopPropagation()}>
                    {SHAPES.map((s) => (
                      <button key={s.id} onClick={(e) => { e.stopPropagation(); update(it.id, { shape: s.id }); }}
                        className={`flex h-5 w-5 items-center justify-center rounded text-xs ${it.shape === s.id ? "bg-blue-100 text-blue-600" : "text-slate-500 hover:bg-slate-100"}`}>{s.label}</button>
                    ))}
                    <span className="mx-0.5 w-px bg-slate-200" />
                    {TEXT_COLORS.map((c) => (
                      <button key={c} onClick={(e) => { e.stopPropagation(); update(it.id, { color: c }); }} className="h-5 w-5 rounded-full border border-slate-300" style={{ background: c }} />
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
      {onDelete && <button onClick={onDelete} title="削除" className={`opacity-0 group-hover:opacity-100 ${active ? "text-white/80 hover:text-white" : "text-slate-400 hover:text-red-500"}`}>×</button>}
    </div>
  );
}
