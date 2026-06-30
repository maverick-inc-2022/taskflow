import { useEffect, useState } from "react";
import { TODAY, projectColorOptions, repeatLabels } from "../data";
import type { Project, ProjectId, RepeatConfig, RepeatMode, Subtask, Task, TaskStatus } from "../types";
import { XIcon } from "../icons";
import CustomRepeatModal from "./CustomRepeatModal";
import { applyPlainTextToMemos } from "../memoText";

interface Props {
  onClose: () => void;
  onAdd: (task: Omit<Task, "id" | "done" | "starred">) => void;
  projects: Project[];
  onAddProject?: (label: string, color: string) => void;
  defaultRepeat?: RepeatMode;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: "not_started", label: "未着手",   color: "text-slate-400" },
  { value: "in_progress", label: "進行中",   color: "text-blue-500"  },
  { value: "in_review",   label: "レビュー中", color: "text-amber-500" },
  { value: "done",        label: "完了",     color: "text-emerald-500" },
];

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
function StatusIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/>
    </svg>
  );
}

export default function AddTaskModal({ onClose, onAdd, projects, onAddProject, defaultRepeat }: Props) {
  const [title, setTitle] = useState("");
  const [project, setProject] = useState<ProjectId>("");
  const [due, setDue] = useState(TODAY);
  const [dueTime, setDueTime] = useState("");
  const [status, setStatus] = useState<TaskStatus>("not_started");
  const [memoText, setMemoText] = useState("");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSub, setNewSub] = useState("");
  const [repeat, setRepeat] = useState<RepeatMode>(defaultRepeat ?? "none");
  const [repeatConfig, setRepeatConfig] = useState<RepeatConfig>({ interval: 1, unit: "week", daysOfWeek: [], endType: "none" });
  const [showCustomRepeat, setShowCustomRepeat] = useState(false);

  // Project add
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectLabel, setNewProjectLabel] = useState("");
  const [newProjectColor, setNewProjectColor] = useState("bg-blue-500");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const memos = applyPlainTextToMemos([], memoText);
    onAdd({
      title: title.trim(),
      project,
      due,
      dueTime: dueTime || undefined,
      priority: "mid",
      status,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
      memos: memos.length > 0 ? memos : undefined,
      repeat: repeat !== "none" ? repeat : undefined,
      repeatConfig: repeat === "custom" ? repeatConfig : undefined,
    });
    onClose();
  };

  const selectedProject = projects.find((p) => p.id === project);
  const currentStatusColor = STATUS_OPTIONS.find((s) => s.value === status)?.color ?? "text-slate-400";

  const rowClass = "flex items-center gap-3 border-b border-slate-100 px-4 py-3";
  const inputClass = "flex-1 border-0 bg-transparent text-sm text-slate-700 outline-none";

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="animate-slide-up w-full max-w-md rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">タスクを追加</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* タスク名 */}
          <div className="px-4 pt-4 pb-3 border-b border-slate-100">
            <textarea
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onInput={(e) => {
                const el = e.target as HTMLTextAreaElement;
                el.style.height = "auto";
                el.style.height = el.scrollHeight + "px";
              }}
              placeholder="タスク名を入力"
              rows={1}
              className="w-full resize-none border-0 bg-transparent text-base font-semibold text-slate-800 outline-none placeholder:text-slate-300 leading-snug min-h-0"
              style={{ fontSize: "16px" }}
            />
          </div>

          {/* 期限 + 時刻 */}
          <div className={rowClass}>
            <CalIcon />
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className={inputClass}
              style={{ colorScheme: "light" }}
            />
            <ClockIcon />
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="w-24 border-0 bg-transparent text-sm text-slate-700 outline-none"
              style={{ colorScheme: "light" }}
            />
          </div>

          {/* 繰り返し */}
          <div className={rowClass}>
            <RepIcon />
            <select
              value={repeat}
              onChange={(e) => {
                const val = e.target.value as RepeatMode;
                if (val === "custom") { setShowCustomRepeat(true); }
                else { setRepeat(val); }
              }}
              className={`${inputClass} cursor-pointer`}
            >
              {(Object.keys(repeatLabels) as RepeatMode[]).map((r) => (
                <option key={r} value={r}>{repeatLabels[r]}</option>
              ))}
            </select>
          </div>
          {showCustomRepeat && (
            <CustomRepeatModal
              due={due}
              repeat={repeat}
              repeatConfig={repeatConfig}
              onChange={(r, cfg) => { setRepeat(r); if (cfg) setRepeatConfig(cfg); }}
              onClose={() => setShowCustomRepeat(false)}
            />
          )}

          {/* プロジェクト */}
          <div className={rowClass}>
            <FolderIcon />
            {!addingProject ? (
              <>
                <select
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  className={`${inputClass} cursor-pointer`}
                >
                  <option value="">プロジェクトなし</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
                {selectedProject && (
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${selectedProject.color}`} />
                )}
                {onAddProject && (
                  <button
                    type="button"
                    onClick={() => setAddingProject(true)}
                    className="shrink-0 text-slate-400 hover:text-slate-600 text-sm px-1"
                  >
                    ＋
                  </button>
                )}
              </>
            ) : (
              <div className="flex-1 space-y-2">
                <input
                  autoFocus
                  value={newProjectLabel}
                  onChange={(e) => setNewProjectLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); }
                    if (e.key === "Escape") { setAddingProject(false); setNewProjectLabel(""); }
                  }}
                  placeholder="プロジェクト名"
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400 bg-white"
                />
                <div className="flex flex-wrap gap-1.5">
                  {projectColorOptions.map((c) => (
                    <button key={c} type="button" onClick={() => setNewProjectColor(c)}
                      className={`h-5 w-5 rounded-full ${c} transition hover:scale-110 ${newProjectColor === c ? "ring-2 ring-offset-1 ring-slate-400" : ""}`} />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setAddingProject(false); setNewProjectLabel(""); }}
                    className="flex-1 rounded-md border border-slate-200 py-1 text-xs text-slate-500 hover:bg-white transition">
                    キャンセル
                  </button>
                  <button type="button" disabled={!newProjectLabel.trim()}
                    onClick={() => {
                      if (!newProjectLabel.trim()) return;
                      onAddProject!(newProjectLabel.trim(), newProjectColor);
                      setAddingProject(false);
                      setNewProjectLabel("");
                    }}
                    className="flex-1 rounded-md bg-blue-600 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition">
                    追加
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ステータス */}
          <div className={rowClass}>
            <StatusIcon />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className={`${inputClass} cursor-pointer ${currentStatusColor}`}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* メモ */}
          <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3">
            <MemoIcon />
            <textarea
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
              placeholder="メモを追加"
              rows={3}
              className="flex-1 resize-none border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              style={{ fontSize: "14px", lineHeight: "1.6" }}
            />
          </div>

          {/* サブタスク */}
          <div className="px-4 py-3">
            <p className="mb-2 text-xs font-semibold text-slate-500">サブタスク</p>

            <div className="space-y-0.5">
              {subtasks.map((s) => (
                <div key={s.id} className="group flex items-center gap-2 rounded-lg py-1.5">
                  <button
                    type="button"
                    onClick={() => setSubtasks(subtasks.map((x) => x.id === s.id ? { ...x, done: !x.done } : x))}
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
                    type="button"
                    onClick={() => setSubtasks(subtasks.filter((x) => x.id !== s.id))}
                    className="shrink-0 text-slate-300 opacity-0 transition hover:text-slate-500 group-hover:opacity-100"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add subtask input */}
            <div className="mt-1 flex items-center gap-2 py-1.5">
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
                    e.preventDefault();
                    const id = `sub${Date.now()}`;
                    setSubtasks([...subtasks, { id, title: newSub.trim(), done: false }]);
                    setNewSub("");
                  }
                }}
                placeholder="タスクを追加"
                className="flex-1 border-0 bg-transparent text-sm text-slate-500 outline-none placeholder:text-slate-400"
                style={{ fontSize: "14px" }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={!title.trim()}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-40"
          >
            追加する
          </button>
        </div>
      </form>
    </div>
  );
}
