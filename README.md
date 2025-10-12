# SOI Pattaya — Minimal Deploy

## 🚀 Deployment Options

### 1. **Deploy Local** (Recommended - Fastest!)
Build on your local machine, deploy to server:
```bash
./deploy-local.sh root@soipattaya.com
```
*Builds locally (fastest!) + complete server setup + SSL*

### 2. **One-Liner Deploy** (Fresh Server)
```bash
curl -sSL https://raw.githubusercontent.com/seamuswc/soipattaya_JS/main/one-liner.sh | sudo bash
```
*Complete automated setup on fresh server + SSL*

### 3. **Pre-Built Deploy** (Update Existing)
```bash
./deploy-prebuilt.sh
```
*Quick updates with pre-built files*

## ⚙️ Management Tools

```bash
npm run merchant     # Set crypto payment addresses (Solana)
npm run line         # Set LINE account for Thai Baht payments
npm run promo        # Generate promo codes
```

---

**That's it!** Deploy with one command, manage with three. 🚀

