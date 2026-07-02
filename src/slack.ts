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


// ── Slack Lists (2025 公開API) ─────────────────────────────────────────────

export interface SlackListItem {
  id: string;
  title: string;
  detail: string;
  assignees: string[];
  /** アイテム内のメッセージ等へのリンク（無ければ空） */
  url: string;
}

/** Slackの「リスト」URL/入力から list_id (F...) を取り出す。 */
export function extractListId(input: string): string | null {
  const s = input.trim();
  // 生のID
  if (/^F[A-Z0-9]{6,}$/i.test(s)) return s.toUpperCase();
  // URL中の F... を拾う（例: https://app.slack.com/lists/T…/F0AB12CD）
  const m = s.match(/\b(F[A-Z0-9]{6,})\b/i);
  return m ? m[1].toUpperCase() : null;
}

/** Slack rich_text ブロックからプレーンテキストを抽出する（再帰）。 */
function richTextToPlain(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(richTextToPlain).join("");
  if (typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (typeof o.text === "string") return o.text;
    if (typeof o.url === "string" && !o.text) return o.url as string;
    if (Array.isArray(o.elements)) return o.elements.map(richTextToPlain).join("");
    if (o.type === "rich_text_section" || o.type === "rich_text_list") {
      return richTextToPlain(o.elements);
    }
  }
  return "";
}

/** リストのセル(field)から表示テキストを得る。 */
function fieldText(f: Record<string, unknown>): string {
  if (Array.isArray(f.rich_text)) return richTextToPlain(f.rich_text).trim();
  if (typeof f.text === "string") return f.text.trim();
  if (typeof f.value === "string") return f.value.trim();
  if (typeof f.number === "number") return String(f.number);
  if (f.select && typeof f.select === "object") {
    const sel = f.select as Record<string, unknown>;
    return String(sel.label ?? sel.value ?? "");
  }
  if (typeof f.date === "string") return f.date;
  return "";
}

/** セルからユーザーID配列を得る。 */
function fieldUsers(f: Record<string, unknown>): string[] {
  const raw = f.user ?? f.users ?? f.person ?? f.assignee;
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string");
  if (typeof raw === "string") return [raw];
  return [];
}

/** アイテムを再帰的に走査して最初のSlackメッセージ/パーマリンクURLを返す。 */
function firstSlackUrl(node: unknown): string {
  if (typeof node === "string") {
    return /^https?:\/\/[^\s]*slack\.com\/(archives|app)\//.test(node) ? node : "";
  }
  if (Array.isArray(node)) {
    for (const x of node) { const u = firstSlackUrl(x); if (u) return u; }
    return "";
  }
  if (node && typeof node === "object") {
    // permalink 系のキーを優先
    const o = node as Record<string, unknown>;
    for (const key of ["permalink", "url", "link"]) {
      if (typeof o[key] === "string" && firstSlackUrl(o[key])) return o[key] as string;
    }
    for (const v of Object.values(o)) { const u = firstSlackUrl(v); if (u) return u; }
  }
  return "";
}

/** ユーザーIDを表示名に解決（users:read）。失敗時はIDのまま。 */
async function resolveUserNames(ids: string[], token: string): Promise<Record<string, string>> {
  const unique = [...new Set(ids)].filter((id) => /^U[A-Z0-9]+$/i.test(id));
  const pairs = await Promise.all(
    unique.map(async (id) => {
      try {
        const data = await slackGet(`users.info?user=${id}`, token);
        const u = data.user as { profile?: { display_name?: string; real_name?: string } } | undefined;
        return [id, u?.profile?.display_name || u?.profile?.real_name || id] as const;
      } catch {
        return [id, id] as const;
      }
    }),
  );
  return Object.fromEntries(pairs);
}

/** Slackリストのアイテム一覧を取得する（lists:read スコープ必要）。 */
export async function fetchListItems(token: string, listId: string, limit = 100): Promise<SlackListItem[]> {
  const params = new URLSearchParams({ list_id: listId, limit: String(limit) });
  const data = await slackGet(`slackLists.items.list?${params}`, token);
  const items = (data.items as Array<Record<string, unknown>> | undefined) ?? [];

  const parsed = items.map((it) => {
    const fields = (it.fields as Array<Record<string, unknown>> | undefined) ?? [];
    const texts = fields.map(fieldText).filter(Boolean);
    const userIds = fields.flatMap(fieldUsers);
    const full = texts.join(" / ");
    const title = (texts[0] ?? "(無題)").split("\n")[0].slice(0, 80);
    return {
      id: String(it.id ?? Math.random()),
      title,
      detail: full.length > title.length ? full.slice(0, 200) : "",
      assignees: userIds,
      url: firstSlackUrl(it),
    };
  });

  // 担当者名を解決
  const allIds = parsed.flatMap((p) => p.assignees);
  if (allIds.length) {
    const names = await resolveUserNames(allIds, token);
    for (const p of parsed) p.assignees = p.assignees.map((id) => names[id] ?? id);
  }
  return parsed;
}

// ── チャンネルのブックマーク（bookmarks.list / bookmarks:read） ──────────────

export interface SlackBookmark {
  id: string;
  title: string;
  link: string;
  emoji: string;
}

/** チャンネルのURL/入力から channel_id (C...) を取り出す。 */
export function extractChannelId(input: string): string | null {
  const s = input.trim();
  if (/^C[A-Z0-9]{6,}$/i.test(s)) return s.toUpperCase();
  const m = s.match(/\b(C[A-Z0-9]{6,})\b/i);
  return m ? m[1].toUpperCase() : null;
}

/** チャンネルのブックマーク一覧を取得（bookmarks:read スコープ必要）。 */
export async function fetchBookmarks(token: string, channelId: string): Promise<SlackBookmark[]> {
  const params = new URLSearchParams({ channel_id: channelId });
  const data = await slackGet(`bookmarks.list?${params}`, token);
  const bookmarks = (data.bookmarks as Array<Record<string, unknown>> | undefined) ?? [];
  return bookmarks
    .filter((b) => b.type === "link" || b.link)
    .map((b) => ({
      id: String(b.id ?? ""),
      title: (b.title as string | undefined)?.trim() || (b.link as string | undefined) || "(無題)",
      link: (b.link as string | undefined) ?? "",
      emoji: (b.emoji as string | undefined) ?? "",
    }));
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
