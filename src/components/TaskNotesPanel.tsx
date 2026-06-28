import { useState, useRef, useCallback, useEffect } from "react";
import type { ChecklistItem, NoteAttachment, NoteMemo, Task } from "../types";

// ── helpers ────────────────────────────────────────────────────────────────

const MEMO_IDX = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];
let _uid = 1;
const uid = () => `n${_uid++}`;

const COLORS = [
  { label: "標準",   val: "inherit" },
  { label: "赤",     val: "#ef4444" },
  { label: "オレンジ", val: "#f97316" },
  { label: "黄",     val: "#eab308" },
  { label: "緑",     val: "#22c55e" },
  { label: "青",     val: "#3b82f6" },
  { label: "紫",     val: "#8b5cf6" },
];

function emptyMemo(idx: number): NoteMemo {
  return { id: uid(), label: `メモ${MEMO_IDX[idx] ?? `(${idx + 1})`}`, html: "", checklist: [], attachments: [] };
}

// ── Toolbar ────────────────────────────────────────────────────────────────

interface ToolbarProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
  cardRef: React.RefObject<HTMLDivElement | null>;
  onAttachFile: () => void;
  onInsertCheckLine: () => void;
}

function Toolbar({ editorRef, cardRef, onAttachFile, onInsertCheckLine }: ToolbarProps) {
  const [showColors, setShowColors] = useState(false);
  const [showLink, setShowLink]     = useState(false);
  const [linkUrl, setLinkUrl]       = useState("");
  const [linkPos, setLinkPos]       = useState({ top: 0, left: 0 });
  const savedRangeRef = useRef<Range | null>(null);

  const focus = () => editorRef.current?.focus();

  const exec = (cmd: string, val?: string) => {
    focus();
    document.execCommand(cmd, false, val);
  };

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

  // mouse-down prevents blur on editor before execCommand fires
  const btn = (title: string, onClick: () => void, content: React.ReactNode, active = false) => (
    <button
      key={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`flex h-7 min-w-[28px] items-center justify-center rounded px-1 text-sm transition ${active ? "bg-blue-100 text-blue-700" : "text-slate-600 hover:bg-slate-100"}`}
    >
      {content}
    </button>
  );

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-slate-100 bg-slate-50 px-2 py-1.5 rounded-t-xl">
      {/* Block type */}
      <select
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => { focus(); exec("formatBlock", e.target.value); }}
        className="rounded border border-slate-200 px-1 py-0.5 text-xs text-slate-600 bg-white"
      >
        <option value="p">本文</option>
        <option value="blockquote">引用ボックス</option>
      </select>

      <div className="mx-1 h-4 w-px bg-slate-200" />

      {/* Lists */}
      {btn("箇条書き（・）", () => exec("insertUnorderedList"),
        <span className="text-xs font-bold">•≡</span>)}
      {btn("番号リスト", () => exec("insertOrderedList"),
        <span className="text-xs font-bold">1.</span>)}
      {btn("チェックボックスを挿入", onInsertCheckLine,
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="4" height="4" rx="1"/><path d="m5 7 1 1 2-2"/><line x1="10" y1="7" x2="21" y2="7"/><rect x="3" y="13" width="4" height="4" rx="1"/><line x1="10" y1="15" x2="21" y2="15"/></svg>)}

      <div className="mx-1 h-4 w-px bg-slate-200" />

      {/* Text format */}
      {btn("太字", () => exec("bold"), <b className="text-sm">B</b>)}
      {btn("下線", () => exec("underline"), <u className="text-sm">U</u>)}

      {/* Color */}
      <div className="relative">
        {btn("文字色", () => { saveRange(); setShowColors((v) => !v); },
          <span className="flex flex-col items-center leading-none">
            <span className="text-xs font-bold">A</span>
            <span className="mt-0.5 h-1 w-4 rounded-sm bg-red-500" />
          </span>)}
        {showColors && (
          <div className="absolute left-0 top-8 z-30 flex gap-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
            {COLORS.map((c) => (
              <button key={c.val}
                onMouseDown={(e) => { e.preventDefault(); restoreRange(); exec("foreColor", c.val); setShowColors(false); }}
                title={c.label}
                className="h-5 w-5 rounded-full border border-slate-200 transition hover:scale-110"
                style={{ background: c.val === "inherit" ? "#1e293b" : c.val }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mx-1 h-4 w-px bg-slate-200" />

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
          setShowLink((v) => !v);
        },
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>)}
        {showLink && (
          <div className="fixed z-50 flex gap-1 rounded-xl border border-slate-200 bg-white p-3 shadow-2xl"
            style={{ top: linkPos.top - 8, left: linkPos.left, transform: "translate(-50%, -100%)" }}
            onMouseDown={(e) => e.stopPropagation()}>
            <input
              autoFocus
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyLink()}
              placeholder="https://..."
              className="w-52 rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-400"
            />
            <button onMouseDown={(e) => { e.preventDefault(); applyLink(); }}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700">
              追加
            </button>
          </div>
        )}
      </div>

      {/* File attach */}
      {btn("ファイルを添付", onAttachFile,
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
        </svg>)}
    </div>
  );
}

