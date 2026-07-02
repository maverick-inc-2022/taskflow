import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LINE_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface TaskRow {
  id: string;
  title: string;
  due?: string;
  done?: boolean;
  deleted?: boolean;
}

interface UserSettings {
  lineUserId?: string;
  lineNotifyDays?: number;
}

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: users, error } = await supabase
    .from("user_data")
    .select("email, tasks, settings");

  if (error) {
    console.error("Supabase error:", error);
    return new Response(JSON.stringify({ error }), { status: 500 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = addDays(today, 0);

  let notified = 0;

  for (const user of users ?? []) {
    const settings = user.settings as UserSettings | null;
    const lineUserId = settings?.lineUserId?.trim();
    if (!lineUserId) continue;

    const notifyDays = settings?.lineNotifyDays ?? 1;
    const targetStr = addDays(today, notifyDays);

    const tasks = (user.tasks as TaskRow[]) ?? [];
    const dueTasks = tasks.filter(
      (t) => !t.done && !t.deleted && t.due &&
        (t.due === todayStr || (notifyDays > 0 && t.due === targetStr))
    );

    if (dueTasks.length === 0) continue;

    const todayTasks = dueTasks.filter((t) => t.due === todayStr);
    const soonTasks = dueTasks.filter((t) => t.due === targetStr && t.due !== todayStr);

    let msg = "📋 TaskFlow 期限通知\n";
    if (todayTasks.length > 0) {
      msg += "\n【今日が期限】\n";
      todayTasks.forEach((t) => { msg += `・${t.title}\n`; });
    }
    if (soonTasks.length > 0) {
      const label =
        notifyDays === 1 ? "明日が期限" : `${notifyDays}日後が期限`;
      msg += `\n【${label}】\n`;
      soonTasks.forEach((t) => { msg += `・${t.title}\n`; });
    }

    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LINE_TOKEN}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: "text", text: msg.trim() }],
      }),
    });

    if (res.ok) notified++;
    else console.error(`LINE push failed for ${user.email}:`, await res.text());
  }

  return new Response(JSON.stringify({ ok: true, notified }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
