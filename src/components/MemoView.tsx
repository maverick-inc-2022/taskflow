import { useState, useRef, useCallback, useEffect } from "react";
import type { StickyMemo, MemoCategory } from "../types";

// ── Built-in categories ───────────────────────────────────────────────────────

export const BUILTIN_CATEGORIES: MemoCategory[] = [
  { id: "work",     name: "仕事",     color: "bg-blue-500"    },
  { id: "personal", name: "個人",     color: "bg-emerald-500" },
  { id: "idea",     name: "アイデア", color: "bg-violet-500"  },
];

// ── Sticky-note colors ────────────────────────────────────────────────────────

const MEMO_COLORS = [
  { id: "yellow", bg: "bg-amber-50",   header: "bg-amber-100",   border: "border-amber-200",   dot: "bg-amber-400"   },
  { id: "blue",   bg: "bg-blue-50",    header: "bg-blue-100",    border: "border-blue-200",    dot: "bg-blue-400"    },
  { id: "green",  bg: "bg-emerald-50", header: "bg-emerald-100", border: "border-emerald-200", dot: "bg-emerald-400" },
  { id: "pink",   bg: "bg-pink-50",    header: "bg-pink-100",    border: "border-pink-200",    dot: "bg-pink-400"    },
  { id: "purple", bg: "bg-violet-50",  header: "bg-violet-100",  border: "border-violet-200",  dot: "bg-violet-400"  },
  { id: "orange", bg: "bg-orange-50",  header: "bg-orange-100",  border: "border-orange-200",  dot: "bg-orange-400"  },
  { id: "white",  bg: "bg-white",      header: "bg-slate-100",   border: "border-slate-200",   dot: "bg-slate-400"   },
];

const TEXT_COLORS = [
  { label: "標準",     val: "inherit"  },
  { label: "赤",       val: "#ef4444"  },
  { label: "オレンジ", val: "#f97316"  },
  { label: "黄",       val: "#eab308"  },
  { label: "緑",       val: "#22c55e"  },
  { label: "青",       val: "#3b82f6"  },
  { label: "紫",       val: "#8b5cf6"  },
];

function getColor(id: string) { return MEMO_COLORS.find(c => c.id === id) ?? MEMO_COLORS[0]; }

// ── Category → card color scheme ─────────────────────────────────────────────

interface CardScheme {
  header:     string;
  body:       string;
  border:     string;
  dot:        string;
  headerText: string; // "text-white" or "text-slate-600"
}

const CAT_SCHEME: Record<string, CardScheme> = {
  "bg-blue-500":    { header: "bg-blue-500",    body: "bg-blue-50",    border: "border-blue-300",    dot: "bg-blue-200",    headerText: "text-white" },
  "bg-emerald-500": { header: "bg-emerald-500", body: "bg-emerald-50", border: "border-emerald-300", dot: "bg-emerald-200", headerText: "text-white" },
  "bg-violet-500":  { header: "bg-violet-500",  body: "bg-violet-50",  border: "border-violet-300",  dot: "bg-violet-200",  headerText: "text-white" },
  "bg-rose-500":    { header: "bg-rose-500",    body: "bg-rose-50",    border: "border-rose-300",    dot: "bg-rose-200",    headerText: "text-white" },
  "bg-amber-500":   { header: "bg-amber-500",   body: "bg-amber-50",   border: "border-amber-300",   dot: "bg-amber-200",   headerText: "text-white" },
  "bg-pink-500":    { header: "bg-pink-500",    body: "bg-pink-50",    border: "border-pink-300",    dot: "bg-pink-200",    headerText: "text-white" },
  "bg-indigo-500":  { header: "bg-indigo-500",  body: "bg-indigo-50",  border: "border-indigo-300",  dot: "bg-indigo-200",  headerText: "text-white" },
  "bg-teal-500":    { header: "bg-teal-500",    body: "bg-teal-50",    border: "border-teal-300",    dot: "bg-teal-200",    headerText: "text-white" },
  "bg-orange-500":  { header: "bg-orange-500",  body: "bg-orange-50",  border: "border-orange-300",  dot: "bg-orange-200",  headerText: "text-white" },
  "bg-slate-400":   { header: "bg-slate-400",   body: "bg-slate-50",   border: "border-slate-300",   dot: "bg-slate-200",   headerText: "text-white" },
};

