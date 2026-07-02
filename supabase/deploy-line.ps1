# LINE通知 Edge Functions デプロイスクリプト
# PowerShell でこのフォルダに移動して実行: .\supabase\deploy-line.ps1

Set-Location $PSScriptRoot/..

Write-Host "=== Step 1: Supabase ログイン ===" -ForegroundColor Cyan
npx supabase login

Write-Host ""
Write-Host "=== Step 2: シークレットキーを設定 ===" -ForegroundColor Cyan
Write-Host "（LINEのChannel Access Tokenを設定します）" -ForegroundColor Gray
npx supabase secrets set LINE_CHANNEL_ACCESS_TOKEN="DlymYpAPi5ROedvULPWdlpgcGjXZ8tshcAO+olxN5HqZaSIo1LMfek5o4w6p+7NHblMU5BLpvl7IirKBMzlcgEMKh/MyOXEv0PGj0unWC/IT2tdBamnAI+tpytnpWihxX6rhQH0YpY9QXGZexaatnAdB04t89/1O/w1cDnyilFU=" --project-ref mjmejuuxtpzxudlmjfas

Write-Host ""
Write-Host "=== Step 3: line-webhook をデプロイ ===" -ForegroundColor Cyan
npx supabase functions deploy line-webhook --project-ref mjmejuuxtpzxudlmjfas --no-verify-jwt

Write-Host ""
Write-Host "=== Step 4: line-notify-cron をデプロイ ===" -ForegroundColor Cyan
npx supabase functions deploy line-notify-cron --project-ref mjmejuuxtpzxudlmjfas --no-verify-jwt

Write-Host ""
Write-Host "=== デプロイ完了！===" -ForegroundColor Green
Write-Host ""
Write-Host "Webhook URL（LINE OAに設定してください）:" -ForegroundColor Yellow
Write-Host "  https://mjmejuuxtpzxudlmjfas.supabase.co/functions/v1/line-webhook" -ForegroundColor White
