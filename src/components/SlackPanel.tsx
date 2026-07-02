import { useState, useEffect, useCallback } from "react";
import { fetchListItems, extractListId, validateToken, type SlackListItem } from "../slack";
import { ExternalLinkIcon, SlackIcon } from "../icons";

const STORAGE_KEY = "taskflow_slack_token";
const LIST_KEY = "taskflow_slack_list";

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export default function SlackPanel() {
  const [token, setToken] = useState<string>(() => localStorage.getItem(STORAGE_KEY) ?? "");
  const [connected, setConnected] = useState(false);
  const [teamInfo, setTeamInfo] = useState<{ teamName: string; userName: string } | null>(null);
  const [items, setItems] = useState<SlackListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [listInput, setListInput] = useState<string>(() => localStorage.getItem(LIST_KEY) ?? "");

  const load = useCallback(async (t: string, input: string) => {
    const listId = extractListId(input);
    if (!listId) { setError("リストのURLまたはID（F…）を入力してください"); setItems([]); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchListItems(t, listId);
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  const runLoad = () => {
    localStorage.setItem(LIST_KEY, listInput);
    if (token) load(token, listInput);
  };

  // Auto-connect on mount if a token is stored
  useEffect(() => {
    if (!token) return;
    setConnecting(true);
    validateToken(token).then(result => {
      if (result.ok) {
        setConnected(true);
        setTeamInfo({ teamName: result.teamName, userName: result.userName });
        if (listInput.trim()) load(token, listInput);
      } else {
        localStorage.removeItem(STORAGE_KEY);
        setToken("");
      }
      setConnecting(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnect = async () => {
    const t = inputValue.trim();
    if (!t) return;
    setConnecting(true);
    setError(null);
    const result = await validateToken(t);
    if (result.ok) {
      localStorage.setItem(STORAGE_KEY, t);
      setToken(t);
      setConnected(true);
      setTeamInfo({ teamName: result.teamName, userName: result.userName });
      setInputValue("");
      if (listInput.trim()) load(t, listInput);
    } else {
      setError(result.error);
    }
    setConnecting(false);
  };

  const handleDisconnect = () => {
    localStorage.removeItem(STORAGE_KEY);
    setToken("");
    setConnected(false);
    setTeamInfo(null);
    setItems([]);
    setError(null);
    setInputValue("");
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
            <SlackIcon className="h-5 w-5" />
            リスト
            <span className="text-xs font-normal text-slate-400">(Slack)</span>
          </h2>
          {teamInfo && (
            <p className="mt-0.5 text-[11px] text-slate-400">
              {teamInfo.teamName} · {teamInfo.userName}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {connected && (
            <>
              <button
                onClick={runLoad}
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
            onClick={() => window.open("https://app.slack.com/client", "_blank")}
            title="Slackで開く"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <ExternalLinkIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Not connected — token input form */}
      {!connected && (
        <div className="space-y-3">
          {connecting ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-400">
              <Spinner /> 接続中...
            </div>
          ) : (
            <>
              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 space-y-1.5 leading-relaxed">
                <p className="font-semibold text-slate-600">トークンの取得方法</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li><a href="https://api.slack.com/apps" target="_blank" rel="noreferrer" className="text-blue-500 underline">api.slack.com/apps</a> でアプリを作成</li>
                  <li>「OAuth &amp; Permissions」→ User Token Scopesに<br/>
                    <code className="rounded bg-slate-200 px-1">lists:read</code> と <code className="rounded bg-slate-200 px-1">users:read</code> を追加
                  </li>
                  <li>「Install to Workspace」でインストール</li>
                  <li>「User OAuth Token」(<code className="rounded bg-slate-200 px-1">xoxp-...</code>) をコピー</li>
                </ol>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleConnect()}
                  placeholder="xoxp-xxxxxxxx..."
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-400"
                />
                <button
                  onClick={handleConnect}
                  disabled={!inputValue.trim()}
                  className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  接続
                </button>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </>
          )}
        </div>
      )}

      {/* Connected — list picker */}
      {connected && (
        <div className="mb-3 space-y-1.5">
          <div className="flex gap-2">
            <input
              value={listInput}
              onChange={e => setListInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && runLoad()}
              placeholder="リストのURL または F… ID"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
            <button
              onClick={runLoad}
              disabled={loading || !listInput.trim()}
              className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
            >
              表示
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">
            Slackでリストを開き、URLを貼り付けてください。表示には <code className="rounded bg-slate-100 px-1">lists:read</code> スコープが必要です。
          </p>
        </div>
      )}

      {/* Connected — loading */}
      {connected && loading && items.length === 0 && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400">
          <Spinner /> 読み込み中...
        </div>
      )}

      {/* Connected — error */}
      {connected && error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
          <button onClick={runLoad} className="ml-2 underline hover:no-underline">再試行</button>
        </div>
      )}

      {/* Connected — empty */}
      {connected && !loading && !error && listInput.trim() && items.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-400">アイテムがありません</p>
      )}

      {/* Connected — list */}
      {items.length > 0 && (() => {
        const listHref = /^https?:\/\//.test(listInput.trim()) ? listInput.trim() : "";
        return (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {items.map(it => {
              const href = it.url || listHref;
              return (
                <li key={it.id}>
                  <a
                    href={href || "#"}
                    target={href ? "_blank" : undefined}
                    rel="noreferrer"
                    onClick={!href ? e => e.preventDefault() : undefined}
                    className="flex items-start gap-2 px-3 py-2 transition hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-700">{it.title}</p>
                      {it.detail && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{it.detail}</p>}
                      {it.assignees.length > 0 && (
                        <p className="mt-1 text-[11px] text-slate-400">👤 {it.assignees.join("、")}</p>
                      )}
                    </div>
                    {href && <ExternalLinkIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />}
                  </a>
                </li>
              );
            })}
          </ul>
        );
      })()}
    </section>
  );
}
