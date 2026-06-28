import { useState, useRef, useEffect, useCallback } from "react";
import { AvatarDisplay } from "../avatarIcons";
import { createPortal } from "react-dom";
import { people as staticPeople, projects as staticProjects, taskColors } from "../data";
import type { Person, Priority, Project, RepeatConfig, RepeatMode, Task } from "../types";
import { dueLabel, priorityMeta } from "../ui";
import {
  EditableTitle,
  EditableProject,
  EditableOwner,
  EditableDue,
  EditablePriority,
} from "./InlineEditors";

type ColKey = "project" | "title" | "owner" | "due" | "priority";

interface Props {
  tasks: Task[];
  today: string;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onUpdate?: (id: string, patch: Partial<Task>) => void;
  onAddPerson?: (name: string, avatar: string) => void;
  onAddProject?: (label: string, color: string) => void;
  projects?: Project[];
  people?: Person[];
  showRepeatCol?: boolean;
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, mid: 1, low: 2 };

const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

function repeatLabel(mode: RepeatMode | undefined, config?: RepeatConfig): string {
  if (!mode || mode === "none") return "なし";
  if (mode === "daily")          return "毎日";
  if (mode === "weekly")         return "毎週";
  if (mode === "weekly-weekday") return "平日毎日";
  if (mode === "monthly")        return "毎月";
  if (mode === "yearly")         return "毎年";
  if (mode === "custom" && config) {
    const u = { day: "日", week: "週", month: "月", year: "年" }[config.unit] ?? config.unit;
    let s = config.interval === 1 ? `毎${u}` : `${config.interval}${u}ごと`;
    if (config.unit === "week" && config.daysOfWeek?.length) {
      s += ` (${config.daysOfWeek.map((d) => DAY_NAMES[d]).join("・")})`;
    }
    return s;
  }
  return mode;
}

