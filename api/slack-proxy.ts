import type { VercelRequest, VercelResponse } from "@vercel/node";

// Server-side proxy for the Slack Web API.
// The browser calls /slack-api/<method>?<params> with an Authorization: Bearer
// header holding the user's own Slack token; a vercel.json rewrite maps that to
// this function (?slackPath=<method>). We relay the call to slack.com so the
// browser never hits Slack cross-origin. In dev, vite.config.ts proxies the
// same /slack-api path, so this file only matters in production.

const ALLOWED = new Set([
  "auth.test",
  "search.messages",
  "stars.list",
  "conversations.info",
  "users.info",
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { slackPath, ...rest } = req.query as Record<string, string | string[]>;
  const method = Array.isArray(slackPath) ? slackPath.join("/") : (slackPath ?? "");

  if (!ALLOWED.has(method)) {
    return res.status(403).json({ ok: false, error: "method_not_allowed" });
  }

  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ ok: false, error: "missing_token" });
  }

  // Rebuild the Slack query string from everything except our own `slackPath`.
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(rest)) {
    if (Array.isArray(v)) v.forEach((x) => qs.append(k, x));
    else if (v != null) qs.append(k, String(v));
  }
  const query = qs.toString();
  const url = `https://slack.com/api/${method}${query ? `?${query}` : ""}`;

  try {
    const r = await fetch(url, { headers: { Authorization: auth } });
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({
      ok: false,
      error: e instanceof Error ? e.message : "proxy_error",
    });
  }
}
