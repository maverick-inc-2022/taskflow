import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

function getClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
      settings: unknown;
    };
    if (!email) return res.status(400).json({ error: "missing email" });

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