function getCardScheme(memo: StickyMemo, category?: MemoCategory): CardScheme {
  if (category) {
    const s = CAT_SCHEME[category.color];
    if (s) return s;
  }
  const c = getColor(memo.color);
  return { header: c.header, body: c.bg, border: c.border, dot: c.dot, headerText: "text-slate-600" };
}

function fmtDate(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function GripIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="9"  cy="5"  r=".5" fill="currentColor"/><circle cx="15" cy="5"  r=".5" fill="currentColor"/>
      <circle cx="9"  cy="12" r=".5" fill="currentColor"/><circle cx="15" cy="12" r=".5" fill="currentColor"/>
      <circle cx="9"  cy="19" r=".5" fill="currentColor"/><circle cx="15" cy="19" r=".5" fill="currentColor"/>
    </svg>
  );
}
function PinIcon({ filled }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="17" x2="12" y2="22"/>
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/>
    </svg>
  );
}
function CopyIcon() {
  return <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>;
}
function DuplicateIcon() {
  return <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><rect x="11" y="11" width="11" height="11" rx="2"/></svg>;
}
function TrashIcon() {
  return <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
}
function CheckIcon() {
  return <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m20 6-11 11-5-5"/></svg>;
}

// ── MemoToolbar ───────────────────────────────────────────────────────────────

interface ToolbarProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
  cardRef:   React.RefObject<HTMLDivElement | null>;
  borderClass: string;
  onInsertCheckLine: () => void;
  onAttachFile: () => void;
}

function MemoToolbar({ editorRef, cardRef, borderClass, onInsertCheckLine, onAttachFile }: ToolbarProps) {
  const [showColors, setShowColors] = useState(false);
  const [showLink,   setShowLink]   = useState(false);
  const [linkUrl,    setLinkUrl]    = useState("");
  const [linkPos,    setLinkPos]    = useState({ top: 0, left: 0 });
  const savedRangeRef = useRef<Range | null>(null);

  const focus = () => editorRef.current?.focus();
  const exec  = (cmd: string, val?: string) => { focus(); document.execCommand(cmd, false, val); };

  const saveRange = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
  };
  const restoreRange = () => {
    const r = savedRangeRef.current;
    if (!r) return;
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
  };

  const applyLink = () => {
    restoreRange();
    if (linkUrl.trim()) exec("createLink", linkUrl.trim());
    setShowLink(false);
    setLinkUrl("");
  };

  const btn = (title: string, onClick: () => void, content: React.ReactNode) => (
    <button
      key={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className="flex h-6 min-w-[24px] items-center justify-center rounded px-1 text-slate-600 hover:bg-white/60 transition"
    >
      {content}
    </button>
  );

  const sep = <div className="mx-0.5 h-3.5 w-px bg-slate-300/70" />;

  return (
    <div className={`flex flex-wrap items-center gap-0.5 border-b ${borderClass} px-2 py-1`}>
      {/* Block type */}
      <select
        onMouseDown={e => e.stopPropagation()}
        onChange={e => { focus(); exec("formatBlock", e.target.value); }}
        className="rounded border border-slate-200 bg-white/70 px-1 py-0.5 text-[11px] text-slate-600"
      >
        <option value="p">本文</option>
        <option value="blockquote">引用</option>
      </select>

      {sep}

      {btn("箇条書き（・）", () => exec("insertUnorderedList"),
        <span className="text-[11px] font-bold">•≡</span>)}
      {btn("番号リスト", () => exec("insertOrderedList"),
        <span className="text-[11px] font-bold">1.</span>)}
      {btn("チェックボックス", onInsertCheckLine,
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="5" width="4" height="4" rx="1"/><path d="m5 7 1 1 2-2"/>
          <line x1="10" y1="7" x2="21" y2="7"/>
          <rect x="3" y="13" width="4" height="4" rx="1"/>
          <line x1="10" y1="15" x2="21" y2="15"/>
        </svg>)}

      {sep}

      {btn("太字", () => exec("bold"),      <b className="text-xs">B</b>)}
      {btn("下線", () => exec("underline"), <u className="text-xs">U</u>)}

      {/* Font color */}
      <div className="relative">
        {btn("文字色", () => { saveRange(); setShowColors(v => !v); },
          <span className="flex flex-col items-center leading-none">
            <span className="text-xs font-bold">A</span>
            <span className="mt-0.5 h-0.5 w-3.5 rounded-sm bg-red-500" />
          </span>)}
        {showColors && (
          <div className="absolute left-0 top-7 z-30 flex gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl">
            {TEXT_COLORS.map(c => (
              <button
                key={c.val}
                onMouseDown={e => { e.preventDefault(); restoreRange(); exec("foreColor", c.val); setShowColors(false); }}
                title={c.label}
                className="rounded-full border border-slate-200 transition hover:scale-110"
                style={{ width: 18, height: 18, background: c.val === "inherit" ? "#1e293b" : c.val }}
              />
            ))}
          </div>
        )}
      </div>

      {sep}

      {/* Link */}
      <div className="relative">
        {btn("リンクを追加", () => {
          saveRange();
          if (!showLink) {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
              const rect = sel.getRangeAt(0).getBoundingClientRect();
              setLinkPos({ top: rect.top, left: rect.left + rect.width / 2 });
            } else if (cardRef.current) {
              const r = cardRef.current.getBoundingClientRect();
              setLinkPos({ top: r.top + r.height / 2, left: r.left + r.width / 2 });
            }
          }
          setShowLink(v => !v);
        },
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>)}
        {showLink && (
          <div
            className="fixed z-50 flex gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl"
            style={{ top: linkPos.top - 8, left: linkPos.left, transform: "translate(-50%, -100%)" }}
            onMouseDown={e => e.stopPropagation()}
          >
            <input
              autoFocus
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && applyLink()}
              placeholder="https://..."
              className="w-48 rounded border border-slate-200 px-2 py-1 text-xs outline-none focus:border-blue-400"
            />
            <button
              onMouseDown={e => { e.preventDefault(); applyLink(); }}
              className="rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700"
            >追加</button>
          </div>
        )}
      </div>

      {sep}

      {btn("ファイルを添付", onAttachFile,
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
        </svg>
      )}
    </div>
  );
}