function ChevronUp() {
  return <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>;
}
function ChevronDown() {
  return <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;
}
function FilterIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-3 w-3 shrink-0 ${active ? "text-blue-600" : "text-slate-400"}`} fill="currentColor">
      <path d="M3 4.5h18v2.1l-7 7v6.9l-4-2V13.6l-7-7V4.5z"/>
    </svg>
  );
}

function getTaskValue(t: Task, col: ColKey, projects: Project[], people: Person[]): string {
  switch (col) {
    case "title":    return t.title.toLowerCase();
    case "project":  return projects.find((p) => p.id === t.project)?.label ?? "";
    case "owner":    return people.find((p) => p.id === t.owner)?.name ?? "￿";
    case "due":      return t.due + (t.dueTime ?? "");
    case "priority": return String(PRIORITY_ORDER[t.priority] ?? 9);
  }
}

function getFilterLabel(t: Task, col: ColKey, projects: Project[], people: Person[], today: string): string {
  switch (col) {
    case "title":    return t.title;
    case "project":  return projects.find((p) => p.id === t.project)?.label ?? "なし";
    case "owner":    return people.find((p) => p.id === t.owner)?.name?.replace("（自分）", "") ?? "未割当";
    case "due":      return t.done && t.completedDate ? `完了 ${t.completedDate}` : dueLabel(t.due, today) || t.due;
    case "priority": return priorityMeta[t.priority]?.label ?? t.priority;
  }
}

interface FilterDropdownProps {
  label: string;
  values: string[];
  selected: string[];
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onToggle: (val: string) => void;
  onClear: () => void;
  onClose: () => void;
}

function FilterDropdown({ label, values, selected, anchorRef, onToggle, onClear, onClose }: FilterDropdownProps) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
  }, [anchorRef]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (anchorRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [anchorRef, onClose]);

  return createPortal(
    <div
      className="fixed z-50 min-w-[160px] rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
        {selected.length > 0 && (
          <button onClick={onClear} className="text-[10px] text-blue-600 hover:underline">クリア</button>
        )}
      </div>
      <div className="max-h-52 overflow-y-auto py-1">
        {values.map((val) => (
          <label key={val} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-slate-50">
            <input type="checkbox" checked={selected.includes(val)} onChange={() => onToggle(val)} className="h-3.5 w-3.5 rounded accent-blue-600" />
            <span className="text-xs text-slate-600">{val}</span>
          </label>
        ))}
      </div>
    </div>,
    document.body
  );
}

// ── Main component ───────────────────────────────────────────────────

export default function TableView({
  tasks,
  today,
  onSelect,
  onToggle,
  onUpdate,
  onAddPerson,
  onAddProject,
  projects: propProjects,
  people: propPeople,
  showRepeatCol,
}: Props) {
  const projects = propProjects ?? staticProjects;
  const people   = propPeople  ?? staticPeople;

  const [sortCol, setSortCol] = useState<ColKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Partial<Record<ColKey, string[]>>>({});
  const [openFilter, setOpenFilter] = useState<ColKey | null>(null);
  const filterBtnRefs = useRef<Partial<Record<ColKey, HTMLButtonElement | null>>>({});

  const handleSortClick = (col: ColKey) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  };

  const toggleFilterValue = (col: ColKey, value: string) => {
    setFilters((prev) => {
      const current = prev[col] ?? [];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [col]: next };
    });
  };

  const clearFilter = useCallback((col: ColKey) => setFilters((prev) => ({ ...prev, [col]: [] })), []);
  const closeFilter = useCallback(() => setOpenFilter(null), []);

  const uniqueValues = (col: ColKey) => Array.from(new Set(tasks.map((t) => getFilterLabel(t, col, projects, people, today)))).sort();

  const filtered = tasks.filter((t) =>
    (Object.entries(filters) as [ColKey, string[]][]).every(([col, vals]) => !vals?.length || vals.includes(getFilterLabel(t, col, projects, people, today)))
  );

  const sorted = sortCol
    ? [...filtered].sort((a, b) => {
        const av = getTaskValue(a, sortCol, projects, people);
        const bv = getTaskValue(b, sortCol, projects, people);
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      })
    : filtered;

  // Completed tasks always go to the bottom
  const activeSorted = sorted.filter((t) => !t.done);
  const doneSorted   = sorted.filter((t) => t.done);

  const dueColLabel = showRepeatCol ? "繰り返し" : "期日";

  const columns: { key: ColKey; label: string; width?: string }[] = [
    { key: "project",  label: "プロジェクト名", width: "w-32" },
    { key: "title",    label: "タスク名" },
    { key: "owner",    label: "担当者",         width: "w-40" },
    { key: "due",      label: dueColLabel,      width: "w-36" },
    { key: "priority", label: "優先度",          width: "w-20" },
  ];

  const activeFilterCount = Object.values(filters).filter((v) => v && v.length > 0).length;

  const renderRow = (t: Task) => {
    const stripe = t.color && t.color !== "none" ? taskColors[t.color]?.stripe : "";
    return (
      <tr key={t.id}
        onClick={() => onSelect(t.id)}
        className={`cursor-pointer border-b border-slate-100 transition hover:bg-slate-50 ${t.done ? "bg-slate-50 opacity-60" : ""}`}>
        {/* Checkbox */}
        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onToggle(t.id)} aria-label="完了"
            className={`flex h-4 w-4 items-center justify-center rounded border-2 transition ${
              t.done ? "border-slate-400 bg-slate-400 text-white" : "border-slate-300 hover:border-blue-500"
            }`}>
            {t.done && <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m20 6-11 11-5-5" /></svg>}
          </button>
        </td>
        {/* Project */}
        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
          {onUpdate
            ? <EditableProject task={t} projects={projects} onSave={(v) => onUpdate(t.id, { project: v })} onAddProject={onAddProject} />
            : (() => { const p = projects.find((p) => p.id === t.project); return p ? <span className="inline-flex items-center gap-1.5 text-slate-600"><span className={`h-2 w-2 rounded-full ${p.color}`} />{p.label}</span> : null; })()
          }
        </td>
        {/* Title — clicking the text also triggers onSelect to open the notes panel */}
        <td className={`px-3 py-2 ${stripe ? `border-l-4 ${stripe}` : ""}`} onClick={(e) => e.stopPropagation()}>
          {onUpdate
            ? <EditableTitle task={t} onSave={(v) => onUpdate(t.id, { title: v })} onSelect={() => onSelect(t.id)} />
            : <span onClick={() => onSelect(t.id)} className={`cursor-pointer hover:underline ${t.done ? "text-slate-400 line-through" : "text-slate-700"}`}>{t.title}</span>
          }
        </td>
        {/* Owner */}
        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
          {onUpdate
            ? <EditableOwner task={t} people={people} onAddPerson={onAddPerson} onSave={(v) => onUpdate(t.id, { owner: v })} />
            : (() => { const o = people.find((p) => p.id === t.owner); return o ? <span className="inline-flex items-center gap-1.5"><AvatarDisplay avatar={o.avatar} name={o.name} size={20} /><span className="text-slate-600">{o.name.replace("（自分）", "")}</span></span> : <span className="text-slate-300">—</span>; })()
          }
        </td>
        {/* Due / Repeat */}
        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
          {showRepeatCol ? (
            <span className={`text-xs font-medium ${t.repeat && t.repeat !== "none" ? "text-violet-600" : "text-slate-300"}`}>
              {repeatLabel(t.repeat, t.repeatConfig)}
            </span>
          ) : onUpdate ? (
            <EditableDue
              task={t}
              today={today}
              onSave={(due, dueTime, repeat, repeatConfig) => onUpdate(t.id, { due, dueTime, repeat, repeatConfig })}
            />
          ) : (
            <span className="text-slate-500">{t.done && t.completedDate ? `完了 ${t.completedDate}` : dueLabel(t.due, today)}</span>
          )}
        </td>
        {/* Priority */}
        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
          {onUpdate
            ? <EditablePriority task={t} onSave={(v) => onUpdate(t.id, { priority: v })} />
            : <span className={`inline-flex h-5 w-6 items-center justify-center rounded text-[11px] font-semibold ${priorityMeta[t.priority].className}`}>{priorityMeta[t.priority].label}</span>
          }
        </td>
      </tr>
    );
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 border-b border-slate-100 bg-blue-50 px-4 py-2 text-xs text-blue-700">
          <FilterIcon active />
          <span>{activeFilterCount}件のフィルター適用中 · {sorted.length}件表示</span>
          <button onClick={() => setFilters({})} className="ml-auto rounded px-2 py-0.5 font-medium hover:bg-blue-100">すべてクリア</button>
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500">
            <th className="w-10 px-3 py-2.5" />
            {columns.map((col) => {
              const hasFilter = (filters[col.key]?.length ?? 0) > 0;
              const isSorted = sortCol === col.key;
              return (
                <th key={col.key} className={`${col.width ?? ""} px-3 py-2.5`}>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleSortClick(col.key)} className="flex items-center gap-1 transition hover:text-slate-700">
                      {col.label}
                      {isSorted ? (sortDir === "asc" ? <ChevronUp /> : <ChevronDown />) : <span className="h-3 w-3" />}
                    </button>
                    <button
                      ref={(el) => { filterBtnRefs.current[col.key] = el; }}
                      onClick={(e) => { e.stopPropagation(); setOpenFilter(openFilter === col.key ? null : col.key); }}
                      className={`rounded p-0.5 transition hover:bg-slate-200 ${hasFilter ? "text-blue-600" : ""}`}
                    >
                      <FilterIcon active={hasFilter} />
                    </button>
                    {openFilter === col.key && (
                      <FilterDropdown
                        label={col.label}
                        values={uniqueValues(col.key)}
                        selected={filters[col.key] ?? []}
                        anchorRef={{ current: filterBtnRefs.current[col.key] ?? null } as React.RefObject<HTMLButtonElement | null>}
                        onToggle={(val) => toggleFilterValue(col.key, val)}
                        onClear={() => clearFilter(col.key)}
                        onClose={closeFilter}
                      />
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr><td colSpan={6} className="px-3 py-10 text-center text-slate-400">タスクはありません</td></tr>
          )}
          {activeSorted.map(renderRow)}
          {doneSorted.length > 0 && activeSorted.length > 0 && (
            <tr>
              <td colSpan={6} className="border-t border-slate-200 bg-slate-50 px-4 py-1.5 text-[11px] font-semibold text-slate-400">
                完了済み ({doneSorted.length}件)
              </td>
            </tr>
          )}
          {doneSorted.map(renderRow)}
        </tbody>
      </table>
    </section>
  );
}
