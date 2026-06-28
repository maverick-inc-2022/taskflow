import { EditIcon } from "../icons";
import MemoEditor from "./MemoEditor";

interface Props {
  notes: string;
  onChange: (v: string) => void;
}

export default function NotesPanel({ notes, onChange }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-800">メモ</h2>
        <EditIcon className="h-4 w-4 text-slate-400" />
      </div>
      <MemoEditor
        value={notes}
        onChange={onChange}
        placeholder="メモを入力…（チェックボックス・表・リンク対応）"
      />
    </section>
  );
}
