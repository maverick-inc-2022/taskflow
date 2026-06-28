/**
 * Shared inline-editing components used by TableView, KanbanView, and CalendarView.
 * Each component renders a clickable trigger and opens a portal dropdown on click.
 */
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { AvatarDisplay, AvatarPicker, DEFAULT_AVATAR } from "../avatarIcons";
import { projectColorOptions } from "../data";
import type { Person, Priority, Project, RepeatConfig, RepeatMode, Task } from "../types";
import { dueLabel, priorityMeta, repeatLabel } from "../ui";
import { RepeatSelector } from "./CustomRepeatModal";

// ── Portal base ───────────────────────────────────────────────────────────────

export function PortalDropdown({
  anchorEl,
  onClose,
  children,
  minWidth = 160,
}: {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  children: React.ReactNode;
  minWidth?: number;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!anchorEl) return;
    const r = anchorEl.getBoundingClientRect();
    const left = Math.min(r.left, window.innerWidth - minWidth - 8);
    const top = r.bottom + 4;
    setPos({ top, left });
  }, [anchorEl, minWidth]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!anchorEl?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [anchorEl, onClose]);

  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
        style={{ top: pos.top, left: pos.left, minWidth }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}

// ── Title ─────────────────────────────────────────────────────────────────────

interface EditableTitleProps {
  task: Task;
  onSave: (title: string) => void;
  className?: string;
  /** Optional: called when the title trigger is clicked (e.g. open notes panel) */
  onSelect?: () => void;
}

export function EditableTitle({ task, onSave, className = "", onSelect }: EditableTitleProps) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(task.title);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) ref.current?.select(); }, [editing]);

  const commit = () => {
    const v = val.trim();
    if (v && v !== task.title) onSave(v); else setVal(task.title);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={ref}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setVal(task.title); setEditing(false); }
        }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full rounded border border-blue-400 px-1 py-0.5 text-sm text-slate-700 outline-none ring-1 ring-blue-100 ${className}`}
      />
    );
  }

  return (
    <span
      title="クリックして編集"
      onClick={(e) => { e.stopPropagation(); setEditing(true); onSelect?.(); }}
      className={`cursor-text rounded px-0.5 hover:bg-slate-100 ${task.done ? "text-slate-400 line-through" : "text-slate-700"} ${className}`}
    >
      {task.title}
    </span>
  );
}

// ── Project ───────────────────────────────────────────────────────────────────

interface EditableProjectProps {
  task: Task;
  projects: Project[];
  onSave: (projectId: string) => void;
  onAddProject?: (label: string, color: string) => void;
  /** visual style for the trigger: "table" = plain text, "badge" = pill badge */
  variant?: "table" | "badge";
}

export function EditableProject({
  task,
  projects,
  onSave,
  onAddProject,
  variant = "table",
}: EditableProjectProps) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("bg-blue-500");
  const ref = useRef<HTMLSpanElement>(null);
  const project = projects.find((p) => p.id === task.project);

  const commitAdd = () => {
    const l = newLabel.trim();
    if (!l) return;
    onAddProject?.(l, newColor);
    setNewLabel(""); setNewColor("bg-blue-500"); setAdding(false); setOpen(false);
  };

  const triggerClass =
    variant === "badge"
      ? "inline-flex cursor-pointer items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 transition hover:bg-slate-200"
      : "inline-flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 text-sm hover:bg-slate-100";

  return (
    <span ref={ref} className="relative">
      <span onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); setAdding(false); }} className={triggerClass}>
        {project
          ? (<><span className={`h-2 w-2 rounded-full ${project.color}`} /><span className="text-slate-600">{project.label}</span></>)
          : (<span className="text-slate-300">—</span>)
        }
      </span>

      {open && (
        <PortalDropdown anchorEl={ref.current} onClose={() => { setOpen(false); setAdding(false); setNewLabel(""); }} minWidth={180}>
          {!adding ? (
            <>
              {projects.map((p) => (
                <button key={p.id} onClick={() => { onSave(p.id); setOpen(false); }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 ${task.project === p.id ? "font-semibold text-blue-600" : "text-slate-700"}`}>
                  <span className={`h-2 w-2 rounded-full ${p.color}`} />{p.label}
                </button>
              ))}
              {onAddProject && (
                <div className="border-t border-slate-100 pt-1">
                  <button onClick={() => setAdding(true)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                    <span className="text-base leading-none">＋</span> プロジェクトを追加
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="p-3 space-y-2">
              <input autoFocus value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitAdd(); if (e.key === "Escape") { setAdding(false); setNewLabel(""); } }}
                placeholder="プロジェクト名"
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400" />
              <div className="flex flex-wrap gap-1.5">
                {projectColorOptions.map((c) => (
                  <button key={c} type="button" onClick={() => setNewColor(c)}
                    className={`h-5 w-5 rounded-full ${c} transition hover:scale-110 ${newColor === c ? "ring-2 ring-offset-1 ring-slate-400" : ""}`} />
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setAdding(false); setNewLabel(""); }}
                  className="flex-1 rounded-md border border-slate-200 py-1 text-xs text-slate-500 hover:bg-slate-50">キャンセル</button>
                <button disabled={!newLabel.trim()} onClick={commitAdd}
                  className="flex-1 rounded-md bg-blue-600 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40">追加</button>
              </div>
            </div>
          )}
        </PortalDropdown>
      )}
    </span>
  );
}

