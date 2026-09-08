# Artifact Studio Dashboard (Frontend)

This is the standalone **Artifact Studio Dashboard**—a highly visual, interactive web application built specifically for film, television, and game cinematics film crews (such as Production Designers, Prop Masters, and Fabricators).

It replaces fragmented chat threads and folders by providing a dedicated workspace where your team can onboard script briefs, review generated designs inside illuminated museum showcase plates (Vitrine Plates), manage human-in-the-loop review gates, and export full manufacturing blueprints.

---

## 🛠️ Key Features

* **Script Extraction Onboarding:** Paste a screenplay scene and let our sub-agents discover key hero props, on-screen action moments, historical world eras, and physical safety constraints.
* **Vitrine Plates Display:** Displays prop designs in a signature, technical glass display overlay with centerlines, asset codes, corner registrations, and metadata overlays.
* **Human-in-the-Loop Gates:** Seamlessly review multiple concept directions and rationales (Gate 1), confirm choices, and record designer reasoning to maintain design integrity.
* **Comprehensive Spec Dossiers:** View and download multi-angle turnaround sheets (Front, Side, Back, 3/4 views), 6-part component detail callout breakdowns, structural dimension spec sheets, and stunt version protocols.

---

## 🚀 How to Run Locally

### Prerequisites
Make sure you have **Node.js** (v18 or higher) and **npm** installed on your system.

---

### Step 1: Install Dependencies
Open your terminal inside this directory (`/app/`) and run:
```bash
npm install
```

---

### Step 2: Configure Environment Variables
Copy the default environment template into an active local `.env` configuration file:
```bash
cp .env.example .env.local
```

Open `.env.local` in your editor and configure the endpoints:
- `VITE_APP_API_URL=http://localhost:5000` (This points to your Express `app-backend` API).
*Note: If no API backend is connected, the app will run in a demonstration-only mode using mock local browser state.*

---

### Step 3: Run the Development Server
Launch the local React/Vite server:
```bash
npm run dev
```

Your terminal will print the local server address:
👉 **`http://localhost:3000`**

Open that address in your browser to start exploring and designing!

---

### 🎨 Design & Style Guidelines
This frontend is built in strict alignment with Artifact's visual identity:
* **Palette:** Warm, organic paper background (`#F0EDE3`) and dark slate-teal text (`#0F1A18`) with a signature inspection turquoise accent (`#12A79D`). Solid colors only—absolutely **no gradients**.
* **Typography:** Characterful, elegant serifs for display headers matched with clean, high-legibility sans-serifs for the user interface.
* **Aesthetics:** Editorial layouts with hairline rules, clean grids, and catalogue-style asset numbering.
