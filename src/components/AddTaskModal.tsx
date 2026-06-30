import { useEffect, useRef, useState } from "react";
import { TODAY, projectColorOptions } from "../data";
import type { Person, Priority, Project, ProjectId, RepeatConfig, RepeatMode, Task } from "../types";
import { XIcon } from "../icons";
import { priorityMeta } from "../ui";
import { AvatarDisplay, AvatarPicker, DEFAULT_AVATAR } from "../avatarIcons";
import CustomRepeatModal from "./CustomRepeatModal";

interface Props {
  onClose: () => void;
  onAdd: (task: Omit<Task, "id" | "done" | "starred">) => void;
  projects: Project[];
  people: Person[];
  onAddPerson?: (name: string, avatar: string) => void;
  onAddProject?: (label: string, color: string) => void;
  defaultRepeat?: RepeatMode;
}

export default function AddTaskModal({ onClose, onAdd, projects, people, onAddPerson, onAddProject, defaultRepeat }: Props) {
  const [title, setTitle] = useState("");
  const [project, setProject] = useState<ProjectId>("");
  const [due, setDue] = useState(TODAY);
  const [dueTime, setDueTime] = useState("");
  const [priority, setPriority] = useState<Priority>("mid");
  const [owner, setOwner] = useState<string | undefined>(people.find((p) => p.id === "me")?.id);
  const [repeat, setRepeat] = useState<RepeatMode>(defaultRepeat ?? "none");
  const [repeatConfig, setRepeatConfig] = useState<RepeatConfig>({ interval: 1, unit: "week", daysOfWeek: [], endType: "none" });
  const [showCustomRepeat, setShowCustomRepeat] = useState(false);

  // Owner picker
  const [showOwner, setShowOwner] = useState(false);
  const ownerRef = useRef<HTMLDivElement>(null);
  const [addingPerson, setAddingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonAvatar, setNewPersonAvatar] = useState(DEFAULT_AVATAR);

  // Project add
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectLabel, setNewProjectLabel] = useState("");
  const [newProjectColor, setNewProjectColor] = useState("bg-blue-500");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!showOwner) return;
    const handler = (e: MouseEvent) => {
      if (!ownerRef.current?.contains(e.target as Node)) {
        setShowOwner(false);
        setAddingPerson(false);
        setNewPersonName("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showOwner]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title: title.trim(), project, due, dueTime: dueTime || undefined, priority, owner, repeat: repeat !== "none" ? repeat : undefined, repeatConfig: repeat === "custom" ? repeatConfig : undefined });
    onClose();
  };

  const ownerPerson = people.find((p) => p.id === owner);

  const fieldClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white";

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="animate-slide-up w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">タスクを追加</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* タスク名 */}
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-slate-600">タスク名</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 提案書の作成"
            className={fieldClass}
          />
        </label>

        {/* プロジェクト */}
        <div className="mb-4">
          <span className="mb-1 block text-sm font-medium text-slate-600">プロジェクト</span>
          {!addingProject ? (
            <div className="flex gap-2">
              <select value={project} onChange={(e) => setProject(e.target.value)} className={`${fieldClass} flex-1`}>
                <option value="">未割当</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              {onAddProject && (
                <button type="button" onClick={() => setAddingProject(true)}
                  className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition">
                  ＋
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-blue-300 bg-blue-50 p-3 space-y-2">
              <input
                autoFocus
                value={newProjectLabel}
                onChange={(e) => setNewProjectLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); }
                  if (e.key === "Escape") { setAddingProject(false); setNewProjectLabel(""); }
                }}
                placeholder="プロジェクト名"
                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400 bg-white"
              />
              <div className="flex flex-wrap gap-1.5">
                {projectColorOptions.map((c) => (
                  <button key={c} type="button" onClick={() => setNewProjectColor(c)}
                    className={`h-5 w-5 rounded-full ${c} transition hover:scale-110 ${newProjectColor === c ? "ring-2 ring-offset-1 ring-slate-400" : ""}`} />
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setAddingProject(false); setNewProjectLabel(""); }}
                  className="flex-1 rounded-md border border-slate-200 py-1 text-xs text-slate-500 hover:bg-white transition">
                  キャンセル
                </button>
                <button type="button" disabled={!newProjectLabel.trim()}
                  onClick={() => {
                    if (!newProjectLabel.trim()) return;
                    onAddProject!(newProjectLabel.trim(), newProjectColor);
                    setAddingProject(false);
                    setNewProjectLabel("");
                  }}
                  className="flex-1 rounded-md bg-blue-600 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition">
                  追加
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 担当者 */}
        <div className="mb-4">
          <span className="mb-1 block text-sm font-medium text-slate-600">担当者</span>
          <div ref={ownerRef} className="relative">
            <button type="button" onClick={() => { setShowOwner((v) => !v); setAddingPerson(false); }}
              className="flex w-full items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition text-left">
              {ownerPerson
                ? <><AvatarDisplay avatar={ownerPerson.avatar} name={ownerPerson.name} size={22} />{ownerPerson.name.replace("（自分）", "")}</>
                : <><span className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-300 text-xs">?</span><span className="text-slate-400">未割当</span></>}
              <svg className="ml-auto h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            {showOwner && (
              <div className="absolute left-0 top-full z-40 mt-1 w-full rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                {!addingPerson ? (
                  <>
                    <button onClick={() => { setOwner(undefined); setShowOwner(false); }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 ${!owner ? "font-semibold text-blue-600" : "text-slate-500"}`}>
                      未割当
                    </button>
                    {people.map((p) => (
                      <button key={p.id} onClick={() => { setOwner(p.id); setShowOwner(false); }}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 ${owner === p.id ? "font-semibold text-blue-600" : "text-slate-700"}`}>
                        <AvatarDisplay avatar={p.avatar} name={p.name} size={22} />
                        {p.name.replace("（自分）", "")}
                      </button>
                    ))}
                    {onAddPerson && (
                      <div className="border-t border-slate-100 mt-1 pt-1">
                        <button onClick={() => setAddingPerson(true)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                          <span className="text-base leading-none">＋</span> 担当者を追加
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-3 space-y-2">
                    <input
                      autoFocus
                      value={newPersonName}
                      onChange={(e) => setNewPersonName(e.target.value)}
                      placeholder="名前"
                      className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400"
                    />
                    <AvatarPicker value={newPersonAvatar} onChange={setNewPersonAvatar} />
                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={() => { setAddingPerson(false); setNewPersonName(""); setNewPersonAvatar(DEFAULT_AVATAR); }}
                        className="flex-1 rounded-md border border-slate-200 py-1 text-xs text-slate-500 hover:bg-slate-50 transition">
                        キャンセル
                      </button>
                      <button type="button" disabled={!newPersonName.trim()}
                        onClick={() => {
                          if (!newPersonName.trim()) return;
                          onAddPerson!(newPersonName.trim(), newPersonAvatar);
                          setAddingPerson(false);
                          setNewPersonName("");
                          setNewPersonAvatar(DEFAULT_AVATAR);
                          setShowOwner(false);
                        }}
                        className="flex-1 rounded-md bg-blue-600 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition">
                        追加
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 期限 */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">期限日</span>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={fieldClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">時刻 (任意)</span>
            <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className={fieldClass} />
          </label>
        </div>

        {/* 繰り返し */}
        <div className="mb-4">
          <span className="mb-1 block text-sm font-medium text-slate-600">繰り返し</span>
          <select
            value={repeat}
            onChange={(e) => {
              const val = e.target.value as RepeatMode;
              if (val === "custom") { setShowCustomRepeat(true); }
              else { setRepeat(val); }
            }}
            className={fieldClass}
          >
            <option value="none">繰り返しなし</option>
            <option value="daily">毎日</option>
            <option value="weekly">毎週</option>
            <option value="monthly">毎月</option>
            <option value="yearly">毎年</option>
            <option value="custom">カスタム…</option>
          </select>
          {repeat === "custom" && (
            <p className="mt-1 text-xs text-blue-600 cursor-pointer hover:underline" onClick={() => setShowCustomRepeat(true)}>
              カスタム設定を編集
            </p>
          )}
        </div>
        {showCustomRepeat && (
          <CustomRepeatModal
            due={due}
            repeat={repeat}
            repeatConfig={repeatConfig}
            onChange={(r, cfg) => { setRepeat(r); if (cfg) setRepeatConfig(cfg); }}
            onClose={() => setShowCustomRepeat(false)}
          />
        )}

        {/* 優先度 */}
        <div className="mb-6">
          <span className="mb-1 block text-sm font-medium text-slate-600">優先度</span>
          <div className="flex gap-2">
            {(Object.keys(priorityMeta) as Priority[]).map((p) => (
              <button key={p} type="button" onClick={() => setPriority(p)}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                  priority === p ? "border-blue-500 bg-blue-50 text-blue-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                }`}>
                {priorityMeta[p].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            キャンセル
          </button>
          <button type="submit" disabled={!title.trim()}
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-40">
            追加する
          </button>
        </div>
      </form>
    </div>
  );
}
