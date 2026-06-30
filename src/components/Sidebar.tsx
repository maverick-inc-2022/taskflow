import { useState } from "react";
import { projectColorOptions, projectIconOptions } from "../data";
import type { MemoCategory, Project, ProjectId } from "../types";
import {
  ChevronLeftIcon,
  HelpIcon,
  ListIcon,
  LogoIcon,
  PlusIcon,
  RepeatIcon,
  SettingsIcon,
  XIcon,
} from "../icons";

export type View =
  | "today"
  | "week"
  | "month"
  | "all"
  | "favorites"
  | "completed"
  | "trash"
  | "repeat"
  | "project";

interface Props {
  view: View;
  onChangeView: (v: View) => void;
  projects: Project[];
  selectedProject: ProjectId | null;
  counts: Partial<Record<View, number>>;
  projectCounts: Record<ProjectId, number>;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelectProject: (id: ProjectId) => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onAddTask: () => void;
  onAddProject: (label: string, color: string, icon: string) => void;
  onUpdateProject: (id: ProjectId, patch: { color?: string; icon?: string; label?: string }) => void;
  /** Current top-level mode */
  mainMode: "tasks" | "memos";
  onChangeMainMode: (mode: "tasks" | "memos") => void;
  memoCategories?: MemoCategory[];
  memoCounts?: Record<string, number>;
  memoFilter?: string | null;
  onAddMemo?: () => void;
  onChangeMemoFilter?: (id: string | null) => void;
  onAddMemoCategory?: (name: string, color: string) => void;
  onDeleteMemoCategory?: (id: string) => void;
  onRenameMemoCategory?: (id: string, name: string) => void;
  profile?: { name: string; avatar: string };
  onOpenProfile?: () => void;
}

const isTaskView = (v: View) =>
  v === "today" || v === "week" || v === "month" || v === "all";

const navItems: {
  id: View;
  label: string;
  icon: typeof ListIcon;
}[] = [
  { id: "today", label: "タスク", icon: ListIcon },
  { id: "repeat", label: "繰り返し", icon: RepeatIcon },
];

