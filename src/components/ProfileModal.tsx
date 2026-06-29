import { useState } from "react";
import { avatarChoices } from "../data";
import type { Profile } from "../types";
import Modal from "./Modal";
import { CameraIcon, LogoutIcon } from "../icons";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function loadAccount(): { email: string; password: string; isInitial: boolean } | null {
  try { const s = localStorage.getItem('taskflow_account'); return s ? JSON.parse(s) : null; } catch { return null; }
}
function saveAccount(a: { email: string; password: string; isInitial: boolean }) {
  localStorage.setItem('taskflow_account', JSON.stringify(a));
}
function genInitialPassword(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

type LoginStep = "email" | "password" | "initial-sent";

interface Props {
  profile: Profile;
  isLoggedIn: boolean;
  needsPasswordChange: boolean;
  onSave: (p: Profile) => void;
  onLogin: (email: string) => void;
  onLogout: () => void;
  onPasswordChanged: () => void;
  onClose: () => void;
}

export default function ProfileModal({ profile, isLoggedIn, needsPasswordChange, onSave, onLogin, onLogout, onPasswordChanged, onClose }: Props) {
  const [draft, setDraft] = useState<Profile>(profile);
  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState(profile.email);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [initialPw, setInitialPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changeError, setChangeError] = useState("");

  const [sending, setSending] = useState(false);

  const handleEmailSubmit = async () => {
    if (!email.trim()) { setError("メールアドレスを入力してください"); return; }
    setError("");
    const account = loadAccount();
    if (account && account.email === email.trim() && !account.isInitial) {
      setStep("password");
    } else {
      const pw = genInitialPassword();
      saveAccount({ email: email.trim(), password: pw, isInitial: true });
      setInitialPw(pw);
      setSending(true);
      try {
        await fetch("/api/send-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password: pw }),
        });
      } catch { /* email sending failed silently */ }
      setSending(false);
      setStep("initial-sent");
    }
  };

  const handlePasswordLogin = () => {
    if (!password.trim()) { setError("パスワードを入力してください"); return; }
    const account = loadAccount();
    if (!account || account.password !== password) { setError("パスワードが正しくありません"); return; }
    setError("");
    onLogin(account.email);
    onClose();
  };

  const handleInitialLogin = () => {
    if (!password.trim()) { setError("パスワードを入力してください"); return; }
    const account = loadAccount();
    if (!account || account.password !== password) { setError("パスワードが正しくありません"); return; }
    setError("");
    onLogin(account.email);
    onClose();
  };

  const handleForgotPassword = () => {
    const pw = genInitialPassword();
    const account = loadAccount();
    saveAccount({ email: account?.email ?? email, password: pw, isInitial: true });
    setInitialPw(pw);
    setPassword("");
    setError("");
    setStep("initial-sent");
  };

  const handleForceChange = () => {
    if (!newPw || !confirmPw) { setChangeError("すべての項目を入力してください"); return; }
    if (newPw.length < 8) { setChangeError("パスワードは8文字以上にしてください"); return; }
    if (newPw !== confirmPw) { setChangeError("パスワードが一致しません"); return; }
    const account = loadAccount();
    if (account) saveAccount({ ...account, password: newPw, isInitial: false });
    onPasswordChanged();
    onClose();
  };

  if (needsPasswordChange) {
    return (
      <Modal title="パスワードを設定" onClose={onClose}>
        <p className="mb-6 text-sm text-slate-500">セキュリティのため、初期パスワードを変更してください。</p>
        <div className="space-y-3">
          <input
            type="password"
            value={newPw}
            onChange={e => { setNewPw(e.target.value); setChangeError(""); }}
            placeholder="新しいパスワード（8文字以上）"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="password"
            value={confirmPw}
            onChange={e => { setConfirmPw(e.target.value); setChangeError(""); }}
            placeholder="パスワードの確認"
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {changeError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{changeError}</p>}
          <button
            onClick={handleForceChange}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            設定して完了
          </button>
        </div>
      </Modal>
    );
  }

  if (!isLoggedIn) {
    if (step === "email") {
      return (
        <Modal title="ログイン" onClose={onClose}>
          <div className="flex flex-col items-center pb-2 pt-4">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <h3 className="mb-1 text-base font-semibold text-slate-800">TaskFlowにログイン</h3>
            <p className="mb-6 text-sm text-slate-400">メールアドレスを入力してください</p>
          </div>
          <label className="mb-5 block">
            <span className="mb-1 block text-sm font-medium text-slate-600">メールアドレス</span>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleEmailSubmit()}
              placeholder="you@example.com"
              autoFocus
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </label>
          {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
          <button
            onClick={handleEmailSubmit}
            disabled={sending}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {sending ? "送信中..." : "次へ"}
          </button>
        </Modal>
      );
    }

    if (step === "password") {
      return (
        <Modal title="ログイン" onClose={onClose}>
          <button onClick={() => { setStep("email"); setPassword(""); setError(""); }}
            className="mb-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5m7-7-7 7 7 7"/></svg>
            戻る
          </button>
          <p className="mb-1 text-sm text-slate-700 font-medium">{email}</p>
          <p className="mb-5 text-xs text-slate-400">パスワードを入力してください</p>
          <label className="mb-5 block">
            <span className="mb-1 block text-sm font-medium text-slate-600">パスワード</span>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handlePasswordLogin()}
                placeholder="••••••••"
                autoFocus
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <EyeIcon open={showPw} />
              </button>
            </div>
          </label>
          {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
          <button onClick={handlePasswordLogin}
            className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            ログイン
          </button>
          <button onClick={handleForgotPassword}
            className="mt-4 w-full text-center text-xs text-slate-400 hover:text-blue-500">
            パスワードをお忘れの場合
          </button>
        </Modal>
      );
    }

    return (
      <Modal title="初期パスワードを確認" onClose={onClose}>
        <div className="mb-5 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <p className="font-medium">初期パスワードをメールに送信しました</p>
          <p className="mt-1 text-xs text-blue-500">{email}</p>
        </div>
        <label className="mb-5 block">
          <span className="mb-1 block text-sm font-medium text-slate-600">初期パスワード</span>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleInitialLogin()}
              placeholder="••••••••"
              autoFocus
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <EyeIcon open={showPw} />
            </button>
          </div>
        </label>
        {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
        <button onClick={handleInitialLogin}
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          ログイン
        </button>
      </Modal>
    );
  }

  const save = () => {
    if (!draft.name.trim()) return;
    onSave(draft);
    onClose();
  };
  const handleLogout = () => { onLogout(); onClose(); };

  return (
    <Modal title="プロフィール" onClose={onClose}>
      <div className="mb-5 flex flex-col items-center">
        <div className="relative">
          <img src={draft.avatar} alt="avatar" className="h-20 w-20 rounded-full border border-slate-200 object-cover" />
          <span className="absolute -bottom-1 -right-1 rounded-full bg-blue-600 p-1.5 text-white">
            <CameraIcon className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3 flex gap-2">
          {avatarChoices.map((a) => (
            <button key={a} onClick={() => setDraft({ ...draft, avatar: a })}
              className={`h-9 w-9 overflow-hidden rounded-full ring-2 transition ${draft.avatar === a ? "ring-blue-500" : "ring-transparent"}`}>
              <img src={a} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>
      <label className="mb-3 block">
        <span className="mb-1 block text-sm font-medium text-slate-600">名前</span>
        <input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
      </label>
      <label className="mb-3 block">
        <span className="mb-1 block text-sm font-medium text-slate-600">メールアドレス</span>
        <input type="email" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
      </label>
      <label className="mb-5 block">
        <span className="mb-1 block text-sm font-medium text-slate-600">役職</span>
        <input value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
      </label>
      <div className="flex items-center justify-between">
        <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-red-500">
          <LogoutIcon className="h-4 w-4" />
          ログアウト
        </button>
        <div className="flex gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">キャンセル</button>
          <button onClick={save} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">保存</button>
        </div>
      </div>
    </Modal>
  );
}
