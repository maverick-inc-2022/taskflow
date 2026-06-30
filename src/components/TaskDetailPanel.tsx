import { useEffect, useRef, useState } from "react";
import { repeatLabels, defaultProjects } from "../data";
import { memosToPlainText, applyPlainTextToMemos } from "../memoText";
import type { NoteMemo, Project, RepeatMode, Task } from "../types";
import { dueLabel } from "../ui";
import { StarIcon, XIcon, TrashIcon } from "../icons";

interface Props {
  task: Task;
  today: string;
  projects?: Project[];
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


export default function TaskDetailPanel({
  task,
  today,
  projects: propProjects,
  onUpdate,
  onClose,
  onDelete,
  onStar,
  onToggle,
}: Props) {
  const projects = propProjects ?? defaultProjects;
  const project = projects.find((p) => p.id === task.project);

  const [titleDraft, setTitleDraft] = useState(task.title);
  const [memoText, setMemoText] = useState(() => memosToPlainText(task.memos));
  const [newSub, setNewSub] = useState("");
  const [dateEdit, setDateEdit] = useState(false);
  const subtasks = task.subtasks ?? [];

  useEffect(() => { setTitleDraft(task.title); }, [task.id, task.title]);
  useEffect(() => { setMemoText(memosToPlainText(task.memos)); }, [task.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const commitTitle = () => {
    const t = titleDraft.trim();
    if (t && t !== task.title) onUpdate({ title: t });
    else setTitleDraft(task.title);
  };

  const commitMemo = () => {
    const newMemos = applyPlainTextToMemos(task.memos, memoText);
    onUpdate({ memos: newMemos });
  };

  const dueFmt = task.done && task.completedDate ? `完了 ${task.completedDate}` : dueLabel(task.due, today);

  return (
    <section
      key={task.id}
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      {/* ── Close button ── */}
      <div className="flex justify-end px-3 pt-3 pb-0">
        <button onClick={onClose} aria-label="閉じる"
          className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      {/* ── Title row ── */}
      <div className="flex items-start gap-2 px-4 pb-4">
        {/* circle checkbox */}
        <button
          onClick={() => onToggle(task.id)}
          aria-label="完了"
          className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90 ${
            task.done ? "border-slate-400 bg-slate-400 text-white" : "border-slate-400 hover:border-blue-500"
          }`}
        >
          {task.done && (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m20 6-11 11-5-5" />
            </svg>
          )}
        </button>

        <textarea
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commitTitle(); (e.target as HTMLTextAreaElement).blur(); }
          }}
          rows={1}
          className="min-h-0 flex-1 resize-none border-0 bg-transparent text-base font-semibold leading-snug text-slate-800 outline-none placeholder:text-slate-300"
          style={{ fontSize: "16px" }}
          onInput={(e) => {
            const el = e.target as HTMLTextAreaElement;
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
          }}
          placeholder="タイトルを追加"
        />

        <button onClick={() => onStar(task.id)} aria-label="スター"
          className={`mt-0.5 shrink-0 p-1 transition ${task.starred ? "text-amber-400" : "text-slate-300 hover:text-amber-400"}`}>
          <StarIcon filled={task.starred} className="h-4 w-4" />
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto border-t border-slate-100">

        {/* 日付 */}
        <div
          className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-3.5 hover:bg-slate-50"
          onClick={() => setDateEdit((v) => !v)}
        >
          <CalIcon />
          <span className={`flex-1 text-sm ${task.due ? "text-slate-700" : "text-slate-400"}`}>
            {task.due ? dueFmt : "日付を追加"}
          </span>
          {task.due && !task.done && (
            <button
              onClick={(e) => { e.stopPropagation(); onUpdate({ due: "" }); }}
              className="shrink-0 text-slate-300 hover:text-slate-500"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {dateEdit && (
          <div className="border-b border-slate-100 px-4 py-3 bg-slate-50">
            <input
              type="date"
              value={task.due}
              onChange={(e) => { onUpdate({ due: e.target.value }); setDateEdit(false); }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              autoFocus
            />
          </div>
        )}

        {/* 時間 */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
          <ClockIcon />
          <input
            type="time"
            value={task.dueTime ?? ""}
            onChange={(e) => onUpdate({ dueTime: e.target.value || undefined })}
            className="flex-1 border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            placeholder="時間を追加"
            style={{ colorScheme: "light" }}
          />
        </div>

        {/* 繰り返し */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
          <RepIcon />
          <select
            value={task.repeat ?? "none"}
            onChange={(e) => onUpdate({ repeat: e.target.value as RepeatMode })}
            className="flex-1 border-0 bg-transparent text-sm text-slate-700 outline-none cursor-pointer"
          >
            {(Object.keys(repeatLabels) as RepeatMode[]).map((r) => (
              <option key={r} value={r}>{repeatLabels[r]}</option>
            ))}
          </select>
        </div>

        {/* プロジェクト */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
          <FolderIcon />
          <select
            value={task.project ?? ""}
            onChange={(e) => onUpdate({ project: e.target.value })}
            className="flex-1 border-0 bg-transparent text-sm text-slate-700 outline-none cursor-pointer"
          >
            <option value="">プロジェクトなし</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          {project && (
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${project.color}`} />
          )}
        </div>

        {/* メモ */}
        <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3.5">
          <MemoIcon />
          <textarea
            value={memoText}
            onChange={(e) => setMemoText(e.target.value)}
            onBlur={commitMemo}
            placeholder="メモを追加"
            rows={3}
            className="min-h-[4rem] flex-1 resize-none border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            style={{ fontSize: "14px", lineHeight: "1.6" }}
          />
        </div>

        {/* サブタスク */}
        <div className="px-4 py-3">
          <p className="mb-2 text-xs font-semibold text-slate-500">サブタスク</p>

          {/* Add subtask row */}
          <div className="flex items-center gap-2 py-1.5">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-slate-400">
              <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <input
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newSub.trim()) {
                  const id = `sub${Date.now()}`;
                  onUpdate({ subtasks: [...subtasks, { id, title: newSub.trim(), done: false }] });
                  setNewSub("");
                }
              }}
              placeholder="サブタスクを追加"
              className="flex-1 border-0 bg-transparent text-sm text-slate-500 outline-none placeholder:text-slate-400"
              style={{ fontSize: "14px" }}
            />
          </div>

          {/* Subtask list */}
          <div className="mt-1 space-y-0.5">
            {subtasks.map((s) => (
              <div key={s.id} className="group flex items-center gap-2 rounded-lg py-1.5">
                <button
                  onClick={() => onUpdate({ subtasks: subtasks.map((x) => x.id === s.id ? { ...x, done: !x.done } : x) })}
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${
                    s.done ? "border-slate-400 bg-slate-400 text-white" : "border-slate-400 hover:border-blue-500"
                  }`}
                >
                  {s.done && (
                    <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m20 6-11 11-5-5" />
                    </svg>
                  )}
                </button>
                <span className={`flex-1 text-sm ${s.done ? "text-slate-400 line-through" : "text-slate-700"}`}>{s.title}</span>
                <button
                  onClick={() => onUpdate({ subtasks: subtasks.filter((x) => x.id !== s.id) })}
                  className="shrink-0 text-slate-300 opacity-0 transition hover:text-slate-500 group-hover:opacity-100"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-slate-100 px-4 py-4">
          <button
            onClick={() => onDelete(task.id)}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50"
          >
            <TrashIcon className="h-4 w-4" />
            タスクを削除
          </button>
        </div>
      </div>
    </section>
  );
}
