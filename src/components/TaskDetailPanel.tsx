import { useEffect, useRef, useState } from "react";
import { AvatarDisplay } from "../avatarIcons";
import { people, projects, repeatLabels, taskColors } from "../data";
import type { Attachment, Priority, RepeatMode, TaskColor, Task } from "../types";
import { dueLabel } from "../ui";
import MemoEditor from "./MemoEditor";
import {
  CalendarIcon,
  CheckCircleIcon,
  CopyIcon,
  FileIcon,
  ListIcon,
  PaletteIcon,
  PaperclipIcon,
  RepeatIcon,
  StarIcon,
  TrashIcon,
  XIcon,
} from "../icons";

interface Props {
  task: Task;
  today: string;
  onClose: () => void;
  onChangeNotes: (id: string, notes: string) => void;
  onChangeTitle: (id: string, title: string) => void;
  onStar: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onChangeOwner: (id: string, owner: string) => void;
  onChangeRepeat: (id: string, repeat: RepeatMode) => void;
  onChangePriority: (id: string, priority: Priority) => void;
  onChangeColor: (id: string, color: TaskColor) => void;
  onAddAttachments: (id: string, files: Attachment[]) => void;
  onDeleteAttachment: (id: string, attId: string) => void;
  onAddSubtask: (id: string, title: string) => void;
  onToggleSubtask: (id: string, subId: string) => void;
  onDeleteSubtask: (id: string, subId: string) => void;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

let attId = 1;

const priorityOptions: { id: Priority; label: string; color: string }[] = [
  { id: "high", label: "高", color: "bg-red-100 text-red-600 hover:bg-red-200" },
  { id: "mid", label: "中", color: "bg-amber-100 text-amber-600 hover:bg-amber-200" },
  { id: "low", label: "低", color: "bg-slate-100 text-slate-500 hover:bg-slate-200" },
];

export default function TaskDetailPanel({
  task,
  today,
  onClose,
  onChangeNotes,
  onChangeTitle,
  onStar,
  onDelete,
  onDuplicate,
  onChangeOwner,
  onChangeRepeat,
  onChangePriority,
  onChangeColor,
  onAddAttachments,
  onDeleteAttachment,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
}: Props) {
  const project = projects.find((p) => p.id === task.project);
  const [newSub, setNewSub] = useState("");
  const [titleDraft, setTitleDraft] = useState(task.title);
  const fileRef = useRef<HTMLInputElement>(null);
  const subtasks = task.subtasks ?? [];
  const doneCount = subtasks.filter((s) => s.done).length;
  const attachments = task.attachments ?? [];

  // Sync title when task changes
  useEffect(() => { setTitleDraft(task.title); }, [task.id, task.title]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const commitTitle = () => {
    const t = titleDraft.trim();
    if (t && t !== task.title) onChangeTitle(task.id, t);
    else setTitleDraft(task.title);
  };

  return (
    <section
      key={task.id}
      className="animate-slide-in-right flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      {/* ── Title bar ── */}
      <div className="flex items-start gap-2 px-5 pt-5 pb-3">
        <textarea
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitTitle(); (e.target as HTMLTextAreaElement).blur(); } }}
          rows={1}
          className="min-h-0 flex-1 resize-none overflow-hidden border-0 border-b-2 border-transparent bg-transparent text-lg font-bold leading-snug text-slate-800 outline-none transition focus:border-blue-500 placeholder:text-slate-300"
          style={{ height: "auto" }}
          onInput={(e) => {
            const el = e.target as HTMLTextAreaElement;
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
          }}
          placeholder="タイトルを追加"
        />
        <div className="flex shrink-0 items-center gap-0.5">
          <button onClick={() => onStar(task.id)} aria-label="スター"
            className={`rounded-full p-1.5 transition ${task.starred ? "text-amber-400" : "text-slate-300 hover:text-amber-400"}`}>
            <StarIcon filled={task.starred} className="h-4 w-4" />
          </button>
          <button onClick={() => onDuplicate(task.id)} aria-label="複製"
            className="rounded-full p-1.5 text-slate-300 transition hover:bg-slate-100 hover:text-slate-600">
            <CopyIcon className="h-4 w-4" />
          </button>
          <button onClick={() => onDelete(task.id)} aria-label="削除"
            className="rounded-full p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500">
            <TrashIcon className="h-4 w-4" />
          </button>
          <button onClick={onClose} aria-label="閉じる"
            className="rounded-full p-1.5 text-slate-300 hover:bg-slate-100 hover:text-slate-500">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Date / project / priority row */}
        <div className="flex items-start gap-3 border-t border-slate-100 px-5 py-3">
          <CalendarIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center rounded-md border border-slate-200 px-2.5 py-1 text-sm text-slate-600">
              {task.dueTime ? `${dueLabel(task.due, today)} ${task.dueTime}` : dueLabel(task.due, today)}
            </span>
            {project && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-sm text-slate-600">
                <span className={`h-2 w-2 rounded-full ${project.color}`} />
                {project.label}
              </span>
            )}
            {task.done && task.completedDate && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-700">
                <CheckCircleIcon className="h-3.5 w-3.5" />
                完了 {task.completedDate}
              </span>
            )}
          </div>
        </div>

        {/* Color row */}
        <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-3">
          <PaletteIcon className="h-4 w-4 shrink-0 text-slate-400" />
          <div className="flex gap-2">
            {(Object.keys(taskColors) as TaskColor[]).map((c) => {
              const selected = (task.color ?? "none") === c;
              return (
                <button key={c} onClick={() => onChangeColor(task.id, c)} title={taskColors[c].label}
                  className={`h-5 w-5 rounded-full ${taskColors[c].dot} transition ${
                    selected ? "ring-2 ring-blue-400 ring-offset-1" : "hover:scale-110"
                  } ${c === "none" ? "border border-slate-300" : ""}`}
                />
              );
            })}
          </div>
        </div>

        {/* Owner row */}
        <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-2.5">
          <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <select value={task.owner ?? ""} onChange={(e) => onChangeOwner(task.id, e.target.value)}
            className="flex-1 rounded-lg border-0 bg-transparent py-1 text-sm text-slate-700 outline-none hover:bg-slate-50 focus:bg-slate-50 cursor-pointer">
            <option value="">担当者を追加</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {task.owner && (() => {
            const owner = people.find((p) => p.id === task.owner);
            return owner ? (
              <AvatarDisplay avatar={owner.avatar} name={owner.name} size={24} />
            ) : null;
          })()}
        </div>

        {/* Repeat row */}
        <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-2.5">
          <RepeatIcon className="h-4 w-4 shrink-0 text-slate-400" />
          <select value={task.repeat ?? "none"} onChange={(e) => onChangeRepeat(task.id, e.target.value as RepeatMode)}
            className="flex-1 rounded-lg border-0 bg-transparent py-1 text-sm text-slate-700 outline-none hover:bg-slate-50 focus:bg-slate-50 cursor-pointer">
            {(Object.keys(repeatLabels) as RepeatMode[]).map((r) => (
              <option key={r} value={r}>{repeatLabels[r]}</option>
            ))}
          </select>
        </div>

        {/* Memo row */}
        <div className="border-t border-slate-100 px-5 py-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
            <ListIcon className="h-4 w-4" />
            メインメモ
          </div>
          <MemoEditor value={task.notes ?? ""} onChange={(v) => onChangeNotes(task.id, v)} />
        </div>

        {/* Attachments row */}
        <div className="border-t border-slate-100 px-5 py-3">
          <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-500">
            <span className="flex items-center gap-2">
              <PaperclipIcon className="h-4 w-4" />
              添付ファイル
              {attachments.length > 0 && (
                <span className="text-xs text-slate-400">({attachments.length})</span>
              )}
            </span>
            <button onClick={() => fileRef.current?.click()}
              className="rounded px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50">
              ＋ 追加
            </button>
            <input ref={fileRef} type="file" multiple className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []).map((f) => ({
                  id: `att${attId++}`, name: f.name, size: f.size,
                }));
                if (files.length) onAddAttachments(task.id, files);
                e.target.value = "";
              }} />
          </div>
          {attachments.length > 0 && (
            <ul className="space-y-1">
              {attachments.map((a) => (
                <li key={a.id} className="group flex items-center gap-2 rounded-lg border border-slate-100 px-2.5 py-1.5 hover:bg-slate-50">
                  <FileIcon className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{a.name}</span>
                  <span className="shrink-0 text-xs text-slate-400">{fmtSize(a.size)}</span>
                  <button onClick={() => onDeleteAttachment(task.id, a.id)}
                    className="shrink-0 text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100">
                    <XIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Subtasks row */}
        <div className="border-t border-slate-100 px-5 py-3 pb-6">
          <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-500">
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
              サブタスク
            </span>
            {subtasks.length > 0 && (
              <span className="text-xs text-slate-400">{doneCount}/{subtasks.length}</span>
            )}
          </div>
          <div className="space-y-0.5">
            {subtasks.map((s) => (
              <div key={s.id} className="group flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-slate-50">
                <button onClick={() => onToggleSubtask(task.id, s.id)}
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition ${
                    s.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 hover:border-blue-500"
                  }`}>
                  {s.done && (
                    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m20 6-11 11-5-5" />
                    </svg>
                  )}
                </button>
                <span className={`min-w-0 flex-1 truncate text-sm ${s.done ? "text-slate-400 line-through" : "text-slate-700"}`}>
                  {s.title}
                </span>
                <button onClick={() => onDeleteSubtask(task.id, s.id)}
                  className="shrink-0 text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100">
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-1 flex items-center gap-2 rounded-lg px-1 py-1.5">
            <span className="h-4 w-4 shrink-0 rounded border-2 border-dashed border-slate-300" />
            <input value={newSub} onChange={(e) => setNewSub(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newSub.trim()) {
                  onAddSubtask(task.id, newSub.trim());
                  setNewSub("");
                }
              }}
              placeholder="サブタスクを追加（Enter）"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" />
          </div>
        </div>
      </div>
    </section>
  );
}
