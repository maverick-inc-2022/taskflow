import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { people as staticPeople, projects as staticProjects, taskColors, projectColorOptions } from "../data";
import type { Person, Priority, Project, RepeatConfig, RepeatMode, Task } from "../types";
import { dueLabel, priorityMeta } from "../ui";
import { GripIcon, RepeatIcon, StarIcon } from "../icons";
import { AvatarDisplay, AvatarPicker, DEFAULT_AVATAR } from "../avatarIcons";

interface Props {
  task: Task;
  today: string;
  onToggle: (id: string) => void;
  onStar?: (id: string) => void;
  onSelect?: (id: string) => void;
  onRename?: (id: string, title: string) => void;
  onHover?: (id: string | null) => void;
  onChangeProject?: (id: string, projectId: string) => void;
  onChangeOwner?: (id: string, ownerId: string | undefined) => void;
  onChangePriority?: (id: string, priority: Priority) => void;
  onChangeDue?: (id: string, due: string, dueTime: string | undefined, repeat: RepeatMode, repeatConfig?: RepeatConfig) => void;
  onAddPerson?: (name: string, avatar: string) => void;
  onAddProject?: (label: string, color: string) => void;
  projects?: Project[];
  people?: Person[];
  selected?: boolean;
  checked?: boolean;
  selectionActive?: boolean;
  onToggleSelect?: (id: string) => void;
  featured?: boolean;
  draggable?: boolean;
  dragging?: boolean;
  dragOver?: boolean;
  onDragStart?: (id: string) => void;
  onDragEnter?: (id: string) => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
}

// Generic portal dropdown
function InlineDropdown({
  anchorRef,
  onClose,
  children,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
  }, [anchorRef]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!anchorRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [anchorRef, onClose]);

  return createPortal(
    <div
      className="fixed z-50 min-w-[200px] rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
}

