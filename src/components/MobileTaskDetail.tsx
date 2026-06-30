import { useState, useRef, useEffect } from "react";
import type { NoteMemo, Task } from "../types";
import { memosToPlainText, applyPlainTextToMemos } from "../memoText";

interface Props {
  task: Task;
  onChangeMemos: (memos: NoteMemo[]) => void;
  onChangeTitle: (title: string) => void;
  onClose: () => void;
}

export default function MobileTaskDetail({ task, onChangeMemos, onChangeTitle, onClose }: Props) {
  // Mobile edits the same data as the desktop rich editor — the first memo,
  // shown/edited here as plain text.
  const [initialText] = useState(() => memosToPlainText(task.memos));
  const [notes, setNotes] = useState(initialText);
  const [title, setTitle] = useState(task.title);
  const containerRef = useRef<HTMLDivElement>(null);

  // Always-current save fn. Kept in a ref so the unmount cleanup below saves
  // the LATEST values rather than a stale closure from first render. Saving is
  // idempotent, so calling it from both a button and unmount is harmless.
  const saveRef = useRef<() => void>(() => {});
  saveRef.current = () => {
    if (notes !== initialText) onChangeMemos(applyPlainTextToMemos(task.memos, notes));
    const t = title.trim();
    if (t && t !== task.title) onChangeTitle(t);
  };

  const handleClose = () => { saveRef.current(); onClose(); };

  // ── Keep the editor pinned to the *visible* viewport so the on-screen
  //    keyboard never pushes the whole page around. The header stays put;
  //    only the textarea's own content scrolls. ───────────────────────────
  useEffect(() => {
    // This overlay only exists on mobile (md:hidden). On desktop the element is
    // display:none, so skip the body-scroll lock & viewport wiring entirely.
    if (window.matchMedia("(min-width: 768px)").matches) return;

    const vv = window.visualViewport;

    const sync = () => {
      const el = containerRef.current;
      if (!el || !vv) return;
      // Size the overlay to exactly the area the keyboard leaves visible…
      el.style.height = `${vv.height}px`;
      // …and hold it against the top of that visible area.
      el.style.transform = `translateY(${vv.offsetTop}px)`;
    };

    sync();
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);

    // Freeze the page behind the overlay so iOS can't scroll it under us.
    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      body.style.overflow = prevOverflow;
      saveRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="md:hidden fixed top-0 left-0 right-0 z-50 flex flex-col bg-white"
      style={{ height: "100dvh", overscrollBehavior: "none" }}
    >
      {/* Header — never moves */}
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 bg-white px-3 pt-3 pb-3">
        <button
          onClick={handleClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 active:bg-slate-100"
          aria-label="戻る"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="min-w-0 flex-1 bg-transparent font-semibold text-slate-800 outline-none placeholder:text-slate-300"
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

      {/* Notes — fills the rest; only this area scrolls */}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="メモを入力…"
        autoCorrect="on"
        spellCheck
        className="min-h-0 flex-1 w-full resize-none bg-white px-4 py-4 text-slate-700 outline-none placeholder:text-slate-300"
        style={{ fontSize: "16px", lineHeight: "1.7" }}
      />
    </div>
  );
}
