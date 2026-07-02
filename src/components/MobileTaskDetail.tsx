import { useState, useRef, useEffect, useCallback } from "react";
import type { NoteMemo, Person, Project, RepeatMode, Task } from "../types";
import { repeatLabels, defaultProjects, people as defaultPeople } from "../data";
import { AvatarDisplay } from "../avatarIcons";
import CustomRepeatModal from "./CustomRepeatModal";

interface Props {
  task: Task;
  projects?: Project[];
  people?: Person[];
  onAddPerson?: (name: string, avatar: string) => void;
  onUpdate: (patch: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onClose: () => void;
}

const FONT_SIZE_OPTIONS = [
  { label: "小", val: "11px" },
  { label: "標準", val: "14px" },
  { label: "大", val: "18px" },
  { label: "特大", val: "24px" },
];

function emptyMemo(): NoteMemo {
  return { id: `m${Date.now()}`, label: "メモ①", html: "", checklist: [], attachments: [] };
}

export default function MobileTaskDetail({
  task,
  projects: propProjects,
  people: propPeople,
  onAddPerson,
  onUpdate,
  onDelete,
  onToggle,
  onClose,
}: Props) {
  const projects = propProjects ?? defaultProjects;
  const people   = propPeople  ?? defaultPeople;

  const [title, setTitle]     = useState(task.title);
  const [newSub, setNewSub]   = useState("");
  const [deletingSubId, setDeletingSubId] = useState<string | null>(null);

  const memoEditorRef  = useRef<HTMLDivElement>(null);
  const savedRangeRef  = useRef<Range | null>(null);
  const [blockType, setBlockType] = useState("p");
  const [showLink, setShowLink]   = useState(false);
  const [linkUrl, setLinkUrl]     = useState("");
  const [fontSize, setFontSize]   = useState("14px");

  useEffect(() => { setTitle(task.title); }, [task.id, task.title]);

  // Initialize editor HTML when task changes
  useEffect(() => {
    if (memoEditorRef.current) {
      memoEditorRef.current.innerHTML = task.memos?.[0]?.html ?? "";
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  // Track block type from selection
  useEffect(() => {
    const update = () => {
      if (!memoEditorRef.current) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
      while (node && node !== memoEditorRef.current) {
        if ((node as Element).tagName === "BLOCKQUOTE") { setBlockType("blockquote"); return; }
        node = node.parentNode;
      }
      setBlockType("p");
    };
    document.addEventListener("selectionchange", update);
    return () => document.removeEventListener("selectionchange", update);
  }, []);

  const [showRepeat, setShowRepeat]             = useState(false);
  const [showOwner, setShowOwner]               = useState(false);
  const [newPersonName, setNewPersonName]       = useState("");
  const [showCustomRepeat, setShowCustomRepeat] = useState(false);
  const [confirmDelete, setConfirmDelete]       = useState(false);

  // Lock background scroll while sheet is open
  useEffect(() => {
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const sheetRef = useRef<HTMLDivElement>(null);

  const saveTitle = () => {
    const t = title.trim();
    if (t && t !== task.title) onUpdate({ title: t });
    else setTitle(task.title);
  };

  // Save editor HTML to task.memos
  const saveHtml = useCallback(() => {
    const html = memoEditorRef.current?.innerHTML ?? "";
    const first = task.memos?.[0];
    const updated: NoteMemo = first ? { ...first, html } : emptyMemo();
    updated.html = html;
    const rest = task.memos?.slice(1) ?? [];
    onUpdate({ memos: [updated, ...rest] });
  }, [task.memos, onUpdate]);

  // Rich editor helpers
  const execCmd = (cmd: string, val?: string) => {
    memoEditorRef.current?.focus();
    document.execCommand(cmd, false, val);
  };

  const applyBlockFormat = (val: string) => {
    memoEditorRef.current?.focus();
    if (val === "p") {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
        while (node && node !== memoEditorRef.current) {
          if ((node as Element).tagName === "BLOCKQUOTE") {
            const bq = node as Element;
            const frag = document.createDocumentFragment();
            while (bq.firstChild) frag.appendChild(bq.firstChild);
            bq.parentNode!.replaceChild(frag, bq);
            setBlockType("p");
            return;
          }
          node = node.parentNode;
        }
      }
      document.execCommand("formatBlock", false, "p");
    } else {
      document.execCommand("formatBlock", false, val);
    }
    setBlockType(val);
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
    if (linkUrl.trim()) execCmd("createLink", linkUrl.trim());
    setShowLink(false);
    setLinkUrl("");
    saveHtml();
  };

  const applyFontSize = (size: string) => {
    memoEditorRef.current?.focus();
    document.execCommand("fontSize", false, "7");
    memoEditorRef.current?.querySelectorAll('font[size="7"]').forEach((font) => {
      const span = document.createElement("span");
      span.style.fontSize = size;
      span.innerHTML = (font as HTMLElement).innerHTML;
      font.parentNode?.replaceChild(span, font);
    });
    setFontSize(size);
    saveHtml();
  };

  // Toolbar button helper
  const tbBtn = (label: string, onPress: () => void, content: React.ReactNode) => (
    <button
      key={label}
      onPointerDown={(e) => { e.preventDefault(); onPress(); }}
      className="flex h-8 min-w-[32px] items-center justify-center rounded px-1.5 text-slate-600 active:bg-slate-200"
      title={label}
    >
      {content}
    </button>
  );

  const dueFmt = () => {
    if (!task.due) return null;
    const d = new Date(task.due + "T00:00:00");
    const wd = ["日","月","火","水","木","金","土"][d.getDay()];
    return `${d.getMonth()+1}/${d.getDate()} (${wd})`;
  };
  void dueFmt;

  const ownerPerson = people.find((p) => p.id === task.owner);
  const projectObj  = projects.find((p) => p.id === task.project);

  return (
    <>
      {/* Backdrop */}
      <div
        className="md:hidden fixed inset-0 z-50 bg-black/40"
        style={{ touchAction: "none" }}
        onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
      />

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        className="md:hidden fixed bottom-0 left-0 right-0 z-[51] flex flex-col bg-white rounded-t-2xl shadow-2xl"
        style={{ maxHeight: "92dvh", paddingBottom: "env(safe-area-inset-bottom)" }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex shrink-0 justify-center pt-2.5 pb-1">
          <div className="h-1 w-10 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-3 py-2.5">
          <button
            onClick={() => onToggle(task.id)}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${
              task.done ? "border-blue-500 bg-blue-500 text-white" : "border-slate-300"
            }`}
          >
            {task.done && (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="m20 6-11 11-5-5"/>
              </svg>
            )}
          </button>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className={`min-w-0 flex-1 bg-transparent font-semibold text-slate-800 outline-none placeholder:text-slate-300 ${task.done ? "line-through text-slate-400" : ""}`}
            style={{ fontSize: "16px" }}
            placeholder="タスク名"
          />
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 active:bg-slate-100"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div
          className="flex-1 overflow-y-auto divide-y divide-slate-100"
          style={{ overscrollBehavior: "contain" }}
        >
          {/* 日付 + 時間 */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
            <input
              type="date"
              value={task.due ?? ""}
              onChange={(e) => onUpdate(e.target.value ? { due: e.target.value } : { due: "", dueTime: undefined })}
              className="flex-1 border-0 bg-transparent text-sm text-slate-700 outline-none"
              style={{ colorScheme: "light", fontSize: "16px" }}
            />
            {task.due && (
              <input
                type="time"
                value={task.dueTime ?? ""}
                onChange={(e) => onUpdate({ dueTime: e.target.value || undefined })}
                className="w-24 border-0 bg-transparent text-sm text-slate-700 outline-none"
                style={{ colorScheme: "light", fontSize: "16px" }}
              />
            )}
          </div>

          {/* 繰り返し */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
            <button onClick={() => setShowRepeat(true)} className="flex-1 text-left text-sm text-slate-700">
              {repeatLabels[task.repeat ?? "none"]}
            </button>
          </div>

          {/* プロジェクト */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <select
              value={task.project ?? ""}
              onChange={(e) => onUpdate({ project: e.target.value })}
              className="flex-1 border-0 bg-transparent text-sm text-slate-700 outline-none"
              style={{ fontSize: "16px" }}
            >
              <option value="">プロジェクトなし</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            {projectObj && <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${projectObj.color}`} />}
          </div>

          {/* 担当者 */}
          <div className="flex items-center gap-3 px-4 py-3.5" onClick={() => setShowOwner(true)}>
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            {ownerPerson ? (
              <span className="flex flex-1 items-center gap-2 text-sm text-slate-700">
                <AvatarDisplay avatar={ownerPerson.avatar} name={ownerPerson.name} size={20} />
                {ownerPerson.name.replace("（自分）", "")}
              </span>
            ) : (
              <span className="flex-1 text-sm text-slate-400">所有者を選択</span>
            )}
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </div>

          {/* メモ（リッチエディタ） */}
          <div className="px-3 py-3">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-0.5 rounded-t-xl border border-b-0 border-slate-200 bg-slate-50 px-2 py-1">
              {/* Block type */}
              <select
                value={blockType}
                onChange={(e) => applyBlockFormat(e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs text-slate-600"
                style={{ fontSize: "13px" }}
              >
                <option value="p">本文</option>
                <option value="blockquote">引用</option>
              </select>

              <div className="mx-1 h-4 w-px bg-slate-200" />

              {tbBtn("太字", () => execCmd("bold"), <b className="text-sm">B</b>)}
              {tbBtn("下線", () => execCmd("underline"), <u className="text-sm">U</u>)}

              <div className="mx-1 h-4 w-px bg-slate-200" />

              {/* Font size */}
              <select
                value={fontSize}
                onChange={(e) => applyFontSize(e.target.value)}
                onPointerDown={(e) => e.stopPropagation()}
                className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs text-slate-600"
                style={{ fontSize: "13px" }}
              >
                {FONT_SIZE_OPTIONS.map((o) => (
                  <option key={o.val} value={o.val}>{o.label}</option>
                ))}
              </select>

              <div className="mx-1 h-4 w-px bg-slate-200" />

              {/* Link */}
              {tbBtn("リンク", () => { saveRange(); setShowLink((v) => !v); },
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              )}

              {/* Bullet list */}
              {tbBtn("箇条書き", () => execCmd("insertUnorderedList"),
                <span className="text-xs font-bold">•≡</span>)}

              {/* Checkbox */}
              {tbBtn("チェック", () => {
                const editor = memoEditorRef.current;
                if (!editor) return;
                editor.focus();
                const sel = window.getSelection();
                if (!sel || !sel.rangeCount) return;
                const range = sel.getRangeAt(0);
                range.deleteContents();
                const div = document.createElement("div");
                div.className = "check-line";
                const cb = document.createElement("span");
                cb.className = "note-checkbox"; cb.contentEditable = "false";
                cb.dataset.checked = "false"; cb.textContent = "☐";
                const ts = document.createElement("span"); ts.className = "check-text";
                div.appendChild(cb); div.appendChild(ts);
                let block: Node | null = range.startContainer;
                while (block && block.parentNode !== editor) block = block.parentNode;
                if (block && block !== editor) editor.insertBefore(div, block.nextSibling);
                else editor.appendChild(div);
                const r = document.createRange();
                r.setStart(ts, 0); r.collapse(true);
                sel.removeAllRanges(); sel.addRange(r);
                saveHtml();
              },
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="4" height="4" rx="1"/><path d="m5 7 1 1 2-2"/><line x1="10" y1="7" x2="21" y2="7"/><rect x="3" y="13" width="4" height="4" rx="1"/><line x1="10" y1="15" x2="21" y2="15"/></svg>
              )}
            </div>

            {/* Link URL input */}
            {showLink && (
              <div className="flex items-center gap-1 border border-t-0 border-slate-200 bg-white px-2 py-2">
                <input
                  autoFocus
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyLink()}
                  placeholder="https://..."
                  className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-400"
                  style={{ fontSize: "16px" }}
                />
                <button
                  onPointerDown={(e) => { e.preventDefault(); applyLink(); }}
                  className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  追加
                </button>
                <button
                  onPointerDown={(e) => { e.preventDefault(); setShowLink(false); setLinkUrl(""); }}
                  className="rounded px-2 py-1.5 text-xs text-slate-400 active:bg-slate-100"
                >
                  ×
                </button>
              </div>
            )}

            {/* contentEditable editor */}
            <div
              ref={memoEditorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={saveHtml}
              onClick={(e) => {
                const el = e.target as HTMLElement;
                if (el.classList.contains("note-checkbox")) {
                  const checked = el.dataset.checked === "true";
                  el.dataset.checked = checked ? "false" : "true";
                  el.textContent = checked ? "☐" : "☑";
                  saveHtml();
                }
              }}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text/plain").trim();
                if (/^https?:\/\/\S+$/.test(text)) {
                  e.preventDefault();
                  const a = document.createElement("a");
                  a.href = text; a.textContent = text;
                  const sel = window.getSelection();
                  if (sel && sel.rangeCount > 0) {
                    const r = sel.getRangeAt(0);
                    r.deleteContents(); r.insertNode(a);
                    r.setStartAfter(a); r.collapse(true);
                    sel.removeAllRanges(); sel.addRange(r);
                  } else {
                    memoEditorRef.current?.appendChild(a);
                  }
                  saveHtml();
                }
              }}
              className="note-editor min-h-[140px] rounded-b-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none"
              data-placeholder="メモを追加"
              style={{ fontSize: "16px", lineHeight: "1.65" }}
            />
          </div>

          {/* サブタスク */}
          <div className="px-4 py-3">
            <p className="mb-2 text-xs font-semibold text-slate-400">サブタスク</p>
            <div className="space-y-1">
              {(task.subtasks ?? []).map((s) => (
                <div key={s.id} className="flex items-center gap-2.5 py-1">
                  <button
                    onClick={() => onUpdate({ subtasks: (task.subtasks ?? []).map((x) => x.id === s.id ? { ...x, done: !x.done } : x) })}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                      s.done ? "border-slate-400 bg-slate-400 text-white" : "border-slate-300"
                    }`}
                  >
                    {s.done && (
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m20 6-11 11-5-5"/>
                      </svg>
                    )}
                  </button>
                  <span className={`flex-1 text-sm ${s.done ? "text-slate-400 line-through" : "text-slate-700"}`}>{s.title}</span>
                  {deletingSubId === s.id ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => { onUpdate({ subtasks: (task.subtasks ?? []).filter((x) => x.id !== s.id) }); setDeletingSubId(null); }}
                        className="rounded-md bg-red-500 px-2.5 py-1 text-xs font-semibold text-white active:bg-red-600"
                      >削除</button>
                      <button
                        onClick={() => setDeletingSubId(null)}
                        className="rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-500 active:bg-slate-200"
                      >×</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingSubId(s.id)}
                      className="text-slate-300 active:text-red-400"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <div className="flex items-center gap-2.5 py-1">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-slate-400">
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                </span>
                <input
                  value={newSub}
                  onChange={(e) => setNewSub(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newSub.trim()) {
                      onUpdate({ subtasks: [...(task.subtasks ?? []), { id: `sub${Date.now()}`, title: newSub.trim(), done: false }] });
                      setNewSub("");
                    }
                  }}
                  placeholder="タスクを追加"
                  className="flex-1 border-0 bg-transparent text-sm text-slate-500 outline-none placeholder:text-slate-400"
                  style={{ fontSize: "16px" }}
                />
              </div>
            </div>
          </div>

          {/* 削除 */}
          <div className="px-4 py-4">
            {confirmDelete ? (
              <div className="flex gap-2">
                <button onClick={() => { onDelete(task.id); onClose(); }}
                  className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white active:bg-red-600">
                  削除する
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-600 active:bg-slate-200">
                  キャンセル
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-red-500 active:bg-red-50">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
                タスクを削除
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 繰り返しシート */}
      {showRepeat && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/40" onClick={() => setShowRepeat(false)}>
          <div className="w-full rounded-t-2xl bg-white pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto my-3 h-1 w-10 rounded-full bg-slate-300" />
            <p className="px-4 pb-2 text-sm font-semibold text-slate-500">繰り返し</p>
            {(Object.keys(repeatLabels) as RepeatMode[]).map((r) => (
              <button
                key={r}
                onClick={() => {
                  if (r === "custom") { setShowRepeat(false); setShowCustomRepeat(true); }
                  else { onUpdate({ repeat: r }); setShowRepeat(false); }
                }}
                className={`flex w-full items-center justify-between px-4 py-3 text-sm transition active:bg-slate-50 ${task.repeat === r || (!task.repeat && r === "none") ? "font-semibold text-blue-600" : "text-slate-700"}`}
              >
                {repeatLabels[r]}
                {(task.repeat === r || (!task.repeat && r === "none")) && (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m20 6-11 11-5-5"/>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 担当者シート */}
      {showOwner && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/40" onClick={() => setShowOwner(false)}>
          <div className="w-full rounded-t-2xl bg-white pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto my-3 h-1 w-10 rounded-full bg-slate-300" />
            <p className="px-4 pb-2 text-sm font-semibold text-slate-500">所有者</p>
            {people.map((p) => (
              <button
                key={p.id}
                onClick={() => { onUpdate({ owner: p.id }); setShowOwner(false); }}
                className={`flex w-full items-center gap-3 px-4 py-3 text-sm transition active:bg-slate-50 ${task.owner === p.id ? "font-semibold text-blue-600" : "text-slate-700"}`}
              >
                <AvatarDisplay avatar={p.avatar} name={p.name} size={24} />
                <span>{p.id === "me" ? "自分" : p.name}</span>
                {task.owner === p.id && (
                  <svg viewBox="0 0 24 24" className="ml-auto h-4 w-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m20 6-11 11-5-5"/>
                  </svg>
                )}
              </button>
            ))}
            {task.owner && (
              <button
                onClick={() => { onUpdate({ owner: undefined }); setShowOwner(false); }}
                className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-400 active:bg-slate-50"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-xs">×</span>
                解除
              </button>
            )}
            <div className="border-t border-slate-100 px-4 py-3">
              <div className="flex gap-2">
                <input
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  placeholder="名前を入力"
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                  style={{ fontSize: "16px" }}
                />
                <button
                  onClick={() => {
                    if (newPersonName.trim() && onAddPerson) {
                      onAddPerson(newPersonName.trim(), "icon:male-adult:#64748b");
                      setNewPersonName("");
                    }
                  }}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                >＋</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCustomRepeat && (
        <CustomRepeatModal
          due={task.due}
          repeat={task.repeat ?? "none"}
          repeatConfig={task.repeatConfig ?? { interval: 1, unit: "week", daysOfWeek: [], endType: "none" }}
          onChange={(r, cfg) => { onUpdate({ repeat: r, repeatConfig: cfg ?? task.repeatConfig }); }}
          onClose={() => setShowCustomRepeat(false)}
        />
      )}
    </>
  );
}
