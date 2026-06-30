import { useRef, useState } from "react";
import type { Project, ProjectId } from "../types";
import { TODAY } from "../data";

interface Props {
  onAdd: (title: string, project: ProjectId, due: string) => void;
  projects: Project[];
  defaultProject?: ProjectId;
}

/**
 * Google Tasks-style always-visible add row.
 * Clicking anywhere on the row instantly positions the cursor in the title input.
 * Press Enter (or blur after typing) to commit; Escape to clear.
 */
export default function QuickAddRow({ onAdd, projects, defaultProject = "" }: Props) {
  const [title, setTitle] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    const t = title.trim();
    if (t) onAdd(t, defaultProject, TODAY);
    setTitle("");
    // keep focus so user can add the next task immediately
    inputRef.current?.focus();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    if (e.key === "Escape") { setTitle(""); inputRef.current?.blur(); }
  };

  return (
    <div
      className="flex cursor-text items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-slate-50"
      onClick={() => inputRef.current?.focus()}
    >
      {/* ＋ icon — same slot as the circle checkbox */}
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-slate-400 transition group-focus-within:border-blue-400">
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>

      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); commit(); }}
        onKeyDown={handleKey}
        placeholder="タスクを追加…"
        className="flex-1 border-0 bg-transparent text-[15px] text-slate-500 outline-none placeholder:text-slate-400 focus:text-slate-800 focus:placeholder:text-slate-300"
        style={{ fontSize: "16px" }}
      />

      {/* show subtle Enter hint when typing */}
      {focused && title.trim() && (
        <span className="shrink-0 text-[11px] text-slate-300 select-none">Enter で追加</span>
      )}
    </div>
  );
}