// ── Owner ─────────────────────────────────────────────────────────────────────

interface EditableOwnerProps {
  task: Task;
  people: Person[];
  onSave: (ownerId: string | undefined) => void;
  onAddPerson?: (name: string, avatar: string) => void;
  variant?: "table" | "badge";
}

export function EditableOwner({
  task,
  people,
  onSave,
  onAddPerson,
  variant = "table",
}: EditableOwnerProps) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAvatar, setNewAvatar] = useState(DEFAULT_AVATAR);
  const ref = useRef<HTMLSpanElement>(null);
  const owner = people.find((p) => p.id === task.owner);

  const commitAdd = () => {
    const n = newName.trim();
    if (!n) return;
    onAddPerson?.(n, newAvatar);
    setNewName(""); setNewAvatar(DEFAULT_AVATAR); setAdding(false); setOpen(false);
  };

  return (
    <span ref={ref} className="relative">
      <span onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); setAdding(false); }}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 hover:bg-slate-100">
        {owner
          ? (<><AvatarDisplay avatar={owner.avatar} name={owner.name} size={20} /><span className={`text-slate-600 ${variant === "badge" ? "text-xs" : "text-sm"}`}>{owner.name.replace("（自分）", "")}</span></>)
          : (<span className="text-slate-300">—</span>)
        }
      </span>

      {open && (
        <PortalDropdown anchorEl={ref.current} onClose={() => { setOpen(false); setAdding(false); setNewName(""); }} minWidth={200}>
          {!adding ? (
            <>
              <button onClick={() => { onSave(undefined); setOpen(false); }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 ${!task.owner ? "font-semibold text-blue-600" : "text-slate-400"}`}>
                なし
              </button>
              {people.map((p) => (
                <button key={p.id} onClick={() => { onSave(p.id); setOpen(false); }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 ${task.owner === p.id ? "font-semibold text-blue-600" : "text-slate-700"}`}>
                  <AvatarDisplay avatar={p.avatar} name={p.name} size={20} />{p.name.replace("（自分）", "")}
                </button>
              ))}
              {onAddPerson && (
                <div className="border-t border-slate-100 pt-1">
                  <button onClick={() => setAdding(true)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                    <span className="text-base leading-none">＋</span> 担当者を追加
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="p-3 space-y-2">
              <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitAdd(); if (e.key === "Escape") { setAdding(false); setNewName(""); } }}
                placeholder="名前"
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400" />
              <AvatarPicker value={newAvatar} onChange={setNewAvatar} />
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setAdding(false); setNewName(""); setNewAvatar(DEFAULT_AVATAR); }}
                  className="flex-1 rounded-md border border-slate-200 py-1 text-xs text-slate-500 hover:bg-slate-50">キャンセル</button>
                <button disabled={!newName.trim()} onClick={commitAdd}
                  className="flex-1 rounded-md bg-blue-600 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40">追加</button>
              </div>
            </div>
          )}
        </PortalDropdown>
      )}
    </span>
  );
}

// ── Due + Repeat ──────────────────────────────────────────────────────────────

interface EditableDueProps {
  task: Task;
  today: string;
  onSave: (due: string, dueTime?: string, repeat?: RepeatMode, repeatConfig?: RepeatConfig) => void;
}