// ── MemoCard ──────────────────────────────────────────────────────────────────

interface CardProps {
  memo: StickyMemo;
  categories: MemoCategory[];
  isDragging: boolean;
  isDragOver: boolean;
  onUpdate: (patch: Partial<StickyMemo>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver:  (e: React.DragEvent) => void;
  onDrop:      (e: React.DragEvent) => void;
  onDragEnd:   () => void;
}

function MemoCard({
  memo, categories,
  isDragging, isDragOver,
  onUpdate, onDelete, onDuplicate,
  onDragStart, onDragOver, onDrop, onDragEnd,
}: CardProps) {
  const cardRef      = useRef<HTMLDivElement>(null);
  const editorRef    = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFocused,          setIsFocused]          = useState(false);
  const [selectedImg,        setSelectedImg]        = useState<HTMLImageElement | null>(null);
  const [showColorPicker,    setShowColorPicker]    = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [copied,             setCopied]             = useState(false);
  const [confirmDelete,      setConfirmDelete]      = useState(false);
  const [linkPreview, setLinkPreview] = useState<{ href: string; x: number; y: number } | null>(null);

  const category = categories.find(cat => cat.id === memo.categoryId);
  const c        = getCardScheme(memo, category);

  // Set initial HTML on mount (and when id changes — e.g. after duplicate)
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = memo.content;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memo.id]);

  const handleInput = useCallback(() => {
    onUpdate({ content: editorRef.current?.innerHTML ?? "", updatedAt: Date.now() });
  }, [onUpdate]);

  // Insert check-line at cursor
  const insertCheckLine = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();

    const div = document.createElement("div");
    div.className = "check-line";
    const cb = document.createElement("span");
    cb.className = "note-checkbox";
    cb.contentEditable = "false";
    cb.dataset.checked = "false";
    cb.textContent = "☐";
    const textSpan = document.createElement("span");
    textSpan.className = "check-text";
    div.appendChild(cb);
    div.appendChild(textSpan);

    let blockNode: Node | null = range.startContainer;
    while (blockNode && blockNode.parentNode !== editor) blockNode = blockNode.parentNode;
    if (blockNode && blockNode !== editor) {
      editor.insertBefore(div, blockNode.nextSibling);
    } else {
      editor.appendChild(div);
    }

    const r = document.createRange();
    r.setStart(textSpan, 0);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
    onUpdate({ content: editor.innerHTML, updatedAt: Date.now() });
  }, [onUpdate]);

  // Handle Enter inside check-lines
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    let node: Node | null = sel.getRangeAt(0).startContainer;
    let checkLine: HTMLElement | null = null;
    while (node && node !== editorRef.current) {
      if (node instanceof HTMLElement && node.classList.contains("check-line")) { checkLine = node; break; }
      node = node.parentNode;
    }
    if (!checkLine) return;
    e.preventDefault();
    const lineText = (checkLine.textContent ?? "").replace(/[☐☑]/g, "").trim();
    if (!lineText) {
      const p = document.createElement("p");
      p.innerHTML = "<br>";
      checkLine.replaceWith(p);
      const r = document.createRange();
      r.setStart(p, 0); r.collapse(true);
      sel.removeAllRanges(); sel.addRange(r);
    } else {
      const newLine = document.createElement("div");
      newLine.className = "check-line";
      const cb2 = document.createElement("span");
      cb2.className = "note-checkbox"; cb2.contentEditable = "false";
      cb2.dataset.checked = "false"; cb2.textContent = "☐";
      const ts2 = document.createElement("span");
      ts2.className = "check-text";
      newLine.appendChild(cb2); newLine.appendChild(ts2);
      checkLine.after(newLine);
      const r = document.createRange();
      r.setStart(ts2, 0); r.collapse(true);
      sel.removeAllRanges(); sel.addRange(r);
    }
    onUpdate({ content: editorRef.current?.innerHTML ?? "", updatedAt: Date.now() });
  }, [onUpdate]);

  // Paste image from clipboard
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData?.items ?? []);
    const imgItem = items.find(it => it.type.startsWith("image/"));
    if (!imgItem) return;
    e.preventDefault();
    const file = imgItem.getAsFile();
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      const img = document.createElement("img");
      img.src = dataUrl;
      img.style.maxWidth = "100%";
      img.style.width = "360px";
      img.className = "memo-image";
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        range.insertNode(img);
        range.setStartAfter(img);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        editorRef.current?.appendChild(img);
      }
      onUpdate({ content: editorRef.current?.innerHTML ?? "", updatedAt: Date.now() });
    };
    reader.readAsDataURL(file);
  }, [onUpdate]);

  // File attachment handler
  const handleFileAttach = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(file => {
      const isImage = file.type.startsWith("image/");
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target?.result as string;
        if (isImage) {
          const img = document.createElement("img");
          img.src = dataUrl;
          img.style.maxWidth = "100%";
          img.style.width = "360px";
          img.className = "memo-image";
          editorRef.current?.appendChild(img);
          onUpdate({ content: editorRef.current?.innerHTML ?? "", updatedAt: Date.now() });
        } else {
          const newFile = { id: `f${Date.now()}`, name: file.name, size: file.size, dataUrl: undefined };
          onUpdate({ files: [...(memo.files ?? []), newFile], updatedAt: Date.now() });
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }, [onUpdate, memo.files]);

  // Toggle checkboxes / open link preview
  const handleClick = useCallback((e: React.MouseEvent) => {
    const el = e.target as HTMLElement;
    if (el.tagName === "IMG") {
      setSelectedImg(el as HTMLImageElement);
      return;
    }
    setSelectedImg(null);
    if (el.classList.contains("note-checkbox")) {
      const checked = el.dataset.checked === "true";
      el.dataset.checked = checked ? "false" : "true";
      el.textContent = checked ? "☐" : "☑";
      onUpdate({ content: editorRef.current?.innerHTML ?? "", updatedAt: Date.now() });
      return;
    }
    const anchor = el.closest("a") as HTMLAnchorElement | null;
    if (anchor?.href) {
      e.preventDefault();
      const rect = anchor.getBoundingClientRect();
      setLinkPreview({ href: anchor.href, x: rect.left + rect.width / 2, y: rect.top });
    } else {
      setLinkPreview(null);
    }
  }, [onUpdate]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = editorRef.current?.innerText ?? memo.content.replace(/<[^>]+>/g, "");
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  // Track focus-within for the editing area (toolbar + editor)
  const handleFocusIn  = () => setIsFocused(true);
  const handleFocusOut = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsFocused(false);
  };

  return (
    <div
      ref={cardRef}
      draggable={!isFocused}
      onDragStart={!isFocused ? onDragStart : undefined}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`group break-inside-avoid mb-4 rounded-2xl border shadow-sm transition-all
        ${c.body} ${c.border}
        ${isDragging ? "opacity-40 scale-95" : "hover:shadow-md"}
        ${isDragOver ? "ring-2 ring-blue-400 ring-offset-1" : ""}
      `}
    >
      {/* ── Header strip ── */}
      <div className={`flex items-center gap-1 rounded-t-2xl px-2 py-2 ${c.header}`}>
        {/* Drag grip */}
        <span className={`shrink-0 cursor-grab opacity-0 transition group-hover:opacity-40 active:cursor-grabbing ${c.headerText}`} title="ドラッグして並び替え">
          <GripIcon />
        </span>

        {/* Color picker dot */}
        <div className="relative shrink-0">
          <button
            onClick={e => { e.stopPropagation(); setShowColorPicker(v => !v); setShowCategoryPicker(false); }}
            className={`h-3.5 w-3.5 rounded-full ${c.dot} ring-1 ring-white/60 transition hover:scale-110`}
            title="付箋の色を変更"
          />
          {showColorPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowColorPicker(false)} />
              <div className="absolute left-0 top-5 z-50 flex gap-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                {MEMO_COLORS.map(mc => (
                  <button
                    key={mc.id}
                    onClick={() => { onUpdate({ color: mc.id, updatedAt: Date.now() }); setShowColorPicker(false); }}
                    className={`h-5 w-5 rounded-full ${mc.dot} transition hover:scale-110 ${memo.color === mc.id ? "ring-2 ring-offset-1 ring-slate-400" : ""}`}
                    title={mc.id}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Category badge */}
        <div className="relative min-w-0 flex-1">
          <button
            onClick={e => { e.stopPropagation(); setShowCategoryPicker(v => !v); setShowColorPicker(false); }}
            className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold transition hover:bg-white/20 ${c.headerText}`}
          >
            {category ? (
              <span className="truncate">{category.name}</span>
            ) : (
              <span className="opacity-50">カテゴリなし</span>
            )}
          </button>
          {showCategoryPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowCategoryPicker(false)} />
              <div className="absolute left-0 top-6 z-50 min-w-[140px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                <button
                  onClick={() => { onUpdate({ categoryId: undefined, updatedAt: Date.now() }); setShowCategoryPicker(false); }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 ${!memo.categoryId ? "font-semibold text-slate-700" : "text-slate-400"}`}
                >
                  カテゴリなし
                  {!memo.categoryId && <span className="ml-auto"><CheckIcon /></span>}
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { onUpdate({ categoryId: cat.id, updatedAt: Date.now() }); setShowCategoryPicker(false); }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 ${memo.categoryId === cat.id ? "font-semibold text-slate-700" : "text-slate-600"}`}
                  >
                    <span className={`h-2 w-2 shrink-0 rounded-full ${cat.color}`} />
                    <span className="flex-1 text-left">{cat.name}</span>
                    {memo.categoryId === cat.id && <CheckIcon />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pin button */}
        <button
          onClick={e => { e.stopPropagation(); onUpdate({ pinned: !memo.pinned, updatedAt: Date.now() }); }}
          title={memo.pinned ? "ピン止めを解除" : "ピン止め"}
          className={`shrink-0 rounded p-1 transition ${
            memo.pinned
              ? "text-amber-300 hover:text-amber-200"
              : `opacity-0 group-hover:opacity-70 ${c.headerText} hover:opacity-100`
          }`}
        >
          <PinIcon filled={memo.pinned} />
        </button>

        {/* Hover actions */}
        <div className={`flex shrink-0 items-center gap-0.5 opacity-0 transition group-hover:opacity-80 ${c.headerText}`}>
          <button onClick={handleCopy} title="コピー" className="rounded p-1 hover:bg-white/20">
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>
          <button onClick={e => { e.stopPropagation(); onDuplicate(); }} title="複製" className="rounded p-1 hover:bg-white/20">
            <DuplicateIcon />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
              <span className="text-[10px] opacity-80">削除？</span>
              <button onClick={onDelete} className="rounded px-1.5 py-0.5 text-[10px] font-semibold hover:bg-white/20">はい</button>
              <button onClick={() => setConfirmDelete(false)} className="rounded px-1.5 py-0.5 text-[10px] opacity-70 hover:bg-white/20">いいえ</button>
            </div>
          ) : (
          <button onClick={e => { e.stopPropagation(); setConfirmDelete(true); }} title="削除" className="rounded p-1 hover:bg-white/20 hover:text-red-300">
            <TrashIcon />
          </button>
          )}
        </div>
      </div>

      {/* ── Editor area (focus-tracked wrapper) ── */}
      <div onFocus={handleFocusIn} onBlur={handleFocusOut}>
        {/* Toolbar — visible when focused */}
        {isFocused && (
          <MemoToolbar
            editorRef={editorRef}
            cardRef={cardRef}
            borderClass={c.border}
            onInsertCheckLine={insertCheckLine}
            onAttachFile={() => fileInputRef.current?.click()}
          />
        )}

        {/* Rich text editor */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          onPaste={handlePaste}
          className="note-editor min-h-[160px] px-3 py-3 text-sm text-slate-700 outline-none"
          data-placeholder="ここに入力..."
        />

        {/* Image resize toolbar */}
        {selectedImg && (
          <div className="flex items-center gap-1 border-t border-slate-100 px-2 py-1.5">
            <span className="text-[10px] text-slate-400 mr-1">画像サイズ:</span>
            {([["小", "160px"], ["中", "280px"], ["大", "100%"]] as [string, string][]).map(([label, w]) => (
              <button
                key={label}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectedImg.style.width = w;
                  selectedImg.style.maxWidth = "100%";
                  onUpdate({ content: editorRef.current?.innerHTML ?? "", updatedAt: Date.now() });
                }}
                className="rounded px-2 py-0.5 text-[10px] text-slate-600 hover:bg-slate-100"
              >{label}</button>
            ))}
            <button
              onMouseDown={(e) => { e.preventDefault(); setSelectedImg(null); }}
              className="ml-auto rounded p-0.5 text-slate-300 hover:text-slate-500"
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        )}

        {/* Link preview popup */}
        {linkPreview && (
          <div
            className="fixed z-50 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-xl text-sm"
            style={{ top: linkPreview.y - 8, left: linkPreview.x, transform: "translate(-50%, -100%)" }}
            onMouseDown={e => e.stopPropagation()}
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            <a href={linkPreview.href} target="_blank" rel="noopener noreferrer"
              className="max-w-[240px] truncate text-blue-600 hover:underline">
              {linkPreview.href}
            </a>
            <button onClick={() => setLinkPreview(null)} className="ml-1 text-slate-300 hover:text-slate-500">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        )}
      </div>

      {/* File attachments */}
      {(memo.files?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-slate-100/60 px-3 py-2">
          {memo.files!.map(f => (
            <div key={f.id} className="flex items-center gap-1 rounded-full bg-white/60 border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600">
              <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
              <span className="max-w-[120px] truncate">{f.name}</span>
              <button
                onClick={() => onUpdate({ files: memo.files!.filter(x => x.id !== f.id), updatedAt: Date.now() })}
                className="ml-0.5 text-slate-300 hover:text-red-400"
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* Date footer */}
      <p className="px-3 pb-2 text-[10px] text-slate-300">{fmtDate(memo.updatedAt)}</p>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="*/*" multiple className="hidden" onChange={handleFileAttach} />
    </div>
  );
}

// ── Main MemoView ─────────────────────────────────────────────────────────────

interface Props {
  memos: StickyMemo[];
  categories: MemoCategory[];
  filterCategoryId: string | null;
  onUpdateMemo: (id: string, patch: Partial<StickyMemo>) => void;
  onDeleteMemo: (id: string) => void;
  onDuplicateMemo: (id: string) => void;
  onReorderMemo: (dragId: string, targetId: string) => void;
}

export default function MemoView({
  memos, categories, filterCategoryId,
  onUpdateMemo, onDeleteMemo, onDuplicateMemo, onReorderMemo,
}: Props) {
  const [search, setSearch] = useState("");
  const [dragId,      setDragId]      = useState<string | null>(null);
  const [dragOverId,  setDragOverId]  = useState<string | null>(null);
  const [dragSection, setDragSection] = useState<"pinned" | "regular" | null>(null);

  const filtered = memos.filter(m => {
    if (filterCategoryId !== null && m.categoryId !== filterCategoryId) return false;
    if (search) {
      const q    = search.toLowerCase();
      const text = m.content.replace(/<[^>]+>/g, "");
      if (!text.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const pinnedMemos  = filtered.filter(m =>  m.pinned);
  const regularMemos = filtered.filter(m => !m.pinned);

  const handleDragStart = (e: React.DragEvent, id: string, section: "pinned" | "regular") => {
    e.dataTransfer.effectAllowed = "move";
    setDragId(id); setDragSection(section);
  };
  const handleDragOver = (e: React.DragEvent, id: string, section: "pinned" | "regular") => {
    if (dragSection !== section) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragId !== id) setDragOverId(id);
  };
  const handleDrop = (e: React.DragEvent, targetId: string, targetSection: "pinned" | "regular") => {
    e.preventDefault();
    if (!dragId || dragSection !== targetSection || dragId === targetId) {
      setDragId(null); setDragOverId(null); setDragSection(null); return;
    }
    onReorderMemo(dragId, targetId);
    setDragId(null); setDragOverId(null); setDragSection(null);
  };
  const handleDragEnd = () => { setDragId(null); setDragOverId(null); setDragSection(null); };

  const renderSection = (list: StickyMemo[], section: "pinned" | "regular") => (
    <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
      {list.map(memo => (
        <MemoCard
          key={memo.id}
          memo={memo}
          categories={categories}
          isDragging={dragId === memo.id}
          isDragOver={dragOverId === memo.id}
          onUpdate={patch => onUpdateMemo(memo.id, patch)}
          onDelete={() => onDeleteMemo(memo.id)}
          onDuplicate={() => onDuplicateMemo(memo.id)}
          onDragStart={e => handleDragStart(e, memo.id, section)}
          onDragOver={e => handleDragOver(e, memo.id, section)}
          onDrop={e => handleDrop(e, memo.id, section)}
          onDragEnd={handleDragEnd}
        />
      ))}
    </div>
  );

  const isEmpty = pinnedMemos.length === 0 && regularMemos.length === 0;

  return (
    <div className="min-h-full px-8 py-6">
      {/* Search */}
      <div className="mb-5 flex items-center gap-3">
        <div className="relative">
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="メモを検索..."
            className="rounded-full border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs outline-none focus:border-blue-400"
          />
        </div>
        {search && <span className="text-xs text-slate-400">{pinnedMemos.length + regularMemos.length}件</span>}
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="mb-3 text-5xl">📝</span>
          <p className="text-base font-semibold text-slate-500">メモはまだありません</p>
          <p className="mt-1 text-sm text-slate-400">サイドバーの「メモを追加」から作成できます</p>
        </div>
      ) : (
        <>
          {pinnedMemos.length > 0 && (
            <div className="mb-2">
              <div className="mb-3 flex items-center gap-1.5">
                <span className="text-amber-500"><PinIcon filled /></span>
                <span className="text-xs font-semibold text-slate-400">ピン止め</span>
              </div>
              {renderSection(pinnedMemos, "pinned")}
              {regularMemos.length > 0 && <div className="mb-5 mt-1 border-t border-slate-200" />}
            </div>
          )}
          {regularMemos.length > 0 && renderSection(regularMemos, "regular")}
        </>
      )}
    </div>
  );
}
