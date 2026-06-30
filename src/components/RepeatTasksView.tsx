import { useState } from "react";
import { people as staticPeople, projects as staticProjects } from "../data";
import type { Person, Project, Task } from "../types";
import { EditableProject, EditableOwner, EditableRepeat, EditableTitle } from "./InlineEditors";

interface Props {
  tasks: Task[];
  today: string;
  onDelete: (id: string) => void;
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
  onAddPerson?: (name: string, avatar: string) => void;
  onAddProject?: (label: string, color: string) => void;
  projects?: Project[];
  people?: Person[];
  onAddTask?: () => void;
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

export default function RepeatTasksView({
  tasks,
  today,
  onDelete,
  onUpdateTask,
  onAddPerson,
  onAddProject,
  projects: propProjects,
  people: propPeople,
  onAddTask,
}: Props) {
  const projects = propProjects ?? staticProjects;
  const people   = propPeople  ?? staticPeople;
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const renderRow = (t: Task) => {

    return (
      <div key={t.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50">
        {/* Trash button — repeat tasks are deleted permanently, so confirm first */}
        {confirmId === t.id ? (
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => { onDelete(t.id); setConfirmId(null); }}
              className="rounded-md bg-red-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-600"
            >
              削除
            </button>
            <button
              onClick={() => setConfirmId(null)}
              className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-200"
            >
              取消
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmId(t.id)}
            title="削除"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-400"
          >
            <TrashIcon />
          </button>
        )}

        {/* Project */}
        <div className="w-28 shrink-0" onClick={(e) => e.stopPropagation()}>
          <EditableProject
            task={t}
            projects={projects}
            onSave={(v) => onUpdateTask(t.id, { project: v })}
            onAddProject={onAddProject}
          />
        </div>

        {/* Title */}
        <div className="min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
          <EditableTitle task={t} onSave={(v) => onUpdateTask(t.id, { title: v })} />
        </div>

        {/* Owner */}
        <div className="w-36 shrink-0" onClick={(e) => e.stopPropagation()}>
          <EditableOwner
            task={t}
            people={people}
            onSave={(v) => onUpdateTask(t.id, { owner: v })}
            onAddPerson={onAddPerson}
          />
        </div>

        {/* Repeat setting — click opens repeat+due picker */}
        <div className="w-40 shrink-0" onClick={(e) => e.stopPropagation()}>
          <EditableRepeat
            task={t}
            today={today}
            onSave={(due, dueTime, repeat, repeatConfig) =>
              onUpdateTask(t.id, { due, dueTime, repeat, repeatConfig })
            }
          />
        </div>

      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Active repeat tasks */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Column header */}
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-400">
          <span className="w-7 shrink-0" />
          <span className="w-28 shrink-0">プロジェクト</span>
          <span className="flex-1">タスク名</span>
          <span className="w-36 shrink-0">担当者</span>
          <span className="w-40 shrink-0">繰り返し</span>
        </div>

        {tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-12">
            <p className="text-sm text-slate-300">繰り返し設定されたタスクはありません</p>
            {onAddTask && (
              <button
                onClick={onAddTask}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                繰り返しタスクを追加
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-50 px-1 py-1">
            {tasks.map(renderRow)}
          </div>
        )}

        {/* Add button shown at the bottom when tasks exist */}
        {tasks.length > 0 && onAddTask && (
          <div className="border-t border-slate-100 px-3 py-2">
            <button
              onClick={onAddTask}
              className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-50 hover:text-blue-600"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              タスクを追加
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
