// Gmail API v1 helpers

export interface GmailEmail {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
  threadId: string;
}

function parseFrom(raw: string): string {
  // "Display Name" <email@x.com>  →  Display Name
  const m = raw.match(/^"?([^"<\n]+?)"?\s*(?:<[^>]+>)?$/);
  const name = m ? m[1].trim() : raw.split("@")[0] ?? raw;
  return name;
}

function formatDate(raw: string): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";
  const today = new Date();
  if (d.toDateString() === today.toDateString())
    return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "昨日";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

interface RawHeader { name: string; value: string; }

async function fetchMessageMeta(token: string, id: string): Promise<GmailEmail | null> {
  const res = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  const msg = await res.json();
  const headers: RawHeader[] = msg.payload?.headers ?? [];
  const h = (name: string) =>
    headers.find(x => x.name.toLowerCase() === name.toLowerCase())?.value ?? "";

  return {
    id: msg.id,
    threadId: msg.threadId,
    from: parseFrom(h("From")),
    subject: h("Subject") || "(件名なし)",
    snippet: (msg.snippet as string ?? "").replace(/&#39;/g, "'").replace(/&amp;/g, "&"),
    date: formatDate(h("Date")),
    unread: (msg.labelIds as string[] ?? []).includes("UNREAD"),
  };
}

export async function fetchStarredEmails(token: string, maxResults = 15): Promise<GmailEmail[]> {
  const res = await fetch(
    `https://www.googleapis.com/gmail/v1/users/me/messages?labelIds=STARRED&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `Gmail API error ${res.status}`);
  }
  const list = await res.json();
  if (!Array.isArray(list.messages) || list.messages.length === 0) return [];

  const results = await Promise.all(
    (list.messages as { id: string }[]).map(m => fetchMessageMeta(token, m.id))
  );
  return results.filter((m): m is GmailEmail => m !== null);
}
