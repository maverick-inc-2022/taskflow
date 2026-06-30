import { useState } from "react";
import { AvatarDisplay, AvatarPicker, DEFAULT_AVATAR } from "../avatarIcons";
import { useGoogleLogin } from "@react-oauth/google";
import type { FontSize, LayoutMode, Person, Settings } from "../types";
import Modal from "./Modal";
import { GmailIcon, GoogleCalendarIcon, SlackIcon } from "../icons";

const fontSizes: { id: FontSize; label: string }[] = [
  { id: "small", label: "小" },
  { id: "medium", label: "中" },
  { id: "large", label: "大" },
];

interface Props {
  settings: Settings;
  onChange: (next: Settings) => void;
  onClose: () => void;
  people?: Person[];
  onAddPerson?: (name: string, avatar: string) => void;
  onRemovePerson?: (id: string) => void;
  onUpdatePerson?: (id: string, name: string, avatar: string) => void;
  avatarChoices?: string[];
  googleCalConnected?: boolean;
  onGoogleCalConnect?: (token: string) => void;
  onGoogleCalDisconnect?: () => void;
  userEmail?: string;
  userPassword?: string;
  onChangePassword?: (current: string, next: string) => string | null;
}

function Toggle({
  on,
  onClick,
}: {
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        on ? "bg-blue-600" : "bg-slate-300"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          on ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function Row({
  label,
  desc,
  children,
}: {
  label: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {desc && <p className="text-xs text-slate-400">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsModal({ settings, onChange, onClose, people = [], onAddPerson, onRemovePerson, onUpdatePerson, avatarChoices = [], googleCalConnected, onGoogleCalConnect, onGoogleCalDisconnect, userEmail, onChangePassword, onExport }: Props & { onExport?: () => void }) {
  const set = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });

  const googleLogin = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/calendar",
    onSuccess: (res) => onGoogleCalConnect?.(res.access_token),
  });
  const [newName, setNewName] = useState("");
  const [newAvatar, setNewAvatar] = useState(DEFAULT_AVATAR);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Person inline editing
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editingPersonName, setEditingPersonName] = useState("");
  const [editingPersonAvatar, setEditingPersonAvatar] = useState(DEFAULT_AVATAR);

  const startEditPerson = (p: Person) => {
    setEditingPersonId(p.id);
    setEditingPersonName(p.name.replace("（自分）", ""));
    setEditingPersonAvatar(p.avatar);
  };
  const commitEditPerson = (p: Person) => {
    const name = editingPersonName.trim();
    if (name) onUpdatePerson?.(p.id, p.id === "me" ? name + "（自分）" : name, editingPersonAvatar);
    setEditingPersonId(null);
  };
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const commitAdd = () => {
    const name = newName.trim();
    if (!name) return;
    onAddPerson?.(name, newAvatar || DEFAULT_AVATAR);
    setNewName("");
    setNewAvatar(DEFAULT_AVATAR);
  };

  return (
    <Modal title="設定" onClose={onClose}>
      <p className="mb-1 text-xs font-semibold tracking-wide text-slate-400">
        外観
      </p>
      <div className="divide-y divide-slate-100">
        <Row label="ダークモード" desc="暗い配色に切り替える">
          <Toggle
            on={settings.darkMode}
            onClick={() => set({ darkMode: !settings.darkMode })}
          />
        </Row>
        <Row label="フォントサイズ">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {fontSizes.map((f) => (
              <button
                key={f.id}
                onClick={() => set({ fontSize: f.id })}
                className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                  settings.fontSize === f.id
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </Row>
      </div>

      <p className="mb-1 mt-5 text-xs font-semibold tracking-wide text-slate-400">
        通知
      </p>
      <div className="divide-y divide-slate-100">
        <Row label="メール通知" desc="期限やメンションをメールで受け取る">
          <Toggle
            on={settings.notifyEmail}
            onClick={() => set({ notifyEmail: !settings.notifyEmail })}
          />
        </Row>
        <Row label="Slack通知" desc="保存したメッセージの更新を通知">
          <Toggle
            on={settings.notifySlack}
            onClick={() => set({ notifySlack: !settings.notifySlack })}
          />
        </Row>
      </div>

      <p className="mb-1 mt-5 text-xs font-semibold tracking-wide text-slate-400">
        表示
      </p>
      <div className="divide-y divide-slate-100">
        <Row label="完了したタスクを隠す" desc="一覧から完了済みを非表示にする">
          <Toggle
            on={settings.hideCompleted}
            onClick={() => set({ hideCompleted: !settings.hideCompleted })}
          />
        </Row>
        <Row label="週の開始日">
          <select
            value={settings.weekStart}
            onChange={e => set({ weekStart: Number(e.target.value) })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-400"
          >
            {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
              <option key={i} value={i}>{d}曜日</option>
            ))}
          </select>
        </Row>
      </div>

      <p className="mb-1 mt-5 text-xs font-semibold tracking-wide text-slate-400">
        初期表示
      </p>
      <div className="divide-y divide-slate-100">
        <Row label="表示形式" desc="サイトを開いたときの画面レイアウト">
          <select
            value={settings.defaultView}
            onChange={e => set({ defaultView: e.target.value as LayoutMode })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-400"
          >
            <option value="list">リスト</option>
            <option value="table">テーブル</option>
            <option value="calendar">カレンダー</option>
            <option value="kanban">かんばん</option>
          </select>
        </Row>
        <Row label="日時範囲" desc="サイトを開いたときの表示範囲">
          <select
            value={settings.defaultDateRange}
            onChange={e => set({ defaultDateRange: e.target.value as Settings["defaultDateRange"] })}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-400"
          >
            <option value="today">今日</option>
            <option value="week">今週</option>
            <option value="month">今月</option>
            <option value="all">すべて</option>
          </select>
        </Row>
      </div>

      <p className="mb-1 mt-5 text-xs font-semibold tracking-wide text-slate-400">
        担当者
      </p>
      <div className="divide-y divide-slate-100">
        {people.map((p) => (
          <div key={p.id} className="py-2.5">
            {editingPersonId === p.id ? (
              /* ── inline edit form ── */
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-2">
                <input
                  autoFocus
                  value={editingPersonName}
                  onChange={e => setEditingPersonName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") commitEditPerson(p); if (e.key === "Escape") setEditingPersonId(null); }}
                  placeholder="名前"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-400"
                />
                <AvatarPicker value={editingPersonAvatar} onChange={setEditingPersonAvatar} />
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setEditingPersonId(null)}
                    className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs text-slate-500 hover:bg-white transition"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={() => commitEditPerson(p)}
                    disabled={!editingPersonName.trim()}
                    className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition"
                  >
                    保存
                  </button>
                </div>
              </div>
            ) : (
              /* ── normal row ── */
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <AvatarDisplay avatar={p.avatar} name={p.name} size={32} />
                  <span className="text-sm text-slate-700">{p.name.replace("（自分）", "")}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEditPerson(p)}
                    className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                  >
                    編集
                  </button>
                  {p.id !== "me" && (
                    <button
                      onClick={() => onRemovePerson?.(p.id)}
                      className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                    >
                      削除
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {/* Add form */}
        <div className="py-3">
          <p className="mb-2 text-xs font-semibold text-slate-400">担当者を追加</p>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commitAdd()}
            placeholder="名前"
            className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          <div className="mb-3">
            <AvatarPicker value={newAvatar} onChange={setNewAvatar} />
          </div>
          <button
            onClick={commitAdd}
            disabled={!newName.trim()}
            className="w-full rounded-lg bg-blue-600 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition"
          >
            追加
          </button>
        </div>
      </div>

      <p className="mb-1 mt-5 text-xs font-semibold tracking-wide text-slate-400">
        連携
      </p>
      <div className="divide-y divide-slate-100">
        {/* Google Calendar — real auth */}
        <div className="flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-3">
            <GoogleCalendarIcon className="h-6 w-6 shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-700">Google カレンダー</p>
              <p className="text-xs text-slate-400">予定をTaskFlowのカレンダーに表示する</p>
            </div>
          </div>
          {googleCalConnected ? (
            <button
              onClick={onGoogleCalDisconnect}
              className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600 hover:bg-red-50 hover:text-red-500 transition"
            >
              連携中
            </button>
          ) : (
            <button
              onClick={() => googleLogin()}
              className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 transition"
            >
              連携する
            </button>
          )}
        </div>
        {/* Gmail — mock */}
        {[
          { icon: GmailIcon, label: "Gmail", desc: "スターを付けたメールをタスク候補として表示する", connected: true },
          { icon: SlackIcon, label: "Slack", desc: "保存したメッセージをタスクとして連携する", connected: false },
        ].map(({ icon: Icon, label, desc, connected }) => (
          <div key={label} className="flex items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-3">
              <Icon className="h-6 w-6 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-700">{label}</p>
                <p className="text-xs text-slate-400">{desc}</p>
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              connected ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
            }`}>
              {connected ? "連携中" : "未連携"}
            </span>
          </div>
        ))}
      </div>

      {userEmail && (
        <>
          <p className="mb-1 mt-5 text-xs font-semibold tracking-wide text-slate-400">
            アカウント
          </p>
          <div className="divide-y divide-slate-100">
            <Row label="メールアドレス">
              <span className="text-sm text-slate-600">{userEmail}</span>
            </Row>
            <Row label="パスワード">
              <div className="flex items-center gap-2">
                <span className="text-sm tracking-widest text-slate-400">••••••••</span>
                <button
                  onClick={() => { setShowChangePassword(v => !v); setPwError(""); setPwSuccess(false); }}
                  className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 transition"
                >
                  {showChangePassword ? "キャンセル" : "変更"}
                </button>
              </div>
            </Row>
            {showChangePassword && (
              <div className="py-3 space-y-2">
                <input
                  type="password"
                  value={pwCurrent}
                  onChange={e => { setPwCurrent(e.target.value); setPwError(""); }}
                  placeholder="現在のパスワード"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                />
                <input
                  type="password"
                  value={pwNew}
                  onChange={e => { setPwNew(e.target.value); setPwError(""); }}
                  placeholder="新しいパスワード（8文字以上）"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                />
                <input
                  type="password"
                  value={pwConfirm}
                  onChange={e => { setPwConfirm(e.target.value); setPwError(""); }}
                  placeholder="新しいパスワード（確認）"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                />
                {pwError && <p className="text-xs text-red-500">{pwError}</p>}
                {pwSuccess && <p className="text-xs text-emerald-600">パスワードを変更しました</p>}
                <button
                  onClick={() => {
                    if (!pwCurrent || !pwNew || !pwConfirm) { setPwError("すべての項目を入力してください"); return; }
                    if (pwNew.length < 8) { setPwError("パスワードは8文字以上にしてください"); return; }
                    if (pwNew !== pwConfirm) { setPwError("新しいパスワードが一致しません"); return; }
                    const err = onChangePassword?.(pwCurrent, pwNew);
                    if (err) { setPwError(err); return; }
                    setPwCurrent(""); setPwNew(""); setPwConfirm(""); setPwSuccess(true);
                    setTimeout(() => { setPwSuccess(false); setShowChangePassword(false); }, 1500);
                  }}
                  className="w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                >
                  パスワードを変更する
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <div className="mt-6 flex items-center justify-between">
        {onExport ? (
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            データをエクスポート
          </button>
        ) : <span />}
        <button onClick={onClose}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          完了
        </button>
      </div>
    </Modal>
  );
}
