// Slack Web API helpers (proxied through /slack-api to avoid CORS)

const BASE = "/slack-api";

export interface SlackSavedItem {
  id: string;
  channel: string;
  author: string;
  text: string;
  time: string;
  permalink: string;
}

function formatTs(ts: string): string {
  if (!ts) return "";
  const d = new Date(parseFloat(ts) * 1000);
  const today = new Date();
  if (d.toDateString() === today.toDateString())
    return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "昨日";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

async function slackGet(path: string, token: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Slack HTTP ${res.status}`);
  const data = (await res.json()) as Record<string, unknown>;
  if (!data.ok) throw new Error((data.error as string | undefined) ?? "Slack API error");
  return data;
}

/**
 * 任意のクエリで search.messages を実行する（search:read スコープ必要）。
 * Slackは「後で対応（保存）」の一覧取得APIを廃止したため、保存メッセージを
 * 直接取得することはできない。代わりにユーザーが決めたキーワード
 * （例: タスクに付ける "★"）で検索して該当メッセージを拾う。
 */
export async function searchMessages(token: string, query: string, count = 20): Promise<SlackSavedItem[]> {
  const params = new URLSearchParams({ query, sort: "timestamp", count: String(count) });
  const data = await slackGet(`search.messages?${params}`, token);
  const messages = data.messages as { matches?: Array<Record<string, unknown>> } | undefined;
  const matches = messages?.matches ?? [];

  return matches.map(m => {
    const ch = m.channel as { id?: string; name?: string } | undefined;
    const ts = (m.ts as string | undefined) ?? "";
    return {
      id: `${ts}-${ch?.id ?? ""}`,
      channel: ch?.name ? `#${ch.name}` : (ch?.id ?? ""),
      author: (m.username as string | undefined) ?? (m.user as string | undefined) ?? "Unknown",
      text: ((m.text as string | undefined) ?? "").replace(/<[^>]+>/g, "").trim(),
      time: formatTs(ts),
      permalink: (m.permalink as string | undefined) ?? "",
    };
  });
}


export async function validateToken(
  token: string
): Promise<{ ok: true; teamName: string; userName: string } | { ok: false; error: string }> {
  try {
    const data = await slackGet("auth.test", token);
    return {
      ok: true,
      teamName: (data.team as string | undefined) ?? "",
      userName: (data.user as string | undefined) ?? "",
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "認証に失敗しました" };
  }
}
