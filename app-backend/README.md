# Artifact App Backend API

This is the standalone **App Backend API** for the Artifact Onboarding and Studio application. It provides database persistence (SQLite locally, PostgreSQL in production) and acts as a secure, smart proxy to coordinate state and operations with the standalone **Artifact Agent System**.

---

## 🛠️ Features
1. **Persistent SQLite/Postgres DB:** Keeps track of your team's `Production Profile` and the full list of `PropItems` in a structured database, replacing fragile `localStorage`.
2. **Seamless Agent System Proxying:** Intermediates and relays requests securely to the Python Agent System (creating props, selections, finalizations, and exports).
3. **Smart State Synchronizer:** Intercepts real-time events on the Server-Sent Events (SSE) `/events` stream to trigger background, transaction-safe updates from the Agent System and automatically update the local database.

---

## 🚀 How to Run Locally

### 1. Configure Environment variables
Copy the `.env.example` to `.env`:
```bash
cp .env.example .env
```

Review or edit `.env` parameters if needed:
- `PORT=5000` (The Express server port)
- `AGENT_SYSTEM_API_URL=http://localhost:8080/v1` (URL of the standalone agent system)

---

### 2. Install Dependencies
Make sure you have Node.js / Bun installed, then run:
```bash
npm install
# or
bun install
```

---

### 3. Run Development Server
Start the Express server with live TypeScript reloading:
```bash
npm run dev
# or
bun run dev
```

---

### 4. Build & Start for Production
Compile TypeScript and start the production build:
```bash
npm run build
npm run start
```
