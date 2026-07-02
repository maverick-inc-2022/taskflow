-- LINE通知の毎日定期実行を設定する
-- Supabase ダッシュボード → SQL Editor で実行してください

-- pg_net 拡張を有効化（Edge Functionを呼び出すために必要）
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 毎朝8時（日本時間）= UTC 23:00 に通知を送信
-- ※ 既にスケジュールが存在する場合は一度削除してから再作成
SELECT cron.unschedule('line-notify-daily');

SELECT cron.schedule(
  'line-notify-daily',
  '0 23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mjmejuuxtpzxudlmjfas.supabase.co/functions/v1/line-notify-cron',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 設定確認
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'line-notify-daily';
