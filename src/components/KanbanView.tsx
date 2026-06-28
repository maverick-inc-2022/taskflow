import { useState } from "react";
import { AvatarDisplay } from "../avatarIcons";
import { people as staticPeople, projects as staticProjects, taskColors } from "../data";
import type { Person, Priority, Project, ProjectId, Task } from "../types";
import { priorityMeta } from "../ui";
import {
  EditableTitle,
  EditableProject,
  EditableOwner,
  EditableDue,
  EditablePriority,
} from "./InlineEditors";

type GroupBy = "project" | "priority" | "date" | "owner";

interface Col {
  id: string;
  label: string;
  color: string;
  tasks: Task[];
}

interface Props {
  tasks: Task[];
  today: string;
  onSelect: (id: string) => void;
  onChangeProject: (id: string, project: ProjectId) => void;
  onChangePriority: (id: string, priority: Priority) => void;
  onUpdateTask?: (id: string, patch: Partial<Task>) => void;
  onAddPerson?: (name: string, avatar: string) => void;
  onAddProject?: (label: string, color: string) => void;
  projects?: Project[];
  people?: Person[];
}

const PRIORITY_COLS: { id: Priority; label: string; color: string }[] = [
  { id: "high", label: "高", color: "bg-rose-500" },
  { id: "mid",  label: "中", color: "bg-amber-400" },
  { id: "low",  label: "低", color: "bg-emerald-500" },
];

// ── KanbanCard ────────────────────────────────────────────────────────────────

interface CardProps {
  task: Task;
  today: string;
  groupBy: GroupBy;
  projects: Project[];
  people: Person[];
  draggable: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onSelect: (id: string) => void;
  onUpdateTask?: (id: string, patch: Partial<Task>) => void;
  onAddPerson?: (name: string, avatar: string) => void;
  onAddProject?: (label: string, color: string) => void;
}

