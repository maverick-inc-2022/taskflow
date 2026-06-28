import { useState, useEffect, useCallback } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { fetchStarredEmails, type GmailEmail } from "../googleGmail";
import { ExternalLinkIcon, GmailIcon, StarBadgeIcon } from "../icons";

interface Props {
  accessToken?: string | null;
  onConnect?: (token: string) => void;
  onDisconnect?: () => void;
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export default function GmailPanel({ accessToken, onConnect, onDisconnect }: Props) {
  const [emails, setEmails] = useState<GmailEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStarredEmails(token);
      setEmails(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (accessToken) load(accessToken);
    else setEmails([]);
  }, [accessToken, load]);

  const login = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    onSuccess: res => onConnect?.(res.access_token),
    onError: () => setError("Googleログインに失敗しました"),
  });

  const handleDisconnect = () => {
    setEmails([]);
    setError(null);
    onDisconnect?.();
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
          <GmailIcon className="h-5 w-5" />
          お気に入りメール
          <span className="text-xs font-normal text-slate-400">(Gmail)</span>
        </h2>
        <div className="flex items-center gap-1">
          {accessToken && (
            <>
              <button
                onClick={() => load(accessToken)}
                disabled={loading}
                title="更新"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
              >
                <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                  <path d="M8 16H3v5"/>
                </svg>
              </button>
              <button
                onClick={handleDisconnect}
                title="連携を解除"
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-400"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </>
          )}
          <button
            onClick={() => window.open("https://mail.google.com/mail/u/0/#starred", "_blank")}
            title="Gmailで開く"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <ExternalLinkIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Not connected */}
      {!accessToken && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <GmailIcon className="h-10 w-10 opacity-30" />
          <p className="text-sm text-slate-500">Gmailと連携してスター付きメールを表示</p>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={() => login()}
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            <GmailIcon className="h-4 w-4" />
            Gmailと連携する
          </button>
        </div>
      )}

      {/* Connected — loading */}
      {accessToken && loading && emails.length === 0 && (
        <div className="flex items-center justify-center py-8 gap-2 text-sm text-slate-400">
          <Spinner />
          読み込み中...
        </div>
      )}

      {/* Connected — error */}
      {accessToken && error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
          <button onClick={() => load(accessToken)} className="ml-2 underline hover:no-underline">再試行</button>
        </div>
      )}

      {/* Connected — empty */}
      {accessToken && !loading && !error && emails.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-400">スター付きメールはありません</p>
      )}

      {/* Connected — email list */}
      {emails.length > 0 && (
        <ul className="-mx-2 divide-y divide-slate-100">
          {emails.map(m => (
            <li key={m.id}>
              <a
                href={`https://mail.google.com/mail/u/0/#starred/${m.threadId}`}
                target="_blank"
                rel="noreferrer"
                className="flex gap-2 rounded-lg px-2 py-2.5 hover:bg-slate-50"
              >
                <StarBadgeIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`truncate text-sm ${m.unread ? "font-bold text-slate-800" : "font-medium text-slate-700"}`}>
                      {m.from}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">{m.date}</span>
                  </div>
                  <p className={`truncate text-sm ${m.unread ? "font-semibold text-slate-700" : "text-slate-600"}`}>
                    {m.subject}
                  </p>
                  <p className="truncate text-xs text-slate-400">{m.snippet}</p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
