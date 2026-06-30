import { useEffect, useRef, useState } from "react";
import { repeatLabels, defaultProjects, people as defaultPeople } from "../data";
import { memosToPlainText, applyPlainTextToMemos } from "../memoText";
import type { Person, Project, RepeatMode, Task } from "../types";
import { StarIcon, XIcon, TrashIcon } from "../icons";
import { AvatarDisplay } from "../avatarIcons";
import CustomRepeatModal from "./CustomRepeatModal";

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
  const [memoText, setMemoText]     = useState(() => memosToPlainText(task.memos));
  const [newSub, setNewSub]         = useState("");
  const [dateEdit, setDateEdit]     = useState(false);
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
  const subtasks = task.subtasks ?? [];

  useEffect(() => { setTitleDraft(task.title); }, [task.id, task.title]);
  useEffect(() => { setMemoText(memosToPlainText(task.memos)); }, [task.id]);
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

  const commitMemo = () => {
    onUpdate({ memos: applyPlainTextToMemos(task.memos, memoText) });
  };

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
          onChange={(e) => setTitleDraft(e.target.value)}
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

        {/* 日付 */}
        <div className="border-b border-slate-100">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <button onClick={() => setDateEdit((v) => !v)} className="shrink-0 text-slate-400 hover:text-blue-500 transition">
              <CalIcon />
            </button>
            <span
              className={`flex-1 cursor-pointer text-sm ${task.due ? "text-slate-700" : "text-slate-400"} hover:text-blue-600`}
              onClick={() => setDateEdit((v) => !v)}
            >
              {task.due ? dueFmt : "日付を追加"}
            </span>
            {task.due && !task.done && (
              <button onClick={() => { onUpdate({ due: "", dueTime: undefined }); setDateEdit(false); }}
                className="shrink-0 text-slate-300 hover:text-slate-500">
                <XIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {dateEdit && (
            <div className="px-4 pb-3 bg-slate-50">
              <input type="date" value={task.due}
                onChange={(e) => { onUpdate({ due: e.target.value }); setDateEdit(false); }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                autoFocus />
            </div>
          )}
        </div>

        {/* 時間 */}
        {task.due && (
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
            <button onClick={openTimePicker} className="shrink-0 text-slate-400 hover:text-blue-500 transition">
              <ClockIcon />
            </button>
            <input
              ref={timeInputRef}
              type="time"
              value={timeDraft}
              onChange={(e) => setTimeDraft(e.target.value)}
              onBlur={(e) => onUpdate({ dueTime: e.target.value || undefined })}
              placeholder="時間を追加"
              className="flex-1 border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              style={{ colorScheme: "light" }}
            />
            {timeDraft && (
              <button onClick={() => { setTimeDraft(""); onUpdate({ dueTime: undefined }); }}
                className="shrink-0 text-slate-300 hover:text-slate-500">
                <XIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* 繰り返し */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5">
          <RepIcon />
          <select
            value={task.repeat ?? "none"}
            onChange={(e) => {
              const val = e.target.value as RepeatMode;
              if (val === "custom") setShowCustomRepeat(true);
              else onUpdate({ repeat: val });
            }}
            className="flex-1 border-0 bg-transparent text-sm text-slate-700 outline-none cursor-pointer"
          >
            {(Object.keys(repeatLabels) as RepeatMode[]).map((r) => (
              <option key={r} value={r}>{repeatLabels[r]}</option>
            ))}
          </select>
        </div>
        {showCustomRepeat && (
          <CustomRepeatModal
            due={task.due}
            repeat={task.repeat ?? "none"}
            repeatConfig={task.repeatConfig ?? { interval: 1, unit: "week", daysOfWeek: [], endType: "none" }}
            onChange={(r, cfg) => { onUpdate({ repeat: r, repeatConfig: cfg }); }}
            onClose={() => setShowCustomRepeat(false)}
          />
        )}

        {/* プロジェクト */}
        <div className="relative border-b border-slate-100" ref={projectRef}>
          <div
            className="flex cursor-pointer items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition"
            onClick={() => setProjectOpen((v) => !v)}
          >
            <FolderIcon />
            {project ? (
              <span className="flex flex-1 items-center gap-2 text-sm text-slate-700">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${project.color}`} />
                {project.label}
              </span>
            ) : (
              <span className="flex-1 text-sm text-slate-400">プロジェクトなし</span>
            )}
          </div>
          {projectOpen && (
            <div className="absolute left-0 right-0 z-20 border border-slate-200 bg-white shadow-lg rounded-xl overflow-hidden mx-2">
              <button
                onClick={() => { onUpdate({ project: "" }); setProjectOpen(false); }}
                className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition hover:bg-slate-50 ${!task.project ? "text-blue-600 font-medium" : "text-slate-500"}`}
              >
                プロジェクトなし
                {!task.project && <span className="ml-auto text-blue-500">✓</span>}
              </button>
              {projects.map((p) => (
                <button key={p.id}
                  onClick={() => { onUpdate({ project: p.id }); setProjectOpen(false); }}
                  className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition hover:bg-slate-50 ${task.project === p.id ? "text-blue-600 font-medium" : "text-slate-700"}`}>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${p.color}`} />
                  {p.label}
                  {task.project === p.id && <span className="ml-auto text-blue-500">✓</span>}
                </button>
              ))}
              {onAddProject && (
                <div className="border-t border-slate-100 px-3 py-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    {PROJECT_COLORS.map((c) => (
                      <button key={c} onClick={() => setNewProjectColor(c)}
                        className={`h-4 w-4 shrink-0 rounded-full ${c} ${newProjectColor === c ? "ring-2 ring-offset-1 ring-blue-400" : ""}`} />
                    ))}
                  </div>
                  <input
                    placeholder="プロジェクト名を入力して Enter"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-400"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const v = newProjectName.trim();
                        if (v) { onAddProject(v, newProjectColor); setNewProjectName(""); setProjectOpen(false); }
                      }
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 担当者（設定済みのみ表示） */}
        <div className="relative border-b border-slate-100" ref={ownerRef}>
          <div
            className="flex cursor-pointer items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition"
            onClick={() => setOwnerOpen((v) => !v)}
          >
            <PersonIcon />
            {owner ? (
              <span className="flex flex-1 items-center gap-2 text-sm text-slate-700">
                <AvatarDisplay avatar={owner.avatar} name={owner.name} size={18} />
                {owner.name.replace("（自分）", "")}
              </span>
            ) : (
              <span className="flex-1 text-sm text-slate-400">担当者を追加</span>
            )}
            {owner && (
              <button onClick={(e) => { e.stopPropagation(); onUpdate({ owner: undefined }); }}
                className="shrink-0 text-slate-300 hover:text-slate-500">
                <XIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {ownerOpen && (
            <div className="absolute left-0 right-0 z-20 border border-slate-200 bg-white shadow-lg rounded-xl overflow-hidden mx-2">
              {people.map((p) => (
                <button key={p.id}
                  onClick={() => { onUpdate({ owner: p.id }); setOwnerOpen(false); }}
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
                  <input
                    placeholder="名前を入力して Enter"
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-400"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const v = (e.target as HTMLInputElement).value.trim();
                        if (v) { onAddPerson(v, "icon:male-adult:#64748b"); (e.target as HTMLInputElement).value = ""; }
                      }
                    }}
                  />
                </div>
              )}
            </div>
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
            style={{ fontSize: "14px", lineHeight: "1.7" }}
          />
        </div>

        {/* サブタスク */}
        <div className="px-4 py-3">
          <p className="mb-2 text-xs font-semibold text-slate-500">サブタスク</p>

          <div className="space-y-0.5">
            {subtasks.map((s) => (
              <div key={s.id} className="group flex items-center gap-2 rounded-lg py-1.5">
                <button
                  onClick={() => onUpdate({ subtasks: subtasks.map((x) => x.id === s.id ? { ...x, done: !x.done } : x) })}
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${
                    s.done ? "border-slate-400 bg-slate-400 text-white" : "border-slate-400 hover:border-blue-500"
                  }`}>
                  {s.done && (
                    <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m20 6-11 11-5-5"/>
                    </svg>
                  )}
                </button>
                <span className={`flex-1 text-sm ${s.done ? "text-slate-400 line-through" : "text-slate-700"}`}>{s.title}</span>
                <button onClick={() => onUpdate({ subtasks: subtasks.filter((x) => x.id !== s.id) })}
                  className="shrink-0 text-slate-300 opacity-0 transition hover:text-slate-500 group-hover:opacity-100">
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-1 flex items-center gap-2 py-1.5">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-slate-400">
              <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </span>
            <input
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newSub.trim()) {
                  onUpdate({ subtasks: [...subtasks, { id: `sub${Date.now()}`, title: newSub.trim(), done: false }] });
                  setNewSub("");
                }
              }}
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
    </section>
  );
}
