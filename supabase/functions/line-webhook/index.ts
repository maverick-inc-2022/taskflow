import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LINE_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN")!;
const LINE_CHANNEL_SECRET = Deno.env.get("LINE_CHANNEL_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface TaskRow {
  title: string;
  due?: string;
  dueTime?: string;
  done?: boolean;
  starred?: boolean;
}
interface UserSettings {
  lineUserId?: string;
}

const WD = ["日", "月", "火", "水", "木", "金", "土"];

/** Current date in JST (Asia/Tokyo) as YYYY-MM-DD. */
function jstToday(): Date {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 3600 * 1000);
  return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate()));
}
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
function mdLabel(due: string): string {
  const d = new Date(due + "T00:00:00Z");
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${WD[d.getUTCDay()]})`;
}

/** Verify the LINE request signature (HMAC-SHA256, base64) against the raw body. */
async function verifySignature(rawBody: string, signature: string | null): Promise<boolean> {
  if (!LINE_CHANNEL_SECRET) return true; // secret not configured — skip (dev)
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(LINE_CHANNEL_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return expected === signature;
}

function formatTask(t: TaskRow): string {
  const star = t.starred ? "⭐ " : "";
  const time = t.dueTime ? ` ${t.dueTime}` : "";
  return `・${star}${t.title}${time}`;
}

/** Build the reply text for a registered user based on their message. */
function buildReply(text: string, tasks: TaskRow[]): string {
  const active = tasks.filter((t) => !t.done && t.due);
  const today = jstToday();
  const todayStr = ymd(today);
  const q = text.trim().toLowerCase();

  const has = (...kw: string[]) => kw.some((k) => text.includes(k) || q.includes(k));

  // ヘルプ
  if (has("ヘルプ", "help", "使い方", "コマンド")) {
    return [
      "📋 TaskFlow でできること",
      "",
      "「今日」→ 今日のタスク",
      "「明日」→ 明日のタスク",
      "「今週」→ 今週のタスク",
      "「すべて」→ 未完了タスク全部",
      "",
      "いつでも話しかけてね！",
    ].join("\n");
  }

  // 明日
  if (has("明日", "あした", "みょうにち", "tomorrow")) {
    const tmr = ymd(addDays(today, 1));
    const list = active.filter((t) => t.due === tmr).sort(sortByTime);
    if (list.length === 0) return `明日（${mdLabel(tmr)}）のタスクはありません 🎉`;
    return [`🗓 明日（${mdLabel(tmr)}）のタスク（${list.length}件）`, "", ...list.map(formatTask)].join("\n");
  }

  // 今週
  if (has("今週", "週") || q.includes("week")) {
    const maxStr = ymd(addDays(today, 6));
    const list = active
      .filter((t) => t.due! >= todayStr && t.due! <= maxStr)
      .sort(sortByDue);
    if (list.length === 0) return "今週のタスクはありません 🎉";
    // 日付ごとにグルーピング
    const byDate = new Map<string, TaskRow[]>();
    for (const t of list) {
      const arr = byDate.get(t.due!) ?? [];
      arr.push(t);
      byDate.set(t.due!, arr);
    }
    const lines: string[] = [`🗓 今週のタスク（${list.length}件）`];
    for (const date of [...byDate.keys()].sort()) {
      lines.push("", `【${mdLabel(date)}】`, ...byDate.get(date)!.sort(sortByTime).map(formatTask));
    }
    return lines.join("\n");
  }

  // すべて / 一覧
  if (has("すべて", "全部", "全て", "一覧", "リスト", "残り", "all")) {
    const overdue = active.filter((t) => t.due! < todayStr).sort(sortByDue);
    const rest = active.filter((t) => t.due! >= todayStr).sort(sortByDue);
    if (overdue.length + rest.length === 0) return "未完了のタスクはありません 🎉";
    const lines: string[] = [`📋 未完了タスク（${overdue.length + rest.length}件）`];
    if (overdue.length) lines.push("", "⚠️ 期限切れ", ...overdue.map((t) => `${formatTask(t)}（${mdLabel(t.due!)}）`));
    if (rest.length) lines.push("", "📅 これから", ...rest.map((t) => `${formatTask(t)}（${mdLabel(t.due!)}）`));
    return lines.join("\n");
  }

  // デフォルト（「今日」含むその他すべて）→ 今日のタスク＋期限切れ
  const overdue = active.filter((t) => t.due! < todayStr).sort(sortByDue);
  const todayList = active.filter((t) => t.due === todayStr).sort(sortByTime);
  const lines: string[] = [`📋 今日（${mdLabel(todayStr)}）のタスク`];
  if (todayList.length) lines.push("", ...todayList.map(formatTask));
  else lines.push("", "今日のタスクはありません 🎉");
  if (overdue.length) lines.push("", "⚠️ 期限切れ", ...overdue.map((t) => `${formatTask(t)}（${mdLabel(t.due!)}）`));
  return lines.join("\n");
}

function sortByTime(a: TaskRow, b: TaskRow): number {
  return (a.dueTime ?? "99:99").localeCompare(b.dueTime ?? "99:99");
}
function sortByDue(a: TaskRow, b: TaskRow): number {
  return (a.due! + (a.dueTime ?? "")).localeCompare(b.due! + (b.dueTime ?? ""));
}

async function reply(replyToken: string, text: string) {
  await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LINE_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text: text.slice(0, 4900) }],
    }),
  });
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("OK", { status: 200 });

  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");
  if (!(await verifySignature(rawBody, signature))) {
    return new Response("invalid signature", { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const events: Array<{
    type: string;
    replyToken?: string;
    message?: { type: string; text?: string };
    source?: { userId?: string };
  }> = body.events ?? [];

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  for (const ev of events) {
    const userId = ev.source?.userId;
    const replyToken = ev.replyToken;
    if (!replyToken || !userId) continue;

    // 友だち追加時：User IDを案内
    if (ev.type === "follow") {
      await reply(
        replyToken,
        `友だち追加ありがとうございます！\n\nあなたのLINE User ID：\n${userId}\n\nTaskFlow の 設定 → LINE通知 に貼り付けると、タスクの通知や「今日のタスク」の照会ができるようになります。`,
      );
      continue;
    }

    if (ev.type !== "message" || ev.message?.type !== "text") continue;
    const text = ev.message.text ?? "";

    // このLINEユーザーに紐づくアカウントを探す
    const { data: users } = await supabase
      .from("user_data")
      .select("email, tasks, settings");

    const match = (users ?? []).find(
      (u) => (u.settings as UserSettings | null)?.lineUserId?.trim() === userId,
    );

    if (!match) {
      // 未登録：User IDを返す
      await reply(
        replyToken,
        `あなたのLINE User ID：\n${userId}\n\nTaskFlow の 設定 → LINE通知 に貼り付けて連携してください。連携後は「今日のタスク」などと話しかけると一覧を表示します。`,
      );
      continue;
    }

    const tasks = (match.tasks as TaskRow[]) ?? [];
    await reply(replyToken, buildReply(text, tasks));
  }

  return new Response("OK", { status: 200 });
});
