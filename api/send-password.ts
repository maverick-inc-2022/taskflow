import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) return res.status(400).json({ error: "missing fields" });

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: "TaskFlow <noreply@maverick-inc.biz>",
    to: email,
    subject: "【TaskFlow】初期パスワードのご案内",
    html: `
      <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff">
        <div style="text-align:center;margin-bottom:32px">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;background:#eff6ff;border-radius:12px">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <h1 style="margin:16px 0 4px;font-size:20px;font-weight:700;color:#1e293b">TaskFlow へようこそ</h1>
          <p style="margin:0;color:#64748b;font-size:14px">アカウントが作成されました</p>
        </div>
        <p style="color:#475569;font-size:14px;margin:0 0 24px">以下の初期パスワードでログインしてください。</p>
        <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
          <p style="margin:0 0 8px;font-size:12px;color:#92400e;font-weight:600">初期パスワード</p>
          <p style="margin:0;font-size:28px;font-family:monospace;font-weight:700;letter-spacing:0.15em;color:#78350f">${password}</p>
        </div>
        <p style="color:#94a3b8;font-size:12px;margin:0">ログイン後、すみやかにパスワードを変更してください。<br>このメールに心当たりがない場合は無視してください。</p>
      </div>
    `,
  });

  if (error) {
    console.error("Resend error:", error);
    return res.status(500).json({ error });
  }

  return res.status(200).json({ ok: true });
}
