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

/** Search API で「後で」リストを取得する（search:read スコープ必要） */
async function fetchLaterViaSearch(token: string, count: number): Promise<SlackSavedItem[]> {
  const params = new URLSearchParams({ query: "in:later", sort: "timestamp", count: String(count) });
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

/** Fetch channel name from ID */
async function resolveChannel(id: string, token: string): Promise<string> {
  try {
    const data = await slackGet(`conversations.info?channel=${id}`, token);
    const ch = data.channel as { name?: string } | undefined;
    return ch?.name ? `#${ch.name}` : id;
  } catch {
    return id;
  }
}

/** Fetch display name for a user ID */
async function resolveUser(userId: string, token: string): Promise<string> {
  try {
    const data = await slackGet(`users.info?user=${userId}`, token);
    const user = data.user as { profile?: { display_name?: string; real_name?: string } } | undefined;
    return user?.profile?.display_name || user?.profile?.real_name || userId;
  } catch {
    return userId;
  }
}

/** Stars list フォールバック（stars:read スコープ） */
async function fetchLaterViaStars(token: string, count: number): Promise<SlackSavedItem[]> {
  const data = await slackGet(`stars.list?count=${count}`, token);
  const items = (data.items as Array<Record<string, unknown>> | undefined) ?? [];
  const msgItems = items.filter(item => item.type === "message");
  if (msgItems.length === 0) return [];

  const uniqueChannels = [...new Set(msgItems.map(i => i.channel as string))];
  const uniqueUsers = [...new Set(
    msgItems
      .map(i => (i.message as Record<string, unknown> | undefined)?.user as string | undefined)
      .filter((u): u is string => !!u)
  )];

  const [channelMap, userMap] = await Promise.all([
    Promise.all(uniqueChannels.map(async id => [id, await resolveChannel(id, token)] as const))
      .then(Object.fromEntries),
    Promise.all(uniqueUsers.map(async id => [id, await resolveUser(id, token)] as const))
      .then(Object.fromEntries),
  ]);

  return msgItems.map(item => {
    const msg = (item.message as Record<string, unknown> | undefined) ?? {};
    const userId = msg.user as string | undefined;
    const ts = (msg.ts as string | undefined) ?? "";
    return {
      id: `${ts}-${item.channel as string}`,
      channel: channelMap[item.channel as string] ?? (item.channel as string),
      author: (msg.username as string | undefined) ?? (userId ? (userMap[userId] ?? userId) : "Unknown"),
      text: ((msg.text as string | undefined) ?? "").replace(/<[^>]+>/g, "").trim(),
      time: formatTs(ts),
      permalink: (msg.permalink as string | undefined) ?? "",
    };
  });
}

/**
 * 「後で」リストを取得する。
 * search.messages(in:later) を試し、missing_scope エラーなら stars.list にフォールバック。
 */
export async function fetchLaterItems(token: string, count = 15): Promise<SlackSavedItem[]> {
  try {
    return await fetchLaterViaSearch(token, count);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    // scope が足りない場合は stars.list で代替
    if (msg.includes("missing_scope") || msg.includes("not_allowed")) {
      return fetchLaterViaStars(token, count);
    }
    throw e;
  }
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
