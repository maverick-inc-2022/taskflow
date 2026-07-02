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
  "slackLists.items.list",
  "bookmarks.list",
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

  // Rebuild the Slack params from everything except our own `slackPath`.
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(rest)) {
    if (Array.isArray(v)) v.forEach((x) => form.append(k, x));
    else if (v != null) form.append(k, String(v));
  }

  // Always POST with a form body: every Slack Web API method accepts POST,
  // and some (e.g. slackLists.items.list) are POST-only.
  const url = `https://slack.com/api/${method}`;

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const data = await r.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({
      ok: false,
      error: e instanceof Error ? e.message : "proxy_error",
    });
  }
}