export default function Sidebar({
  view,
  onChangeView,
  projects,
  selectedProject,
  counts,
  projectCounts,
  collapsed,
  onToggleCollapse,
  onSelectProject,
  onOpenSettings,
  onOpenHelp,
  onAddTask,
  onAddProject,
  onUpdateProject,
  mainMode,
  onChangeMainMode,
  memoCategories = [],
  memoCounts = {},
  memoFilter = null,
  onAddMemo,
  onChangeMemoFilter,
  onAddMemoCategory,
  onDeleteMemoCategory,
  onRenameMemoCategory,
  profile,
  onOpenProfile,
}: Props) {
  const [pickerProjectId, setPickerProjectId] = useState<ProjectId | null>(null);
  const [addingProject, setAddingProject] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState(projectColorOptions[0]);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState(projectColorOptions[0]);
  const [newProjectIcon, setNewProjectIcon] = useState(projectIconOptions[0]);

  // Inline rename state
  const [editingProjectId, setEditingProjectId] = useState<ProjectId | null>(null);
  const [editingProjectName, setEditingProjectName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  // Delete confirmation
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState<string | null>(null);

  const commitNewProject = () => {
    const name = newProjectName.trim();
    if (name) {
      onAddProject(name, newProjectColor, newProjectIcon);
    }
    setAddingProject(false);
    setNewProjectName("");
    setNewProjectColor(projectColorOptions[0]);
    setNewProjectIcon(projectIconOptions[0]);
  };

  const taskCount = counts.all ?? 0;

  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-slate-200 bg-white py-5 transition-all duration-200 ${
        collapsed ? "w-16 px-2" : "w-60 px-4"
      }`}
    >
      {/* Logo + collapse */}
      <div className={`flex items-center pb-3 ${collapsed ? "justify-center" : "justify-between px-1"}`}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <LogoIcon className="h-7 w-7" />
            <span className="text-lg font-bold text-slate-800">TaskFlow</span>
          </div>
        )}
        <button onClick={onToggleCollapse} title={collapsed ? "開く" : "閉じる"}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          {collapsed ? <LogoIcon className="h-6 w-6" /> : <ChevronLeftIcon className="h-5 w-5" />}
        </button>
      </div>

      {/* タスク ↔ メモ toggle */}
      {!collapsed ? (
        <div className="mb-4 flex gap-0.5 rounded-xl bg-slate-100 p-0.5">
          <button
            onClick={() => onChangeMainMode("tasks")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition ${
              mainMode === "tasks" ? "bg-white text-slate-700 shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h6"/></svg>
            タスク
          </button>
          <button
            onClick={() => onChangeMainMode("memos")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition ${
              mainMode === "memos" ? "bg-white text-slate-700 shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            メモ
          </button>
        </div>
      ) : (
        /* collapsed: icon-only toggle */
        <div className="mb-4 flex flex-col gap-1">
          <button onClick={() => onChangeMainMode("tasks")} title="タスク"
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${mainMode === "tasks" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-100"}`}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 9h10M7 13h6"/></svg>
          </button>
          <button onClick={() => onChangeMainMode("memos")} title="メモ"
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${mainMode === "memos" ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-100"}`}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          </button>
        </div>
      )}

      {/* Add task button — tasks mode only */}
      {mainMode === "tasks" && (
        <div className={`mb-5 ${collapsed ? "flex justify-center" : ""}`}>
          <button onClick={onAddTask} title="タスクを追加 (Ctrl+T)"
            className={`flex items-center gap-2 rounded-full bg-blue-600 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition ${
              collapsed ? "h-9 w-9 justify-center" : "px-4 py-2 w-full"
            }`}>
            <PlusIcon className="h-4 w-4 shrink-0" />
            {!collapsed && "タスクを追加"}
          </button>
        </div>
      )}

      {/* Memo add button — memos mode only */}
      {mainMode === "memos" && (
        <div className={`mb-4 ${collapsed ? "flex justify-center" : ""}`}>
          <button
            onClick={onAddMemo}
            title="メモを追加"
            className={`flex items-center gap-2 rounded-full bg-blue-600 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 ${
              collapsed ? "h-9 w-9 justify-center" : "w-full px-4 py-2"
            }`}
          >
            <PlusIcon className="h-4 w-4 shrink-0" />
            {!collapsed && "メモを追加"}
          </button>
        </div>
      )}

      {/* Main nav — tasks mode only */}
      {mainMode === "memos" ? null : <nav className="space-y-0.5">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = id === "today" ? isTaskView(view) : view === id;
          const count = id === "today" ? taskCount : counts[id];
          return (
            <button key={id} onClick={() => onChangeView(id)} title={collapsed ? label : undefined}
              className={`flex w-full items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition ${
                collapsed ? "justify-center px-0" : "px-3"
              } ${active ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <>
                  {label}
                  {count != null && count > 0 ? (
                    <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"
                    }`}>{count}</span>
                  ) : null}
                </>
              )}
            </button>
          );
        })}
      </nav>}

      {/* Categories — memos mode only */}
      {mainMode === "memos" && (
        <div className="flex-1 overflow-y-auto">
          {!collapsed && (
            <div className="flex items-center justify-between px-3 pb-2">
              <span className="text-xs font-semibold tracking-wide text-slate-400">カテゴリ</span>
              <button onClick={() => setAddingCategory(true)} title="カテゴリを追加"
                className="rounded text-slate-400 hover:text-blue-500">
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Add category form */}
          {addingCategory && !collapsed && (
            <div className="mx-1 mb-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <input
                autoFocus
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    const name = newCategoryName.trim();
                    if (name) onAddMemoCategory?.(name, newCategoryColor);
                    setAddingCategory(false); setNewCategoryName(""); setNewCategoryColor(projectColorOptions[0]);
                  }
                  if (e.key === "Escape") { setAddingCategory(false); setNewCategoryName(""); }
                }}
                placeholder="カテゴリ名"
                className="mb-2 w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm outline-none focus:border-blue-400"
              />
              <p className="mb-1 text-[10px] font-semibold text-slate-400">カラー</p>
              <div className="mb-2 flex flex-wrap gap-1">
                {projectColorOptions.map(col => (
                  <button key={col} onClick={() => setNewCategoryColor(col)}
                    className={`h-5 w-5 rounded-full ${col} transition ${newCategoryColor === col ? "ring-2 ring-blue-400 ring-offset-1" : "hover:scale-110"}`} />
                ))}
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    const name = newCategoryName.trim();
                    if (name) onAddMemoCategory?.(name, newCategoryColor);
                    setAddingCategory(false); setNewCategoryName(""); setNewCategoryColor(projectColorOptions[0]);
                  }}
                  className="flex-1 rounded-md bg-blue-600 py-1 text-xs font-medium text-white hover:bg-blue-700">
                  追加
                </button>
                <button onClick={() => { setAddingCategory(false); setNewCategoryName(""); }}
                  className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-200">
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* すべて row */}
          {!collapsed && (
            <button
              onClick={() => onChangeMemoFilter?.(null)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                memoFilter === null ? "bg-blue-50 font-medium text-blue-600" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-300" />
              <span className="flex-1 text-left">すべて</span>
              {Object.values(memoCounts).reduce((s, n) => s + n, 0) > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${memoFilter === null ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                  {Object.values(memoCounts).reduce((s, n) => s + n, 0)}
                </span>
              )}
            </button>
          )}

          <ul className="space-y-0.5">
            {memoCategories.map(cat => {
              const count = memoCounts[cat.id] ?? 0;
              const active = memoFilter === cat.id;
              return (
                <li key={cat.id} className="group relative">
                  <div className={`flex w-full items-center gap-2.5 rounded-lg py-2 text-sm transition ${
                    collapsed ? "justify-center px-0" : "px-3"
                  } ${active ? "bg-blue-50 font-medium text-blue-600" : "text-slate-600 hover:bg-slate-100"}`}>
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${cat.color}`} />
                    {!collapsed && (
                      <>
                        {editingCategoryId === cat.id ? (
                          <input
                            autoFocus
                            value={editingCategoryName}
                            onChange={e => setEditingCategoryName(e.target.value)}
                            onBlur={() => {
                              const name = editingCategoryName.trim();
                              if (name && name !== cat.name) onRenameMemoCategory?.(cat.id, name);
                              setEditingCategoryId(null);
                            }}
                            onKeyDown={e => {
                              if (e.key === "Enter") {
                                const name = editingCategoryName.trim();
                                if (name && name !== cat.name) onRenameMemoCategory?.(cat.id, name);
                                setEditingCategoryId(null);
                              }
                              if (e.key === "Escape") setEditingCategoryId(null);
                            }}
                            onClick={e => e.stopPropagation()}
                            className="min-w-0 flex-1 rounded border border-blue-400 bg-white px-1 py-0 text-sm outline-none"
                          />
                        ) : (
                          <button
                            onClick={() => onChangeMemoFilter?.(cat.id)}
                            onDoubleClick={() => { setEditingCategoryId(cat.id); setEditingCategoryName(cat.name); }}
                            className="flex min-w-0 flex-1 items-center text-left"
                          >
                            <span className="min-w-0 flex-1 truncate">{cat.name}</span>
                            {count > 0 && (
                              <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${active ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                                {count}
                              </span>
                            )}
                          </button>
                        )}
                        {confirmDeleteCategoryId === cat.id ? (
                          <div className="ml-1 flex shrink-0 items-center gap-0.5">
                            <span className="text-[10px] text-slate-400">削除？</span>
                            <button
                              onClick={() => { onDeleteMemoCategory?.(cat.id); setConfirmDeleteCategoryId(null); }}
                              className="rounded px-1 py-0.5 text-[10px] font-medium text-red-500 hover:bg-red-50"
                            >はい</button>
                            <button
                              onClick={() => setConfirmDeleteCategoryId(null)}
                              className="rounded px-1 py-0.5 text-[10px] text-slate-400 hover:bg-slate-100"
                            >いいえ</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteCategoryId(cat.id)}
                            title="削除"
                            className="ml-1 shrink-0 rounded p-0.5 text-slate-300 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                          >
                            <XIcon className="h-3 w-3" />
                          </button>
                        )}
                      </>
                    )}
                    {collapsed && (
                      <button onClick={() => onChangeMemoFilter?.(cat.id)} title={cat.name} className="absolute inset-0" />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Projects — tasks mode only */}
      {mainMode === "tasks" && <div className="mt-6 flex-1">
        {!collapsed && (
          <div className="flex items-center justify-between px-3 pb-2">
            <span className="text-xs font-semibold tracking-wide text-slate-400">プロジェクト</span>
            <button onClick={() => setAddingProject(true)} title="プロジェクトを追加"
              className="rounded text-slate-400 hover:text-blue-500">
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Add project form */}
        {addingProject && !collapsed && (
          <div className="mx-1 mb-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
            <input
              autoFocus
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitNewProject();
                if (e.key === "Escape") { setAddingProject(false); setNewProjectName(""); }
              }}
              placeholder="プロジェクト名"
              className="mb-2 w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm outline-none focus:border-blue-400"
            />
            {/* Color picker */}
            <p className="mb-1 text-[10px] font-semibold text-slate-400">カラー</p>
            <div className="mb-2 flex flex-wrap gap-1">
              {projectColorOptions.map((c) => (
                <button key={c} onClick={() => setNewProjectColor(c)}
                  className={`h-5 w-5 rounded-full ${c} transition ${
                    newProjectColor === c ? "ring-2 ring-blue-400 ring-offset-1" : "hover:scale-110"
                  }`} />
              ))}
            </div>
            <div className="flex gap-1.5">
              <button onClick={commitNewProject}
                className="flex-1 rounded-md bg-blue-600 py-1 text-xs font-medium text-white hover:bg-blue-700">
                追加
              </button>
              <button onClick={() => { setAddingProject(false); setNewProjectName(""); }}
                className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-200">
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        <ul className="space-y-0.5">
          {projects.map((p) => {
            const active = view === "project" && selectedProject === p.id;
            const icon = p.icon ?? "📁";
            return (
              <li key={p.id} className="group relative">
                <div className={`flex w-full items-center gap-2.5 rounded-lg py-2 text-sm transition ${
                  collapsed ? "justify-center px-0" : "px-3"
                } ${active ? "bg-blue-50 font-medium text-blue-600" : "text-slate-600 hover:bg-slate-100"}`}>
                  {/* color dot */}
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${p.color}`} />
                  {!collapsed && (
                    editingProjectId === p.id ? (
                      <input
                        autoFocus
                        value={editingProjectName}
                        onChange={e => setEditingProjectName(e.target.value)}
                        onBlur={() => {
                          const name = editingProjectName.trim();
                          if (name && name !== p.label) onUpdateProject(p.id, { label: name });
                          setEditingProjectId(null);
                        }}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            const name = editingProjectName.trim();
                            if (name && name !== p.label) onUpdateProject(p.id, { label: name });
                            setEditingProjectId(null);
                          }
                          if (e.key === "Escape") setEditingProjectId(null);
                        }}
                        onClick={e => e.stopPropagation()}
                        className="min-w-0 flex-1 rounded border border-blue-400 bg-white px-1 py-0 text-sm outline-none"
                      />
                    ) : (
                      <button
                        onClick={() => onSelectProject(p.id)}
                        onDoubleClick={() => { setEditingProjectId(p.id); setEditingProjectName(p.label); }}
                        className="flex min-w-0 flex-1 items-center text-left"
                      >
                        <span className="min-w-0 flex-1 truncate">{p.label}</span>
                        {projectCounts[p.id] ? (
                          <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            active ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"
                          }`}>{projectCounts[p.id]}</span>
                        ) : null}
                      </button>
                    )
                  )}
                  {collapsed && (
                    <button onClick={() => onSelectProject(p.id)} title={p.label} className="absolute inset-0" />
                  )}
                </div>

                {/* Icon + Color picker popover */}
                {pickerProjectId === p.id && !collapsed && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setPickerProjectId(null)} />
                    <div className="absolute left-8 top-0 z-20 rounded-xl border border-slate-200 bg-white p-3 shadow-lg" style={{ width: 200 }}>
                      <p className="mb-1.5 text-[10px] font-semibold text-slate-400">アイコン</p>
                      <div className="mb-3 flex flex-wrap gap-1">
                        {projectIconOptions.map((ic) => (
                          <button key={ic} onClick={() => onUpdateProject(p.id, { icon: ic })}
                            className={`flex h-7 w-7 items-center justify-center rounded-lg text-base transition hover:bg-slate-100 ${
                              icon === ic ? "bg-blue-100 ring-2 ring-blue-400 ring-offset-1" : ""
                            }`}>
                            {ic}
                          </button>
                        ))}
                      </div>
                      <p className="mb-1.5 text-[10px] font-semibold text-slate-400">カラー</p>
                      <div className="flex flex-wrap gap-1.5">
                        {projectColorOptions.map((c) => (
                          <button key={c} onClick={() => onUpdateProject(p.id, { color: c })}
                            className={`h-6 w-6 rounded-full ${c} transition hover:scale-110 ${
                              p.color === c ? "ring-2 ring-blue-400 ring-offset-1" : ""
                            }`} />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </div>}

      {/* Bottom utility */}
      <div className="mt-auto space-y-1 border-t border-slate-100 pt-4">
        <SideLink icon={SettingsIcon} label="設定" collapsed={collapsed} onClick={onOpenSettings} />
        <SideLink icon={HelpIcon} label="ヘルプ" collapsed={collapsed} onClick={onOpenHelp} />
        {profile && (
          <button
            onClick={onOpenProfile}
            title={collapsed ? profile.name : undefined}
            className={`flex w-full items-center gap-3 rounded-lg py-2 text-sm text-slate-700 transition hover:bg-slate-100 ${collapsed ? "justify-center px-0" : "px-3"}`}
          >
            <img src={profile.avatar} alt="" className="h-7 w-7 shrink-0 rounded-full border border-slate-200 object-cover" />
            {!collapsed && <span className="min-w-0 flex-1 truncate text-left font-medium">{profile.name}</span>}
          </button>
        )}
      </div>
    </aside>
  );
}

function SideLink({
  icon: Icon,
  label,
  onClick,
  collapsed,
}: {
  icon: typeof ListIcon;
  label: string;
  onClick?: () => void;
  collapsed?: boolean;
}) {
  return (
    <button onClick={onClick} title={collapsed ? label : undefined}
      className={`flex w-full items-center gap-3 rounded-lg py-2 text-sm text-slate-600 transition hover:bg-slate-100 ${
        collapsed ? "justify-center px-0" : "px-3"
      }`}>
      <Icon className="h-5 w-5 shrink-0 text-slate-400" />
      {!collapsed && label}
    </button>
  );
}