// ── Checklist ──────────────────────────────────────────────────────────────

function ChecklistSection({ items, onChange }: { items: ChecklistItem[]; onChange: (items: ChecklistItem[]) => void }) {
  const [newText, setNewText] = useState("");

  const toggle = (id: string) =>
    onChange(items.map((it) => it.id === id ? { ...it, checked: !it.checked } : it));
  const remove = (id: string) => onChange(items.filter((it) => it.id !== id));
  const updateText = (id: string, text: string) =>
    onChange(items.map((it) => it.id === id ? { ...it, text } : it));
  const add = () => {
    const t = newText.trim();
    if (!t) return;
    onChange([...items, { id: uid(), text: t, checked: false }]);
    setNewText("");
  };

  return (
    <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
      {items.map((it) => (
        <div key={it.id} className="group flex items-center gap-2">
          <input type="checkbox" checked={it.checked} onChange={() => toggle(it.id)}
            className="h-4 w-4 accent-blue-600 shrink-0" />
          <input
            value={it.text}
            onChange={(e) => updateText(it.id, e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            className={`flex-1 bg-transparent text-sm outline-none ${it.checked ? "text-slate-400 line-through" : "text-slate-700"}`}
          />
          <button onClick={() => remove(it.id)}
            className="hidden text-slate-300 hover:text-red-400 group-hover:block">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 shrink-0 rounded border border-dashed border-slate-300" />
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          placeholder="チェック項目を追加…"
          className="flex-1 bg-transparent text-sm text-slate-400 outline-none placeholder:text-slate-300 focus:text-slate-600"
        />
      </div>
    </div>
  );
}

// ── Attachment list ────────────────────────────────────────────────────────

function AttachmentList({ items, onRemove }: { items: NoteAttachment[]; onRemove: (id: string) => void }) {
  if (items.length === 0) return null;
  const fmt = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
  const ext = (name: string) => name.split(".").pop()?.toUpperCase() ?? "FILE";
  return (
    <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
      {items.map((a) => (
        <div key={a.id} className="group flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="w-10 shrink-0 rounded bg-slate-200 px-1 py-0.5 text-center text-[10px] font-bold text-slate-500">
            {ext(a.name)}
          </span>
          <a href={a.dataUrl} download={a.name}
            className="min-w-0 flex-1 truncate text-sm text-blue-600 hover:underline">
            {a.name}
          </a>
          <span className="shrink-0 text-xs text-slate-400">{fmt(a.size)}</span>
          <button onClick={() => onRemove(a.id)}
            className="hidden text-slate-300 hover:text-red-400 group-hover:block">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Single memo card ───────────────────────────────────────────────────────

interface MemoCardProps {
  memo: NoteMemo;
  index: number;
  onChange: (updated: NoteMemo) => void;
  onDelete: () => void;
}

function MemoCard({ memo, index: _index, onChange, onDelete }: MemoCardProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkPreview, setLinkPreview] = useState<{ href: string; x: number; y: number } | null>(null);

  // Sync HTML into state on user input
  const handleInput = useCallback(() => {
    onChange({ ...memo, html: editorRef.current?.innerHTML ?? "" });
  }, [memo, onChange]);

  // Insert a check-line div at the current cursor position
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
    // Text span for cursor anchor (no extra characters)
    const textSpan = document.createElement("span");
    textSpan.className = "check-text";
    div.appendChild(cb);
    div.appendChild(textSpan);

    // Insert after current block
    let blockNode: Node | null = range.startContainer;
    while (blockNode && blockNode.parentNode !== editor) blockNode = blockNode.parentNode;
    if (blockNode && blockNode !== editor) {
      editor.insertBefore(div, blockNode.nextSibling);
    } else {
      editor.appendChild(div);
    }

    // Place cursor inside the empty span
    const r = document.createRange();
    r.setStart(textSpan, 0);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
    onChange({ ...memo, html: editor.innerHTML });
  }, [memo, onChange]);

  // Toggle inline checkboxes on click / detect link clicks
  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    const el = e.target as HTMLElement;
    if (el.classList.contains("note-checkbox")) {
      const checked = el.dataset.checked === "true";
      el.dataset.checked = checked ? "false" : "true";
      el.textContent = checked ? "☐" : "☑";
      onChange({ ...memo, html: editorRef.current?.innerHTML ?? "" });
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
  }, [memo, onChange]);

  // Handle Enter inside check-line
  const handleEditorKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    // Walk up to find a .check-line ancestor
    let node: Node | null = sel.getRangeAt(0).startContainer;
    let checkLine: HTMLElement | null = null;
    while (node && node !== editorRef.current) {
      if (node instanceof HTMLElement && node.classList.contains("check-line")) {
        checkLine = node; break;
      }
      node = node.parentNode;
    }
    if (!checkLine) return;

    e.preventDefault();
    const lineText = (checkLine.textContent ?? "").replace(/[☐☑]/g, "").trim();

    if (!lineText) {
      // Empty check-line → exit to normal paragraph
      const p = document.createElement("p");
      p.innerHTML = "<br>";
      checkLine.replaceWith(p);
      const r = document.createRange();
      r.setStart(p, 0); r.collapse(true);
      sel.removeAllRanges(); sel.addRange(r);
    } else {
      // Non-empty → add new check-line after
      const newLine = document.createElement("div");
      newLine.className = "check-line";
      const cb2 = document.createElement("span");
      cb2.className = "note-checkbox";
      cb2.contentEditable = "false";
      cb2.dataset.checked = "false";
      cb2.textContent = "☐";
      const ts2 = document.createElement("span");
      ts2.className = "check-text";
            newLine.appendChild(cb2);
      newLine.appendChild(ts2);
      checkLine.after(newLine);
      const r = document.createRange();
      r.setStart(ts2, 0); r.collapse(true);
      sel.removeAllRanges(); sel.addRange(r);
    }
    onChange({ ...memo, html: editorRef.current?.innerHTML ?? "" });
  }, [memo, onChange]);

  // On mount, set initial HTML
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== memo.html) {
      editorRef.current.innerHTML = memo.html;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memo.id]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onChange({
        ...memo,
        attachments: [
          ...memo.attachments,
          { id: uid(), name: file.name, size: file.size, dataUrl: reader.result as string },
        ],
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div ref={cardRef} className="flex max-h-[70vh] flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Card header — fixed inside card */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3 py-2">
        <span className="text-xs font-semibold text-slate-500">{memo.label}</span>
        <button onClick={onDelete}
          className="text-slate-300 transition hover:text-red-400"
          title="このメモを削除">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* Toolbar — fixed inside card */}
      <div className="shrink-0">
        <Toolbar
          editorRef={editorRef}
          cardRef={cardRef}
          onAttachFile={() => fileInputRef.current?.click()}
          onInsertCheckLine={insertCheckLine}
        />
      </div>
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFile} />

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Rich-text editor */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleEditorKeyDown}
          onClick={handleEditorClick}
          className="note-editor min-h-[220px] px-3 py-2 text-sm text-slate-700 outline-none focus:outline-none"
          data-placeholder="ここに入力…"
        />

      {/* Link preview popup */}
      {linkPreview && (
        <div
          className="fixed z-50 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-xl text-sm"
          style={{ top: linkPreview.y - 8, left: linkPreview.x, transform: "translate(-50%, -100%)" }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          <a href={linkPreview.href} target="_blank" rel="noopener noreferrer"
            className="max-w-[240px] truncate text-blue-600 hover:underline">
            {linkPreview.href}
          </a>
          <button onClick={() => setLinkPreview(null)}
            className="ml-1 text-slate-300 hover:text-slate-500">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      )}

        {/* Attachments */}
        {memo.attachments.length > 0 && (
          <div className="px-3 pb-2">
            <AttachmentList
              items={memo.attachments}
              onRemove={(id) => onChange({ ...memo, attachments: memo.attachments.filter((a) => a.id !== id) })}
            />
          </div>
        )}
      </div>{/* end scrollable body */}
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────

interface Props {
  task: Task;
  onChangeMemos: (memos: NoteMemo[]) => void;
  onClose: () => void;
}

export default function TaskNotesPanel({ task, onChangeMemos, onClose }: Props) {
  const memos: NoteMemo[] = task.memos?.length ? task.memos : [emptyMemo(0)];

  const updateMemo = (idx: number, updated: NoteMemo) => {
    const next = memos.map((m, i) => (i === idx ? updated : m));
    onChangeMemos(next);
  };

  const deleteMemo = (idx: number) => {
    const next = memos.filter((_, i) => i !== idx);
    onChangeMemos(next.length ? next : [emptyMemo(0)]);
  };

  const addMemo = () => {
    onChangeMemos([...memos, emptyMemo(memos.length)]);
  };

  // project badge color from task
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
      {/* Panel header */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3 rounded-t-2xl">
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
        </svg>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">{task.title}</span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600" title="閉じる">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* Memo list */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {memos.map((memo, idx) => (
          <MemoCard
            key={memo.id}
            memo={memo}
            index={idx}
            onChange={(updated) => updateMemo(idx, updated)}
            onDelete={() => deleteMemo(idx)}
          />
        ))}

        {/* Add memo button */}
        <button
          onClick={addMemo}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-sm text-slate-400 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          メモを追加
        </button>
      </div>
    </div>
  );
}
