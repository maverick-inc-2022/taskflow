import { useState, useRef, useEffect } from "react";
import type { Person, Project, RepeatMode, Task } from "../types";
import { repeatLabels, defaultProjects, people as defaultPeople } from "../data";
import { AvatarDisplay } from "../avatarIcons";
import { applyPlainTextToMemos, memosToPlainText } from "../memoText";
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
  const [memoText, setMemoText] = useState(() => memosToPlainText(task.memos));
  const [newSub, setNewSub]   = useState("");

  // Resync local drafts if the task changes underneath us (defensive — the
  // parent also remounts via key, but this prevents cross-task contamination).
  useEffect(() => { setTitle(task.title); }, [task.id, task.title]);
  useEffect(() => { setMemoText(memosToPlainText(task.memos)); }, [task.id]);
  const [showRepeat, setShowRepeat] = useState(false);
  const [showOwner, setShowOwner]   = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [showCustomRepeat, setShowCustomRepeat] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const subtasks = task.subtasks ?? [];

  const saveTitle = () => {
    const t = title.trim();
    if (t && t !== task.title) onUpdate({ title: t });
    else setTitle(task.title);
  };

  const commitMemo = () => {
    onUpdate({ memos: applyPlainTextToMemos(task.memos, memoText) });
  };

  // Keep overlay pinned to visible viewport (handles iOS keyboard)
  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) return;
    const vv = window.visualViewport;
    const sync = () => {
      const el = containerRef.current;
      if (!el || !vv) return;
      el.style.height = `${vv.height}px`;
      el.style.transform = `translateY(${vv.offsetTop}px)`;
    };
    sync();
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      document.body.style.overflow = prevOverflow;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dueFmt = () => {
    if (!task.due) return null;
    const d = new Date(task.due + "T00:00:00");
    const wd = ["日","月","火","水","木","金","土"][d.getDay()];
    return `${d.getMonth()+1}/${d.getDate()} (${wd})`;
  };

  const ownerPerson = people.find((p) => p.id === task.owner);
  const projectObj  = projects.find((p) => p.id === task.project);

  return (
    <div
      ref={containerRef}
      className="md:hidden fixed top-0 left-0 right-0 z-50 flex flex-col bg-white"
      style={{ height: "100dvh", overscrollBehavior: "none" }}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-white px-3 py-3">
        <button
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 active:bg-slate-100"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <button
          onClick={() => { onToggle(task.id); }}
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
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">

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
          <button
            onClick={() => setShowRepeat(true)}
            className="flex-1 text-left text-sm text-slate-700"
          >
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

        {/* メモ */}
        <div className="px-4 py-3.5">
          <textarea
            value={memoText}
            onChange={(e) => setMemoText(e.target.value)}
            onBlur={commitMemo}
            placeholder="メモを追加"
            rows={4}
            className="w-full resize-none border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            style={{ fontSize: "16px", lineHeight: "1.6" }}
          />
        </div>

        {/* サブタスク */}
        <div className="px-4 py-3">
          <p className="mb-2 text-xs font-semibold text-slate-400">サブタスク</p>
          <div className="space-y-1">
            {subtasks.map((s) => (
              <div key={s.id} className="flex items-center gap-2.5 py-1">
                <button
                  onClick={() => onUpdate({ subtasks: subtasks.map((x) => x.id === s.id ? { ...x, done: !x.done } : x) })}
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
                <button
                  onClick={() => onUpdate({ subtasks: subtasks.filter((x) => x.id !== s.id) })}
                  className="text-slate-300 active:text-red-400"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
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
                    onUpdate({ subtasks: [...subtasks, { id: `sub${Date.now()}`, title: newSub.trim(), done: false }] });
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
    </div>
  );
}