export default function TaskItem({
  task,
  today,
  onToggle,
  onStar,
  onSelect,
  onRename,
  onHover,
  onChangeProject,
  onChangeOwner,
  onChangePriority,
  onChangeDue,
  onAddPerson,
  onAddProject,
  projects: propProjects,
  people: propPeople,
  selected,
  checked,
  draggable,
  dragging,
  dragOver,
  onDragStart,
  onDragEnter,
  onDrop,
  onDragEnd,
}: Props) {
  const projects = propProjects ?? staticProjects;
  const people = propPeople ?? staticPeople;
  const project = projects.find((p) => p.id === task.project);
  const pr = priorityMeta[task.priority];
  const owner = people.find((p) => p.id === task.owner);
  const stripe = task.color && task.color !== "none" ? taskColors[task.color]?.stripe : "";
  const isOthers = !!task.owner && task.owner !== "me";
  const due = task.dueTime
    ? `${dueLabel(task.due, today)}  ${task.dueTime}まで`
    : `${dueLabel(task.due, today)}中`;

  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectLabel, setNewProjectLabel] = useState("");
  const [newProjectColor, setNewProjectColor] = useState("bg-blue-500");
  const [showOwnerPicker, setShowOwnerPicker] = useState(false);
  const [addingPerson, setAddingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonAvatar, setNewPersonAvatar] = useState(DEFAULT_AVATAR);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const priorityBtnRef = useRef<HTMLSpanElement>(null);
  const [showDuePicker, setShowDuePicker] = useState(false);
  const dueBtnRef = useRef<HTMLSpanElement>(null);

  const [dueEdit, setDueEdit] = useState({
    due: task.due,
    dueTime: task.dueTime ?? "",
    repeat: (task.repeat ?? "none") as RepeatMode,
    repeatConfig: task.repeatConfig ?? { interval: 1, unit: "week" as const, daysOfWeek: [new Date(task.due + "T00:00:00").getDay()], endType: "none" as const },
  });
  const [showCustomModal, setShowCustomModal] = useState(false);

  const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
  const UNIT_LABELS: Record<string, string> = { day: "日ごと", week: "週ごと", month: "月ごと", year: "年ごと" };

  const repeatOptions: { id: RepeatMode; getLabel: () => string }[] = [
    { id: "none", getLabel: () => "なし" },
    { id: "daily", getLabel: () => "毎日" },
    { id: "weekly", getLabel: () => "毎週" },
    { id: "weekly-weekday", getLabel: () => { const d = new Date(dueEdit.due + "T00:00:00"); return `毎週${WEEKDAY_LABELS[d.getDay()]}曜日`; } },
    { id: "monthly", getLabel: () => { const d = new Date(dueEdit.due + "T00:00:00"); return `毎月${d.getDate()}日`; } },
    { id: "yearly", getLabel: () => "毎年" },
    { id: "custom", getLabel: () => "カスタム…" },
  ];

  const commitDue = (overrideRepeat?: RepeatMode, overrideConfig?: RepeatConfig) => {
    const rep = overrideRepeat ?? dueEdit.repeat;
    const cfg = overrideConfig ?? (rep === "custom" ? dueEdit.repeatConfig : undefined);
    onChangeDue?.(task.id, dueEdit.due, dueEdit.dueTime || undefined, rep, cfg);
    setShowDuePicker(false);
    setShowCustomModal(false);
  };
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.title);
  const editInputRef = useRef<HTMLInputElement>(null);
  const projectBtnRef = useRef<HTMLButtonElement>(null);
  const ownerBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (editing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editing]);

  const commitEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== task.title) onRename?.(task.id, trimmed);
    else setEditValue(task.title);
    setEditing(false);
  };

  // Select the task row AND enter title edit mode
  const selectAndEdit = () => {
    onSelect?.(task.id);
    if (!task.done) { setEditValue(task.title); setEditing(true); }
  };

  return (
    <div
      draggable={draggable}
      onClick={selectAndEdit}
      onMouseEnter={() => onHover?.(task.id)}
      onMouseLeave={() => onHover?.(null)}
      onDragStart={() => onDragStart?.(task.id)}
      onDragEnter={() => onDragEnter?.(task.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDrop?.()}
      onDragEnd={() => onDragEnd?.()}
      className={`group relative flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 transition ${
        task.done ? "" : stripe ? `border-l-4 ${stripe}` : ""
      } ${dragging ? "opacity-40" : isOthers && !task.done ? "opacity-40 hover:opacity-70" : ""} ${dragOver ? "ring-2 ring-blue-300" : ""} ${
        task.done
          ? "bg-slate-200 hover:bg-slate-200"
          : checked
            ? "bg-blue-100/70 ring-1 ring-blue-300"
            : selected
              ? "bg-blue-50 ring-1 ring-blue-200"
              : "hover:bg-slate-50"
      }`}
    >
      {/* drag handle */}
      <span
        className={`h-4 w-4 shrink-0 transition ${draggable ? "cursor-grab text-slate-300 opacity-0 group-hover:opacity-100 active:cursor-grabbing" : "pointer-events-none opacity-0"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <GripIcon className="h-4 w-4" />
      </span>

      {/* completion checkbox — always circle */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
        aria-label="完了"
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90 ${
          task.done
            ? "border-slate-400 bg-slate-400 text-white"
            : "border-slate-300 hover:border-blue-500"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className={`h-3.5 w-3.5 transition-all duration-200 ${task.done ? "scale-100 opacity-100" : "scale-0 opacity-0"}`}
          fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="m20 6-11 11-5-5" />
        </svg>
      </button>

      {/* project picker trigger — invisible, anchored for dropdown only */}
      <button
        ref={projectBtnRef}
        onClick={(e) => { e.stopPropagation(); selectAndEdit(); if (onChangeProject) setShowProjectPicker((v) => !v); }}
        className="hidden"
        aria-hidden
      />
      {/* Project picker dropdown */}
      {showProjectPicker && (
        <InlineDropdown
          anchorRef={projectBtnRef as React.RefObject<HTMLElement | null>}
          onClose={() => { setShowProjectPicker(false); setAddingProject(false); setNewProjectLabel(""); }}
        >
          <button
            onClick={() => { onChangeProject?.(task.id, ""); setShowProjectPicker(false); }}
            className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 ${
              !task.project ? "font-semibold text-blue-600" : "text-slate-400"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-slate-300" />
            未割当
          </button>
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => { onChangeProject?.(task.id, p.id); setShowProjectPicker(false); }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 ${
                task.project === p.id ? "font-semibold text-blue-600" : "text-slate-700"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${p.color}`} />
              {p.label}
            </button>
          ))}
          {onAddProject && (
            <div className="border-t border-slate-100 mt-1 pt-1">
              {!addingProject ? (
                <button
                  onClick={() => setAddingProject(true)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                >
                  <span className="text-base leading-none">＋</span> プロジェクトを追加
                </button>
              ) : (
                <div className="px-3 py-2 space-y-2">
                  <input
                    autoFocus
                    value={newProjectLabel}
                    onChange={(e) => setNewProjectLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newProjectLabel.trim()) {
                        onAddProject(newProjectLabel.trim(), newProjectColor);
                        setAddingProject(false);
                        setNewProjectLabel("");
                        setShowProjectPicker(false);
                      }
                      if (e.key === "Escape") { setAddingProject(false); setNewProjectLabel(""); }
                    }}
                    placeholder="プロジェクト名"
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-400"
                  />
                  <div className="flex flex-wrap gap-1">
                    {projectColorOptions.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewProjectColor(c)}
                        className={`h-5 w-5 rounded-full ${c} transition hover:scale-110 ${newProjectColor === c ? "ring-2 ring-offset-1 ring-slate-400" : ""}`}
                      />
                    ))}
                  </div>
                  <button
                    disabled={!newProjectLabel.trim()}
                    onClick={() => {
                      if (!newProjectLabel.trim()) return;
                      onAddProject(newProjectLabel.trim(), newProjectColor);
                      setAddingProject(false);
                      setNewProjectLabel("");
                      setShowProjectPicker(false);
                    }}
                    className="w-full rounded-md bg-blue-600 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition"
                  >
                    追加
                  </button>
                </div>
              )}
            </div>
          )}
        </InlineDropdown>
      )}

      {/* title + project dot + due date */}
      <span className="relative min-w-0 flex-1">
        {editing ? (
          <input
            ref={editInputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") { setEditValue(task.title); setEditing(false); }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded bg-white px-1 text-[15px] text-slate-700 outline-none ring-2 ring-blue-400"
          />
        ) : (
          <>
            <span
              className={`block truncate text-[15px] transition-colors duration-300 ${task.done ? "text-slate-400 line-through" : "text-slate-800"}`}
              onClick={(e) => { e.stopPropagation(); selectAndEdit(); }}
            >
              {task.title}
            </span>
            {/* Project dot + name, always visible */}
            {project && (
              <span className="flex items-center gap-1 mt-0.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${task.done ? "bg-slate-300" : project.color}`} />
                <span className="text-xs text-slate-400 truncate">{project.label}</span>
              </span>
            )}
            <span
              className={`pointer-events-none absolute left-0 top-[10px] h-px origin-left bg-slate-400 transition-transform duration-300 ease-out ${task.done ? "scale-x-100" : "scale-x-0"}`}
              style={{ width: "100%" }}
            />
          </>
        )}
      </span>

      {/* star button */}
      {onStar && (
        <button
          onClick={(e) => { e.stopPropagation(); onStar(task.id); }}
          className={`shrink-0 p-1 transition ${task.starred ? "text-amber-400" : "text-slate-300 hover:text-slate-400"}`}
        >
          <StarIcon filled={task.starred} className="h-4 w-4" />
        </button>
      )}

      {/* owner — hidden, kept for dropdown logic */}
      <button
        ref={ownerBtnRef}
        onClick={(e) => {
          e.stopPropagation();
          selectAndEdit();
          if (onChangeOwner) setShowOwnerPicker((v) => !v);
        }}
        title={owner?.name ?? "担当者を設定"}
        className={`hidden w-36 shrink-0 items-center gap-1.5 transition ${onChangeOwner ? "hover:bg-slate-100 rounded-lg px-1" : "cursor-default"}`}
      >
        {owner ? (
          <>
            <AvatarDisplay avatar={owner.avatar} name={owner.name} size={22} className={`ring-1 ring-slate-200 ${task.done ? "opacity-50" : ""}`} />
            <span className={`truncate text-sm ${task.done ? "text-slate-400" : "text-slate-600"}`}>
              {owner.name.replace("（自分）", "")}
            </span>
          </>
        ) : (
          <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-dashed text-xs text-slate-300 ${onChangeOwner ? "border-slate-300 hover:border-blue-400" : "border-transparent"}`}>
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </span>
        )}
      </button>
      {showOwnerPicker && (
        <InlineDropdown
          anchorRef={ownerBtnRef as React.RefObject<HTMLElement | null>}
          onClose={() => setShowOwnerPicker(false)}
        >
          <button
            onClick={() => { onChangeOwner?.(task.id, undefined); setShowOwnerPicker(false); }}
            className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 ${!task.owner ? "font-semibold text-blue-600" : "text-slate-500"}`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-300">
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </span>
            未割当
          </button>
          {people.map((p) => (
            <button
              key={p.id}
              onClick={() => { onChangeOwner?.(task.id, p.id); setShowOwnerPicker(false); }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 ${task.owner === p.id ? "font-semibold text-blue-600" : "text-slate-700"}`}
            >
              <AvatarDisplay avatar={p.avatar} name={p.name} size={20} />
              {p.name.replace("（自分）", "")}
            </button>
          ))}
          {/* Inline add person */}
          <div className="border-t border-slate-100 px-3 pt-2 pb-2">
            {!addingPerson ? (
              <button
                onClick={() => setAddingPerson(true)}
                className="flex w-full items-center gap-2 py-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-blue-400 text-base leading-none">+</span>
                担当者を追加
              </button>
            ) : (
              <div onClick={(e) => e.stopPropagation()}>
                <input
                  autoFocus
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newPersonName.trim()) {
                      onAddPerson?.(newPersonName.trim(), newPersonAvatar);
                      setNewPersonName(""); setAddingPerson(false);
                    }
                    if (e.key === "Escape") { setNewPersonName(""); setAddingPerson(false); }
                  }}
                  placeholder="名前"
                  className="mb-2 w-full rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-400"
                />
                <div className="mb-2">
                  <AvatarPicker value={newPersonAvatar} onChange={setNewPersonAvatar} />
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      if (newPersonName.trim()) {
                        onAddPerson?.(newPersonName.trim(), newPersonAvatar);
                        setNewPersonName(""); setAddingPerson(false);
                      }
                    }}
                    disabled={!newPersonName.trim()}
                    className="flex-1 rounded bg-blue-600 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
                  >追加</button>
                  <button onClick={() => { setNewPersonName(""); setAddingPerson(false); }}
                    className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">キャンセル</button>
                </div>
              </div>
            )}
          </div>
        </InlineDropdown>
      )}

      {/* due date + repeat — hidden */}
      <span className="relative hidden w-52 shrink-0 items-center justify-end gap-1.5">
        <span
          ref={dueBtnRef}
          onClick={(e) => { e.stopPropagation(); selectAndEdit(); if (!task.done && onChangeDue) { setDueEdit({ due: task.due, dueTime: task.dueTime ?? "", repeat: (task.repeat ?? "none") as RepeatMode, repeatConfig: task.repeatConfig ?? { interval: 1, unit: "week" as const, daysOfWeek: [new Date(task.due + "T00:00:00").getDay()], endType: "none" as const } }); setShowDuePicker((v) => !v); } }}
          className={`text-right text-base ${task.done ? "text-slate-400" : "text-slate-500"} ${!task.done && onChangeDue ? "cursor-pointer hover:text-slate-700 hover:underline" : ""}`}
        >
          {task.done && task.completedDate ? task.completedDate : due}
        </span>
        {task.repeat && task.repeat !== "none" && (
          <RepeatIcon className="h-4 w-4 shrink-0 text-slate-400" />
        )}
        {showDuePicker && createPortal(
          (() => {
            const rect = dueBtnRef.current?.getBoundingClientRect();
            return (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDuePicker(false)} />
                <div
                  className="fixed z-50 w-96 rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
                  style={{ top: (rect?.bottom ?? 0) + 4, left: Math.min(rect?.right ?? 0, window.innerWidth - 392) - 384 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* 日付 + 時間 横並び */}
                  <div className="mb-3 flex gap-3">
                    <div className="flex-1">
                      <p className="mb-1 text-xs font-semibold text-slate-400">日付</p>
                      <input
                        type="date"
                        value={dueEdit.due}
                        onChange={(e) => setDueEdit((d) => ({ ...d, due: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div className="w-32">
                      <p className="mb-1 text-xs font-semibold text-slate-400">時間（任意）</p>
                      <input
                        type="time"
                        value={dueEdit.dueTime}
                        onChange={(e) => setDueEdit((d) => ({ ...d, dueTime: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </div>
                  {/* 繰り返し — 2列グリッド */}
                  <p className="mb-1.5 text-xs font-semibold text-slate-400">繰り返し</p>
                  <div className="mb-3 grid grid-cols-2 gap-0.5">
                    {repeatOptions.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          if (r.id === "custom") {
                            setDueEdit((d) => ({ ...d, repeat: "custom" }));
                            setShowCustomModal(true);
                          } else {
                            setDueEdit((d) => ({ ...d, repeat: r.id }));
                          }
                        }}
                        className={`rounded-lg px-2.5 py-1.5 text-left text-sm transition ${dueEdit.repeat === r.id ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-700 hover:bg-slate-50"}`}
                      >
                        {r.getLabel()}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => commitDue()} className="flex-1 rounded-lg bg-blue-600 py-1.5 text-sm font-medium text-white hover:bg-blue-700">保存</button>
                    <button onClick={() => setShowDuePicker(false)} className="flex-1 rounded-lg bg-slate-100 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200">キャンセル</button>
                  </div>
                </div>
                {/* カスタム繰り返しモーダル */}
                {showCustomModal && (
                  <>
                    <div className="fixed inset-0 z-[60] bg-black/30" onClick={() => setShowCustomModal(false)} />
                    <div
                      className="fixed left-1/2 top-1/2 z-[70] w-80 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <h3 className="mb-4 text-base font-bold text-slate-800">カスタムの繰り返し</h3>
                      {/* 間隔 */}
                      <p className="mb-1 text-xs font-semibold text-slate-400">繰り返す間隔:</p>
                      <div className="mb-4 flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          value={dueEdit.repeatConfig.interval}
                          onChange={(e) => setDueEdit((d) => ({ ...d, repeatConfig: { ...d.repeatConfig, interval: Math.max(1, +e.target.value) } }))}
                          className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <select
                          value={dueEdit.repeatConfig.unit}
                          onChange={(e) => setDueEdit((d) => ({ ...d, repeatConfig: { ...d.repeatConfig, unit: e.target.value as RepeatConfig["unit"] } }))}
                          className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-400"
                        >
                          {(["day", "week", "month", "year"] as const).map((u) => (
                            <option key={u} value={u}>{UNIT_LABELS[u]}</option>
                          ))}
                        </select>
                      </div>
                      {/* 曜日 (週のみ) */}
                      {dueEdit.repeatConfig.unit === "week" && (
                        <>
                          <p className="mb-1 text-xs font-semibold text-slate-400">曜日:</p>
                          <div className="mb-4 flex gap-1">
                            {WEEKDAY_LABELS.map((wd, i) => {
                              const active = (dueEdit.repeatConfig.daysOfWeek ?? []).includes(i);
                              return (
                                <button
                                  key={i}
                                  onClick={() => setDueEdit((d) => {
                                    const days = d.repeatConfig.daysOfWeek ?? [];
                                    return { ...d, repeatConfig: { ...d.repeatConfig, daysOfWeek: active ? days.filter((x) => x !== i) : [...days, i].sort() } };
                                  })}
                                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition ${active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                                >
                                  {wd}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                      {/* 終了条件 */}
                      <p className="mb-1 text-xs font-semibold text-slate-400">終了日</p>
                      <div className="mb-4 space-y-2">
                        {([["none", "なし"], ["date", "終了日:"], ["count", "繰り返し:"]] as const).map(([type, lbl]) => (
                          <label key={type} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                            <input
                              type="radio"
                              name="endType"
                              value={type}
                              checked={dueEdit.repeatConfig.endType === type}
                              onChange={() => setDueEdit((d) => ({ ...d, repeatConfig: { ...d.repeatConfig, endType: type } }))}
                              className="accent-blue-600"
                            />
                            {lbl}
                            {type === "date" && dueEdit.repeatConfig.endType === "date" && (
                              <input
                                type="date"
                                value={dueEdit.repeatConfig.endDate ?? ""}
                                onChange={(e) => setDueEdit((d) => ({ ...d, repeatConfig: { ...d.repeatConfig, endDate: e.target.value } }))}
                                className="ml-1 flex-1 rounded border border-slate-200 px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-blue-400"
                              />
                            )}
                            {type === "count" && dueEdit.repeatConfig.endType === "count" && (
                              <div className="ml-1 flex items-center gap-1">
                                <input
                                  type="number"
                                  min={1}
                                  value={dueEdit.repeatConfig.endCount ?? 1}
                                  onChange={(e) => setDueEdit((d) => ({ ...d, repeatConfig: { ...d.repeatConfig, endCount: Math.max(1, +e.target.value) } }))}
                                  className="w-14 rounded border border-slate-200 px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-blue-400"
                                />
                                <span className="text-xs text-slate-500">回</span>
                              </div>
                            )}
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowCustomModal(false)} className="flex-1 rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200">キャンセル</button>
                        <button onClick={() => commitDue("custom", dueEdit.repeatConfig)} className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700">完了</button>
                      </div>
                    </div>
                  </>
                )}
              </>
            );
          })(),
          document.body
        )}
      </span>

      {/* priority badge — desktop only */}
      {task.done ? (
        <span className="hidden h-6 w-20 shrink-0 items-center justify-center rounded-md bg-slate-200 text-sm font-semibold text-slate-400">
          完了
        </span>
      ) : (
        <span className="relative hidden shrink-0">
          <span
            ref={priorityBtnRef}
            onClick={(e) => { e.stopPropagation(); selectAndEdit(); if (onChangePriority) setShowPriorityPicker((v) => !v); }}
            className={`flex h-6 w-20 items-center justify-center rounded-md text-sm font-semibold ${pr.className} ${onChangePriority ? "cursor-pointer hover:opacity-80" : ""}`}
          >
            {pr.label}
          </span>
          {showPriorityPicker && (
            <InlineDropdown
              anchorRef={priorityBtnRef as React.RefObject<HTMLElement | null>}
              onClose={() => setShowPriorityPicker(false)}
            >
              {(Object.keys(priorityMeta) as Priority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => { onChangePriority?.(task.id, p); setShowPriorityPicker(false); }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 ${task.priority === p ? "font-semibold" : "text-slate-700"}`}
                >
                  <span className={`flex h-5 w-12 items-center justify-center rounded-md text-xs font-semibold ${priorityMeta[p].className}`}>
                    {priorityMeta[p].label}
                  </span>
                </button>
              ))}
            </InlineDropdown>
          )}
        </span>
      )}
    </div>
  );
}
