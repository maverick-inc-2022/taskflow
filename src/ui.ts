import type { Priority, RepeatConfig, RepeatMode, SortMode, Task } from "./types";

const DAY_NAMES_SHORT = ["日", "月", "火", "水", "木", "金", "土"];

export function repeatLabel(mode: RepeatMode | undefined, config?: RepeatConfig): string {
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
      s += ` (${config.daysOfWeek.map((d) => DAY_NAMES_SHORT[d]).join("・")})`;
    }
    return s;
  }
  return mode;
}

export const priorityMeta: Record<
  Priority,
  { label: string; className: string }
> = {
  high: { label: "高", className: "bg-red-50 text-red-600" },
  mid: { label: "中", className: "bg-amber-50 text-amber-600" },
  low: { label: "低", className: "bg-emerald-50 text-emerald-600" },
};

export const eventColor: Record<
  string,
  { bar: string; bg: string; text: string }
> = {
  blue: { bar: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700" },
  green: { bar: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  purple: { bar: "bg-violet-500", bg: "bg-violet-50", text: "text-violet-700" },
  gray: { bar: "bg-slate-300", bg: "bg-slate-100", text: "text-slate-500" },
};

/** Human-friendly Japanese label for a due date relative to TODAY. */
export function dueLabel(due: string, today: string): string {
  const d = new Date(due + "T00:00:00");
  const t = new Date(today + "T00:00:00");
  const diff = Math.round((d.getTime() - t.getTime()) / 86400000);
  const wd = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  const md = `${d.getMonth() + 1}/${d.getDate()}`;
  if (diff === 0) return "今日";
  if (diff === 1) return `明日  ${md} (${wd})`;
  if (diff < 0) return `${md} (${wd})`;
  return `${diff}日後  ${md} (${wd})`;
}

/** Heading label for a date section in the grouped (all tasks) view. */
function sectionLabel(due: string, today: string): string {
  const d = new Date(due + "T00:00:00");
  const t = new Date(today + "T00:00:00");
  const diff = Math.round((d.getTime() - t.getTime()) / 86400000);
  const wd = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  if (diff === 0) return "今日";
  return `${d.getMonth() + 1}月${d.getDate()}日(${wd})`;
}

const fmtYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Advance a YYYY-MM-DD date by one recurrence step for every repeat mode. */
export function nextDue(due: string, repeat: RepeatMode, config?: RepeatConfig): string {
  if (!due) return due;
  const d = new Date(due + "T00:00:00");
  switch (repeat) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "weekly-weekday":
      // advance to the next weekday (skip Sat/Sun)
      do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
    case "custom": {
      const interval = Math.max(1, config?.interval ?? 1);
      const unit = config?.unit ?? "week";
      if (unit === "day") d.setDate(d.getDate() + interval);
      else if (unit === "week") d.setDate(d.getDate() + interval * 7);
      else if (unit === "month") d.setMonth(d.getMonth() + interval);
      else if (unit === "year") d.setFullYear(d.getFullYear() + interval);
      break;
    }
    default:
      // "none" or unknown — no advance
      break;
  }
  return fmtYMD(d);
}

/**
 * Order a flat list so incomplete tasks stay on top (in their existing manual
 * order) and completed tasks sink to the bottom, sorted by the chosen mode.
 */
export function orderTasks(tasks: Task[], sort: SortMode): Task[] {
  const active = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  done.sort((a, b) =>
    sort === "completed"
      ? (b.completedAt ?? 0) - (a.completedAt ?? 0)
      : a.due.localeCompare(b.due) || (a.completedAt ?? 0) - (b.completedAt ?? 0),
  );
  return [...active, ...done];
}

export interface TaskGroup {
  key: string;
  label: string;
  /** red heading for the overdue group */
  overdue?: boolean;
  tasks: Task[];
}

/**
 * Group tasks for the list view: an "期限切れ" group for overdue+incomplete
 * tasks, then one group per due date (今日 first, then ascending).
 */
export function groupTasksByDate(
  tasks: Task[],
  today: string,
  sort: SortMode = "date",
): TaskGroup[] {
  const overdue: Task[] = [];
  const byDate = new Map<string, Task[]>();

  for (const t of tasks) {
    if (!t.done && t.due < today) {
      overdue.push(t);
    } else {
      const arr = byDate.get(t.due) ?? [];
      arr.push(t);
      byDate.set(t.due, arr);
    }
  }

  const groups: TaskGroup[] = [];
  if (overdue.length) {
    groups.push({
      key: "overdue",
      label: "期限切れ",
      overdue: true,
      tasks: orderTasks(overdue, sort),
    });
  }
  for (const date of [...byDate.keys()].sort()) {
    groups.push({
      key: date,
      label: sectionLabel(date, today),
      tasks: orderTasks(byDate.get(date)!, sort),
    });
  }
  return groups;
}
