import { CopyIcon, EditIcon, TrashIcon, XIcon } from "../icons";

interface Props {
  count: number;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSelectAll: () => void;
  onClear: () => void;
}

export default function BulkActionBar({
  count,
  onEdit,
  onDelete,
  onDuplicate,
  onSelectAll,
  onClear,
}: Props) {
  return (
    <div className="animate-slide-up fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-xl">
      <button
        onClick={onClear}
        className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        aria-label="選択解除"
      >
        <XIcon className="h-5 w-5" />
      </button>
      <span className="px-1 text-sm font-bold text-slate-700">
        {count}件選択中
      </span>
      <button
        onClick={onSelectAll}
        className="rounded-lg px-2 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
      >
        表示中をすべて選択
      </button>
      <span className="mx-1 h-6 w-px bg-slate-200" />
      <button
        onClick={onEdit}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        <EditIcon className="h-4 w-4" />
        一括編集
      </button>
      <button
        onClick={onDuplicate}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        <CopyIcon className="h-4 w-4" />
        複製
      </button>
      <button
        onClick={onDelete}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        <TrashIcon className="h-4 w-4" />
        削除
      </button>
    </div>
  );
}
