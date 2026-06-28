import { useState } from "react";
import { people as staticPeople, projects as staticProjects, taskColors } from "../data";
import type { Person, Project, Task } from "../types";
import { priorityMeta } from "../ui";
import {
  EditableTitle,
  EditableProject,
  EditableOwner,
  EditableDue,
  EditablePriority,
} from "./InlineEditors";

interface Props {
  tasks: Task[];
  today: string;
  weekStart: number;
  monthOffset?: number;
  onSelect: (id: string) => void;
  onToggle?: (id: string) => void;
  onUpdate?: (id: string, patch: Partial<Task>) => void;
  onAddPerson?: (name: string, avatar: string) => void;
  onAddProject?: (label: string, color: string) => void;
  projects?: Project[];
  people?: Person[];
}

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function CalendarView({
  tasks,
  today,
  weekStart,
  monthOffset = 0,
  onSelect,
  onToggle,
  onUpdate,
  onAddPerson,
  onAddProject,
  projects: propProjects,
  people: propPeople,
}: Props) {
  const projects = propProjects ?? staticProjects;
  const people   = propPeople  ?? staticPeople;

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const base = new Date(today + "T00:00:00");
  base.setMonth(base.getMonth() + monthOffset);
  const year = base.getFullYear();
  const month = base.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = (first.getDay() - weekStart + 7) % 7;

  const allDays = ["日", "月", "火", "水", "木", "金", "土"];
  const weekdays = [...allDays.slice(weekStart), ...allDays.slice(0, weekStart)];

  const cells: (string | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(iso(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const tasksOn = (date: string) => tasks.filter((t) => t.due === date);

  const selectedTasks = selectedDate ? tasks.filter((t) => t.due === selectedDate) : [];

  const selDateLabel = selectedDate
    ? (() => {
        const d = new Date(selectedDate + "T00:00:00");
        const wd = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
        return `${d.getMonth() + 1}月${d.getDate()}日(${wd})`;
      })()
    : "";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-bold text-slate-800">
        {year}年{month + 1}月
      </h2>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-slate-200">
        {weekdays.map((w) => (
          <div
            key={w}
            className="bg-slate-50 py-2 text-center text-xs font-semibold text-slate-500"
          >
            {w}
          </div>
        ))}
        {cells.map((date, i) => {
          const items = date ? tasksOn(date) : [];
          const isToday    = date === today;
          const isSelected = date === selectedDate;
          return (
            <div
              key={i}
              onClick={() => date && setSelectedDate(isSelected ? null : date)}
              className={`min-h-[96px] p-1.5 transition ${
                date
                  ? `cursor-pointer bg-white hover:bg-blue-50 ${isSelected ? "ring-2 ring-inset ring-blue-500" : ""}`
                  : "bg-slate-50/60"
              }`}
            >
              {date && (
                <>
                  <div
                    className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      isToday
                        ? "bg-blue-600 font-bold text-white"
                        : isSelected
                          ? "font-bold text-blue-600"
                          : "text-slate-500"
                    }`}
                  >
                    {parseInt(date.slice(8, 10))}
                  </div>
                  <div className="space-y-0.5">
                    {items.slice(0, 3).map((t) => {
                      const proj = projects.find((p) => p.id === t.project);
                      const dot =
                        t.color && t.color !== "none"
                          ? taskColors[t.color]?.dot
                          : proj?.color;
                      return (
                        <button
                          key={t.id}
                          onClick={(e) => { e.stopPropagation(); onSelect(t.id); }}
                          className={`flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] hover:bg-slate-100 ${
                            t.done ? "text-slate-400 line-through" : "text-slate-600"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                          <span className="truncate">{t.title}</span>
                        </button>
                      );
                    })}
                    {items.length > 3 && (
                      <div className="px-1 text-[10px] text-slate-400">
                        +{items.length - 3}件
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected date task list */}
      {selectedDate && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">
              {selDateLabel} のタスク
              <span className="ml-1.5 font-normal text-slate-400">({selectedTasks.length}件)</span>
            </h3>
            <button
              onClick={() => setSelectedDate(null)}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-400">
                  <th className="w-9 px-3 py-2.5" />
                  <th className="w-32 px-3 py-2.5 text-left">プロジェクト</th>
                  <th className="px-3 py-2.5 text-left">タスク名</th>
                  <th className="w-36 px-3 py-2.5 text-left">担当者</th>
                  <th className="w-28 px-3 py-2.5 text-left">期日</th>
                  <th className="w-16 px-3 py-2.5 text-left">優先度</th>
                </tr>
              </thead>
              <tbody>
                {selectedTasks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-xs text-slate-300">
                      この日のタスクはありません
                    </td>
                  </tr>
                )}
                {[...selectedTasks.filter(t => !t.done), ...selectedTasks.filter(t => t.done)].map((t) => {
                  const stripe = t.color && t.color !== "none" ? taskColors[t.color]?.stripe : "";
                  return (
                    <tr
                      key={t.id}
                      className={`border-b border-slate-50 transition hover:bg-slate-50 ${t.done ? "opacity-60" : ""}`}
                    >
                      {/* Toggle */}
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        {onToggle && (
                          <button
                            onClick={() => onToggle(t.id)}
                            aria-label="完了"
                            className={`flex h-4 w-4 items-center justify-center rounded border-2 transition ${
                              t.done ? "border-slate-400 bg-slate-400 text-white" : "border-slate-300 hover:border-blue-500"
                            }`}
                          >
                            {t.done && (
                              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m20 6-11 11-5-5" />
                              </svg>
                            )}
                          </button>
                        )}
                      </td>
                      {/* Project */}
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        {onUpdate
                          ? <EditableProject task={t} projects={projects} onSave={(v) => onUpdate(t.id, { project: v })} onAddProject={onAddProject} />
                          : (() => { const p = projects.find((p) => p.id === t.project); return p ? <span className="inline-flex items-center gap-1.5 text-slate-600"><span className={`h-2 w-2 rounded-full ${p.color}`} />{p.label}</span> : null; })()
                        }
                      </td>
                      {/* Title — click opens notes panel */}
                      <td className={`px-3 py-2.5 ${stripe ? `border-l-4 ${stripe}` : ""}`} onClick={(e) => e.stopPropagation()}>
                        {onUpdate
                          ? <EditableTitle task={t} onSave={(v) => onUpdate(t.id, { title: v })} onSelect={() => onSelect(t.id)} />
                          : <span onClick={() => onSelect(t.id)} className={`cursor-pointer hover:underline ${t.done ? "text-slate-400 line-through" : "text-slate-700"}`}>{t.title}</span>
                        }
                      </td>
                      {/* Owner */}
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        {onUpdate
                          ? <EditableOwner task={t} people={people} onSave={(v) => onUpdate(t.id, { owner: v })} onAddPerson={onAddPerson} />
                          : (() => { const o = people.find((p) => p.id === t.owner); return o ? <span className="inline-flex items-center gap-1.5"><span className="text-xs text-slate-600">{o.name.replace("（自分）", "")}</span></span> : null; })()
                        }
                      </td>
                      {/* Due */}
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        {onUpdate
                          ? <EditableDue task={t} today={today} onSave={(due, dueTime, repeat, repeatConfig) => onUpdate(t.id, { due, dueTime, repeat, repeatConfig })} />
                          : <span className="text-xs text-slate-500">{t.due}</span>
                        }
                      </td>
                      {/* Priority */}
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        {onUpdate
                          ? <EditablePriority task={t} onSave={(v) => onUpdate(t.id, { priority: v })} />
                          : <span className={`inline-flex h-5 w-6 items-center justify-center rounded text-[11px] font-semibold ${priorityMeta[t.priority].className}`}>{priorityMeta[t.priority].label}</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
