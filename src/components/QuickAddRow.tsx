import { useRef, useState } from "react";
import type { Project, ProjectId } from "../types";
import { TODAY } from "../data";

interface Props {
  onAdd: (title: string, project: ProjectId, due: string) => void;
  projects: Project[];
  defaultProject?: ProjectId;
}

export default function QuickAddRow({ onAdd, projects, defaultProject = "" }: Props) {
  const [title, setTitle] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const committingRef = useRef(false);

  const project = projects.find((p) => p.id === defaultProject);

  const addAndClear = (refocus: boolean) => {
    if (committingRef.current) return;
    const t = title.trim();
    if (!t) return;
    committingRef.current = true;
    onAdd(t, defaultProject, TODAY);
    setTitle("");
    committingRef.current = false;
    if (refocus) inputRef.current?.focus();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); addAndClear(true); }
    if (e.key === "Escape") { setTitle(""); inputRef.current?.blur(); }
  };

  return (
    <div
      className="flex cursor-text items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-slate-50"
      onClick={() => inputRef.current?.focus()}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-slate-400">
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>

      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); addAndClear(false); }}
        onKeyDown={handleKey}
        placeholder="タスクを追加…"
        className="flex-1 border-0 bg-transparent text-[15px] text-slate-500 outline-none placeholder:text-slate-400 focus:text-slate-800 focus:placeholder:text-slate-300"
        style={{ fontSize: "16px" }}
      />

      {/* Project badge — visible when a default project is set */}
      {project && !focused && (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
          <span className={`h-1.5 w-1.5 rounded-full ${project.color}`} />
          {project.label}
        </span>
      )}

      {focused && title.trim() && (
        <span className="shrink-0 text-[11px] text-slate-300 select-none">Enter で追加</span>
      )}
    </div>
  );
}
