# Getting Started - SOI Pattaya

## 🚀 Quick Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install
cd client && npm install
cd ../server && npm install
```

### 2. Setup Environment
```bash
npm run setup
```

### 3. Setup Database
```bash
cd server
npx prisma db push
```

### 4. Start Development
```bash
npm run dev
```

Visit: http://localhost:5173

## 🔧 Configuration

Edit `.env` file with your values:
- Google Maps API key (for maps)
- Blockchain addresses (for payments)
- Admin credentials (for dashboard)

## 🚀 Production Deployment

### Option 1: Simple Deploy
```bash
npm run deploy
```

### Option 2: Manual Deploy
```bash
# Build
npm run build

# Start
npm start
```

## 📱 Features

- **Property Listings**: Create and browse properties
- **Blockchain Payments**: Solana, Aptos, Sui support
- **Admin Dashboard**: Manage all listings
- **Mobile Friendly**: Works on all devices
- **Google Maps**: Interactive property locations

## 🆘 Need Help?

**Common Issues:**
- Port 3000 in use: `sudo lsof -i :3000 && sudo kill -9 <PID>`
- Database issues: `cd server && npx prisma db push`
- Build errors: `rm -rf node_modules && npm install`

**Check Logs:**
- Development: Check terminal output
- Production: `pm2 logs soipattaya`
