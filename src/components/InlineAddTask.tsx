import { useEffect, useRef, useState } from "react";
import { AvatarDisplay, AvatarPicker, DEFAULT_AVATAR } from "../avatarIcons";
import { projectColorOptions } from "../data";
import type { NoteMemo, Person, Priority, Project, ProjectId, RepeatConfig, RepeatMode } from "../types";
import { priorityMeta } from "../ui";
import { RepeatSelector } from "./CustomRepeatModal";

export interface InlineCommitData {
  title: string;
  project: ProjectId;
  due: string;
  dueTime?: string;
  priority: Priority;
  owner?: string;
  repeat?: RepeatMode;
  memos?: NoteMemo[];
}

interface Props {
  onCommit: (data: InlineCommitData) => void;
  onCancel: () => void;
  projects: Project[];
  people: Person[];
  defaultProject?: ProjectId;
  defaultDue?: string;
  today: string;
  memos: NoteMemo[];
  onChangeMemos: (m: NoteMemo[]) => void;
  onAddPerson?: (name: string, avatar: string) => void;
  onAddProject?: (label: string, color: string) => void;
}

export default function InlineAddTask({
  onCommit, onCancel, projects, people,
  defaultProject, defaultDue, today,
  memos, onChangeMemos: _onChangeMemos,
  onAddPerson, onAddProject,
}: Props) {
  const [title, setTitle] = useState("");
  const [project, setProject] = useState<ProjectId>(defaultProject ?? "");
  const [due, setDue] = useState(defaultDue ?? today);
  const [dueTime, setDueTime] = useState("");
  const [priority, setPriority] = useState<Priority>("mid");
  const [repeat, setRepeat] = useState<RepeatMode>("none");
  const [repeatConfig, setRepeatConfig] = useState<RepeatConfig>({ interval: 1, unit: "week", daysOfWeek: [], endType: "none" });
  const [owner, setOwner] = useState<string | undefined>(people.find((p) => p.id === "me")?.id);

  // Owner picker
  const [showOwner, setShowOwner] = useState(false);
  const [addingPerson, setAddingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [newPersonAvatar, setNewPersonAvatar] = useState(DEFAULT_AVATAR);
  const ownerRef = useRef<HTMLDivElement>(null);

  // Project picker
  const [showProject, setShowProject] = useState(false);
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectLabel, setNewProjectLabel] = useState("");
  const [newProjectColor, setNewProjectColor] = useState("bg-blue-500");
  const projectRef = useRef<HTMLDivElement>(null);

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  useEffect(() => {
    if (!showProject) return;
    const handler = (e: MouseEvent) => {
      if (!projectRef.current?.contains(e.target as Node)) {
        setShowProject(false);
        setAddingProject(false);
        setNewProjectLabel("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showProject]);

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

  const commit = () => {
    const t = title.trim();
    if (!t) { onCancel(); return; }
    onCommit({ title: t, project, due, dueTime: dueTime || undefined, priority, owner, repeat: repeat !== "none" ? repeat : undefined, memos: memos.length ? memos : undefined });
  };

  const ownerPerson = people.find((p) => p.id === owner);

  return (
    <div className="mx-0.5 my-1 rounded-2xl border border-blue-300 bg-blue-50 shadow-lg ring-1 ring-blue-100">
      {/* Main row */}
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="h-5 w-5 shrink-0 rounded-[5px] border-2 border-dashed border-slate-300" />

        {/* Project — w-28 to match task row, custom dropdown */}
        <div ref={projectRef} className="relative w-28 shrink-0">
          <button type="button" onClick={() => { setShowProject((v) => !v); setAddingProject(false); }}
            className="flex w-full items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-sm font-semibold text-slate-600 hover:border-blue-400 transition">
            {project ? (
              <><span className={`h-2 w-2 shrink-0 rounded-full ${projects.find((p) => p.id === project)?.color ?? "bg-slate-300"}`} /><span className="truncate">{projects.find((p) => p.id === project)?.label}</span></>
            ) : (
              <><span className="h-2 w-2 shrink-0 rounded-full bg-slate-300" /><span className="truncate text-slate-400">未割当</span></>
            )}
          </button>
          {showProject && (
            <div className="absolute left-0 top-8 z-50 min-w-[180px] rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
              {!addingProject ? (
                <>
                  <button onClick={() => { setProject(""); setShowProject(false); }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 ${!project ? "font-semibold text-blue-600" : "text-slate-500"}`}>
                    <span className="h-2 w-2 rounded-full bg-slate-300" /> 未割当
                  </button>
                  {projects.map((p) => (
                    <button key={p.id} onClick={() => { setProject(p.id); setShowProject(false); }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 ${project === p.id ? "font-semibold text-blue-600" : "text-slate-700"}`}>
                      <span className={`h-2 w-2 rounded-full ${p.color}`} /> {p.label}
                    </button>
                  ))}
                  {onAddProject && (
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button onClick={() => setAddingProject(true)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                        <span className="text-base leading-none">＋</span> プロジェクトを追加
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-3 space-y-2">
                  <input autoFocus value={newProjectLabel} onChange={(e) => setNewProjectLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Escape") { setAddingProject(false); setNewProjectLabel(""); } }}
                    placeholder="プロジェクト名"
                    className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400" />
                  <div className="flex flex-wrap gap-1.5">
                    {projectColorOptions.map((c) => (
                      <button key={c} type="button" onClick={() => setNewProjectColor(c)}
                        className={`h-5 w-5 rounded-full ${c} transition hover:scale-110 ${newProjectColor === c ? "ring-2 ring-offset-1 ring-slate-400" : ""}`} />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setAddingProject(false); setNewProjectLabel(""); }}
                      className="flex-1 rounded-md border border-slate-200 py-1 text-xs text-slate-500 hover:bg-slate-50 transition">キャンセル</button>
                    <button type="button" disabled={!newProjectLabel.trim()}
                      onClick={() => {
                        if (!newProjectLabel.trim()) return;
                        onAddProject!(newProjectLabel.trim(), newProjectColor);
                        setAddingProject(false); setNewProjectLabel(""); setShowProject(false);
                      }}
                      className="flex-1 rounded-md bg-blue-600 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition">追加</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Title — flex-1 to fill remaining space */}
        <input
          ref={titleRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); commit(); }
            if (e.key === "Escape") { e.preventDefault(); onCancel(); }
          }}
          placeholder="タスク名を入力…"
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-300"
        />

        {/* Owner — w-36 to match task row, hidden on mobile */}
        <div ref={ownerRef} className="relative hidden sm:block w-36 shrink-0">
          <button type="button" onClick={() => { setShowOwner((v) => !v); setAddingPerson(false); }}
            className="flex w-full items-center gap-1.5 rounded-lg py-1 px-1 text-sm text-slate-600 hover:bg-white/60 transition">
            {ownerPerson
              ? <><AvatarDisplay avatar={ownerPerson.avatar} name={ownerPerson.name} size={22} /><span className="truncate">{ownerPerson.name.replace("（自分）", "")}</span></>
              : <><span className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-300 text-xs">?</span><span className="text-slate-400">未割当</span></>}
          </button>
          {showOwner && (
            <div className="absolute left-0 top-9 z-50 min-w-[200px] rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
              {!addingPerson ? (
                <>
                  <button onClick={() => { setOwner(undefined); setShowOwner(false); }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 ${!owner ? "font-semibold text-blue-600" : "text-slate-500"}`}>
                    未割当
                  </button>
                  {people.map((p) => (
                    <button key={p.id} onClick={() => { setOwner(p.id); setShowOwner(false); }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 ${owner === p.id ? "font-semibold text-blue-600" : "text-slate-700"}`}>
                      <AvatarDisplay avatar={p.avatar} name={p.name} size={20} />
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
                  <input autoFocus value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)}
                    placeholder="名前" className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-400" />
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
                        setAddingPerson(false); setNewPersonName(""); setNewPersonAvatar(DEFAULT_AVATAR); setShowOwner(false);
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

        {/* Due date + time — w-52 to match task row, hidden on mobile */}
        <div className="hidden sm:flex w-52 shrink-0 items-center gap-1">
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)}
            className="flex-1 rounded-md border border-slate-200 px-1 py-0.5 text-xs text-slate-600 outline-none focus:border-blue-400 bg-white" />
          <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)}
            className="w-20 rounded-md border border-slate-200 px-1 py-0.5 text-xs text-slate-600 outline-none focus:border-blue-400 bg-white" />
        </div>

        {/* Priority — w-20 to match task row */}
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          className="w-20 shrink-0 rounded-md border border-slate-200 px-1 py-0.5 text-sm font-semibold text-slate-600 outline-none focus:border-blue-400 bg-white text-center"
        >
          {(Object.keys(priorityMeta) as Priority[]).map((p) => (
            <option key={p} value={p}>{priorityMeta[p].label}</option>
          ))}
        </select>
      </div>

      {/* Mobile-only: due date row */}
      <div className="sm:hidden flex items-center gap-2 border-t border-blue-100 px-4 py-2">
        <span className="text-xs text-slate-400">期限</span>
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)}
          className="flex-1 rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-600 outline-none focus:border-blue-400 bg-white" />
        <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)}
          className="w-20 rounded-md border border-slate-200 px-1 py-0.5 text-xs text-slate-600 outline-none focus:border-blue-400 bg-white" />
      </div>

      {/* Action row with repeat */}
      <div className="flex items-center justify-between border-t border-blue-100 px-4 py-2">
        <RepeatSelector
          due={due}
          repeat={repeat}
          repeatConfig={repeatConfig}
          onChange={(r, cfg) => { setRepeat(r); if (cfg) setRepeatConfig(cfg); }}
        />
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-white/60 transition">
            キャンセル
          </button>
          <button type="button" onClick={commit} disabled={!title.trim()}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition">
            追加
          </button>
        </div>
      </div>
    </div>
  );
}
