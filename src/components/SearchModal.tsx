import { useEffect, useMemo, useRef, useState } from "react";
import { projects } from "../data";
import type { Task } from "../types";
import { dueLabel } from "../ui";
import { SearchIcon, XIcon } from "../icons";

interface Props {
  tasks: Task[];
  today: string;
  onClose: () => void;
  onSelect: (id: string) => void;
}

export default function SearchModal({ tasks, today, onClose, onSelect }: Props) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return tasks.slice(0, 8);
    return tasks
      .filter((t) => {
        const proj = projects.find((p) => p.id === t.project)?.label ?? "";
        return (
          t.title.toLowerCase().includes(s) ||
          (t.notes ?? "").toLowerCase().includes(s) ||
          proj.includes(s)
        );
      })
      .slice(0, 12);
  }, [q, tasks]);

  const choose = (id?: string) => {
    if (!id) return;
    onSelect(id);
    onClose();
  };

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-slide-up w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-4">
          <SearchIcon className="h-5 w-5 text-slate-400" />
          <input
            ref={ref}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                choose(results[active]?.id);
              }
            }}
            placeholder="タスクを検索…"
            className="flex-1 py-4 text-base outline-none placeholder:text-slate-400"
          />
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <ul className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-slate-400">
              「{q}」に一致するタスクはありません
            </li>
          ) : (
            results.map((t, i) => {
              const proj = projects.find((p) => p.id === t.project);
              return (
                <li key={t.id}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(t.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${
                      i === active ? "bg-blue-50" : "hover:bg-slate-50"
                    }`}
                  >
                    {proj && (
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${proj.color}`} />
                    )}
                    <span
                      className={`min-w-0 flex-1 truncate text-sm ${
                        t.done ? "text-slate-400 line-through" : "text-slate-700"
                      }`}
                    >
                      {t.title}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {dueLabel(t.due, today)}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <div className="flex items-center gap-3 border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
          <kbd className="rounded border border-slate-200 px-1.5 py-0.5">↑↓</kbd>
          移動
          <kbd className="rounded border border-slate-200 px-1.5 py-0.5">Enter</kbd>
          開く
          <kbd className="rounded border border-slate-200 px-1.5 py-0.5">Esc</kbd>
          閉じる
        </div>
      </div>
    </div>
  );
}
