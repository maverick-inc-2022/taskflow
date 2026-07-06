import { useEffect, useRef, useState, memo } from "react";
import type { ReactNode } from "react";
import { repeatLabels, defaultProjects, people as defaultPeople } from "../data";
import type { Person, Project, RepeatMode, Task } from "../types";
import { StarIcon, XIcon, TrashIcon } from "../icons";
import { AvatarDisplay } from "../avatarIcons";
import CustomRepeatModal from "./CustomRepeatModal";
import { fileToCompressedDataUrl } from "../imageUtils";

// ── Memo expand editor (stable mount to avoid contentEditable re-render issues)
const MemoExpandEditor = memo(function MemoExpandEditor({
  expandRef,
  initialHtml,
  onSave,
  onPaste,
}: {
  expandRef: React.RefObject<HTMLDivElement | null>;
  initialHtml: string;
  onSave: (html: string) => void;
  onPaste: (e: React.ClipboardEvent) => void;
}) {
  useEffect(() => {
    if (expandRef.current) expandRef.current.innerHTML = initialHtml;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={expandRef}
      contentEditable
      suppressContentEditableWarning
      onInput={() => onSave(expandRef.current?.innerHTML ?? "")}
      onPaste={onPaste}
      onClick={(e) => {
        const el = e.target as HTMLElement;
        if (el.classList.contains("note-checkbox")) {
          const checked = el.dataset.checked === "true";
          el.dataset.checked = checked ? "false" : "true";
          el.textContent = checked ? "☐" : "☑";
          onSave(expandRef.current?.innerHTML ?? "");
          return;
        }
        const a = el.closest("a") as HTMLAnchorElement | null;
        if (a?.href) { e.preventDefault(); window.open(a.href, "_blank", "noopener,noreferrer"); }
      }}
      className="note-editor flex-1 overflow-y-auto px-5 py-4 text-sm text-slate-700 outline-none"
      style={{ minHeight: "360px", fontSize: "14px", lineHeight: "1.7" }}
      data-placeholder="メモを追加"
    />
  );
});

interface Props {
  task: Task;
  today: string;
  projects?: Project[];
  people?: Person[];
  onAddPerson?: (name: string, avatar: string) => void;
  onAddProject?: (label: string, color: string) => void;
  onUpdate: (patch: Partial<Task>) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
  onStar: (id: string) => void;
  onToggle: (id: string) => void;
}

function CalIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
    </svg>
  );
}
function RepIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  );
}
function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
function MemoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  );
}
function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

function fmtDate(ts?: number): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

const PROJECT_COLORS = [
  "bg-blue-500","bg-violet-500","bg-rose-500","bg-amber-400","bg-emerald-500","bg-slate-400","bg-pink-500","bg-cyan-500",
];

