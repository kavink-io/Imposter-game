# 🎭 Imposter Party - Real-Time Social Deduction Game

A modern, responsive, real-time multiplayer web application built with **React, Vite, Tailwind CSS, and Supabase**, tailored for deployment to **Vercel**.

All player communication, secret topic distribution, private role cards, discussion timers, and voting ballots are handled **100% internally inside the website**. No WhatsApp, external messaging apps, phone numbers, or SMS required!

---

## 🌟 Key Updates & Game Architecture

### 1. 👑 Host Does Not Play Any Role
- The **Room Host is the Game Master (Moderator)**.
- The host organizes the room, starts the game, manages timers, speaking turns, and opens/closes voting rounds.
- **The host does NOT receive a secret player role and does NOT vote.**
- The host has a dedicated Game Master dashboard with topic overview and live round monitoring.

### 2. 🔍 Multiple Rounds Until the Imposter is Exposed
- In each round (Round 1, Round 2, Round 3...), players give verbal clues and secretly vote on who they suspect is an Imposter.
- At the end of voting:
  - If an **Imposter is voted out**: The Imposter is **EXPOSED!** 👥 **Civilians Win!** (Game finishes).
  - If the **Joker is voted out**: The Joker tricked the group! 🃏 **Joker Wins Alone!**
  - If an **Innocent Civilian is voted out**: The Imposter has escaped detection!
    - The eliminated civilian sits out as a spectator.
    - The match **does not end** — the host clicks **"Proceed to Round X (Hunt Continues!)"**.
    - The remaining alive players continue the investigation with the same secret topic into the next round until the Imposter is exposed (or Imposters reach parity)!

### 3. 👥 Unlimited Players (No 8-Player Limit)
- Play with **any number of players** (minimum 3 players; no upper cap: 4, 6, 8, 10, 12, 16+ players!).
- Dynamic server-side role balancing:
  - **Imposter Count**: Auto-balanced (1 for 3-5 players, 2 for 6-10 players, 3 for 11+ players) or customizable by the host.
  - **Joker**: 1 Joker (active when 4+ players, optional toggle in host settings).
  - **Civilians**: All remaining players are Civilians with the secret word.

---

## 🚀 Key Features

- **Private In-Website Role Cards**: Authenticated server delivery. Each participant gets a 3D animated flip card with a **"Reveal My Role"** button, role-specific neon glows, icons, and instructions. Tap to reveal, tap again to conceal!
- **Game Master Dashboard**: Host can view the secret word and imposter clues, monitor who has cast their ballot, and control round transitions.
- **Dual Topic Modes**:
  - **Random Topic**: Server picks from 50+ curated topics and imposter clues across 6 categories.
  - **Manual Topic**: Host types a custom secret word and imposter clue before launching.
- **In-Game Discussion Assistant**: Customizable timer with audio warnings, time-up buzzer, and a verbal clue turn indicator.
- **Private In-App Voting**: Players privately ballot for one of the other alive players (cannot vote for self, host, or eliminated players). Ballots remain secret until the host closes voting.
- **Dramatic Results Reveal**: Tally reveal, eliminated players, role cards unmasked, and celebratory confetti!
- **Dual-Engine Architecture**:
  - **Live Supabase Mode**: Connects to Supabase PostgreSQL with Realtime subscriptions and `SECURITY DEFINER` RPCs.
  - **Local Multi-Tab Simulation Engine**: Built-in `BroadcastChannel` and testing dock allowing full end-to-end testing across multiple tabs or within a single browser window!

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

### 2. Install Dependencies & Run
```powershell
npm install
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser!

> 💡 **Instant Testing Tip**:
> In local mode, click **"Create Room"**, enter your name (Host), and in the lobby tap **"+1 Player"** or **"+4 Players"** in the bottom testing dock! You can then launch the round and switch between any player or the Game Master with 1 click to test private role cards, discussion, and voting!

---

## 🗄️ Supabase Setup & Deployment Guide

To connect the application to a live Supabase project for real-world multiplayer play on separate phones:

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Copy the entire contents of [`supabase/migrations/20261030000000_imposter_party_schema.sql`](supabase/migrations/20261030000000_imposter_party_schema.sql) and paste it into the editor, then click **Run**.
4. Open [`supabase/seed.sql`](supabase/seed.sql) and paste it into a new query, then click **Run** to load 50+ curated topics and clues.
5. In **Project Settings** -> **API**, copy your **Project URL** and **Project API Anon Key**.
6. Create a `.env` file in the project root:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

---

## 🌐 Vercel Deployment Instructions

1. Push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Deploy Imposter Party"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/imposter-party.git
   git push -u origin main
   ```
2. Log in to [vercel.com](https://vercel.com) and click **Add New...** -> **Project**.
3. Select your `imposter-party` repository.
4. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = `https://<your-project-ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `<your-supabase-anon-key>`
5. Click **Deploy**!

---

## 📜 License
MIT License - Have fun hosting your game nights!
