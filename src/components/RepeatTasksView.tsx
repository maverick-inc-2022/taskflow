import { AvatarDisplay } from "../avatarIcons";
import { people as staticPeople, projects as staticProjects } from "../data";
import type { Person, Project, Task } from "../types";
import { priorityMeta, repeatLabel } from "../ui";
import { EditableProject, EditableOwner, EditableRepeat, EditablePriority, EditableTitle } from "./InlineEditors";

interface Props {
  tasks: Task[];
  trashedTasks: Task[];
  today: string;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onUpdateTask: (id: string, patch: Partial<Task>) => void;
  onAddPerson?: (name: string, avatar: string) => void;
  onAddProject?: (label: string, color: string) => void;
  projects?: Project[];
  people?: Person[];
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

function RepeatIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 ${className}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 1l4 4-4 4"/>
      <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
      <path d="M7 23l-4-4 4-4"/>
      <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  );
}

export default function RepeatTasksView({
  tasks,
  trashedTasks,
  today,
  onDelete,
  onRestore,
  onUpdateTask,
  onAddPerson,
  onAddProject,
  projects: propProjects,
  people: propPeople,
}: Props) {
  const projects = propProjects ?? staticProjects;
  const people   = propPeople  ?? staticPeople;

  const renderRow = (t: Task) => {

    return (
      <div key={t.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50">
        {/* Trash button */}
        <button
          onClick={() => onDelete(t.id)}
          title="削除"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-red-50 hover:text-red-400"
        >
          <TrashIcon />
        </button>

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

        {/* Priority */}
        <div className="w-16 shrink-0 text-right" onClick={(e) => e.stopPropagation()}>
          <EditablePriority task={t} onSave={(v) => onUpdateTask(t.id, { priority: v })} />
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
          <span className="w-16 shrink-0 text-right">優先度</span>
        </div>

        {tasks.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-slate-300">
            繰り返し設定されたタスクはありません
          </div>
        ) : (
          <div className="divide-y divide-slate-50 px-1 py-1">
            {tasks.map(renderRow)}
          </div>
        )}
      </section>

      {/* Deleted / trashed section */}
      {trashedTasks.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
            <TrashIcon />
            <span className="text-sm font-semibold text-slate-500">削除済み</span>
            <span className="text-xs text-slate-400">({trashedTasks.length}件)</span>
          </div>
          <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {trashedTasks.map((t) => {
              const proj   = projects.find((p) => p.id === t.project);
              const owner  = people.find((p) => p.id === t.owner);
              const rLabel = repeatLabel(t.repeat, t.repeatConfig);
              const pr     = priorityMeta[t.priority];
              return (
                <div key={t.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  {/* Top: project + priority */}
                  <div className="flex items-center gap-1.5">
                    {proj && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-500 border border-slate-200">
                        <span className={`h-1.5 w-1.5 rounded-full ${proj.color}`} />
                        {proj.label}
                      </span>
                    )}
                    <span className={`ml-auto inline-flex h-5 w-6 items-center justify-center rounded text-[10px] font-semibold ${pr.className}`}>
                      {pr.label}
                    </span>
                  </div>

                  {/* Title */}
                  <p className="text-sm text-slate-500 line-through">{t.title}</p>

                  {/* Repeat + owner */}
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs text-violet-500">
                      <RepeatIcon className="text-violet-400" />
                      {rLabel}
                    </span>
                    {owner && (
                      <span className="ml-auto flex items-center gap-1">
                        <AvatarDisplay avatar={owner.avatar} name={owner.name} size={16} />
                        <span className="text-[10px] text-slate-400">{owner.name.replace("（自分）", "")}</span>
                      </span>
                    )}
                  </div>

                  {/* Restore button */}
                  <button
                    onClick={() => onRestore(t.id)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white py-1 text-xs font-medium text-slate-500 transition hover:border-blue-300 hover:text-blue-600"
                  >
                    復元
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