export default function TaskDetailPanel({
  task,
  today,
  projects: propProjects,
  people: propPeople,
  onAddPerson,
  onAddProject,
  onUpdate,
  onClose,
  onDelete,
  onStar,
  onToggle,
}: Props) {
  const projects = propProjects ?? defaultProjects;
  const people   = propPeople  ?? defaultPeople;
  const project  = projects.find((p) => p.id === task.project);
  const owner    = people.find((p) => p.id === task.owner);

  const [titleDraft, setTitleDraft] = useState(task.title);
  const [newSub, setNewSub]         = useState("");
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editingSubTitle, setEditingSubTitle] = useState("");
  const [deletingSubId, setDeletingSubId] = useState<string | null>(null);
  const [subDragId,    setSubDragId]    = useState<string | null>(null);
  const [subDragOverId, setSubDragOverId] = useState<string | null>(null);
  const [dateEdit, setDateEdit]     = useState(false);
  const [calYear,  setCalYear]      = useState(() => { const d = new Date(); return d.getFullYear(); });
  const [calMonth, setCalMonth]     = useState(() => { const d = new Date(); return d.getMonth(); });
  const [timeDraft, setTimeDraft]   = useState(task.dueTime ?? "");
  const timeInputRef                = useRef<HTMLInputElement>(null);
  const [showCustomRepeat, setShowCustomRepeat] = useState(false);
  const [ownerOpen, setOwnerOpen]   = useState(false);
  const ownerRef                    = useRef<HTMLDivElement>(null);
  const [projectOpen, setProjectOpen] = useState(false);
  const projectRef                    = useRef<HTMLDivElement>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showMemoToolbar, setShowMemoToolbar] = useState(false);
  const [showMemoColors, setShowMemoColors]   = useState(false);
  const [showMemoLink,   setShowMemoLink]     = useState(false);
  const [memoLinkUrl,    setMemoLinkUrl]      = useState("");
  const [memoLinkPos,    setMemoLinkPos]      = useState({ top: 0, left: 0 });
  const [memoBlockType,  setMemoBlockType]    = useState("p");
  const [memoFontSize,   setMemoFontSize]     = useState("14px");
  const [showMemoExpand, setShowMemoExpand]   = useState(false);
  const [showExpandToolbar,  setShowExpandToolbar]  = useState(false);
  const [showExpandColors,   setShowExpandColors]   = useState(false);
  const [showExpandLink,     setShowExpandLink]     = useState(false);
  const [expandLinkUrl,      setExpandLinkUrl]      = useState("");
  const [expandLinkPos,      setExpandLinkPos]      = useState({ top: 0, left: 0 });
  const [expandBlockType,    setExpandBlockType]    = useState("p");
  const [expandFontSize,     setExpandFontSize]     = useState("14px");
  const savedExpandRange = useRef<Range | null>(null);
  const memoEditorRef    = useRef<HTMLDivElement>(null);
  const memoExpandRef    = useRef<HTMLDivElement>(null);
  const memoFileInputRef = useRef<HTMLInputElement>(null);
  const savedMemoRange   = useRef<Range | null>(null);
  const subtasks = task.subtasks ?? [];

  // task.idのみ依存: リアルタイム保存中にtask.titleが変わっても入力中の文字を巻き戻さない
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setTitleDraft(task.title); }, [task.id]);
  useEffect(() => {
    if (memoEditorRef.current) {
      memoEditorRef.current.innerHTML = task.memos?.[0]?.html ?? "";
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);
  useEffect(() => { setTimeDraft(task.dueTime ?? ""); }, [task.id, task.dueTime]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Close owner dropdown on outside click
  useEffect(() => {
    if (!ownerOpen) return;
    const handler = (e: MouseEvent) => {
      if (ownerRef.current && !ownerRef.current.contains(e.target as Node)) setOwnerOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ownerOpen]);

  useEffect(() => {
    if (!projectOpen) return;
    const handler = (e: MouseEvent) => {
      if (projectRef.current && !projectRef.current.contains(e.target as Node)) setProjectOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [projectOpen]);

  const commitTitle = () => {
    const t = titleDraft.trim();
    if (t && t !== task.title) onUpdate({ title: t });
    else setTitleDraft(task.title);
  };

  const commitMemoHtml = () => {
    const html = memoEditorRef.current?.innerHTML ?? "";
    const existing = task.memos?.[0]?.html ?? "";
    if (html !== existing) {
      onUpdate({ memos: [{ id: task.memos?.[0]?.id ?? `memo_${Date.now()}`, label: "メモ①", html, checklist: task.memos?.[0]?.checklist ?? [], attachments: task.memos?.[0]?.attachments ?? [] }] });
    }
  };

  // ── リアルタイム保存（blurを待たず、入力が止まったら即コミット） ──
  const commitMemoRef = useRef(commitMemoHtml);
  commitMemoRef.current = commitMemoHtml;
  const memoCommitTimer = useRef<number | null>(null);
  const scheduleMemoCommit = () => {
    if (memoCommitTimer.current) window.clearTimeout(memoCommitTimer.current);
    memoCommitTimer.current = window.setTimeout(() => commitMemoRef.current(), 500);
  };
  // タイトルは空文字への巻き戻しを避けるため、有効値のときだけ即コミット
  const commitTitleLive = () => {
    const t = titleDraft.trim();
    if (t && t !== task.title) onUpdate({ title: t });
  };
  const commitTitleLiveRef = useRef(commitTitleLive);
  commitTitleLiveRef.current = commitTitleLive;
  const titleCommitTimer = useRef<number | null>(null);
  const scheduleTitleCommit = () => {
    if (titleCommitTimer.current) window.clearTimeout(titleCommitTimer.current);
    titleCommitTimer.current = window.setTimeout(() => commitTitleLiveRef.current(), 600);
  };
  useEffect(() => () => {
    // アンマウント時（タスク切替・パネルを閉じる）に未保存分をフラッシュ
    if (memoCommitTimer.current) window.clearTimeout(memoCommitTimer.current);
    if (titleCommitTimer.current) window.clearTimeout(titleCommitTimer.current);
    commitMemoRef.current();
    commitTitleLiveRef.current();
  }, []);

  const memoBtn = (title: string, onClick: () => void, content: ReactNode) => (
    <button
      key={title}
      onPointerDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      className="flex h-6 min-w-[24px] items-center justify-center rounded px-1 text-slate-600 hover:bg-slate-100 transition"
    >{content}</button>
  );

  const commitEditorHtml = (editorRef: React.RefObject<HTMLDivElement | null>) => {
    const html = editorRef.current?.innerHTML ?? "";
    const existing = task.memos?.[0];
    onUpdate({ memos: [{ id: existing?.id ?? `memo_${Date.now()}`, label: "メモ①", html, checklist: existing?.checklist ?? [], attachments: existing?.attachments ?? [] }] });
  };

  const insertNodeAtCaret = (node: Node, editorRef: React.RefObject<HTMLDivElement | null>) => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      const range = sel.getRangeAt(0);
      range.deleteContents(); range.insertNode(node);
      range.setStartAfter(node); range.collapse(true);
      sel.removeAllRanges(); sel.addRange(range);
    } else { editorRef.current?.appendChild(node); }
  };

  const handleMemoPaste = (e: React.ClipboardEvent, editorRef: React.RefObject<HTMLDivElement | null>) => {
    // 画像の貼り付け: フル解像度base64を圧縮してから挿入（保存サイズ肥大化防止）
    const imgItem = Array.from(e.clipboardData.items).find(it => it.type.startsWith("image/"));
    if (imgItem) {
      const file = imgItem.getAsFile();
      if (file) {
        e.preventDefault();
        fileToCompressedDataUrl(file).then(dataUrl => {
          const img = document.createElement("img");
          img.src = dataUrl; img.style.maxWidth = "100%"; img.className = "memo-image";
          insertNodeAtCaret(img, editorRef);
          commitEditorHtml(editorRef);
        });
      }
      return;
    }
    const text = e.clipboardData.getData("text/plain").trim();
    if (!/^https?:\/\/\S+$/.test(text)) return;
    e.preventDefault();
    const a = document.createElement("a");
    a.href = text; a.textContent = text;
    insertNodeAtCaret(a, editorRef);
    commitEditorHtml(editorRef);
  };

  const saveMemoRange = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedMemoRange.current = sel.getRangeAt(0).cloneRange();
  };
  const restoreMemoRange = () => {
    const r = savedMemoRange.current;
    if (!r) return;
    const sel = window.getSelection();
    sel?.removeAllRanges(); sel?.addRange(r);
  };
  const execMemo = (cmd: string, val?: string) => { memoEditorRef.current?.focus(); document.execCommand(cmd, false, val); };

  const applyFontSize = (editorRef: React.RefObject<HTMLDivElement | null>, size: string, setSize: (s: string) => void) => {
    editorRef.current?.focus();
    // Use fontSize "7" as a sentinel, then replace created <font> elements with styled <span>s
    document.execCommand("fontSize", false, "7");
    const editor = editorRef.current;
    if (!editor) return;
    editor.querySelectorAll('font[size="7"]').forEach(font => {
      const span = document.createElement("span");
      span.style.fontSize = size;
      span.innerHTML = font.innerHTML;
      font.parentNode?.replaceChild(span, font);
    });
    setSize(size);
  };

  const applyMemoBlockFormat = (value: string) => {
    memoEditorRef.current?.focus();
    if (value === "p") {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
        while (node && node !== memoEditorRef.current) {
          if ((node as Element).tagName === "BLOCKQUOTE") {
            const bq = node as Element;
            const parent = bq.parentNode!;
            const frag = document.createDocumentFragment();
            while (bq.firstChild) frag.appendChild(bq.firstChild);
            parent.replaceChild(frag, bq);
            setMemoBlockType("p");
            return;
          }
          node = node.parentNode;
        }
      }
      document.execCommand("formatBlock", false, "p");
    } else {
      document.execCommand("formatBlock", false, value);
    }
  };

  useEffect(() => {
    const update = () => {
      if (!memoEditorRef.current) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
      while (node && node !== memoEditorRef.current) {
        if ((node as Element).tagName === "BLOCKQUOTE") { setMemoBlockType("blockquote"); return; }
        node = node.parentNode;
      }
      setMemoBlockType("p");
    };
    document.addEventListener("selectionchange", update);
    return () => document.removeEventListener("selectionchange", update);
  }, []);
  const applyMemoLink = () => {
    restoreMemoRange();
    if (memoLinkUrl.trim()) execMemo("createLink", memoLinkUrl.trim());
    setShowMemoLink(false); setMemoLinkUrl("");
  };

  // ── Expand modal toolbar helpers ──
  const execExpand = (cmd: string, val?: string) => { memoExpandRef.current?.focus(); document.execCommand(cmd, false, val); };
  const saveExpandRange = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedExpandRange.current = sel.getRangeAt(0).cloneRange();
  };
  const restoreExpandRange = () => {
    const r = savedExpandRange.current;
    if (!r) return;
    const sel = window.getSelection();
    sel?.removeAllRanges(); sel?.addRange(r);
  };
  const applyExpandLink = () => {
    restoreExpandRange();
    if (expandLinkUrl.trim()) execExpand("createLink", expandLinkUrl.trim());
    setShowExpandLink(false); setExpandLinkUrl("");
  };
  const applyExpandBlockFormat = (value: string) => {
    memoExpandRef.current?.focus();
    if (value === "p") {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
        while (node && node !== memoExpandRef.current) {
          if ((node as Element).tagName === "BLOCKQUOTE") {
            const bq = node as Element;
            const parent = bq.parentNode!;
            const frag = document.createDocumentFragment();
            while (bq.firstChild) frag.appendChild(bq.firstChild);
            parent.replaceChild(frag, bq);
            setExpandBlockType("p");
            return;
          }
          node = node.parentNode;
        }
      }
      document.execCommand("formatBlock", false, "p");
    } else {
      document.execCommand("formatBlock", false, value);
    }
  };
  const commitExpandHtml = () => {
    const html = memoExpandRef.current?.innerHTML ?? "";
    const existing = task.memos?.[0];
    onUpdate({ memos: [{ id: existing?.id ?? `memo_${Date.now()}`, label: "メモ①", html, checklist: existing?.checklist ?? [], attachments: existing?.attachments ?? [] }] });
  };
  const insertExpandCheckLine = () => {
    const editor = memoExpandRef.current;
    if (!editor) return;
    editor.focus();
    const div = document.createElement("div"); div.className = "check-line";
    const cb = document.createElement("span"); cb.className = "note-checkbox"; cb.contentEditable = "false"; cb.dataset.checked = "false"; cb.textContent = "☐";
    const ts = document.createElement("span"); ts.className = "check-text";
    div.appendChild(cb); div.appendChild(ts);
    const sel = window.getSelection();
    if (sel && sel.rangeCount) { const r = sel.getRangeAt(0); r.deleteContents(); r.insertNode(div); const nr = document.createRange(); nr.setStart(ts, 0); nr.collapse(true); sel.removeAllRanges(); sel.addRange(nr); }
    else editor.appendChild(div);
    commitExpandHtml();
  };
  useEffect(() => {
    const update = () => {
      if (!memoExpandRef.current) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      let node: Node | null = sel.getRangeAt(0).commonAncestorContainer;
      while (node && node !== memoExpandRef.current) {
        if ((node as Element).tagName === "BLOCKQUOTE") { setExpandBlockType("blockquote"); return; }
        node = node.parentNode;
      }
      setExpandBlockType("p");
    };
    document.addEventListener("selectionchange", update);
    return () => document.removeEventListener("selectionchange", update);
  }, []);

  const insertMemoCheckLine = () => {
    const editor = memoEditorRef.current;
    if (!editor) return;
    editor.focus();
    const div = document.createElement("div"); div.className = "check-line";
    const cb = document.createElement("span"); cb.className = "note-checkbox"; cb.contentEditable = "false"; cb.dataset.checked = "false"; cb.textContent = "☐";
    const ts = document.createElement("span"); ts.className = "check-text";
    div.appendChild(cb); div.appendChild(ts);
    const sel = window.getSelection();
    if (sel && sel.rangeCount) { const r = sel.getRangeAt(0); r.deleteContents(); r.insertNode(div); const nr = document.createRange(); nr.setStart(ts, 0); nr.collapse(true); sel.removeAllRanges(); sel.addRange(nr); }
    else editor.appendChild(div);
    commitMemoHtml();
  };

  const handleMemoFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(file => {
      const isImage = file.type.startsWith("image/");
      if (isImage) {
        // 画像は縮小・圧縮して埋め込む（保存サイズ超過を防ぐ）
        fileToCompressedDataUrl(file).then(dataUrl => {
          const img = document.createElement("img");
          img.src = dataUrl;
          img.style.maxWidth = "100%";
          img.className = "memo-image";
          memoEditorRef.current?.appendChild(img);
          commitMemoHtml();
        });
      } else {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const dataUrl = evt.target?.result as string;
          const existing = task.memos?.[0];
          const newAtt = { id: `att_${Date.now()}`, name: file.name, size: file.size, dataUrl };
          onUpdate({ memos: [{ id: existing?.id ?? `memo_${Date.now()}`, label: "メモ①", html: memoEditorRef.current?.innerHTML ?? existing?.html ?? "", checklist: existing?.checklist ?? [], attachments: [...(existing?.attachments ?? []), newAtt] }] });
        };
        reader.readAsDataURL(file);
      }
    });
    e.target.value = "";
  };

  const FONT_SIZE_OPTIONS = [
    { label: "小", val: "11px" },
    { label: "標準", val: "14px" },
    { label: "大", val: "18px" },
    { label: "特大", val: "24px" },
    { label: "最大", val: "32px" },
  ];

  const MEMO_TEXT_COLORS = [
    { label: "標準", val: "inherit" }, { label: "赤", val: "#ef4444" }, { label: "オレンジ", val: "#f97316" },
    { label: "黄", val: "#eab308" },   { label: "緑", val: "#22c55e" }, { label: "青", val: "#3b82f6" },
    { label: "紫", val: "#8b5cf6" },
  ];

  const dueFmt = (() => {
    if (task.done && task.completedDate) return task.completedDate;
    if (!task.due) return "";
    const d = new Date(task.due + "T00:00:00");
    const wd = ["日","月","火","水","木","金","土"][d.getDay()];
    return `${d.getMonth()+1}/${d.getDate()} (${wd})`;
  })();

  const openTimePicker = () => {
    const el = timeInputRef.current;
    if (!el) return;
    try { if (typeof el.showPicker === "function") { el.showPicker(); return; } } catch {}
    el.focus();
  };

  return (
    <section
      key={task.id}
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      {/* ── Close ── */}
      <div className="flex justify-end px-3 pt-3 pb-0">
        <button onClick={onClose} aria-label="閉じる"
          className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      {/* ── Title ── */}
      <div className="flex items-start gap-2 px-4 pb-4">
        <button onClick={() => onToggle(task.id)} aria-label="完了"
          className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90 ${
            task.done ? "border-slate-400 bg-slate-400 text-white" : "border-slate-400 hover:border-blue-500"
          }`}>
          {task.done && (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m20 6-11 11-5-5"/>
            </svg>
          )}
        </button>

        <textarea
          value={titleDraft}
          onChange={(e) => { setTitleDraft(e.target.value); scheduleTitleCommit(); }}
          onBlur={commitTitle}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitTitle(); (e.target as HTMLTextAreaElement).blur(); } }}
          rows={1}
          className="min-h-0 flex-1 resize-none border-0 bg-transparent text-base font-semibold leading-snug text-slate-800 outline-none placeholder:text-slate-300"
          style={{ fontSize: "16px" }}
          onInput={(e) => { const el = e.target as HTMLTextAreaElement; el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }}
          placeholder="タイトルを追加"
        />

        <button onClick={() => onStar(task.id)} aria-label="スター"
          className={`mt-0.5 shrink-0 p-1 transition ${task.starred ? "text-amber-400" : "text-slate-300 hover:text-amber-400"}`}>
          <StarIcon filled={task.starred} className="h-4 w-4" />
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto border-t border-slate-100">

        {/* 日付・時間・繰り返し（1行） */}
        <div className="border-b border-slate-100 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
            {/* Date */}
            <button onClick={() => {
              if (!dateEdit && task.due) {
                const d = new Date(task.due + "T00:00:00");
                setCalYear(d.getFullYear()); setCalMonth(d.getMonth());
              } else if (!dateEdit) {
                const d = new Date();
                setCalYear(d.getFullYear()); setCalMonth(d.getMonth());
              }
              setDateEdit(v => !v);
            }} className="shrink-0 text-slate-400 hover:text-blue-500 transition"><CalIcon /></button>
            <span
              className={`cursor-pointer ${task.due ? "text-slate-700" : "text-slate-400"} hover:text-blue-600`}
              onClick={() => {
                if (!dateEdit && task.due) {
                  const d = new Date(task.due + "T00:00:00");
                  setCalYear(d.getFullYear()); setCalMonth(d.getMonth());
                } else if (!dateEdit) {
                  const d = new Date();
                  setCalYear(d.getFullYear()); setCalMonth(d.getMonth());
                }
                setDateEdit(v => !v);
              }}
            >{task.due ? dueFmt : "日付を追加"}</span>
            {task.due && !task.done && (
              <button onClick={() => { onUpdate({ due: "", dueTime: undefined }); setDateEdit(false); }} className="text-slate-300 hover:text-slate-500">
                <XIcon className="h-3 w-3" />
              </button>
            )}

            {task.due && (
              <>
                <span className="mx-1 h-3.5 w-px shrink-0 bg-slate-200" />
                <button onClick={openTimePicker} className="shrink-0 text-slate-400 hover:text-blue-500 transition"><ClockIcon /></button>
                <input
                  ref={timeInputRef}
                  type="time"
                  value={timeDraft}
                  onChange={(e) => { setTimeDraft(e.target.value); onUpdate({ dueTime: e.target.value || undefined }); }}
                  className="w-[68px] border-0 bg-transparent text-sm text-slate-700 outline-none"
                  style={{ colorScheme: "light" }}
                />
                {timeDraft && (
                  <button onClick={() => { setTimeDraft(""); onUpdate({ dueTime: undefined }); }} className="text-slate-300 hover:text-slate-500">
                    <XIcon className="h-3 w-3" />
                  </button>
                )}
                <span className="mx-1 h-3.5 w-px shrink-0 bg-slate-200" />
              </>
            )}

            {/* Repeat */}
            <RepIcon />
            <select
              value={task.repeat ?? "none"}
              onChange={(e) => {
                const val = e.target.value as RepeatMode;
                if (val === "custom") setShowCustomRepeat(true);
                else onUpdate({ repeat: val });
              }}
              className="min-w-[90px] flex-1 border-0 bg-transparent text-sm text-slate-700 outline-none cursor-pointer"
            >
              {(Object.keys(repeatLabels) as RepeatMode[]).map((r) => (
                <option key={r} value={r}>{repeatLabels[r]}</option>
              ))}
            </select>
            {task.repeat === "custom" && (
              <button
                onClick={() => setShowCustomRepeat(true)}
                title="カスタム繰り返しを編集"
                className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-500"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                </svg>
              </button>
            )}
          </div>

          {showCustomRepeat && (
            <CustomRepeatModal
              due={task.due}
              repeat={task.repeat ?? "none"}
              repeatConfig={task.repeatConfig ?? { interval: 1, unit: "day", daysOfWeek: [], endType: "none" }}
              onChange={(r, cfg) => onUpdate({ repeat: r, repeatConfig: cfg ?? task.repeatConfig })}
              onClose={() => setShowCustomRepeat(false)}
            />
          )}
          {dateEdit && (() => {
            const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
            const firstDow    = new Date(calYear, calMonth, 1).getDay();
            const cells: (number | null)[] = [];
            for (let i = 0; i < firstDow; i++) cells.push(null);
            for (let d = 1; d <= daysInMonth; d++) cells.push(d);
            while (cells.length % 7 !== 0) cells.push(null);
            const iso = (d: number) =>
              `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const todayIso = new Date().toISOString().slice(0, 10);
            return (
              <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                {/* Month nav */}
                <div className="mb-2 flex items-center justify-between">
                  <button onPointerDown={e => { e.preventDefault(); const d = new Date(calYear, calMonth - 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                  <span className="text-xs font-semibold text-slate-700">{calYear}年 {calMonth + 1}月</span>
                  <button onPointerDown={e => { e.preventDefault(); const d = new Date(calYear, calMonth + 1); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }}
                    className="rounded p-1 text-slate-400 hover:bg-slate-100">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                </div>
                {/* Day headers */}
                <div className="mb-1 grid grid-cols-7 text-center">
                  {["日","月","火","水","木","金","土"].map(w => (
                    <span key={w} className="text-[10px] font-semibold text-slate-400">{w}</span>
                  ))}
                </div>
                {/* Day cells */}
                <div className="grid grid-cols-7 gap-y-0.5">
                  {cells.map((d, i) => {
                    if (!d) return <span key={i} />;
                    const dateStr  = iso(d);
                    const isToday  = dateStr === todayIso;
                    const isSelected = dateStr === task.due;
                    return (
                      <button key={i} onPointerDown={e => { e.preventDefault(); onUpdate({ due: dateStr }); setDateEdit(false); }}
                        className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs transition ${
                          isSelected ? "bg-blue-600 font-bold text-white" :
                          isToday    ? "border border-blue-400 font-semibold text-blue-600 hover:bg-blue-50" :
                          "text-slate-700 hover:bg-slate-100"
                        }`}>
                        {d}
                      </button>
                    );
                  })}
                </div>
                {/* Clear button */}
                {task.due && (
                  <button onPointerDown={e => { e.preventDefault(); onUpdate({ due: "", dueTime: undefined }); setDateEdit(false); }}
                    className="mt-2 w-full rounded-lg py-1 text-center text-xs text-slate-400 hover:bg-slate-50 hover:text-red-400">
                    日付をクリア
                  </button>
                )}
              </div>
            );
          })()}
        </div>

        {/* プロジェクト・担当者（1行） */}
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
          {/* Project */}
          <div className="relative min-w-0 flex-1" ref={projectRef}>
            <button
              className="flex w-full items-center gap-1.5 text-left transition hover:text-blue-600"
              onClick={() => { setProjectOpen((v) => !v); setOwnerOpen(false); }}
            >
              <FolderIcon />
              {project ? (
                <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-slate-700">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${project.color}`} />
                  <span className="truncate">{project.label}</span>
                </span>
              ) : (
                <span className="flex-1 truncate text-sm text-slate-400">プロジェクトなし</span>
              )}
            </button>
            {projectOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                <button onClick={() => { onUpdate({ project: "" }); setProjectOpen(false); }}
                  className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition hover:bg-slate-50 ${!task.project ? "text-blue-600 font-medium" : "text-slate-500"}`}>
                  プロジェクトなし{!task.project && <span className="ml-auto text-blue-500">✓</span>}
                </button>
                {projects.map((p) => (
                  <button key={p.id} onClick={() => { onUpdate({ project: p.id }); setProjectOpen(false); }}
                    className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition hover:bg-slate-50 ${task.project === p.id ? "text-blue-600 font-medium" : "text-slate-700"}`}>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${p.color}`} />{p.label}
                    {task.project === p.id && <span className="ml-auto text-blue-500">✓</span>}
                  </button>
                ))}
                {onAddProject && (
                  <div className="border-t border-slate-100 px-3 py-2">
                    <div className="mb-1.5 flex items-center gap-2">
                      {PROJECT_COLORS.map((c) => (
                        <button key={c} onClick={() => setNewProjectColor(c)}
                          className={`h-4 w-4 shrink-0 rounded-full ${c} ${newProjectColor === c ? "ring-2 ring-offset-1 ring-blue-400" : ""}`} />
                      ))}
                    </div>
                    <input placeholder="プロジェクト名を入力して Enter" value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-400"
                      onKeyDown={(e) => { if (e.key === "Enter") { const v = newProjectName.trim(); if (v) { onAddProject(v, newProjectColor); setNewProjectName(""); setProjectOpen(false); } } }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <span className="h-3.5 w-px shrink-0 bg-slate-200" />

          {/* Owner */}
          <div className="relative min-w-0 flex-1" ref={ownerRef}>
            <button
              className="flex w-full items-center gap-1.5 text-left transition hover:text-blue-600"
              onClick={() => { setOwnerOpen((v) => !v); setProjectOpen(false); }}
            >
              <PersonIcon />
              {owner ? (
                <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-slate-700">
                  <AvatarDisplay avatar={owner.avatar} name={owner.name} size={16} />
                  <span className="truncate">{owner.name.replace("（自分）", "")}</span>
                </span>
              ) : (
                <span className="flex-1 truncate text-sm text-slate-400">担当者を追加</span>
              )}
            </button>
            {ownerOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                {people.map((p) => (
                  <button key={p.id} onClick={() => { onUpdate({ owner: p.id }); setOwnerOpen(false); }}
                    className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition hover:bg-slate-50 ${task.owner === p.id ? "text-blue-600 font-medium" : "text-slate-700"}`}>
                    <AvatarDisplay avatar={p.avatar} name={p.name} size={20} />
                    {p.name.replace("（自分）", "")}
                    {task.owner === p.id && <span className="ml-auto text-blue-500">✓</span>}
                  </button>
                ))}
                {task.owner && (
                  <button onClick={() => { onUpdate({ owner: undefined }); setOwnerOpen(false); }}
                    className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-50">
                    <XIcon className="h-3.5 w-3.5" /> 担当者を解除
                  </button>
                )}
                {onAddPerson && (
                  <div className="border-t border-slate-100 px-3 py-2">
                    <input placeholder="名前を入力して Enter"
                      className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-400"
                      onKeyDown={(e) => { if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value.trim(); if (v) { onAddPerson(v, "icon:male-adult:#64748b"); (e.target as HTMLInputElement).value = ""; } } }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {owner && (
            <button onClick={(e) => { e.stopPropagation(); onUpdate({ owner: undefined }); }} className="shrink-0 text-slate-300 hover:text-slate-500">
              <XIcon className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* メモ */}
        <div className="border-b border-slate-100">
          {/* Header: label + T button */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <MemoIcon />
              <span>メモ</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onMouseDown={(e) => { e.preventDefault(); setShowMemoExpand(true); }}
                title="拡大表示"
                className="rounded p-1 text-slate-300 transition hover:bg-slate-100 hover:text-slate-500"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); setShowMemoToolbar((v) => !v); }}
                title="テキスト書式"
                className={`rounded px-2 py-0.5 text-xs font-bold transition ${showMemoToolbar ? "bg-blue-100 text-blue-600" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"}`}
              >T</button>
            </div>
          </div>
          {/* Formatting toolbar */}
          {showMemoToolbar && (
            <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-100 px-2 py-1">
              {/* Block format */}
              <select onPointerDown={e => e.stopPropagation()} value={memoBlockType} onChange={e => applyMemoBlockFormat(e.target.value)}
                className="rounded border border-slate-200 bg-white/70 px-1 py-0.5 text-[11px] text-slate-600">
                <option value="p">本文</option>
                <option value="blockquote">引用</option>
              </select>
              <div className="mx-0.5 h-3.5 w-px bg-slate-300/70" />
              {memoBtn("箇条書き（・）", () => execMemo("insertUnorderedList"), <span className="text-[11px] font-bold">•≡</span>)}
              {memoBtn("番号リスト", () => execMemo("insertOrderedList"), <span className="text-[11px] font-bold">1.</span>)}
              {memoBtn("チェックボックス", insertMemoCheckLine,
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="5" width="4" height="4" rx="1"/><path d="m5 7 1 1 2-2"/>
                  <line x1="10" y1="7" x2="21" y2="7"/>
                  <rect x="3" y="13" width="4" height="4" rx="1"/>
                  <line x1="10" y1="15" x2="21" y2="15"/>
                </svg>)}
              <div className="mx-0.5 h-3.5 w-px bg-slate-300/70" />
              {memoBtn("太字", () => execMemo("bold"), <b className="text-xs">B</b>)}
              {memoBtn("下線", () => execMemo("underline"), <u className="text-xs">U</u>)}
              {/* Font size */}
              <select
                onPointerDown={e => e.stopPropagation()}
                value={memoFontSize}
                onChange={e => applyFontSize(memoEditorRef, e.target.value, setMemoFontSize)}
                className="rounded border border-slate-200 bg-white/70 px-1 py-0.5 text-[11px] text-slate-600"
                title="文字サイズ"
              >
                {FONT_SIZE_OPTIONS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
              </select>
              {/* Text color */}
              <div className="relative">
                {memoBtn("文字色", () => { saveMemoRange(); setShowMemoColors(v => !v); },
                  <span className="flex flex-col items-center leading-none">
                    <span className="text-xs font-bold">A</span>
                    <span className="mt-0.5 h-0.5 w-3.5 rounded-sm bg-red-500" />
                  </span>)}
                {showMemoColors && (
                  <div className="absolute left-0 top-7 z-30 flex gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl">
                    {MEMO_TEXT_COLORS.map(c => (
                      <button key={c.val}
                        onPointerDown={e => { e.preventDefault(); restoreMemoRange(); execMemo("foreColor", c.val); setShowMemoColors(false); }}
                        className="h-5 w-5 rounded-full border border-slate-200 transition hover:scale-110"
                        style={{ background: c.val === "inherit" ? "linear-gradient(135deg,#ddd 50%,#fff 50%)" : c.val }}
                        title={c.label} />
                    ))}
                  </div>
                )}
              </div>
              {/* Link */}
              <div className="relative">
                {memoBtn("リンク", () => {
                  saveMemoRange();
                  if (!showMemoLink) {
                    const sel = window.getSelection();
                    if (sel && sel.rangeCount > 0) {
                      const rect = sel.getRangeAt(0).getBoundingClientRect();
                      setMemoLinkPos({ top: rect.top, left: rect.left + rect.width / 2 });
                    } else if (memoEditorRef.current) {
                      const r = memoEditorRef.current.getBoundingClientRect();
                      setMemoLinkPos({ top: r.top + 40, left: r.left + r.width / 2 });
                    }
                  }
                  setShowMemoLink(v => !v);
                },
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>)}
                {showMemoLink && (
                  <div
                    className="fixed z-50 flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl"
                    style={{ top: memoLinkPos.top - 8, left: memoLinkPos.left, transform: "translate(-50%, -100%)" }}
                    onPointerDown={e => e.stopPropagation()}
                  >
                    <input autoFocus value={memoLinkUrl} onChange={e => setMemoLinkUrl(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && applyMemoLink()}
                      placeholder="https://..." className="w-44 rounded border border-slate-200 px-2 py-1 text-xs outline-none focus:border-blue-400" />
                    <button onPointerDown={e => { e.preventDefault(); applyMemoLink(); }}
                      className="rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700">追加</button>
                  </div>
                )}
              </div>
              {/* File attach */}
              {memoBtn("ファイルを添付", () => memoFileInputRef.current?.click(),
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>)}
            </div>
          )}
          {/* Rich-text editor */}
          <div
            ref={memoEditorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={scheduleMemoCommit}
            onBlur={commitMemoHtml}
            onPaste={(e) => handleMemoPaste(e, memoEditorRef)}
            onClick={(e) => {
              const a = (e.target as HTMLElement).closest("a");
              if (a?.href) { e.preventDefault(); window.open(a.href, "_blank", "noopener,noreferrer"); }
            }}
            data-placeholder="メモを追加"
            className="note-editor min-h-[200px] px-4 py-3 text-sm text-slate-700 outline-none"
            style={{ fontSize: "14px", lineHeight: "1.7" }}
          />
          {/* Attachments */}
          {(task.memos?.[0]?.attachments?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-slate-100 px-4 py-2">
              {task.memos![0].attachments.map(a => (
                <div key={a.id} className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
                  <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <a href={a.dataUrl} download={a.name} className="max-w-[140px] truncate hover:underline hover:text-blue-600">{a.name}</a>
                  <button
                    onPointerDown={e => { e.preventDefault(); const existing = task.memos![0]; onUpdate({ memos: [{ ...existing, attachments: existing.attachments.filter(x => x.id !== a.id) }] }); }}
                    className="ml-0.5 text-slate-300 hover:text-red-400"
                  >×</button>
                </div>
              ))}
            </div>
          )}
          {/* Hidden file input */}
          <input ref={memoFileInputRef} type="file" accept="*/*" multiple className="hidden" onChange={handleMemoFileAttach} />
        </div>

        {/* サブタスク */}
        <div className="mx-3 my-2 rounded-xl bg-blue-50 px-3 py-3">
          <p className="mb-2 text-xs font-semibold text-slate-500">サブタスク</p>
          <div className="space-y-0.5">
            {subtasks.map((s) => (
              <div
                key={s.id}
                draggable={editingSubId !== s.id && deletingSubId !== s.id}
                onDragStart={() => setSubDragId(s.id)}
                onDragOver={(e) => { e.preventDefault(); if (s.id !== subDragId) setSubDragOverId(s.id); }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!subDragId || subDragId === s.id) { setSubDragId(null); setSubDragOverId(null); return; }
                  const from = subtasks.findIndex(x => x.id === subDragId);
                  const to   = subtasks.findIndex(x => x.id === s.id);
                  if (from < 0 || to < 0) { setSubDragId(null); setSubDragOverId(null); return; }
                  const next = [...subtasks];
                  const [moved] = next.splice(from, 1);
                  next.splice(to, 0, moved);
                  onUpdate({ subtasks: next });
                  setSubDragId(null); setSubDragOverId(null);
                }}
                onDragEnd={() => { setSubDragId(null); setSubDragOverId(null); }}
                className={`group flex items-center gap-2 rounded-lg py-1.5 transition
                  ${subDragId === s.id ? "opacity-40" : ""}
                  ${subDragOverId === s.id ? "ring-1 ring-blue-400 bg-blue-50" : ""}`}
              >
                {/* Drag grip */}
                <span className="shrink-0 cursor-grab opacity-0 group-hover:opacity-40 active:cursor-grabbing text-slate-400 touch-none">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>
                </span>
                <button
                  onClick={() => onUpdate({ subtasks: subtasks.map((x) => x.id === s.id ? { ...x, done: !x.done } : x) })}
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${s.done ? "border-slate-400 bg-slate-400 text-white" : "border-slate-400 hover:border-blue-500"}`}>
                  {s.done && <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m20 6-11 11-5-5"/></svg>}
                </button>
                {editingSubId === s.id ? (
                  <input
                    autoFocus
                    value={editingSubTitle}
                    onChange={(e) => setEditingSubTitle(e.target.value)}
                    onBlur={() => {
                      const trimmed = editingSubTitle.trim();
                      if (trimmed) onUpdate({ subtasks: subtasks.map((x) => x.id === s.id ? { ...x, title: trimmed } : x) });
                      setEditingSubId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.currentTarget.blur(); }
                      if (e.key === "Escape") { setEditingSubId(null); }
                    }}
                    className="flex-1 border-0 bg-transparent text-sm text-slate-700 outline-none"
                    style={{ fontSize: "14px" }}
                  />
                ) : (
                  <span
                    onClick={() => { setEditingSubId(s.id); setEditingSubTitle(s.title); }}
                    className={`flex-1 cursor-text text-sm ${s.done ? "text-slate-400 line-through" : "text-slate-700"}`}
                  >{s.title}</span>
                )}
                {deletingSubId === s.id ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-[11px] text-slate-400">削除？</span>
                    <button
                      onClick={() => { onUpdate({ subtasks: subtasks.filter((x) => x.id !== s.id) }); setDeletingSubId(null); }}
                      className="rounded px-1.5 py-0.5 text-[11px] font-medium text-red-500 hover:bg-red-50 transition"
                    >はい</button>
                    <button
                      onClick={() => setDeletingSubId(null)}
                      className="rounded px-1.5 py-0.5 text-[11px] text-slate-400 hover:bg-slate-100 transition"
                    >いいえ</button>
                  </div>
                ) : (
                  <button onClick={() => setDeletingSubId(s.id)}
                    className="shrink-0 text-slate-300 opacity-0 transition hover:text-red-400 group-hover:opacity-100">
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="mt-1 flex items-center gap-2 py-1.5">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-slate-400">
              <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            </span>
            <input value={newSub} onChange={(e) => setNewSub(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newSub.trim()) { onUpdate({ subtasks: [...subtasks, { id: `sub${Date.now()}`, title: newSub.trim(), done: false }] }); setNewSub(""); } }}
              placeholder="サブタスクを追加"
              className="flex-1 border-0 bg-transparent text-sm text-slate-500 outline-none placeholder:text-slate-400"
              style={{ fontSize: "14px" }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-4 py-4">
          {(task.createdAt || task.updatedAt) && (
            <div className="mb-4 space-y-1 rounded-xl bg-slate-50 px-3 py-2.5">
              {task.createdAt && (
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>作成日</span><span>{fmtDate(task.createdAt)}</span>
                </div>
              )}
              {task.updatedAt && (
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>更新日</span><span>{fmtDate(task.updatedAt)}</span>
                </div>
              )}
            </div>
          )}
          {deleteConfirm ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
              <p className="mb-3 text-sm font-medium text-red-700">本当に削除しますか？</p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteConfirm(false)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  キャンセル
                </button>
                <button onClick={() => onDelete(task.id)}
                  className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600">
                  削除
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setDeleteConfirm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50">
              <TrashIcon className="h-4 w-4" />
              タスクを削除
            </button>
          )}
        </div>
      </div>

      {/* メモ拡大モーダル */}
      {showMemoExpand && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/50 animate-fade-in"
          onClick={() => { if (memoEditorRef.current) memoEditorRef.current.innerHTML = task.memos?.[0]?.html ?? ""; setShowMemoExpand(false); }}
        >
          <div
            className="relative flex flex-col w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl animate-slide-up overflow-hidden"
            style={{ maxHeight: "88vh" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
              <MemoIcon />
              <span className="min-w-0 flex-1 text-sm font-semibold text-slate-700">メモ — {task.title}</span>
              <button
                onMouseDown={e => { e.preventDefault(); setShowExpandToolbar(v => !v); }}
                title="テキスト書式"
                className={`rounded px-2 py-0.5 text-xs font-bold transition ${showExpandToolbar ? "bg-blue-100 text-blue-600" : "text-slate-400 hover:bg-slate-200 hover:text-slate-600"}`}
              >T</button>
              <button
                onClick={() => { if (memoEditorRef.current) memoEditorRef.current.innerHTML = task.memos?.[0]?.html ?? ""; setShowMemoExpand(false); }}
                className="rounded p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                title="閉じる (Esc)"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            {/* Toolbar */}
            {showExpandToolbar && (
              <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-slate-100 px-2 py-1">
                <select onPointerDown={e => e.stopPropagation()} value={expandBlockType} onChange={e => applyExpandBlockFormat(e.target.value)}
                  className="rounded border border-slate-200 bg-white/70 px-1 py-0.5 text-[11px] text-slate-600">
                  <option value="p">本文</option>
                  <option value="blockquote">引用</option>
                </select>
                <div className="mx-0.5 h-3.5 w-px bg-slate-300/70" />
                {memoBtn("箇条書き（・）", () => execExpand("insertUnorderedList"), <span className="text-[11px] font-bold">•≡</span>)}
                {memoBtn("番号リスト", () => execExpand("insertOrderedList"), <span className="text-[11px] font-bold">1.</span>)}
                {memoBtn("チェックボックス", insertExpandCheckLine,
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="4" height="4" rx="1"/><path d="m5 7 1 1 2-2"/>
                    <line x1="10" y1="7" x2="21" y2="7"/>
                    <rect x="3" y="13" width="4" height="4" rx="1"/>
                    <line x1="10" y1="15" x2="21" y2="15"/>
                  </svg>)}
                <div className="mx-0.5 h-3.5 w-px bg-slate-300/70" />
                {memoBtn("太字", () => execExpand("bold"), <b className="text-xs">B</b>)}
                {memoBtn("下線", () => execExpand("underline"), <u className="text-xs">U</u>)}
                {/* Font size */}
                <select
                  onPointerDown={e => e.stopPropagation()}
                  value={expandFontSize}
                  onChange={e => applyFontSize(memoExpandRef, e.target.value, setExpandFontSize)}
                  className="rounded border border-slate-200 bg-white/70 px-1 py-0.5 text-[11px] text-slate-600"
                  title="文字サイズ"
                >
                  {FONT_SIZE_OPTIONS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
                </select>
                <div className="relative">
                  {memoBtn("文字色", () => { saveExpandRange(); setShowExpandColors(v => !v); },
                    <span className="flex flex-col items-center leading-none">
                      <span className="text-xs font-bold">A</span>
                      <span className="mt-0.5 h-0.5 w-3.5 rounded-sm bg-red-500" />
                    </span>)}
                  {showExpandColors && (
                    <div className="absolute left-0 top-7 z-30 flex gap-1 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl">
                      {MEMO_TEXT_COLORS.map(c => (
                        <button key={c.val}
                          onPointerDown={e => { e.preventDefault(); restoreExpandRange(); execExpand("foreColor", c.val); setShowExpandColors(false); }}
                          className="h-5 w-5 rounded-full border border-slate-200 transition hover:scale-110"
                          style={{ background: c.val === "inherit" ? "linear-gradient(135deg,#ddd 50%,#fff 50%)" : c.val }}
                          title={c.label} />
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  {memoBtn("リンク", () => {
                    saveExpandRange();
                    if (!showExpandLink) {
                      const sel = window.getSelection();
                      if (sel && sel.rangeCount > 0) {
                        const rect = sel.getRangeAt(0).getBoundingClientRect();
                        setExpandLinkPos({ top: rect.top, left: rect.left + rect.width / 2 });
                      }
                    }
                    setShowExpandLink(v => !v);
                  }, <span className="text-[11px] font-bold underline">URL</span>)}
                </div>
              </div>
            )}
            {showExpandLink && (
              <div className="fixed z-[60] -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
                style={{ top: expandLinkPos.top - 48, left: expandLinkPos.left }}>
                <div className="flex gap-1">
                  <input autoFocus value={expandLinkUrl} onChange={e => setExpandLinkUrl(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") applyExpandLink(); if (e.key === "Escape") { setShowExpandLink(false); setExpandLinkUrl(""); } }}
                    placeholder="https://..." className="w-48 rounded border border-slate-200 px-2 py-1 text-xs outline-none focus:border-blue-400" />
                  <button onPointerDown={e => { e.preventDefault(); applyExpandLink(); }} className="rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600">OK</button>
                </div>
              </div>
            )}
            {/* Editor */}
            <MemoExpandEditor
              expandRef={memoExpandRef}
              initialHtml={task.memos?.[0]?.html ?? ""}
              onSave={(html) => {
                const existing = task.memos?.[0];
                onUpdate({ memos: [{ id: existing?.id ?? `memo_${Date.now()}`, label: "メモ①", html, checklist: existing?.checklist ?? [], attachments: existing?.attachments ?? [] }] });
              }}
              onPaste={(e) => handleMemoPaste(e, memoExpandRef)}
            />
          </div>
        </div>
      )}
    </section>
  );
}
