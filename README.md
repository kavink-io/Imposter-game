# 🎭 Imposter Party - Real-Time 8-Player Deduction Game

A modern, responsive, real-time multiplayer web application for **exactly 8 players**, built with **React, Vite, Tailwind CSS, and Supabase**, tailored for frictionless deployment to **Vercel**.

All player communication, secret topic distribution, private role cards, discussion timers, and voting ballots are handled **100% internally inside the website**. No WhatsApp, external messaging apps, phone numbers, or SMS required!

---

## 🌟 Game Overview & Roles (Strictly 8 Players)

In every round, the server securely assigns one of three secret roles to each of the 8 players:

| Role | Count | Secret Info | Mission / Victory Condition |
| :--- | :---: | :--- | :--- |
| **👥 Civilian** | **5** | **Secret Word** (e.g. `PIZZA`) | Know the secret word. Give subtle verbal clues to identify the 2 Imposters without revealing the word. Avoid voting out the Joker! |
| **🚨 Imposter** | **2** | **Secret Clue** (e.g. `ITALIAN`) | Do **NOT** know the secret word! Receive a related clue. Both Imposters share this clue to bluff, blend in, and survive the vote! |
| **🃏 Joker** | **1** | **Secret Word** (e.g. `PIZZA`) | **Knows the secret word**, BUT must act suspicious and pretend to be an imposter. **If the group votes the Joker out, the Joker wins alone!** |

---

## 🚀 Key Features

- **Private In-Website Role Cards**: Authenticated server delivery. Each player gets a 3D animated flip card with a **"Reveal My Role"** button, role-specific neon glows, icons, and instructions. Tap to reveal, tap again to conceal!
- **Strict 8-Player Lobby**: Transaction-safe room locking. The host can only launch once all 8 slots are occupied.
- **Cryptographic Server-Side Distribution**: Role assignments and random topic selections happen entirely on the database/server side. Secret roles and words are **never broadcast in public room channels**.
- **Dual Topic Modes**:
  - **Random Topic**: Server picks from 50+ curated topics and imposter clues across 6 categories.
  - **Manual Topic**: Host types a custom secret word and imposter clue before launching.
- **In-Game Discussion Assistant**: Customizable timer with audio warnings, time-up buzzer, and a verbal clue turn indicator.
- **Private In-App Voting**: Players privately ballot for one of the other 7 players (cannot vote for self). Ballots remain secret until the host closes voting.
- **Dramatic Results Reveal**: Tally reveal, eliminated players, role cards unmasked, and celebratory confetti!
- **Start Next Round Button**: Keep the exact same 8 friends in the room, re-randomize roles, pick a new topic, and increment the round counter.
- **Dual-Engine Architecture**:
  - **Live Supabase Mode**: Connects to Supabase PostgreSQL with Realtime subscriptions and `SECURITY DEFINER` RPCs.
  - **Local Multi-Tab Simulation Engine**: Built-in `BroadcastChannel` and testing dock allowing full end-to-end testing across 8 tabs or within a single browser window!

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide Icons, Canvas Confetti.
- **Backend / Database**: Supabase (PostgreSQL with Row Level Security, Realtime websockets, and `SECURITY DEFINER` RPC functions).
- **Deployment**: Vercel (Single Page App with zero-config serverless client routing via `vercel.json`).

---

## 💻 Quick Start & Windows Installation Guide

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or newer). Check with:
  ```powershell
  node -v
  ```

### 2. Clone or Navigate to the Project Directory
```powershell
cd c:\Users\Kavin\WH
```

### 3. Install Dependencies
```powershell
npm install
```

### 4. Run Development Server
```powershell
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser!

> 💡 **Instant Testing Tip**:
> In local mode, click **"Create Room"**, enter your name, and in the lobby tap **"Auto-Fill to 8 Players"** in the bottom dock! You can then launch the round and switch between any of the 8 players' points of view with 1 click to test private role cards, discussion, and voting!

---

## 🗄️ Supabase Setup & Deployment Guide

To connect the application to a live Supabase project for real-world multiplayer play on separate phones:

### Step 1: Create a Free Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a free account.
2. Click **New Project** and select a database region.

### Step 2: Run the Database Migrations
1. In the Supabase Dashboard, open the **SQL Editor** from the left navigation.
2. Click **New Query**.
3. Copy the entire contents of [`supabase/migrations/20261030000000_imposter_party_schema.sql`](file:///c:/Users/Kavin/WH/supabase/migrations/20261030000000_imposter_party_schema.sql) and paste it into the editor.
4. Click **Run** (Ctrl+Enter). This creates all 6 tables, constraints, Row Level Security policies, and secure server-side RPC functions.

### Step 3: Seed the Topic & Clue Database
1. In the **SQL Editor**, open another **New Query**.
2. Copy the entire contents of [`supabase/seed.sql`](file:///c:/Users/Kavin/WH/supabase/seed.sql) and paste it.
3. Click **Run** to load 50+ curated topics and imposter clues.

### Step 4: Retrieve API Keys
1. In Supabase, go to **Project Settings** (gear icon) -> **API**.
2. Copy the **Project URL** (`https://<project-ref>.supabase.co`).
3. Copy the **Project API Anon Key** (`ey...`).

### Step 5: Configure Local Environment
Create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

---

## 🌐 Vercel Deployment Instructions

Deploying the frontend to Vercel takes less than 2 minutes:

### Option A: Using the Vercel Dashboard (Recommended)
1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Imposter Party"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/imposter-party.git
   git push -u origin main
   ```
2. Log in to [vercel.com](https://vercel.com) and click **Add New...** -> **Project**.
3. Select your `imposter-party` repository.
4. Framework Preset will auto-detect as **Vite**.
5. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = `https://<your-project-ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `<your-supabase-anon-key>`
6. Click **Deploy**!

### Option B: Using the Vercel CLI
```powershell
npm i -g vercel
vercel
```

---

## 📱 How to Test with 8 Real Players on Separate Phones

1. Open your live Vercel URL on your phone or laptop.
2. Click **Create Room**, enter your name, and tap **Create Room & Enter Lobby**.
3. Click the **"Copy Invite Link"** button (or share the 6-character room code, e.g. `PARTY8`).
4. Have 7 friends open the link on their mobile browsers (iOS Safari, Android Chrome, etc.).
5. Each player enters their display name and joins.
6. The host's lobby updates in real-time as each slot fills up: `1/8`, `2/8` ... `8/8`.
7. Once all 8 players have joined, the host clicks **"Start Game & Assign Roles"**.
8. Every player's phone instantly updates to their confidential 3D card. Tap **"Reveal My Role"**!
9. Conduct the discussion round and cast private votes.
10. The host taps **"Tally Votes & Reveal Results"** to reveal the winner!

---

## 🔒 Security Architecture

- **Token-Based Private Authentication**: When a player joins a room, a cryptographically secure 256-bit token is generated on the server (`player_token`).
- **Zero Public Secret Leaks**: The `private_player_roles` table has Row Level Security completely blocking direct SELECTs during active games. Only the `rpc_get_my_private_role` function can access a role, and only when provided with that player's exact private token.
- **Host Role Protection**: Critical actions (starting rounds, advancing phases, closing voting) verify the caller is the host via `is_host = true` linked to their private token.
- **No Self-Voting**: The database RPC verifies `voter_id != target_id` at the SQL level.

---

## 📜 License
MIT License - Have fun hosting your game nights!
