import { useEffect, useRef, useState } from "react";
import { repeatLabels, defaultProjects, people as defaultPeople } from "../data";
import { memosToPlainText, applyPlainTextToMemos } from "../memoText";
import type { NoteMemo, Person, Project, RepeatConfig, RepeatMode, Task } from "../types";
import { dueLabel } from "../ui";
import { StarIcon, XIcon, TrashIcon } from "../icons";
import { AvatarDisplay } from "../avatarIcons";
import CustomRepeatModal from "./CustomRepeatModal";

interface Props {
  task: Task;
  today: string;
  projects?: Project[];
  people?: Person[];
  onAddPerson?: (name: string, avatar: string) => void;
  onUpdate: (patch: Partial<Task>) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
  onStar: (id: string) => void;
  onToggle: (id: string) => void;
}

function CalIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
    </svg>
  );
}
function RepIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  );
}
function FolderIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
function MemoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  );
}


export default function TaskDetailPanel({
  task,
  today,
  projects: propProjects,
  people: propPeople,
  onAddPerson,
  onUpdate,
  onClose,
  onDelete,
  onStar,
  onToggle,
}: Props) {
  const projects = propProjects ?? defaultProjects;
  const people   = propPeople  ?? defaultPeople;
  const project = projects.find((p) => p.id === task.project);

  const [titleDraft, setTitleDraft] = useState(task.title);
  const [memoText, setMemoText] = useState(() => memosToPlainText(task.memos));
  const [newSub, setNewSub] = useState("");
  const [dateEdit, setDateEdit] = useState(false);
  const [timeDraft, setTimeDraft] = useState(task.dueTime ?? "");
  const timeInputRef = useRef<HTMLInputElement>(null);
  const [showCustomRepeat, setShowCustomRepeat] = useState(false);
  const [repeatConfig, setRepeatConfig] = useState(task.repeatConfig ?? { interval: 1, unit: "week" as const, daysOfWeek: [], endType: "none" as const });
  const [ownerOpen, setOwnerOpen] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const ownerRef = useRef<HTMLDivElement>(null);
  const [richMemoOpen, setRichMemoOpen] = useState(false);
  const richEditorRef = useRef<HTMLDivElement>(null);
  const subtasks = task.subtasks ?? [];

  useEffect(() => { setTitleDraft(task.title); }, [task.id, task.title]);
  useEffect(() => { setMemoText(memosToPlainText(task.memos)); }, [task.id]);
  useEffect(() => { setTimeDraft(task.dueTime ?? ""); }, [task.id, task.dueTime]);
  useEffect(() => {
    if (richEditorRef.current) {
      const html = task.memos?.[0]?.html ?? memoText.replace(/\n/g, "<br>");
      richEditorRef.current.innerHTML = html;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const commitTitle = () => {
    const t = titleDraft.trim();
    if (t && t !== task.title) onUpdate({ title: t });
    else setTitleDraft(task.title);
  };

  const commitMemo = () => {
    const newMemos = applyPlainTextToMemos(task.memos, memoText);
    onUpdate({ memos: newMemos });
  };

  const commitRichMemo = () => {
    const html = richEditorRef.current?.innerHTML ?? "";
    const base = task.memos?.[0] ?? { id: "memo1", label: "メモ①", checklist: [], attachments: [] };
    onUpdate({ memos: [{ ...base, html }] });
  };

  const richExec = (cmd: string, val?: string) => {
    richEditorRef.current?.focus();
    document.execCommand(cmd, false, val);
  };

  const dueFmt = (() => {
    if (task.done && task.completedDate) return task.completedDate;
    if (!task.due) return "";
    const d = new Date(task.due + "T00:00:00");
    const wd = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
    return `${d.getMonth() + 1}/${d.getDate()} (${wd})`;
  })();

  return (
    <section
      key={task.id}
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      {/* ── Close button ── */}
      <div className="flex justify-end px-3 pt-3 pb-0">
        <button onClick={onClose} aria-label="閉じる"
          className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      {/* ── Title row ── */}
      <div className="flex items-start gap-2 px-4 pb-4">
        {/* circle checkbox */}
        <button
          onClick={() => onToggle(task.id)}
          aria-label="完了"
          className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90 ${
            task.done ? "border-slate-400 bg-slate-400 text-white" : "border-slate-400 hover:border-blue-500"
          }`}
        >
          {task.done && (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m20 6-11 11-5-5" />
            </svg>
          )}
        </button>

        <textarea
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commitTitle(); (e.target as HTMLTextAreaElement).blur(); }
          }}
          rows={1}
          className="min-h-0 flex-1 resize-none border-0 bg-transparent text-base font-semibold leading-snug text-slate-800 outline-none placeholder:text-slate-300"
          style={{ fontSize: "16px" }}
          onInput={(e) => {
            const el = e.target as HTMLTextAreaElement;
            el.style.height = "auto";
            el.style.height = el.scrollHeight + "px";
          }}
          placeholder="タイトルを追加"
        />

        <button onClick={() => onStar(task.id)} aria-label="スター"
          className={`mt-0.5 shrink-0 p-1 transition ${task.starred ? "text-amber-400" : "text-slate-300 hover:text-amber-400"}`}>
          <StarIcon filled={task.starred} className="h-4 w-4" />
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto border-t border-slate-100">

        {/* 日付 + 時間 + 繰り返し（1行） */}
        <div className="border-b border-slate-100">
          <div className="flex items-center gap-2 px-4 py-3.5">
            <button onClick={() => setDateEdit((v) => !v)} className="shrink-0 text-slate-400 hover:text-blue-500 transition">
              <CalIcon />
            </button>
            <span
              className={`cursor-pointer text-sm ${task.due ? "text-slate-700" : "text-slate-400"} hover:underline`}
              onClick={() => setDateEdit((v) => !v)}
            >
              {task.due ? dueFmt : "日付を追加"}
            </span>
            {task.due && (
              <>
                <button onClick={() => timeInputRef.current?.showPicker()} className="ml-1 shrink-0 text-slate-400 hover:text-blue-500 transition">
                  <ClockIcon />
                </button>
                <input
                  ref={timeInputRef}
                  type="time"
                  value={timeDraft}
                  onChange={(e) => setTimeDraft(e.target.value)}
                  onBlur={(e) => onUpdate({ dueTime: e.target.value || undefined })}
                  className="w-20 border-0 bg-transparent text-sm text-slate-700 outline-none"
                  style={{ colorScheme: "light" }}
                />
              </>
            )}
            <div className="mx-1 h-3.5 w-px shrink-0 bg-slate-200" />
            <RepIcon />
            <select
              value={task.repeat ?? "none"}
              onChange={(e) => {
                const val = e.target.value as RepeatMode;
                if (val === "custom") { setShowCustomRepeat(true); }
                else { onUpdate({ repeat: val }); }
              }}
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-700 outline-none cursor-pointer"
            >
              {(Object.keys(repeatLabels) as RepeatMode[]).map((r) => (
                <option key={r} value={r}>{repeatLabels[r]}</option>
              ))}
            </select>
            {task.due && !task.done && (
              <button
                onClick={(e) => { e.stopPropagation(); onUpdate({ due: "" }); }}
                className="shrink-0 text-slate-300 hover:text-slate-500"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {dateEdit && (
            <div className="px-4 pb-3 bg-slate-50">
              <input
                type="date"
                value={task.due}
                onChange={(e) => { onUpdate({ due: e.target.value }); setDateEdit(false); }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                autoFocus
              />
            </div>
          )}
        </div>
        {showCustomRepeat && (
          <CustomRepeatModal
            due={task.due}
            repeat={task.repeat ?? "none"}
            repeatConfig={repeatConfig}
            onChange={(r, cfg) => {
              const nextCfg = cfg ?? repeatConfig;
              setRepeatConfig(nextCfg);
              onUpdate({ repeat: r, repeatConfig: nextCfg });
            }}
            onClose={() => setShowCustomRepeat(false)}
          />
        )}

        {/* プロジェクト + タスク所有者（横並び） */}
        <div className="relative border-b border-slate-100" ref={ownerRef}>
          <div className="flex items-center px-4 py-3.5">
            {/* プロジェクト */}
            <FolderIcon />
            <select
              value={task.project ?? ""}
              onChange={(e) => onUpdate({ project: e.target.value })}
              className="ml-2 min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-700 outline-none cursor-pointer"
            >
              <option value="">プロジェクトなし</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            {project && <span className={`mx-1 h-2.5 w-2.5 shrink-0 rounded-full ${project.color}`} />}

            {/* セパレータ */}
            <div className="mx-2 h-3.5 w-px shrink-0 bg-slate-200" />

            {/* タスク所有者 */}
            <div
              className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-slate-100 transition"
              onClick={() => setOwnerOpen((v) => !v)}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              {task.owner ? (() => {
                const p = people.find((x) => x.id === task.owner);
                return p ? (
                  <span className="flex items-center gap-1.5 text-sm text-slate-700">
                    <AvatarDisplay avatar={p.avatar} name={p.name} size={18} />
                    <span className="max-w-[80px] truncate">{p.name.replace("（自分）", "")}</span>
                  </span>
                ) : <span className="text-sm text-slate-400">未設定</span>;
              })() : (
                <span className="text-sm text-slate-400">未設定</span>
              )}
              <svg viewBox="0 0 24 24" className="h-3 w-3 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </div>
          </div>

          {ownerOpen && (
            <div className="absolute right-0 z-20 w-52 border border-slate-200 bg-white shadow-lg rounded-xl overflow-hidden">
              {(() => {
                const me = people.find((p) => p.id === "me");
                return me ? (
                  <button
                    onClick={() => { onUpdate({ owner: "me" }); setOwnerOpen(false); }}
                    className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition hover:bg-blue-50 ${task.owner === "me" ? "bg-blue-50 text-blue-600" : "text-slate-700"}`}
                  >
                    <AvatarDisplay avatar={me.avatar} name={me.name} size={22} />
                    <span>自分</span>
                    {task.owner === "me" && <span className="ml-auto text-blue-500">✓</span>}
                  </button>
                ) : null;
              })()}
              {people.filter((p) => p.id !== "me").map((p) => (
                <button
                  key={p.id}
                  onClick={() => { onUpdate({ owner: p.id }); setOwnerOpen(false); }}
                  className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition hover:bg-slate-50 ${task.owner === p.id ? "bg-blue-50 text-blue-600" : "text-slate-700"}`}
                >
                  <AvatarDisplay avatar={p.avatar} name={p.name} size={22} />
                  <span>{p.name}</span>
                  {task.owner === p.id && <span className="ml-auto text-blue-500">✓</span>}
                </button>
              ))}
              {task.owner && (
                <button
                  onClick={() => { onUpdate({ owner: undefined }); setOwnerOpen(false); }}
                  className="flex w-full items-center gap-2.5 border-t border-slate-100 px-4 py-2.5 text-sm text-slate-400 transition hover:bg-slate-50"
                >
                  <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-slate-300 text-xs">×</span>
                  解除
                </button>
              )}
              {onAddPerson && (
                <div className="border-t border-slate-100 px-3 py-2">
                  <div className="flex gap-2">
                    <input
                      value={newPersonName}
                      onChange={(e) => setNewPersonName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newPersonName.trim()) {
                          onAddPerson(newPersonName.trim(), "icon:male-adult:#64748b");
                          setNewPersonName("");
                        }
                      }}
                      placeholder="名前を入力して Enter"
                      className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-400"
                    />
                    <button
                      onClick={() => {
                        if (newPersonName.trim()) {
                          onAddPerson(newPersonName.trim(), "icon:male-adult:#64748b");
                          setNewPersonName("");
                        }
                      }}
                      className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >＋</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* メモ */}
        <div className="border-b border-slate-100">
          {/* ツールバー（隠れてる、ボタンで表示） */}
          {richMemoOpen && (
            <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-100 bg-slate-50 px-2 py-1">
              <select
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => { richEditorRef.current?.focus(); document.execCommand("formatBlock", false, e.target.value); }}
                className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px] text-slate-600"
              >
                <option value="p">本文</option>
                <option value="h3">見出し</option>
                <option value="blockquote">引用</option>
              </select>
              <div className="mx-0.5 h-3.5 w-px bg-slate-300/70" />
              <button onMouseDown={(e) => { e.preventDefault(); richExec("insertUnorderedList"); }}
                className="flex h-6 min-w-[24px] items-center justify-center rounded px-1 text-[11px] font-bold text-slate-600 hover:bg-white transition">•≡</button>
              <button onMouseDown={(e) => { e.preventDefault(); richExec("insertOrderedList"); }}
                className="flex h-6 min-w-[24px] items-center justify-center rounded px-1 text-[11px] font-bold text-slate-600 hover:bg-white transition">1.</button>
              <div className="mx-0.5 h-3.5 w-px bg-slate-300/70" />
              <button onMouseDown={(e) => { e.preventDefault(); richExec("bold"); }}
                className="flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-slate-600 hover:bg-white transition"><b>B</b></button>
              <button onMouseDown={(e) => { e.preventDefault(); richExec("underline"); }}
                className="flex h-6 w-6 items-center justify-center rounded text-xs text-slate-600 hover:bg-white transition"><u>U</u></button>
              <button onMouseDown={(e) => { e.preventDefault(); richExec("italic"); }}
                className="flex h-6 w-6 items-center justify-center rounded text-xs italic text-slate-600 hover:bg-white transition">I</button>
              <div className="mx-0.5 h-3.5 w-px bg-slate-300/70" />
              {["#ef4444","#f97316","#22c55e","#3b82f6","#8b5cf6"].map((c) => (
                <button key={c} onMouseDown={(e) => { e.preventDefault(); richExec("foreColor", c); }}
                  className="h-4 w-4 rounded-full border border-white shadow-sm transition hover:scale-110"
                  style={{ background: c }} />
              ))}
              <button onMouseDown={(e) => { e.preventDefault(); richExec("foreColor", "inherit"); }}
                className="h-4 w-4 rounded-full border border-slate-300 bg-slate-700 transition hover:scale-110" />
            </div>
          )}
          {/* エディタ本体（常に表示） */}
          <div className="flex items-start gap-3 px-4 pt-3.5" style={{ paddingBottom: "0.2rem" }}>
            <MemoIcon />
            <div className="flex-1" />
            <button
              onClick={() => setRichMemoOpen((v) => !v)}
              title={richMemoOpen ? "書式ツールバーを閉じる" : "書式を設定"}
              className={`shrink-0 rounded-md p-1 transition ${richMemoOpen ? "bg-blue-100 text-blue-600" : "text-slate-300 hover:bg-slate-100 hover:text-slate-500"}`}
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>
              </svg>
            </button>
          </div>
          <div
            ref={richEditorRef}
            contentEditable
            suppressContentEditableWarning
            onBlur={commitRichMemo}
            data-placeholder="メモを追加"
            className="note-editor min-h-[14rem] w-full px-4 py-2 pb-4 text-sm text-slate-700 outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:text-slate-500"
            style={{ lineHeight: "1.7" }}
          />
        </div>

        {/* サブタスク */}
        <div className="px-4 py-3">
          <p className="mb-2 text-xs font-semibold text-slate-500">サブタスク</p>

          {/* Subtask list */}
          <div className="space-y-0.5">
            {subtasks.map((s) => (
              <div key={s.id} className="group flex items-center gap-2 rounded-lg py-1.5">
                <button
                  onClick={() => onUpdate({ subtasks: subtasks.map((x) => x.id === s.id ? { ...x, done: !x.done } : x) })}
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${
                    s.done ? "border-slate-400 bg-slate-400 text-white" : "border-slate-400 hover:border-blue-500"
                  }`}
                >
                  {s.done && (
                    <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m20 6-11 11-5-5" />
                    </svg>
                  )}
                </button>
                <span className={`flex-1 text-sm ${s.done ? "text-slate-400 line-through" : "text-slate-700"}`}>{s.title}</span>
                <button
                  onClick={() => onUpdate({ subtasks: subtasks.filter((x) => x.id !== s.id) })}
                  className="shrink-0 text-slate-300 opacity-0 transition hover:text-slate-500 group-hover:opacity-100"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add subtask row — below the list */}
          <div className="mt-1 flex items-center gap-2 py-1.5">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-300 text-slate-400">
              <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <input
              value={newSub}
              onChange={(e) => setNewSub(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newSub.trim()) {
                  const id = `sub${Date.now()}`;
                  onUpdate({ subtasks: [...subtasks, { id, title: newSub.trim(), done: false }] });
                  setNewSub("");
                }
              }}
              placeholder="タスクを追加"
              className="flex-1 border-0 bg-transparent text-sm text-slate-500 outline-none placeholder:text-slate-400"
              style={{ fontSize: "14px" }}
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-slate-100 px-4 py-4">
          {/* 作成日・更新日 */}
          <div className="mb-4 space-y-1.5 rounded-xl bg-slate-50 px-3 py-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>作成日</span>
              <span>{task.createdAt ? new Date(task.createdAt).toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>更新日</span>
              <span>{task.updatedAt ? new Date(task.updatedAt).toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}</span>
            </div>
          </div>
          <button
            onClick={() => onDelete(task.id)}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50"
          >
            <TrashIcon className="h-4 w-4" />
            タスクを削除
          </button>
        </div>
      </div>
    </section>
  );
}
