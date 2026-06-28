export type Priority = "high" | "mid" | "low";

export type ProjectId = string;

export interface Task {
  id: string;
  title: string;
  project: ProjectId;
  /** ISO date (YYYY-MM-DD) the task is due */
  due: string;
  /** Optional clock time shown after the date, e.g. "10:00" */
  dueTime?: string;
  priority: Priority;
  done: boolean;
  starred: boolean;
  /** Free-form memo shown in the detail panel */
  notes?: string;
  /** Monotonic counter set when the task is completed (for "完了順" sorting) */
  completedAt?: number;
  /** Human-readable completion datetime, e.g. "5/20 14:32" */
  completedDate?: string;
  /** Person who currently "holds the ball" */
  owner?: string;
  /** Recurrence — completing a repeating task spawns the next occurrence */
  repeat?: RepeatMode;
  repeatConfig?: RepeatConfig;
  /** Checklist shown under the main memo */
  subtasks?: Subtask[];
  /** Accent color tag (key of taskColors) */
  color?: TaskColor;
  /** Attached files (name/size only — mock, no upload) */
  attachments?: Attachment[];
  /** Rich-text memo sections */
  memos?: NoteMemo[];
}

export type TaskColor =
  | "none"
  | "red"
  | "orange"
  | "green"
  | "blue"
  | "purple"
  | "pink";

export interface Attachment {
  id: string;
  name: string;
  size: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface NoteAttachment {
  id: string;
  name: string;
  size: number;
  dataUrl: string;
}

export interface NoteMemo {
  id: string;
  label: string;       // "メモ①" etc.
  html: string;        // rich HTML from contenteditable
  checklist: ChecklistItem[];
  attachments: NoteAttachment[];
}

export type RepeatMode = "none" | "daily" | "weekly" | "weekly-weekday" | "monthly" | "yearly" | "custom";

export interface RepeatConfig {
  interval: number;
  unit: "day" | "week" | "month" | "year";
  daysOfWeek?: number[]; // 0=Sun … 6=Sat
  endType: "none" | "date" | "count";
  endDate?: string;
  endCount?: number;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Person {
  id: string;
  name: string;
  avatar: string;
}

export type SortMode = "date" | "completed";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  /** dot color */
  kind: "task" | "mention" | "system";
}

export interface Profile {
  name: string;
  email: string;
  avatar: string;
  role: string;
}

export interface Settings {
  notifyEmail: boolean;
  notifySlack: boolean;
  hideCompleted: boolean;
  weekStart: number; // 0=Sun,1=Mon,...,6=Sat
  darkMode: boolean;
  accent: AccentColor;
  fontSize: FontSize;
  defaultView: LayoutMode;
  defaultDateRange: "today" | "week" | "month" | "all";
}

export type AccentColor = "blue" | "violet" | "emerald" | "rose" | "amber";
export type FontSize = "small" | "medium" | "large";
export type LayoutMode = "list" | "kanban" | "calendar" | "table";

export interface CalendarEvent {
  id: string;
  title: string;
  /** Hour as a float, e.g. 13.5 = 13:30 */
  start: number;
  end: number;
  color: "blue" | "green" | "purple" | "gray";
}

export interface Project {
  id: ProjectId;
  label: string;
  color: string; // tailwind bg color class
  icon?: string; // emoji character
}

/** A starred (お気に入り) Gmail message. */
export interface Email {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  /** Display time, e.g. "9:24" or "5/19" */
  time: string;
  unread?: boolean;
}

/** A saved (保存済み) Slack message. */
export interface SlackMessage {
  id: string;
  channel: string;
  author: string;
  text: string;
  time: string;
}

// ── Sticky Memo ───────────────────────────────────────────────────────────────

export interface MemoCategory {
  id: string;
  name: string;
  /** Tailwind bg class, e.g. "bg-blue-500" */
  color: string;
}

export interface StickyMemo {
  id: string;
  categoryId?: string;
  /** Rich HTML from contentEditable */
  content: string;
  /** Color key: "yellow" | "blue" | "green" | "pink" | "purple" | "orange" | "white" */
  color: string;
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
}
