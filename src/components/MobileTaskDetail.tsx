import { useState, useRef, useEffect } from "react";
import type { Task } from "../types";

interface Props {
  task: Task;
  onChangeNotes: (notes: string) => void;
  onChangeTitle: (title: string) => void;
  onClose: () => void;
}

export default function MobileTaskDetail({ task, onChangeNotes, onChangeTitle, onClose }: Props) {
  const [notes, setNotes] = useState(task.notes ?? "");
  const [title, setTitle] = useState(task.title);
  const savedRef = useRef(false);

  const save = () => {
    if (savedRef.current) return;
    savedRef.current = true;
    onChangeNotes(notes);
    if (title.trim() && title.trim() !== task.title) onChangeTitle(title.trim());
  };

  const handleClose = () => { save(); onClose(); };

  // Save when navigating away without pressing back
  useEffect(() => () => { save(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="md:hidden fixed inset-0 z-50 flex flex-col bg-white"
      style={{ height: "100dvh", overscrollBehavior: "none" }}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-white px-4"
        style={{ paddingTop: "env(safe-area-inset-top, 12px)", paddingBottom: "12px" }}>
        <button
          onClick={handleClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 active:bg-slate-100"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 bg-transparent text-base font-semibold text-slate-800 outline-none placeholder:text-slate-300"
          style={{ fontSize: "16px" }}
          placeholder="タスク名"
        />

        <button
          onClick={handleClose}
          className="shrink-0 rounded-full bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white active:bg-blue-700"
        >
          保存
        </button>
      </div>

      {/* Notes area — fills remaining space, shrinks when keyboard opens */}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="メモを入力…"
        autoCorrect="on"
        spellCheck
        className="flex-1 w-full resize-none bg-white px-4 py-4 text-slate-700 outline-none placeholder:text-slate-300"
        style={{ fontSize: "16px", lineHeight: "1.7" }}
      />
    </div>
  );
}
