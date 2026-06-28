import { projects } from "../data";
import type { Task } from "../types";
import { dueLabel } from "../ui";
import { TrashIcon, UndoIcon } from "../icons";

interface Props {
  trash: Task[];
  today: string;
  onRestore: (id: string) => void;
  onPurge: (id: string) => void;
  onEmpty: () => void;
}

export default function TrashView({
  trash,
  today,
  onRestore,
  onPurge,
  onEmpty,
}: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-800">
          ゴミ箱{" "}
          <span className="font-normal text-slate-400">({trash.length}件)</span>
        </h2>
        <button
          onClick={onEmpty}
          disabled={trash.length === 0}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 disabled:text-slate-300 disabled:hover:bg-transparent"
        >
          ゴミ箱を空にする
        </button>
      </div>

      {trash.length === 0 ? (
        <p className="px-3 py-10 text-center text-sm text-slate-400">
          ゴミ箱は空です
        </p>
      ) : (
        <ul className="space-y-0.5">
          {trash.map((t) => {
            const project = projects.find((p) => p.id === t.project);
            return (
              <li
                key={t.id}
                className="group flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-slate-50"
              >
                <span className="min-w-0 flex-1 truncate text-[15px] text-slate-500">
                  {t.title}
                </span>
                {project && (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    {project.label}
                  </span>
                )}
                <span className="w-24 shrink-0 text-right text-sm text-slate-400">
                  {dueLabel(t.due, today)}
                </span>
                <button
                  onClick={() => onRestore(t.id)}
                  title="元に戻す"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                >
                  <UndoIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onPurge(t.id)}
                  title="完全に削除"
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
