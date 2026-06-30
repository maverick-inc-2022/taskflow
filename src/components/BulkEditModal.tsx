import { useState } from "react";
import { people as staticPeople, projects, repeatLabels } from "../data";
import type { Person, ProjectId, RepeatMode, Task } from "../types";
import Modal from "./Modal";

interface Props {
  count: number;
  onApply: (patch: Partial<Task>) => void;
  onClose: () => void;
  people?: Person[];
}

const KEEP = "__keep__";

export default function BulkEditModal({ count, onApply, onClose, people: propPeople }: Props) {
  const people = propPeople ?? staticPeople;
  const [project, setProject] = useState<string>(KEEP);
  const [owner, setOwner] = useState<string>(KEEP);
  const [repeat, setRepeat] = useState<string>(KEEP);
  const [changeDue, setChangeDue] = useState(false);
  const [due, setDue] = useState("");

  const apply = () => {
    const patch: Partial<Task> = {};
    if (project !== KEEP) patch.project = project as ProjectId;
    if (owner !== KEEP) patch.owner = owner;
    if (repeat !== KEEP) patch.repeat = repeat as RepeatMode;
    if (changeDue && due) patch.due = due;
    onApply(patch);
    onClose();
  };

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    options: { value: string; label: string }[],
  ) => (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border px-2 py-2 text-sm outline-none focus:border-blue-400 ${
          value === KEEP
            ? "border-slate-200 text-slate-400"
            : "border-blue-300 text-slate-700"
        }`}
      >
        <option value={KEEP}>変更しない</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <Modal title={`一括編集（${count}件）`} onClose={onClose}>
      <p className="mb-4 text-sm text-slate-500">
        変更したい項目だけ設定してください。「変更しない」の項目はそのまま保持されます。
      </p>

      <div className="grid grid-cols-2 gap-3">
        {field(
          "プロジェクト",
          project,
          setProject,
          projects.map((p) => ({ value: p.id, label: p.label })),
        )}
        {field("今のボール（担当）", owner, setOwner, [
          { value: "", label: "未割り当て" },
          ...people.map((p) => ({ value: p.id, label: p.name })),
        ])}
        {field(
          "繰り返し",
          repeat,
          setRepeat,
          (Object.keys(repeatLabels) as RepeatMode[]).map((r) => ({
            value: r,
            label: repeatLabels[r],
          })),
        )}
      </div>

      <div className="mt-3 rounded-lg border border-slate-200 p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <input
            type="checkbox"
            checked={changeDue}
            onChange={(e) => setChangeDue(e.target.checked)}
            className="h-4 w-4 rounded accent-blue-600"
          />
          期限日を変更する
        </label>
        {changeDue && (
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          キャンセル
        </button>
        <button
          onClick={apply}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {count}件に適用
        </button>
      </div>
    </Modal>
  );
}