export function EditableDue({ task, today, onSave }: EditableDueProps) {
  const [open, setOpen] = useState(false);
  const [due, setDue] = useState(task.due);
  const [time, setTime] = useState(task.dueTime ?? "");
  const [repeat, setRepeat] = useState<RepeatMode>(task.repeat ?? "none");
  const [repeatConfig, setRepeatConfig] = useState<RepeatConfig>(
    task.repeatConfig ?? { interval: 1, unit: "week", daysOfWeek: [], endType: "none" }
  );
  const ref = useRef<HTMLSpanElement>(null);

  const displayLabel = task.done && task.completedDate
    ? `完了 ${task.completedDate}`
    : dueLabel(task.due, today) || task.due;

  return (
    <span ref={ref} className="relative">
      <span
        onClick={(e) => {
          e.stopPropagation();
          setDue(task.due); setTime(task.dueTime ?? "");
          setRepeat(task.repeat ?? "none");
          setRepeatConfig(task.repeatConfig ?? { interval: 1, unit: "week", daysOfWeek: [], endType: "none" });
          setOpen((v) => !v);
        }}
        className="cursor-pointer rounded px-1 py-0.5 text-slate-500 hover:bg-slate-100"
      >
        {task.due ? displayLabel : "—"}
      </span>

      {open && (
        <PortalDropdown anchorEl={ref.current} onClose={() => setOpen(false)} minWidth={256}>
          <div className="p-3 space-y-2.5">
            <div>
              <p className="mb-1 text-[10px] font-semibold text-slate-400">日付</p>
              <input type="date" value={due} onChange={(e) => setDue(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold text-slate-400">時間（任意）</p>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold text-slate-400">繰り返し</p>
              <RepeatSelector
                due={due || task.due}
                repeat={repeat}
                repeatConfig={repeatConfig}
                onChange={(r, cfg) => { setRepeat(r); if (cfg) setRepeatConfig(cfg); }}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { onSave(due, time || undefined, repeat !== "none" ? repeat : undefined, repeat === "custom" ? repeatConfig : undefined); setOpen(false); }}
                className="flex-1 rounded-lg bg-blue-600 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
                保存
              </button>
              <button onClick={() => setOpen(false)}
                className="flex-1 rounded-lg bg-slate-100 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200">
                キャンセル
              </button>
            </div>
          </div>
        </PortalDropdown>
      )}
    </span>
  );
}

// ── Priority ──────────────────────────────────────────────────────────────────

interface EditablePriorityProps {
  task: Task;
  onSave: (priority: Priority) => void;
  variant?: "table" | "badge";
}

export function EditablePriority({ task, onSave, variant = "table" }: EditablePriorityProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const pr = priorityMeta[task.priority];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const baseClass = variant === "badge"
    ? `flex h-5 w-6 cursor-pointer items-center justify-center rounded text-[10px] font-semibold transition hover:opacity-80 ${pr.className}`
    : `inline-flex h-6 w-10 cursor-pointer items-center justify-center rounded-md text-xs font-semibold hover:opacity-80 ${pr.className}`;

  return (
    <span ref={ref} className="relative">
      <span onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} className={baseClass}>
        {pr.label}
      </span>
      {open && (
        <PortalDropdown anchorEl={ref.current} onClose={() => setOpen(false)} minWidth={110}>
          {(Object.keys(priorityMeta) as Priority[]).map((p) => (
            <button key={p} onClick={() => { onSave(p); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 ${task.priority === p ? "font-semibold" : "text-slate-700"}`}>
              <span className={`flex h-5 w-8 items-center justify-center rounded text-xs font-semibold ${priorityMeta[p].className}`}>
                {priorityMeta[p].label}
              </span>
            </button>
          ))}
        </PortalDropdown>
      )}
    </span>
  );
}

// ── Repeat (trigger shows repeat label, opens due+repeat picker) ──────────────

interface EditableRepeatProps {
  task: Task;
  today: string;
  onSave: (due: string, dueTime?: string, repeat?: RepeatMode, repeatConfig?: RepeatConfig) => void;
}

export function EditableRepeat({ task, today, onSave }: EditableRepeatProps) {
  const [open, setOpen] = useState(false);
  const [due, setDue] = useState(task.due);
  const [time, setTime] = useState(task.dueTime ?? "");
  const [repeat, setRepeat] = useState<RepeatMode>(task.repeat ?? "none");
  const [repeatConfig, setRepeatConfig] = useState<RepeatConfig>(
    task.repeatConfig ?? { interval: 1, unit: "week", daysOfWeek: [], endType: "none" }
  );
  const ref = useRef<HTMLSpanElement>(null);

  const rLabel = repeatLabel(task.repeat, task.repeatConfig);
  const active = !!task.repeat && task.repeat !== "none";

  return (
    <span ref={ref} className="relative">
      <span
        onClick={(e) => {
          e.stopPropagation();
          setDue(task.due); setTime(task.dueTime ?? "");
          setRepeat(task.repeat ?? "none");
          setRepeatConfig(task.repeatConfig ?? { interval: 1, unit: "week", daysOfWeek: [], endType: "none" });
          setOpen((v) => !v);
        }}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded px-1 py-0.5 hover:bg-slate-100"
      >
        <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 shrink-0 ${active ? "text-violet-500" : "text-slate-300"}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
          <path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
        </svg>
        <span className={`text-sm font-medium ${active ? "text-violet-600" : "text-slate-400"}`}>{rLabel}</span>
      </span>

      {open && (
        <PortalDropdown anchorEl={ref.current} onClose={() => setOpen(false)} minWidth={256}>
          <div className="p-3 space-y-2.5">
            <div>
              <p className="mb-1 text-[10px] font-semibold text-slate-400">日付</p>
              <input type="date" value={due} onChange={(e) => setDue(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold text-slate-400">時間（任意）</p>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <p className="mb-1 text-[10px] font-semibold text-slate-400">繰り返し</p>
              <RepeatSelector
                due={due || task.due}
                repeat={repeat}
                repeatConfig={repeatConfig}
                onChange={(r, cfg) => { setRepeat(r); if (cfg) setRepeatConfig(cfg); }}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  onSave(due, time || undefined, repeat !== "none" ? repeat : undefined, repeat === "custom" ? repeatConfig : undefined);
                  setOpen(false);
                }}
                className="flex-1 rounded-lg bg-blue-600 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
                保存
              </button>
              <button onClick={() => setOpen(false)}
                className="flex-1 rounded-lg bg-slate-100 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200">
                キャンセル
              </button>
            </div>
          </div>
        </PortalDropdown>
      )}
    </span>
  );
}
