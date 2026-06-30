import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { AvatarDisplay } from "./avatarIcons";
import Sidebar, { type View } from "./components/Sidebar";
import TaskItem from "./components/TaskItem";
import GmailPanel from "./components/GmailPanel";
import SlackPanel from "./components/SlackPanel";
import GoogleCalendarPanel from "./components/GoogleCalendarPanel";
import TaskDetailPanel from "./components/TaskDetailPanel";
import MobileTaskDetail from "./components/MobileTaskDetail";
import AddTaskModal from "./components/AddTaskModal";
import InlineAddTask from "./components/InlineAddTask";
import QuickAddRow from "./components/QuickAddRow";
import SearchModal from "./components/SearchModal";
import NotificationsPopover from "./components/NotificationsPopover";
import SettingsModal from "./components/SettingsModal";
import HelpModal from "./components/HelpModal";
import ProfileModal from "./components/ProfileModal";
import BulkEditModal from "./components/BulkEditModal";
import BulkActionBar from "./components/BulkActionBar";
import KanbanView from "./components/KanbanView";
import CalendarView from "./components/CalendarView";
import TableView from "./components/TableView";
import RepeatTasksView from "./components/RepeatTasksView";
import MemoView, { BUILTIN_CATEGORIES } from "./components/MemoView";
import {
  defaultProfile,
  defaultProjects,
  defaultSettings,
  initialNotifications,
  initialTasks,
  people as defaultPeople,
  avatarChoices,
  TODAY,
} from "./data";
import type {
  AppNotification,
  LayoutMode,
  MemoCategory,
  Person,
  Profile,
  Project,
  ProjectId,
  Settings,
  SortMode,
  StickyMemo,
  Task,
} from "./types";
import { groupTasksByDate, nextDue, orderTasks, type TaskGroup } from "./ui";
import {
  BellIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ColumnsIcon,
  HelpIcon,
  ListIcon,
  SearchIcon,
  SettingsIcon,
  TableIcon,
} from "./icons";

const layoutOptions: { id: LayoutMode; label: string; icon: typeof ListIcon }[] =
  [
    { id: "list", label: "リスト", icon: ListIcon },
    { id: "kanban", label: "カンバン", icon: ColumnsIcon },
    { id: "calendar", label: "カレンダー", icon: CalendarIcon },
    { id: "table", label: "テーブル", icon: TableIcon },
  ];

const viewTitle: Record<View, string> = {
  today: "今日のタスク",
  week: "今週のタスク",
  month: "今月のタスク",
  all: "すべてのタスク",
  favorites: "お気に入り",
  completed: "完了済み",
  trash: "ゴミ箱",
  repeat: "繰り返しタスク",
  project: "プロジェクト",
};

let nextId = 100;
let completeCounter = 1;
let subId = 1;
let memoSeq = 1; // disambiguates memo ids created within the same millisecond

/** Seed the module-level id/counter state from restored data so freshly
 *  generated ids never collide with persisted ones after a reload. */
function seedCounters(tasks: Task[]) {
  let maxU = 99;
  let maxSub = 0;
  let maxComplete = 0;
  for (const t of tasks) {
    const m = /^u(\d+)$/.exec(t.id);
    if (m) maxU = Math.max(maxU, parseInt(m[1], 10));
    if (typeof t.completedAt === "number") maxComplete = Math.max(maxComplete, t.completedAt);
    for (const s of t.subtasks ?? []) {
      const sm = /^st(\d+)$/.exec(s.id);
      if (sm) maxSub = Math.max(maxSub, parseInt(sm[1], 10));
    }
  }
  nextId = maxU + 1;
  subId = maxSub + 1;
  completeCounter = maxComplete + 1;
}

const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

