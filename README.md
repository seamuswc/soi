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
git pull
npm run update

## 🛡️ Safe Updates (Recommended)

```bash
# Safe update with maintenance mode (no user interruption)
npm run safe-update

# Manual maintenance control
npm run maintenance on     # Enable maintenance mode
npm run update            # Run update safely  
npm run maintenance off   # Restore site
npm run maintenance status # Check status
```

## 🎟️ Promo Code Management

```bash
# Set promo code and usage limit
npm run promo "WELCOME20" 100

# Check promo usage statistics
npm run check-promo


