import { useCallback, useEffect, useRef, useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";

// Google のアクセストークンは約1時間で失効する。単一トークンを1日保持する事は
// できないので、期限付きで保存しつつ、失効前に「サイレント更新」(prompt:'' の
// 裏側トークン再取得。Googleセッションと同意が生きていればポップアップ無し)で
// 継続的に更新する。これによりログインし直さずに丸1日以上つながったままになる。

interface Stored { token: string; expiresAt: number; }

function read(key: string): Stored | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const s = JSON.parse(raw) as Stored;
    if (s && typeof s.token === "string" && typeof s.expiresAt === "number") return s;
  } catch { /* 旧形式(生トークン)などはnull扱い */ }
  return null;
}

export function useGoogleAuth(scope: string, storageKey: string) {
  const [token, setToken] = useState<string | null>(() => {
    const s = read(storageKey);
    return s && s.expiresAt > Date.now() ? s.token : null;
  });
  const expiresAtRef = useRef<number>(read(storageKey)?.expiresAt ?? 0);

  const persist = useCallback((res: { access_token: string; expires_in?: number }) => {
    const expiresAt = Date.now() + (res.expires_in ?? 3600) * 1000;
    expiresAtRef.current = expiresAt;
    try { localStorage.setItem(storageKey, JSON.stringify({ token: res.access_token, expiresAt })); } catch { /* quota */ }
    setToken(res.access_token);
  }, [storageKey]);

  // ボタン用（必要なら同意画面を出す）とサイレント更新用（prompt:''）を分ける
  const loginInteractive = useGoogleLogin({ scope, onSuccess: persist, onError: () => {} });
  const loginSilent = useGoogleLogin({ scope, prompt: "", onSuccess: persist, onError: () => {} });

  const signOut = useCallback(() => {
    expiresAtRef.current = 0;
    try { localStorage.removeItem(storageKey); } catch { /* noop */ }
    setToken(null);
  }, [storageKey]);

  // 起動時：有効なトークンが無ければサイレント更新を試す（セッションが生きていれば無音で復帰）
  useEffect(() => {
    if (!token) loginSilent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 失効5分前を過ぎたら裏で更新
  useEffect(() => {
    const id = setInterval(() => {
      const exp = expiresAtRef.current;
      if (exp && Date.now() > exp - 5 * 60_000) loginSilent();
    }, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    token,
    signIn: () => loginInteractive(),
    refresh: () => loginSilent(),
    signOut,
  };
}
