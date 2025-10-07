# SOI Pattaya — Minimal Deploy

## 🚀 One-command deploy (recommended)
```bash
curl -sSL https://raw.githubusercontent.com/seamuswc/soipattaya_JS/main/one-liner.sh | sudo bash
```

## 🧰 Manual deploy on a fresh server
```bash
git clone https://github.com/seamuswc/soipattaya_JS.git
cd soipattaya_JS
sudo ./deploy.sh
```

Notes
- **Domain**: scripts assume `soipattaya.com` (edit in `deploy.sh` if different)
- **Env**: after install, edit `.env` in the app root, then `pm2 restart all`
  - PROMO_CODE=yourcode
  - PROMO_MAX_USES=10

## After Setup
```bash
pm2 status              # Check if running
pm2 logs soipattaya     # View logs
pm2 restart soipattaya  # Restart app
pm2 stop soipattaya     # Stop app
pm2 start soipattaya    # Start app
```

## Update to latest code

cd /var/www/soipattaya 
npm run update

```