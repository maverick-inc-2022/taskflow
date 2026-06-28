import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

const TABLE_SNIPPET = `\n| 項目 | 内容 |\n| --- | --- |\n| 　 | 　 |\n| 　 | 　 |\n`;

export default function MemoEditor({
  value,
  onChange,
  placeholder = "メモを入力…（Markdown対応）",
  className = "",
}: Props) {
  const [preview, setPreview] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  /** Insert text at the caret (or replace selection). */
  const insert = (snippet: string, selectOffset?: number) => {
    const ta = ref.current;
    if (!ta) {
      onChange(value + snippet);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = value.slice(0, start) + snippet + value.slice(end);
    onChange(next);
    const caret = start + (selectOffset ?? snippet.length);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(caret, caret);
    });
  };

  const tools = [
    { label: "見出し", title: "見出し", onClick: () => insert("## ") },
    { label: "☑", title: "チェックボックス", onClick: () => insert("- [ ] ") },
    { label: "•", title: "箇条書き", onClick: () => insert("- ") },
    { label: "表", title: "表を挿入", onClick: () => insert(TABLE_SNIPPET) },
    {
      label: "🔗",
      title: "リンク",
      onClick: () => insert("[リンクテキスト](https://)", 1),
    },
  ];

  return (
    <div className={className}>
      <div className="mb-1 flex items-center gap-1">
        {!preview &&
          tools.map((t) => (
            <button
              key={t.title}
              type="button"
              title={t.title}
              onClick={t.onClick}
              className="rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
            >
              {t.label}
            </button>
          ))}
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          className="ml-auto rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
        >
          {preview ? "編集" : "プレビュー"}
        </button>
      </div>

      {preview ? (
        <div className="md-preview min-h-[7rem] rounded-lg border border-slate-200 bg-white p-3">
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <span className="text-sm text-slate-400">（メモは空です）</span>
          )}
        </div>
      ) : (
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          className="h-32 w-full resize-none rounded-lg border border-transparent bg-slate-50 p-3 text-sm leading-7 text-slate-700 outline-none focus:border-blue-300 focus:bg-white"
        />
      )}
    </div>
  );
}