function KanbanCard({
  task: t,
  today,
  groupBy,
  projects,
  people,
  draggable,
  dragging,
  onDragStart,
  onDragEnd,
  onSelect,
  onUpdateTask,
  onAddPerson,
  onAddProject,
}: CardProps) {
  const pr = priorityMeta[t.priority];
  const owner = people.find((p) => p.id === t.owner);
  const stripe = t.color && t.color !== "none" ? taskColors[t.color]?.stripe : "";

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onSelect(t.id)}
      className={`group rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md ${
        stripe ? `border-l-4 ${stripe}` : ""
      } ${dragging ? "opacity-40" : ""}`}
    >
      {/* Title */}
      <div className="mb-2" onClick={(e) => e.stopPropagation()}>
        {onUpdateTask ? (
          <EditableTitle task={t} onSave={(v) => onUpdateTask(t.id, { title: v })} className="text-sm" />
        ) : (
          <p className={`text-sm ${t.done ? "text-slate-400 line-through" : "text-slate-700"}`}>{t.title}</p>
        )}
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>

        {/* Priority */}
        {groupBy !== "priority" && (
          onUpdateTask ? (
            <EditablePriority task={t} onSave={(p) => onUpdateTask(t.id, { priority: p })} variant="badge" />
          ) : (
            <span className={`flex h-5 w-6 items-center justify-center rounded text-[10px] font-semibold ${pr.className}`}>
              {pr.label}
            </span>
          )
        )}

        {/* Project */}
        {onUpdateTask ? (
          <EditableProject
            task={t}
            projects={projects}
            onSave={(pid) => onUpdateTask(t.id, { project: pid })}
            onAddProject={onAddProject}
            variant="badge"
          />
        ) : groupBy !== "project" ? (
          (() => {
            const proj = projects.find((p) => p.id === t.project);
            return proj ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                <span className={`h-1.5 w-1.5 rounded-full ${proj.color}`} />
                {proj.label}
              </span>
            ) : null;
          })()
        ) : null}

        {/* Due date */}
        {groupBy !== "date" && (
          <div onClick={(e) => e.stopPropagation()}>
            {onUpdateTask ? (
              <EditableDue
                task={t}
                today={today}
                onSave={(due, dueTime, repeat, repeatConfig) =>
                  onUpdateTask(t.id, { due, dueTime, repeat, repeatConfig })
                }
              />
            ) : t.due ? (
              <span className="rounded px-1 text-xs text-slate-400">
                {(() => {
                  if (t.done && t.completedDate) return `完了 ${t.completedDate}`;
                  const d = new Date(t.due + "T00:00:00");
                  const td = new Date(today + "T00:00:00");
                  const diff = Math.round((d.getTime() - td.getTime()) / 86400000);
                  if (diff === 0) return "今日";
                  const md = `${d.getMonth() + 1}/${d.getDate()}`;
                  const wd = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
                  return diff < 0 ? md : `${md}(${wd})`;
                })()}
              </span>
            ) : null}
          </div>
        )}

        {/* Owner */}
        <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
          {onUpdateTask ? (
            <EditableOwner
              task={t}
              people={people}
              onSave={(oid) => onUpdateTask(t.id, { owner: oid })}
              onAddPerson={onAddPerson}
              variant="badge"
            />
          ) : owner ? (
            <span className="flex items-center gap-1">
              <AvatarDisplay avatar={owner.avatar} name={owner.name} size={20} className="ring-1 ring-slate-200" />
              {groupBy !== "owner" && (
                <span className="text-xs text-slate-500">{owner.name.replace("（自分）", "")}</span>
              )}
            </span>
          ) : (
            <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-slate-300">
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function buildDateCols(tasks: Task[], today: string): Col[] {
  const todayDate = new Date(today + "T00:00:00");
  const in7 = new Date(todayDate); in7.setDate(todayDate.getDate() + 7);
  const in7Str = in7.toISOString().slice(0, 10);
  const buckets = [
    { id: "overdue", label: "期限切れ", color: "bg-rose-500",   test: (t: Task) => t.due < today && !t.done },
    { id: "today",   label: "今日",     color: "bg-blue-500",   test: (t: Task) => t.due === today },
    { id: "week",    label: "今週",     color: "bg-violet-500", test: (t: Task) => t.due > today && t.due <= in7Str },
    { id: "later",   label: "それ以降", color: "bg-slate-400",  test: (t: Task) => t.due > in7Str },
  ];
  return buckets.map((b) => ({ id: b.id, label: b.label, color: b.color, tasks: tasks.filter(b.test) }));
}

export default function KanbanView({
  tasks,
  today,
  onSelect,
  onChangeProject,
  onChangePriority,
  onUpdateTask,
  onAddPerson,
  onAddProject,
  projects: propProjects,
  people: propPeople,
}: Props) {
  const projects = propProjects ?? staticProjects;
  const people   = propPeople  ?? staticPeople;
  const [groupBy, setGroupBy] = useState<GroupBy>("project");
  const [dragId,  setDragId]  = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [expandedDone, setExpandedDone] = useState<Set<string>>(new Set());
  const canDrag = groupBy !== "date";

  const toggleDone = (colId: string) =>
    setExpandedDone((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId); else next.add(colId);
      return next;
    });

  const buildOwnerCols = (): Col[] => {
    const seen = new Set<string>();
    const cols: Col[] = [];
    for (const t of tasks) {
      const key = t.owner ?? "__none__";
      if (!seen.has(key)) {
        seen.add(key);
        const person = people.find((p) => p.id === t.owner);
        cols.push({ id: key, label: person ? person.name.replace("（自分）", "") : "未割り当て", color: "bg-slate-400", tasks: [] });
      }
    }
    for (const col of cols) col.tasks = tasks.filter((t) => (t.owner ?? "__none__") === col.id);
    return cols;
  };

  const cols: Col[] = (() => {
    if (groupBy === "project")  return projects.map((p) => ({ id: p.id, label: p.label, color: p.color, tasks: tasks.filter((t) => t.project === p.id) }));
    if (groupBy === "priority") return PRIORITY_COLS.map((pc) => ({ id: pc.id, label: pc.label, color: pc.color, tasks: tasks.filter((t) => t.priority === pc.id) }));
    if (groupBy === "owner")    return buildOwnerCols();
    return buildDateCols(tasks, today);
  })();

  const handleDrop = (colId: string) => {
    if (!dragId) return;
    if (groupBy === "project")  onChangeProject(dragId, colId as ProjectId);
    if (groupBy === "priority") onChangePriority(dragId, colId as Priority);
    if (groupBy === "owner")    onUpdateTask?.(dragId, { owner: colId === "__none__" ? undefined : colId });
    setDragId(null);
    setOverCol(null);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Group switcher */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-400">グループ：</span>
        <div className="flex items-center gap-0.5 rounded-full border border-slate-200 bg-white p-0.5">
          {([
            { id: "date"     as GroupBy, label: "日付" },
            { id: "priority" as GroupBy, label: "優先度" },
            { id: "owner"    as GroupBy, label: "担当者" },
            { id: "project"  as GroupBy, label: "プロジェクト" },
          ]).map((opt) => (
            <button
              key={opt.id}
              onClick={() => setGroupBy(opt.id)}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${
                groupBy === opt.id ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Columns */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {cols.map((col) => (
          <div
            key={col.id}
            onDragOver={(e) => { if (canDrag) { e.preventDefault(); setOverCol(col.id); } }}
            onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
            onDrop={() => handleDrop(col.id)}
            className={`flex w-72 shrink-0 flex-col rounded-2xl border p-3 transition ${
              overCol === col.id && canDrag
                ? "border-blue-400 bg-blue-50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="mb-2 flex items-center gap-2 px-1">
              <span className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
              <span className="text-sm font-bold text-slate-700">{col.label}</span>
              <span className="text-xs text-slate-400">{col.tasks.length}</span>
            </div>

            {(() => {
              const activeTasks = col.tasks.filter((t) => !t.done);
              const doneTasks   = col.tasks.filter((t) => t.done);
              const doneOpen    = expandedDone.has(col.id);
              return (
                <div className="flex flex-col gap-2">
                  {activeTasks.map((t) => (
                    <KanbanCard
                      key={t.id}
                      task={t}
                      today={today}
                      groupBy={groupBy}
                      projects={projects}
                      people={people}
                      draggable={canDrag}
                      dragging={dragId === t.id}
                      onDragStart={() => setDragId(t.id)}
                      onDragEnd={() => setDragId(null)}
                      onSelect={onSelect}
                      onUpdateTask={onUpdateTask}
                      onAddPerson={onAddPerson}
                      onAddProject={onAddProject}
                    />
                  ))}
                  {activeTasks.length === 0 && doneTasks.length === 0 && (
                    <p className="px-1 py-6 text-center text-xs text-slate-300">タスクなし</p>
                  )}

                  {/* Completed tasks section */}
                  {doneTasks.length > 0 && (
                    <div className="mt-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleDone(col.id); }}
                        className="flex w-full items-center gap-1.5 rounded-lg px-1 py-1 text-xs font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      >
                        <svg viewBox="0 0 24 24" className={`h-3 w-3 shrink-0 transition-transform ${doneOpen ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m9 18 6-6-6-6"/>
                        </svg>
                        <span>完了済み</span>
                        <span className="text-slate-300">({doneTasks.length}件)</span>
                      </button>
                      {doneOpen && (
                        <div className="mt-1.5 flex flex-col gap-2">
                          {doneTasks.map((t) => (
                            <div key={t.id} className="opacity-60">
                              <KanbanCard
                                task={t}
                                today={today}
                                groupBy={groupBy}
                                projects={projects}
                                people={people}
                                draggable={false}
                                dragging={false}
                                onDragStart={() => {}}
                                onDragEnd={() => {}}
                                onSelect={onSelect}
                                onUpdateTask={onUpdateTask}
                                onAddPerson={onAddPerson}
                                onAddProject={onAddProject}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}
