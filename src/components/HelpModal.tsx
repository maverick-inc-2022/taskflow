import { useState } from "react";
import Modal from "./Modal";
import { KeyboardIcon, SendIcon } from "../icons";

interface Props {
  onClose: () => void;
}

const shortcuts: [string, string][] = [
  ["Ctrl + T", "タスクを追加"],
  ["Ctrl + K", "検索を開く"],
  ["Enter", "ホバー中のタスクの下に追加"],
  ["Esc", "モーダル・パネルを閉じる"],
];

const faqs: [string, string][] = [
  ["Googleカレンダーと同期するには？", "サイドバーの「連携」からGoogleカレンダーを選び、アカウントを認証してください。"],
  ["お気に入りはどこに表示される？", "タスクの☆を押すと、サイドバーの「お気に入り」に表示されます。"],
  ["完了したタスクの並び順は変えられる？", "タイトル横の並び替えアイコンから「日付順／完了順」を切り替えられます。"],
];

export default function HelpModal({ onClose }: Props) {
  const [feedback, setFeedback] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <Modal title="ヘルプ・フィードバック" onClose={onClose} maxW="max-w-lg">
      {/* Shortcuts */}
      <div className="mb-5">
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
          <KeyboardIcon className="h-4 w-4 text-slate-400" />
          キーボードショートカット
        </h3>
        <div className="rounded-xl bg-slate-50 p-3">
          {shortcuts.map(([k, label]) => (
            <div
              key={k}
              className="flex items-center justify-between py-1 text-sm"
            >
              <span className="text-slate-600">{label}</span>
              <kbd className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
                {k}
              </kbd>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="mb-5">
        <h3 className="mb-2 text-sm font-bold text-slate-700">よくある質問</h3>
        <div className="divide-y divide-slate-100">
          {faqs.map(([q, a]) => (
            <details key={q} className="group py-2">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-slate-700">
                {q}
                <span className="text-slate-400 transition group-open:rotate-180">
                  ⌄
                </span>
              </summary>
              <p className="mt-1 text-sm leading-6 text-slate-500">{a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* Feedback */}
      <div>
        <h3 className="mb-2 text-sm font-bold text-slate-700">
          フィードバックを送る
        </h3>
        {sent ? (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            ご意見ありがとうございます！🙏 開発の参考にさせていただきます。
          </p>
        ) : (
          <>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="ご要望・不具合などをお聞かせください"
              className="h-24 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400"
            />
            <div className="mt-2 flex justify-end">
              <button
                disabled={!feedback.trim()}
                onClick={() => setSent(true)}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <SendIcon className="h-4 w-4" />
                送信
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
