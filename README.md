# SOI Pattaya - React + Vite + Fastify App

## Setup

1. Install dependencies:
   ```
   npm install
   cd client && npm install
   cd ../server && npm install
   ```

2. Set up environment variables in server/.env and client/.env (see examples above).

3. Run Prisma migrations:
   ```
   cd server
   npx prisma migrate dev
   ```

## Development

```
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3000

## Build

```
npm run build
```

## Start Production

```
npm start
```

For deployment, use a Node.js host, serve client/build as static, proxy API to server.

Note: Update wallet addresses and API keys in .env files.
The app now uses direct Solana RPC for payment validation, no Helius required.
Only Solana payments are supported.
Users can pay via QR or directly with Phantom wallet.

