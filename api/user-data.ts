import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

function getClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

function authorized(req: VercelRequest): boolean {
  const secret = process.env.API_SECRET;
  if (!secret) return true; // not configured — allow (dev mode)
  return req.headers["x-api-secret"] === secret;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!authorized(req)) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const supabase = getClient();

  if (req.method === "GET") {
    const { email } = req.query as { email: string };
    if (!email) return res.status(400).json({ error: "missing email" });

    const { data, error } = await supabase
      .from("user_data")
      .select("tasks, memos, settings")
      .eq("email", email)
      .single();

    if (error) return res.status(404).json(null);
    return res.status(200).json(data);
  }

  if (req.method === "POST") {
    const { email, tasks, memos, settings } = req.body as {
      email: string;
      tasks: unknown;
      memos: unknown;
      settings: (Record<string, unknown> & { _ts?: number }) | null;
    };
    if (!email) return res.status(400).json({ error: "missing email" });

    // 「最後に更新した方が勝つ」: 受信データの更新時刻(_ts)が、クラウドの
    // 現在値より古ければ上書きしない（別端末の新しい編集を守る）。
    const incomingTs = Number(settings?._ts ?? 0);
    if (incomingTs > 0) {
      const { data: cur } = await supabase
        .from("user_data")
        .select("settings")
        .eq("email", email)
        .single();
      const existingTs = Number((cur?.settings as { _ts?: number } | null)?._ts ?? 0);
      if (existingTs > incomingTs) {
        // 古い保存は棄却（クラウドの新しいデータを保持）。clientはエラーにしない。
        return res.status(200).json({ ok: true, skipped: "stale" });
      }
    }

    const { error } = await supabase.from("user_data").upsert(
      { email, tasks, memos, settings, updated_at: new Date().toISOString() },
      { onConflict: "email" }
    );

    if (error) {
      console.error("Supabase upsert error:", error);
      return res.status(500).json({ error });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
