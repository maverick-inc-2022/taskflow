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
    const { email, tasks, memos, settings, clientV } = req.body as {
      email: string;
      tasks: unknown;
      memos: unknown;
      settings: (Record<string, unknown> & { _ts?: number }) | null;
      clientV?: number;
    };
    if (!email) return res.status(400).json({ error: "missing email" });

    // 旧バージョンのクライアント（クライアント時計ベースの同期＋エコー保存バグあり）
    // からの書き込みは受け付けない。リロードして新バンドルを取得するまで読み取り専用。
    // ※旧クライアントがエラー表示にならないよう ok:true で返す
    if ((clientV ?? 0) < 2) {
      return res.status(200).json({ ok: true, skipped: "old-client" });
    }

    // サーバー側でタイムスタンプを割り当て（クライアントのクロックスキューを排除）
    const incomingTs = Number(settings?._ts ?? 0);

    const { data: cur } = await supabase
      .from("user_data")
      .select("settings")
      .eq("email", email)
      .single();
    const existingTs = Number((cur?.settings as { _ts?: number } | null)?._ts ?? 0);

    // 大きく遅れた保存だけ棄却する（長時間オフラインだった端末の古いデータで
    // 上書きされるのを防ぐ）。5分以内の並行編集は「最後に保存した方が勝つ」。
    const GRACE_MS = 5 * 60 * 1000;
    if (incomingTs > 0 && existingTs - incomingTs > GRACE_MS) {
      return res.status(200).json({ ok: true, skipped: "stale" });
    }

    // _ts は単調増加のサーバー時刻（論理クロック）。過去にズレた時計で書かれた
    // 未来の _ts が残っていても絶対に逆行しない → 「新しい保存ほど _ts が大きい」を保証
    const serverTs = Math.max(Date.now(), existingTs + 1);
    const settingsWithServerTs = settings ? { ...(settings as object), _ts: serverTs } : settings;

    const { error } = await supabase.from("user_data").upsert(
      { email, tasks, memos, settings: settingsWithServerTs, updated_at: new Date().toISOString() },
      { onConflict: "email" }
    );

    if (error) {
      console.error("Supabase upsert error:", error);
      return res.status(500).json({ error });
    }
    // serverTs を返す → クライアントはこの値を localTs として使う
    return res.status(200).json({ ok: true, serverTs });
  }

  return res.status(405).end();
}