/** Completion stamp anchored to the demo date with the real clock time. */
function completionStamp(): string {
  const md = `${parseInt(TODAY.slice(5, 7))}/${parseInt(TODAY.slice(8, 10))}`;
  const d = new Date();
  return `${md} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Filter the task pool down to what a given view should show. */
function tasksForView(
  tasks: Task[],
  view: View,
  selectedProject: ProjectId | null,
): Task[] {
  if (view === "favorites") return tasks.filter((t) => t.starred);
  if (view === "completed") return tasks.filter((t) => t.done);
  if (view === "repeat")
    return tasks.filter((t) => t.repeat && t.repeat !== "none" && !t.done);
  if (view === "project")
    return tasks.filter((t) => t.project === selectedProject);
  if (view === "all" || view === "today") return tasks;
  const t = new Date(TODAY + "T00:00:00");
  const horizon = new Date(t);
  if (view === "week") horizon.setDate(t.getDate() + 6);
  else horizon.setMonth(t.getMonth() + 1, 0); // end of this month
  const max = fmtDate(horizon); // local date — avoid UTC off-by-one
  return tasks.filter((task) => task.due <= max);
}

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    let restored = initialTasks;
    try {
      const s = localStorage.getItem('taskflow_tasks');
      if (s) restored = JSON.parse(s) as Task[];
    } catch {}
    seedCounters(restored);
    return restored;
  });
  const [view, setView] = useState<View>(() => {
    try {
      const s = localStorage.getItem('taskflow_settings');
      const dr = (JSON.parse(s ?? '{}') as Partial<Settings>).defaultDateRange;
      if (dr === "today" || dr === "week" || dr === "month" || dr === "all") return dr;
    } catch {}
    return "today";
  });
  const [showModal, setShowModal] = useState(false);
  const [modalDefaultRepeat, setModalDefaultRepeat] = useState<import("./types").RepeatMode | undefined>(undefined);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileRightOpen, setMobileRightOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const [sortOpen, setSortOpen] = useState(false);
  // sort mode for active task lists
  type ListSort = "date" | "priority" | "owner" | "project" | "custom";
  const [listSort, setListSort] = useState<ListSort>("date");
  const [listSortOpen, setListSortOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectId | null>(null);

  // multi-select
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const selectionActive = selectedIds.length > 0;

  // drag & drop
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // inline add and hover tracking
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [inlineAfter, setInlineAfter] = useState<string | null>(null);
  const [inlineGroup, setInlineGroup] = useState<string | null>(null);
  const [draftMemos, setDraftMemos] = useState<import("./types").NoteMemo[]>([]);

  // resizable right column
  const [rightWidth, setRightWidth] = useState(420);
  const [rightOpen, setRightOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [layout, setLayout] = useState<LayoutMode>(() => {
    try {
      const s = localStorage.getItem('taskflow_settings');
      if (s) return (JSON.parse(s) as Partial<Settings>).defaultView ?? "list";
    } catch {}
    return "list";
  });
  const [calendarOffset, setCalendarOffset] = useState(0); // months offset for calendar nav
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());

  // ── Main mode: tasks ↔ memos ──
  const [mainMode, setMainMode] = useState<"tasks" | "memos">("tasks");

  // ── Sticky memos ──
  const [memos, setMemos] = useState<StickyMemo[]>(() => {
    try {
      const s = localStorage.getItem('taskflow_memos');
      if (s) return JSON.parse(s) as StickyMemo[];
    } catch {}
    return [];
  });
  const [memoFilter, setMemoFilter] = useState<string | null>(null);
  const [memoCategories, setMemoCategories] = useState<MemoCategory[]>(BUILTIN_CATEGORIES);

  const addMemo = () => {
    const now = Date.now();
    setMemos(prev => [{ id: `memo_${now}_${memoSeq++}`, content: "", color: "yellow", createdAt: now, updatedAt: now }, ...prev]);
  };
  const updateMemo = (id: string, patch: Partial<StickyMemo>) =>
    setMemos(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
  const deleteMemo = (id: string) => setMemos(prev => prev.filter(m => m.id !== id));
  const reorderMemo = (fromId: string, toId: string) => {
    setMemos(prev => {
      const arr = [...prev];
      const from = arr.findIndex(m => m.id === fromId);
      const to   = arr.findIndex(m => m.id === toId);
      if (from < 0 || to < 0 || from === to) return prev;
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  };
  const duplicateMemo = (id: string) => {
    const now = Date.now();
    setMemos(prev => {
      const src = prev.find(m => m.id === id);
      if (!src) return prev;
      return [{ ...src, id: `memo_dup_${now}_${memoSeq++}`, createdAt: now, updatedAt: now }, ...prev];
    });
  };
  const addMemoCategory = (name: string, color: string) => {
    const id = `cat_${Date.now()}`;
    setMemoCategories(prev => [...prev, { id, name, color }]);
  };
  const deleteMemoCategory = (id: string) => {
    setMemoCategories(prev => prev.filter(c => c.id !== id));
    // Clear the now-dangling categoryId from memos so they remain reachable.
    setMemos(prev => prev.map(m => m.categoryId === id ? { ...m, categoryId: undefined } : m));
    setMemoFilter(prev => prev === id ? null : prev);
  };

  const memoCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of memos) {
      if (m.categoryId) counts[m.categoryId] = (counts[m.categoryId] ?? 0) + 1;
    }
    return counts;
  }, [memos]);

  // sidebar / header features
  const [trash, setTrash] = useState<Task[]>(() => {
    try {
      const s = localStorage.getItem('taskflow_trash');
      if (s) return JSON.parse(s) as Task[];
    } catch {}
    return [];
  });
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(() =>
    localStorage.getItem('taskflow_banner_dismissed') === '1'
  );
  const exportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      tasks,
      trash,
      memos,
      settings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `taskflow_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const [googleCalToken, setGoogleCalToken] = useState<string | null>(null);
  const [gmailToken, setGmailToken] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const s = localStorage.getItem('taskflow_settings');
      if (s) return { ...defaultSettings, ...JSON.parse(s) };
    } catch {}
    return defaultSettings;
  });
  const [notifications, setNotifications] =
    useState<AppNotification[]>(initialNotifications);
  const [activeModal, setActiveModal] = useState<
    "settings" | "help" | "profile" | null
  >(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const safeSetItem = (key: string, value: unknown) => {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { /* quota exceeded or storage unavailable — keep running in-memory */ }
  };
  useEffect(() => { safeSetItem('taskflow_settings', settings); }, [settings]);
  useEffect(() => { safeSetItem('taskflow_tasks',    tasks);    }, [tasks]);
  useEffect(() => { safeSetItem('taskflow_memos',    memos);    }, [memos]);
  useEffect(() => { safeSetItem('taskflow_trash',    trash);    }, [trash]);

  // ── Supabase cloud sync ──
  const [syncedEmail, setSyncedEmail] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // Block autosave until the initial cloud load has resolved, so empty/stale
  // local state can't overwrite real cloud data on a fresh device.
  const cloudHydratedRef = useRef(false);

  const loadFromCloud = async (email: string) => {
    try {
      const res = await fetch(`/api/user-data?email=${encodeURIComponent(email)}`);
      if (!res.ok) return;
      const data = await res.json() as { tasks: Task[]; memos: StickyMemo[]; settings: Settings } | null;
      if (!data) return;
      if (data.tasks) { seedCounters(data.tasks); setTasks(data.tasks); localStorage.setItem('taskflow_tasks', JSON.stringify(data.tasks)); }
      if (data.memos) { setMemos(data.memos); localStorage.setItem('taskflow_memos', JSON.stringify(data.memos)); }
      if (data.settings) { setSettings(s => ({ ...s, ...data.settings })); }
    } catch { /* network error, use local data */ }
    finally { cloudHydratedRef.current = true; }
  };

  const saveToCloud = async (email: string) => {
    setSyncStatus("saving");
    try {
      const res = await fetch("/api/user-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, tasks, memos, settings }),
      });
      setSyncStatus(res.ok ? "saved" : "error");
      setTimeout(() => setSyncStatus("idle"), 2000);
    } catch { setSyncStatus("error"); setTimeout(() => setSyncStatus("idle"), 2000); }
  };

  useEffect(() => {
    if (!syncedEmail) return;
    // Don't save back until the first cloud load completed (avoids clobbering
    // cloud data with empty local state right after login).
    if (!cloudHydratedRef.current) return;
    const t = setTimeout(() => saveToCloud(syncedEmail), 2000);
    return () => clearTimeout(t);
  }, [tasks, memos, settings, syncedEmail]);

  useEffect(() => {
    if (needsPasswordChange) setActiveModal("profile");
  }, [needsPasswordChange]);

  const handleLogin = (email: string) => {
    const account = (() => { try { const s = localStorage.getItem('taskflow_account'); return s ? JSON.parse(s) : null; } catch { return null; } })();
    setIsLoggedIn(true);
    setNeedsPasswordChange(account?.isInitial ?? false);
    cloudHydratedRef.current = false;
    setSyncedEmail(email);
    loadFromCloud(email);
  };
  const handleLogout = () => {
    setIsLoggedIn(false);
    setNeedsPasswordChange(false);
    setSyncedEmail(null);
  };
  const handleChangePassword = (current: string, next: string): string | null => {
    const account = (() => { try { const s = localStorage.getItem('taskflow_account'); return s ? JSON.parse(s) : null; } catch { return null; } })();
    if (!account || account.password !== current) return "現在のパスワードが正しくありません";
    localStorage.setItem('taskflow_account', JSON.stringify({ ...account, password: next, isInitial: false }));
    return null;
  };

  // People (stateful for adding/removing members)
  const [people, setPeople] = useState<Person[]>(defaultPeople);
  let nextPersonId = 200;
  const addPerson = (name: string, avatar: string) => {
    const id = `person${nextPersonId++}`;
    setPeople((ps) => [...ps, { id, name, avatar }]);
  };
  const removePerson = (id: string) => {
    setPeople((ps) => ps.filter((p) => p.id !== id));
    // Clear the owner on any task that referenced the removed person.
    setTasks((ts) => ts.map((t) => (t.owner === id ? { ...t, owner: undefined } : t)));
  };
  const updatePerson = (id: string, name: string, avatar: string) =>
    setPeople((ps) => ps.map((p) => (p.id === id ? { ...p, name, avatar } : p)));

  // Projects (stateful for color editing + adding new)
  const [projects, setProjects] = useState<Project[]>(defaultProjects);
  let nextProjectId = 100;
  const addProject = (label: string, color: string, icon: string) => {
    const id = `proj${nextProjectId++}`;
    setProjects((ps) => [...ps, { id, label, color, icon }]);
  };
  const updateProject = (id: ProjectId, patch: { color?: string; icon?: string; label?: string }) =>
    setProjects((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const renameMemoCategory = (id: string, name: string) =>
    setMemoCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c));
  const recolorMemoCategory = (id: string, color: string) =>
    setMemoCategories(prev => prev.map(c => c.id === id ? { ...c, color } : c));

  // Header period label and navigation
  const periodLabel = useMemo(() => {
    const base = new Date(TODAY + "T00:00:00");
    if (layout === "calendar") {
      base.setMonth(base.getMonth() + calendarOffset);
      return `${base.getFullYear()}年 ${base.getMonth() + 1}月`;
    }
    const dow = ["日", "月", "火", "水", "木", "金", "土"][base.getDay()];
    if (view === "today")
      return `${base.getFullYear()}年 ${base.getMonth() + 1}月 ${base.getDate()}日（${dow}）`;
    if (view === "week" || view === "month")
      return `${base.getFullYear()}年 ${base.getMonth() + 1}月`;
    if (view === "all") return "すべてのタスク";
    if (view === "favorites") return "お気に入り";
    if (view === "completed") return "完了済み";
    if (view === "repeat") return "繰り返しタスク";
    if (view === "trash") return "ゴミ箱";
    if (view === "project")
      return projects.find((p) => p.id === selectedProject)?.label ?? "プロジェクト";
    return viewTitle[view];
  }, [view, layout, calendarOffset, selectedProject]);

  const handleNavPrev = () => {
    if (layout === "calendar") setCalendarOffset((o) => o - 1);
  };
  const handleNavNext = () => {
    if (layout === "calendar") setCalendarOffset((o) => o + 1);
  };

  const calendarBase = useMemo(() => {
    const d = new Date(TODAY + "T00:00:00");
    d.setMonth(d.getMonth() + calendarOffset);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }, [calendarOffset]);

  const jumpToYearMonth = (year: number, month: number) => {
    const d = new Date(TODAY + "T00:00:00");
    setCalendarOffset((year - d.getFullYear()) * 12 + (month - (d.getMonth() + 1)));
    setShowCalendarPicker(false);
  };

  const toggle = (id: string) => {
    const t = tasks.find((x) => x.id === id);
    // Completing a repeating task advances its due date to the next occurrence (no clone).
    if (t && !t.done && t.repeat && t.repeat !== "none") {
      const upcoming = nextDue(t.due, t.repeat, t.repeatConfig);
      const cfg = t.repeatConfig;
      // Honor an end condition: stop recurring and complete normally.
      const reachedEndDate =
        cfg?.endType === "date" && cfg.endDate && upcoming > cfg.endDate;
      const reachedEndCount = cfg?.endType === "count" && (cfg.endCount ?? 1) <= 1;
      if (reachedEndDate || reachedEndCount) {
        setTasks((ts) =>
          ts.map((x) =>
            x.id === id
              ? {
                  ...x,
                  done: true,
                  completedAt: completeCounter++,
                  completedDate: completionStamp(),
                }
              : x,
          ),
        );
        return;
      }
      setTasks((ts) =>
        ts.map((x) =>
          x.id === id
            ? {
                ...x,
                due: upcoming,
                done: false,
                completedAt: undefined,
                completedDate: undefined,
                // decrement remaining count when an end-count is set
                repeatConfig:
                  cfg?.endType === "count"
                    ? { ...cfg, endCount: (cfg.endCount ?? 1) - 1 }
                    : x.repeatConfig,
                subtasks: x.subtasks?.map((s) => ({ ...s, done: false })),
              }
            : x,
        ),
      );
      return;
    }
    setTasks((ts) =>
      ts.map((x) =>
        x.id === id
          ? {
              ...x,
              done: !x.done,
              completedAt: !x.done ? completeCounter++ : undefined,
              completedDate: !x.done ? completionStamp() : undefined,
            }
          : x,
      ),
    );
  };
  const updateTask = (id: string, patch: Partial<Task>) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t)));
  // --- multi-select bulk actions ---
  const toggleSelect = (id: string) =>
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  const clearSelection = () => setSelectedIds([]);
  const deleteTask = (id: string) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    setTasks((ts) => ts.filter((x) => x.id !== id));
    // Repeat tasks are permanently deleted (no trash).
    if (!t.repeat || t.repeat === "none") {
      setTrash((tr) => [t, ...tr]);
    }
    setSelectedId((cur) => (cur === id ? null : cur));
  };
  const restoreTask = (id: string) => {
    const t = trash.find((x) => x.id === id);
    if (!t) return;
    setTasks((ts) => [...ts, t]);
    setTrash((tr) => tr.filter((x) => x.id !== id));
  };
  const bulkDelete = () => {
    const sel = new Set(selectedIds);
    // Mirror deleteTask: repeat tasks are purged permanently (not trashed).
    const removed = tasks.filter((t) => sel.has(t.id) && (!t.repeat || t.repeat === "none"));
    setTasks((ts) => ts.filter((t) => !sel.has(t.id)));
    setTrash((tr) => [...removed, ...tr]);
    setSelectedId((cur) => (cur && sel.has(cur) ? null : cur));
    setSelectedIds([]);
  };
  const bulkApply = (patch: Partial<Task>) => {
    const sel = new Set(selectedIds);
    setTasks((ts) => ts.map((t) => (sel.has(t.id) ? { ...t, ...patch } : t)));
    setSelectedIds([]);
  };
  const bulkDuplicate = () => {
    const sel = new Set(selectedIds);
    setTasks((ts) => {
      const copies = ts
        .filter((t) => sel.has(t.id))
        .map<Task>((t) => ({
          ...t,
          id: `u${nextId++}`,
          title: `${t.title}（コピー）`,
          done: false,
          starred: false,
          completedAt: undefined,
          completedDate: undefined,
          subtasks: t.subtasks?.map((s) => ({ ...s, id: `st${subId++}` })),
        }));
      return [...ts, ...copies];
    });
    setSelectedIds([]);
  };
  const star = (id: string) =>
    setTasks((ts) =>
      ts.map((t) => (t.id === id ? { ...t, starred: !t.starred } : t)),
    );
  const markAllRead = () =>
    setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
  const readNotification = (id: string) =>
    setNotifications((ns) =>
      ns.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  const addTask = (data: Omit<Task, "id" | "done" | "starred">) => {
    const now = Date.now();
    setTasks((ts) => [
      ...ts,
      { ...data, id: `u${nextId++}`, done: false, starred: false, createdAt: now, updatedAt: now },
    ]);
  };

  /** Insert a new task right after `afterId` with full field data. */
  const commitInline = (afterId: string, data: import("./components/InlineAddTask").InlineCommitData) => {
    const id = `u${nextId++}`;
    setTasks((ts) => {
      const idx = ts.findIndex((t) => t.id === afterId);
      const newTask: Task = {
        id,
        title: data.title,
        project: data.project,
        due: data.due,
        dueTime: data.dueTime,
        priority: data.priority,
        owner: data.owner,
        memos: data.memos,
        done: false,
        starred: false,
      };
      const copy = [...ts];
      copy.splice(idx + 1, 0, newTask);
      return copy;
    });
    setDraftMemos([]);
    setInlineAfter(null);
  };

  /** Add a new task from the bottom "+" button (appended to end of tasks). */
  const commitInlineBottom = (data: import("./components/InlineAddTask").InlineCommitData) => {
    addTask({ title: data.title, project: data.project, due: data.due, dueTime: data.dueTime, priority: data.priority, owner: data.owner, repeat: data.repeat, memos: data.memos });
    setDraftMemos([]);
    setInlineGroup(null);
  };

  /** Move dragged task to just before the drop target in the master array. */
  const handleDrop = () => {
    if (dragId && dragOverId && dragId !== dragOverId) {
      setTasks((ts) => {
        const from = ts.findIndex((t) => t.id === dragId);
        if (from < 0) return ts;
        const arr = [...ts];
        const [moved] = arr.splice(from, 1);
        const to = arr.findIndex((t) => t.id === dragOverId);
        arr.splice(to, 0, moved);
        return arr;
      });
    }
    setDragId(null);
    setDragOverId(null);
  };

  // --- global keyboard shortcuts ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      // Ctrl/⌘ + T → add task
      if ((e.ctrlKey || e.metaKey) && (e.key === "t" || e.key === "T")) {
        e.preventDefault();
        setShowModal(true);
        return;
      }
      // Ctrl/⌘ + K → search
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      // Esc clears multi-selection
      if (e.key === "Escape" && selectedIds.length) {
        setSelectedIds([]);
        return;
      }
      // Enter key no longer adds tasks inline
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hoveredId, showModal, selectedIds.length]);

  // apply appearance settings to <html>
  useEffect(() => {
    const el = document.documentElement;
    el.classList.toggle("dark", settings.darkMode);
    ["blue", "violet", "emerald", "rose", "amber"].forEach((c) =>
      el.classList.remove(`theme-${c}`),
    );
    el.classList.add(`theme-${settings.accent}`);
    el.style.fontSize =
      settings.fontSize === "small"
        ? "14px"
        : settings.fontSize === "large"
          ? "18px"
          : "16px";
  }, [settings.darkMode, settings.accent, settings.fontSize]);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const onMove = (ev: MouseEvent) => {
      const rect = bodyRef.current?.getBoundingClientRect();
      if (!rect) return;
      const w = rect.right - ev.clientX - 12;
      setRightWidth(Math.min(480, Math.max(300, w)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
    };
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // sort helper for active task lists
  const sortActiveTasks = (list: Task[]) => {
    if (listSort === "custom") return list;
    const copy = [...list];
    if (listSort === "priority") {
      const order: Record<string, number> = { high: 0, mid: 1, low: 2 };
      copy.sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9));
    } else if (listSort === "owner") {
      copy.sort((a, b) => {
        const an = people.find((p) => p.id === a.owner)?.name ?? "ｚ";
        const bn = people.find((p) => p.id === b.owner)?.name ?? "ｚ";
        return an.localeCompare(bn, "ja");
      });
    } else if (listSort === "project") {
      copy.sort((a, b) => {
        const ap = projects.find((p) => p.id === a.project)?.label ?? "";
        const bp = projects.find((p) => p.id === b.project)?.label ?? "";
        return ap.localeCompare(bp, "ja");
      });
    }
    return copy;
  };

  // --- "today" view sub-lists ---
  const todayActive = useMemo(
    () => sortActiveTasks(tasks.filter((t) => t.due === TODAY && !t.done)),
    [tasks, listSort], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const doneToday = useMemo(
    () => orderTasks(tasks.filter((t) => t.due === TODAY && t.done), sortMode),
    [tasks, sortMode],
  );

  // --- grouped views (week / month / all / favorites) ---
  // Active tasks only (not done) — sorted by listSort
  const groups = useMemo(() => {
    const pool = tasksForView(tasks, view, selectedProject).filter(
      (t) => view === "completed" ? true : !t.done,
    );
    return groupTasksByDate(sortActiveTasks(pool), TODAY, "date");
  }, [tasks, view, selectedProject, listSort]); // eslint-disable-line react-hooks/exhaustive-deps

  // Completed tasks for the current view — sorted by sortMode
  const doneInView = useMemo(() => {
    if (view === "completed") return []; // completed view handles its own rendering
    return orderTasks(
      tasksForView(tasks, view, selectedProject).filter((t) => t.done),
      sortMode,
    );
  }, [tasks, view, selectedProject, sortMode]);

  // --- sidebar task counts (incomplete unless noted) ---
  const counts = useMemo(() => {
    const active = tasks.filter((t) => !t.done);
    const base = new Date(TODAY + "T00:00:00");
    const wk = new Date(base);
    wk.setDate(base.getDate() + 6);
    const mo = new Date(base);
    mo.setMonth(base.getMonth() + 1, 0);
    const wkMax = fmtDate(wk);
    const moMax = fmtDate(mo);
    const projectCounts = {} as Record<ProjectId, number>;
    for (const p of projects)
      projectCounts[p.id] = active.filter((t) => t.project === p.id).length;
    return {
      view: {
        today: active.filter((t) => t.due === TODAY).length,
        week: active.filter((t) => t.due <= wkMax).length,
        month: active.filter((t) => t.due <= moMax).length,
        all: active.length,
        favorites: active.filter((t) => t.starred).length,
        completed: tasks.filter((t) => t.done).length,
        repeat: active.filter((t) => t.repeat && t.repeat !== "none").length,
      } as Partial<Record<View, number>>,
      projectCounts,
    };
  }, [tasks, projects]);

  // flat task set for kanban / calendar / table layouts
  const flatVisible = useMemo(() => {
    if (view === "trash") return [];
    if (view === "today")
      return tasks.filter(
        (t) => t.due === TODAY && (!settings.hideCompleted || !t.done),
      );
    return tasksForView(tasks, view, selectedProject).filter(
      (t) => view === "completed" || !settings.hideCompleted || !t.done,
    );
  }, [tasks, view, selectedProject, settings.hideCompleted]);

  // ids currently shown in the active view (for "select all")
  const visibleIds = useMemo(() => {
    if (view === "trash") return [];
    if (view === "today")
      return [...todayActive, ...doneToday].map((t) => t.id);
    return groups.flatMap((g) => g.tasks).map((t) => t.id);
  }, [view, todayActive, doneToday, groups]);
  const selectAllVisible = () => setSelectedIds(visibleIds);

  // shared TaskItem renderer (no key — caller wraps in keyed Fragment)
  const renderTask = (t: Task, opts?: { featured?: boolean }) => (
    <TaskItem
      task={t}
      today={TODAY}
      projects={projects}
      people={people}
      selected={selectedId === t.id}
      checked={selectedIds.includes(t.id)}
      selectionActive={selectionActive}
      onToggleSelect={toggleSelect}
      featured={opts?.featured}
      onToggle={toggle}
      onStar={star}
      onSelect={setSelectedId}
      onRename={(id, title) => updateTask(id, { title })}
      onHover={setHoveredId}
      onChangeProject={(id, projectId) => updateTask(id, { project: projectId })}
      onChangeOwner={(id, ownerId) => updateTask(id, { owner: ownerId })}
      onChangePriority={(id, priority) => updateTask(id, { priority })}
      onChangeDue={(id, due, dueTime, repeat, repeatConfig) => updateTask(id, { due, dueTime, repeat, repeatConfig })}
      onAddPerson={addPerson}
      onAddProject={(label, color) => addProject(label, color, "📌")}
      draggable={!t.done && listSort === "custom"}
      dragging={dragId === t.id}
      dragOver={dragOverId === t.id}
      onDragStart={setDragId}
      onDragEnter={setDragOverId}
      onDrop={handleDrop}
      onDragEnd={() => {
        setDragId(null);
        setDragOverId(null);
      }}
    />
  );

  const LIST_SORT_OPTIONS: { id: ListSort; label: string }[] = [
    { id: "date",     label: "日付順" },
    { id: "priority", label: "優先度順" },
    { id: "owner",    label: "担当者順" },
    { id: "project",  label: "プロジェクト順" },
    { id: "custom",   label: "カスタム" },
  ];
  const listSortControl = (
    <div className="relative">
      <button
        onClick={() => setListSortOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
      >
        {LIST_SORT_OPTIONS.find((o) => o.id === listSort)?.label ?? "日付順"}
        <ChevronDownIcon className="h-3 w-3" />
      </button>
      {listSortOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setListSortOpen(false)} />
          <div className="animate-slide-up absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            {LIST_SORT_OPTIONS.map((o) => (
              <button key={o.id} onClick={() => { setListSort(o.id); setListSortOpen(false); }}
                className={`flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 ${listSort === o.id ? "font-semibold text-blue-600" : "text-slate-600"}`}>
                {o.label}
                {listSort === o.id && <CheckIcon className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const renderList = (list: Task[], featuredFirst = false) =>
    list.map((t, i) => (
      <Fragment key={t.id}>
        {renderTask(t, { featured: featuredFirst && i === 0 })}
        {inlineAfter === t.id && (
          <InlineAddTask
            onCommit={(data) => commitInline(t.id, data)}
            onCancel={() => { setInlineAfter(null); setDraftMemos([]); }}
            projects={projects}
            people={people}
            defaultProject={t.project}
            defaultDue={t.due}
            today={TODAY}
            memos={draftMemos}
            onChangeMemos={setDraftMemos}
          />
        )}
      </Fragment>
    ));

  const inlineAddButton = (_groupKey: string, defaultProject?: string) => (
    <QuickAddRow
      projects={projects}
      defaultProject={defaultProject}
      onAdd={(title, project, due) => addTask({ title, project, due, priority: "mid" })}
    />
  );

  const renderGrouped = (gs: TaskGroup[]) =>
    gs.length === 0 ? (
      <div>
        <p className="px-3 py-6 text-center text-sm text-slate-400">
          タスクはありません 🎉
        </p>
        {inlineAddButton("empty")}
      </div>
    ) : (
      <>
        {gs.map((g) => (
          <div key={g.key} className="mb-4 last:mb-0">
            <h3
              className={`mb-1 px-1 text-sm font-bold ${
                g.overdue ? "text-red-500" : "text-blue-500"
              }`}
            >
              {g.label}:
            </h3>
            <div className="space-y-0">{renderList(g.tasks)}</div>
            {inlineAddButton(`group:${g.key}`)}
          </div>
        ))}
      </>
    );

  const sidebarProps = {
    view, onChangeView: setView, projects, selectedProject,
    counts: counts.view, projectCounts: counts.projectCounts,
    collapsed: sidebarCollapsed,
    onToggleCollapse: () => setSidebarCollapsed((v) => !v),
    onSelectProject: (id: ProjectId) => { setSelectedProject(id); setView("project"); },
    onOpenSettings: () => setActiveModal("settings"),
    onOpenHelp: () => setActiveModal("help"),
    onAddTask: () => setShowModal(true),
    onAddProject: addProject,
    onUpdateProject: updateProject,
    mainMode, onChangeMainMode: (mode: "tasks" | "memos") => { setMainMode(mode); if (mode === "memos") setRightOpen(false); },
    memoCategories, memoCounts, memoFilter,
    onAddMemo: addMemo, onChangeMemoFilter: setMemoFilter,
    onAddMemoCategory: addMemoCategory, onDeleteMemoCategory: deleteMemoCategory, onRenameMemoCategory: renameMemoCategory, onRecolorMemoCategory: recolorMemoCategory,
    profile, onOpenProfile: () => setActiveModal("profile"),
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-slate-100 shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <Sidebar {...sidebarProps} collapsed={false} onToggleCollapse={() => setMobileSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden h-full md:block">
        <Sidebar {...sidebarProps} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ── Top bar ── */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 md:px-4">
          {/* Mobile hamburger */}
          <button onClick={() => setMobileSidebarOpen(true)} className="md:hidden rounded-md p-2 text-slate-500 hover:bg-slate-100">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          {/* View tabs: 今日/今週/今月/すべて — タスクモード・リスト/テーブルのみ表示 */}
          {mainMode === "tasks" && (["today","week","month","all"] as View[]).includes(view) && (layout === "list" || layout === "table") ? (
            <div className="flex items-center gap-0.5 rounded-full border border-slate-200 p-0.5">
              {([
                { id: "today" as View, label: "今日" },
                { id: "week"  as View, label: "今週" },
                { id: "month" as View, label: "今月" },
                { id: "all"   as View, label: "すべて" },
              ]).map((tab) => (
                <button key={tab.id} onClick={() => setView(tab.id)}
                  className={`whitespace-nowrap rounded-full px-2 py-1 text-xs sm:text-sm sm:px-3 font-medium transition ${
                    view === tab.id
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>
          ) : mainMode === "tasks" ? (
            <span className="whitespace-nowrap text-base font-semibold text-slate-700">
              {periodLabel}
            </span>
          ) : (
            /* メモモード: タイトル + フィルタータブ */
            <div className="flex min-w-0 items-center gap-2">
              <span className="whitespace-nowrap text-base font-semibold text-slate-700">メモ</span>
              <div className="flex min-w-0 overflow-x-auto items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 p-0.5 scrollbar-none">
                <button
                  onClick={() => setMemoFilter(null)}
                  className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition ${memoFilter === null ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:bg-white/60"}`}
                >
                  すべて{memos.length > 0 && <span className="ml-0.5 opacity-60">({memos.length})</span>}
                </button>
                {memoCategories.map(cat => {
                  const count = memoCounts[cat.id] ?? 0;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setMemoFilter(cat.id)}
                      className={`whitespace-nowrap flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition ${memoFilter === cat.id ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:bg-white/60"}`}
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${cat.color}`} />
                      {cat.name}{count > 0 && <span className="opacity-60">({count})</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Calendar navigation (< >) — only for calendar layout */}
          {mainMode === "tasks" && layout === "calendar" && (
            <div className="relative flex items-center gap-1">
              <button onClick={handleNavPrev} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" title="前月">
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setPickerYear(calendarBase.year); setShowCalendarPicker(v => !v); }}
                className="whitespace-nowrap rounded-md px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
                title="年月を選択"
              >
                {periodLabel}
              </button>
              <button onClick={handleNavNext} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" title="次月">
                <ChevronRightIcon className="h-4 w-4" />
              </button>

              {showCalendarPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowCalendarPicker(false)} />
                  <div className="absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 shadow-xl" style={{ minWidth: 200 }}>
                    {/* Year navigation */}
                    <div className="mb-2 flex items-center justify-between">
                      <button onClick={() => setPickerYear(y => y - 1)} className="rounded p-1 text-slate-500 hover:bg-slate-100">
                        <ChevronLeftIcon className="h-4 w-4" />
                      </button>
                      <span className="text-sm font-semibold text-slate-700">{pickerYear}年</span>
                      <button onClick={() => setPickerYear(y => y + 1)} className="rounded p-1 text-slate-500 hover:bg-slate-100">
                        <ChevronRightIcon className="h-4 w-4" />
                      </button>
                    </div>
                    {/* Month grid */}
                    <div className="grid grid-cols-4 gap-1">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                        const isActive = calendarBase.year === pickerYear && calendarBase.month === m;
                        return (
                          <button
                            key={m}
                            onClick={() => jumpToYearMonth(pickerYear, m)}
                            className={`rounded-lg py-1.5 text-xs font-medium transition hover:bg-blue-50 hover:text-blue-600 ${
                              isActive ? "bg-blue-100 font-semibold text-blue-700" : "text-slate-600"
                            }`}
                          >
                            {m}月
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex-1" />

          {/* Icon actions */}
          <div className="flex items-center gap-0.5">
            <button onClick={() => setSearchOpen(true)} title="検索 (Ctrl+K)" className="rounded-md p-2 text-slate-500 hover:bg-slate-100">
              <SearchIcon className="h-4 w-4" />
            </button>
          </div>

          {mainMode === "tasks" && <div className="hidden sm:block h-5 w-px bg-slate-200" />}

          {/* Layout switcher — tasks mode only, hidden on mobile */}
          {mainMode === "tasks" && <div className="hidden sm:flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5">
            {layoutOptions.map((o) => {
              const Icon = o.icon;
              const active = layout === o.id;
              return (
                <button key={o.id} onClick={() => setLayout(o.id)} title={o.label}
                  className={`flex items-center justify-center rounded-md p-1.5 transition ${
                    active ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  }`}>
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>}

          <div className="hidden sm:block h-5 w-px bg-slate-200" />

          {/* Bell notification */}
          <div className="relative">
            <button onClick={() => setNotifOpen((v) => !v)} title="通知"
              className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100">
              <BellIcon className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full z-50 mt-1">
                <NotificationsPopover notifications={notifications} onClose={() => setNotifOpen(false)}
                  onMarkAll={markAllRead} onRead={readNotification} />
              </div>
            )}
          </div>

          {/* Right panel toggle — hidden on mobile */}
          <button
            onClick={() => setRightOpen((v) => !v)}
            title={rightOpen ? "右パネルを隠す" : "右パネルを表示"}
            className={`hidden md:flex rounded-md p-2 transition hover:bg-slate-100 ${rightOpen ? "text-blue-600" : "text-slate-400"}`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 3v18"/>
              {rightOpen && <path d="m17 9 3 3-3 3"/>}
              {!rightOpen && <path d="m17 15-3-3 3-3"/>}
            </svg>
          </button>

        </header>

        {/* ── Local-storage warning banner ── */}
        {!bannerDismissed && (
          <div className="flex shrink-0 items-center gap-3 border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-xs text-amber-800">
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>データはこのブラウザにのみ保存されています。別のPC・ブラウザからはアクセスできません。定期的にバックアップを取ることをお勧めします。</span>
            <button
              onClick={exportData}
              className="ml-auto shrink-0 rounded-md bg-amber-100 px-2.5 py-1 font-medium text-amber-700 hover:bg-amber-200 transition"
            >
              エクスポート
            </button>
            <button
              onClick={() => { setBannerDismissed(true); localStorage.setItem('taskflow_banner_dismissed', '1'); }}
              className="shrink-0 text-amber-400 hover:text-amber-600"
              title="閉じる"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}

        <main className="flex-1 overflow-hidden">
        {/* Body — resizable two-column */}
        <div ref={bodyRef} className="flex h-full">
          {/* Left column — scrolls independently */}
          <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden pb-16 md:pb-0">
          {mainMode === "memos" ? (
            <MemoView
              memos={memos}
              categories={memoCategories}
              filterCategoryId={memoFilter}
              onUpdateMemo={updateMemo}
              onDeleteMemo={deleteMemo}
              onDuplicateMemo={duplicateMemo}
              onReorderMemo={reorderMemo}
            />
          ) : (
          <div className="w-full max-w-[900px] px-3 py-4 md:px-8 md:py-6">
          <div className="space-y-4 md:space-y-6">
            {layout === "kanban" ? (
              <KanbanView
                tasks={flatVisible}
                today={TODAY}
                projects={projects}
                people={people}
                onSelect={setSelectedId}
                onChangeProject={(id, project) => updateTask(id, { project })}
                onChangePriority={(id, priority) => updateTask(id, { priority })}
                onUpdateTask={updateTask}
                onAddPerson={addPerson}
                onAddProject={(label, color) => addProject(label, color, "📌")}
              />
            ) : layout === "calendar" ? (
              <CalendarView
                tasks={flatVisible}
                today={TODAY}
                weekStart={settings.weekStart}
                monthOffset={calendarOffset}
                onSelect={setSelectedId}
                onToggle={toggle}
                onUpdate={(id, patch) => updateTask(id, patch)}
                onAddPerson={addPerson}
                onAddProject={(label, color) => addProject(label, color, "📌")}
                projects={projects}
                people={people}
              />
            ) : layout === "table" ? (
              <TableView
                tasks={flatVisible}
                today={TODAY}
                onSelect={setSelectedId}
                onToggle={toggle}
                onUpdate={(id, patch) => updateTask(id, patch)}
                onAddPerson={addPerson}
                onAddProject={(label, color) => addProject(label, color, "📌")}
                projects={projects}
                people={people}
                showRepeatCol={view === "repeat"}
              />
            ) : view === "today" ? (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-1 flex items-center justify-between px-1">
                    <h3 className="text-sm font-bold text-slate-700">
                      今日のタスク{" "}
                      <span className="font-normal text-slate-400">({todayActive.length}件)</span>
                    </h3>
                    {listSortControl}
                  </div>
                  <div className="space-y-0">{renderList(todayActive)}</div>
                  {inlineAddButton("today")}
                </section>

                {!settings.hideCompleted && doneToday.length > 0 && (
                  <section className="rounded-2xl border border-slate-200 bg-slate-100 p-5 shadow-sm">
                    <h3 className="mb-1 px-1 text-sm font-bold text-slate-700">
                      完了済み{" "}
                      <span className="font-normal text-slate-400">
                        ({doneToday.length}件)
                      </span>
                    </h3>
                    <div className="space-y-0">{renderList(doneToday)}</div>
                  </section>
                )}
              </>
            ) : view === "repeat" ? (
              <RepeatTasksView
                tasks={tasksForView(tasks, "repeat", null)}
                today={TODAY}
                onDelete={deleteTask}
                onUpdateTask={updateTask}
                onAddPerson={addPerson}
                onAddProject={(label, color) => addProject(label, color, "📌")}
                projects={projects}
                people={people}
                onAddTask={() => { setModalDefaultRepeat("weekly"); setShowModal(true); }}
              />
            ) : (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between px-1">
                    <span className="text-sm font-semibold text-slate-700">{periodLabel}</span>
                    {listSortControl}
                  </div>
                  {renderGrouped(groups)}
                </section>

                {!settings.hideCompleted && doneInView.length > 0 && (
                  <section className="rounded-2xl border border-slate-200 bg-slate-100 p-5 shadow-sm">
                    <div className="mb-3 flex items-center justify-between px-1">
                      <h3 className="text-sm font-bold text-slate-700">
                        完了済み{" "}
                        <span className="font-normal text-slate-400">({doneInView.length}件)</span>
                      </h3>
                      <div className="relative">
                        <button
                          onClick={() => setSortOpen((v) => !v)}
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                        >
                          {sortMode === "date" ? "日付順" : "完了順"}
                          <ChevronDownIcon className="h-3 w-3" />
                        </button>
                        {sortOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                            <div className="animate-slide-up absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                              {([{ id: "date", label: "日付順" }, { id: "completed", label: "完了順" }] as const).map((o) => (
                                <button key={o.id} onClick={() => { setSortMode(o.id); setSortOpen(false); }}
                                  className={`flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 ${sortMode === o.id ? "font-semibold text-blue-600" : "text-slate-600"}`}>
                                  {o.label}
                                  {sortMode === o.id && <CheckIcon className="h-3.5 w-3.5" />}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="space-y-0">{renderList(doneInView)}</div>
                  </section>
                )}
              </>
            )}
          </div>
          </div>
          )}
          </div>{/* end left scroll column */}

          {/* drag-to-resize handle — shown only when notes panel is visible */}
          {layout !== "table" && (selectedId !== null || inlineAfter !== null) && (
            <div
              onMouseDown={startResize}
              className="group flex w-3 shrink-0 cursor-col-resize items-center justify-center"
            >
              <div className="h-16 w-1 rounded-full bg-slate-200 transition group-hover:bg-blue-400" />
            </div>
          )}

          {/* Notes panel — visible when a task or draft is selected (tasks mode only) */}
          {mainMode === "tasks" && (selectedId !== null || inlineAfter !== null) && (() => {
            const selectedTask = selectedId ? tasks.find((t) => t.id === selectedId) : null;
            const desktopPanel = selectedTask ? (
              <TaskDetailPanel
                key={selectedTask.id}
                task={selectedTask}
                today={TODAY}
                projects={projects}
                people={people}
                onAddPerson={addPerson}
                onUpdate={(patch) => updateTask(selectedId!, patch)}
                onClose={() => setSelectedId(null)}
                onDelete={(id) => { deleteTask(id); setSelectedId(null); }}
                onStar={star}
                onToggle={toggle}
              />
            ) : null;
            return (
              <>
                {/* Mobile: Google Tasks-style simple full-screen editor */}
                {selectedTask ? (
                  <MobileTaskDetail
                    key={selectedTask.id}
                    task={selectedTask}
                    projects={projects}
                    people={people}
                    onAddPerson={addPerson}
                    onUpdate={(patch) => updateTask(selectedId!, patch)}
                    onDelete={(id) => { deleteTask(id); setSelectedId(null); }}
                    onToggle={toggle}
                    onClose={() => setSelectedId(null)}
                  />
                ) : inlineAfter !== null ? (
                  <div className="md:hidden fixed inset-0 z-50 bg-white overflow-y-auto">
                    {desktopPanel}
                  </div>
                ) : null}
                {/* Desktop: side panel */}
                <div className="hidden md:block shrink-0 overflow-y-auto py-6 pr-4 pl-3" style={{ width: rightWidth }}>
                  {desktopPanel}
                </div>
              </>
            );
          })()}

        </div>{/* end body flex row */}
        </main>

        {/* Mobile bottom navigation bar */}
        {!mobileSidebarOpen && (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center border-t border-slate-200 bg-white pb-safe"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            <button
              onClick={() => { setMainMode("tasks"); }}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${mainMode === "tasks" ? "text-blue-600" : "text-slate-400"}`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              タスク
            </button>
            {/* FAB (center) */}
            <button
              onClick={() => mainMode === "memos" ? addMemo() : setShowModal(true)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg active:scale-95 transition mx-3"
              aria-label={mainMode === "memos" ? "メモを追加" : "タスクを追加"}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
            </button>
            <button
              onClick={() => setMainMode("memos")}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${mainMode === "memos" ? "text-blue-600" : "text-slate-400"}`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              メモ
            </button>
          </nav>
        )}
      </div>

      {/* Far-right overlay sidebar — Calendar / Google Calendar / Gmail / Slack */}
      <div
        className="fixed right-0 top-0 z-50 h-full w-[340px] overflow-y-auto border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out hidden md:block"
        style={{ transform: rightOpen ? "translateX(0)" : "translateX(100%)" }}
      >
        {/* Close button */}
        <div className="sticky top-0 z-10 flex justify-end border-b border-slate-100 bg-white px-3 py-2">
          <button
            onClick={() => setRightOpen(false)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            title="閉じる"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
            閉じる
          </button>
        </div>
        <div className="space-y-6 px-4 py-4">
          <GoogleCalendarPanel
            accessToken={googleCalToken}
            onConnect={setGoogleCalToken}
            onDisconnect={() => setGoogleCalToken(null)}
            onAddTask={(title, due) => addTask({ title, due, project: "work", priority: "mid" })}
          />
          <GmailPanel
            accessToken={gmailToken}
            onConnect={setGmailToken}
            onDisconnect={() => setGmailToken(null)}
          />
          <SlackPanel />
        </div>
      </div>

      {showModal && (
        <AddTaskModal
          onClose={() => { setShowModal(false); setModalDefaultRepeat(undefined); }}
          onAdd={addTask}
          projects={projects}
          onAddProject={(label, color) => addProject(label, color, "📌")}
          defaultRepeat={modalDefaultRepeat}
          defaultProject={selectedProject ?? undefined}
        />
      )}

      {searchOpen && (
        <SearchModal
          tasks={tasks}
          today={TODAY}
          onClose={() => setSearchOpen(false)}
          onSelect={(id) => setSelectedId(id)}
        />
      )}

      {activeModal === "settings" && (
        <SettingsModal
          settings={settings}
          onChange={setSettings}
          onClose={() => setActiveModal(null)}
          people={people}
          onAddPerson={addPerson}
          onRemovePerson={removePerson}
          onUpdatePerson={updatePerson}
          avatarChoices={avatarChoices}
          googleCalConnected={!!googleCalToken}
          onGoogleCalConnect={setGoogleCalToken}
          onGoogleCalDisconnect={() => setGoogleCalToken(null)}
          userEmail={profile.email}
          onChangePassword={handleChangePassword}
          onExport={exportData}
        />
      )}
      {activeModal === "help" && (
        <HelpModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "profile" && (
        <ProfileModal
          profile={profile}
          isLoggedIn={isLoggedIn}
          needsPasswordChange={needsPasswordChange}
          onSave={(p) => { setProfile(p); }}
          onLogin={handleLogin}
          onLogout={handleLogout}
          onPasswordChanged={() => { setNeedsPasswordChange(false); }}
          onClose={() => setActiveModal(null)}
        />
      )}

      {selectionActive && view !== "trash" && (
        <BulkActionBar
          count={selectedIds.length}
          onEdit={() => setBulkEditOpen(true)}
          onDelete={bulkDelete}
          onDuplicate={bulkDuplicate}
          onSelectAll={selectAllVisible}
          onClear={clearSelection}
        />
      )}
      {bulkEditOpen && (
        <BulkEditModal
          count={selectedIds.length}
          onApply={bulkApply}
          onClose={() => setBulkEditOpen(false)}
          people={people}
        />
      )}
    </div>
  );
}
