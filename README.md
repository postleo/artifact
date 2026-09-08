<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Artifact: Art Department Hero Prop Pipeline

Welcome to **Artifact**! 

Artifact is a specialized production tool designed for **film, television, and game cinematics film crews** (specifically Production Designers, Prop Masters, and Fabricators). 

It automates and structures the creative lifecycle of a **"hero prop"**—the signature, highly detailed physical object that the story depends on and the camera studies in close-ups (like a relic, a map, an ancient device, or a key). Artifact guides your prop brief from screenplay text to divergent concept designs, through human review gates, and compiles complete build specifications and turnaround sheets for the fabrication shop floor.

---

## 📁 Repository Architecture

This repository is structured as a clean, decoupled monorepo containing three completely standalone components:

```
/
├── app/                  <-- [Component 1] Standalone React / Vite Frontend Dashboard
├── app-backend/          <-- [Component 2] Standalone Express & SQL Database Backend API
└── agent-system/         <-- [Component 3] Standalone Python ADK Agent System Core
```

Each component is 100% independent and communicates over standard REST APIs, allowing them to be developed, run, and deployed separately.

---

## 🚀 One-Minute Local Quickstart (Stub / Offline Mode)

You can launch and test the entire full-stack system on your machine **completely offline and without any Google Cloud account or API keys required**, with zero Google Cloud setup required!

### Prerequisites
Make sure you have the following installed on your system:
1. **Node.js** (v18 or higher) & **npm** (comes with Node)
2. **Python** (v3.10 or higher) & **pip** (comes with Python)

---

### Step-by-Step Launch

Open **three separate terminal windows** and run the following commands:

#### Terminal 1: Launch the Agent Reasoning Core (Port 8080)
The Python agent generates design concepts, handles safety validation, and computes build turnarounds.
```bash
cd agent-system

# 1. Create a Python virtual environment to keep things clean
python -m venv .venv
source .venv/bin/activate  # On Windows, use: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Launch in Offline/Stub mode (no Google Cloud account needed!)
USE_STUBS=true uvicorn api.app:app --host 0.0.0.0 --port 8080 --reload
```
*API docs will be available at: `http://localhost:8080/docs`*

#### Terminal 2: Launch the App Backend API (Port 5000)
The Express server persists production information and prop records in a local database file, and proxies requests to the Python agent.
```bash
cd app-backend

# 1. Install dependencies
npm install

# 2. Copy the default environment configuration
cp .env.example .env

# 3. Launch the development server
npm run dev
```
*App Backend API will run at: `http://localhost:5000` (it will automatically create a local `db.sqlite` database file).*

#### Terminal 3: Launch the Studio Frontend App (Port 3000)
The React dashboard is your visual workspace for screenplay onboarding, selection reviews, and downloading specifications.
```bash
cd app

# 1. Install dependencies
npm install

# 2. Copy the default environment configuration
cp .env.example .env.local

# 3. Launch the React server
npm run dev
```
*Navigate your browser to: **`http://localhost:3000`***

---

## 🛠️ The Three Components Explained

### 🖥️ 1. Studio Onboarding & Dashboard Frontend (`/app/`)
* **What it is:** The visual control room. It provides an intuitive layout for production designers and film crews to analyze screenplays, review draft concepts in museum "glass showcases" (Vitrine Plates), manage human-in-the-loop review gates, and export full blueprints.
* **Tech Stack:** React 19, Vite, TypeScript, TailwindCSS, Motion, Lucide.
* **Go deeper:** See [app/README.md](/app/README.md).

### 🗄️ 2. App Backend API & Database (`/app-backend/`)
* **What it is:** The persistent data manager. It replaces fragile browser `localStorage` by storing your team's production bibles and prop sheets in an SQL database. It also acts as a smart mediator that relays commands to the Python Agent and synchronizes states in real-time via Server-Sent Events (SSE).
* **Tech Stack:** Node.js, Express, TypeScript, Sequelize (ORM), SQLite (local), PostgreSQL (production).
* **Go deeper:** See [app-backend/README.md](/app-backend/README.md).

### 🤖 Core Agent reasoning Engine (`/agent-system/`)
* **What it is:** The intelligence core. Built natively on **Google ADK** (Agent Development Kit), it runs three specialized sub-agents (`OptionsGenerator`, `SelectionRecorder`, `AssetFinisher`) using Gemini models to draft design specifications, run trademark checks, and output seed-locked multi-angle turnaround images. It also includes an independent interactive command-line tool (`cli.py`).
* **Tech Stack:** Python 3.12, FastAPI, google-adk, google-genai, Firestore (production).
* **Go deeper:** See [agent-system/README.md](/agent-system/README.md).
