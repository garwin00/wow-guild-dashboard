# WoW Guild Dashboard

A multi-tenant dashboard for World of Warcraft guilds. Manage your roster, schedule raids, track sign-ups, analyse Warcraft Logs parses, and monitor Mythic+ progress — all in one place.

## Features

| Area | What it does |
|------|-------------|
| 🔐 **Auth** | Battle.net OAuth login; optional email/password fallback |
| 🏠 **Overview** | Guild stats, pinnable announcements, next raid countdown, absence notices |
| 🗂️ **Roster** | Sync from Blizzard API, assign Tank/Healer/DPS roles, officer notes, search & filter |
| 📅 **Raids** | Create events, manage sign-ups (Accepted/Tentative/Declined), role composition panel, item-level readiness, officer overrides |
| 📊 **Logs** | Warcraft Logs sync — parse %, DPS/HPS, fight breakdowns, per-player trends via Recharts |
| 📡 **Live Logs** | Auto-polling live report view; in-progress fight tracking with boss HP%, attempt history |
| ⚔️ **Mythic+** | Season score tracking, dungeon run history, weekly affix display |
| ⚙️ **Settings** | Guild profile, WCL connection, role management |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Database | PostgreSQL + Prisma 7 ORM (Neon serverless adapter) |
| Auth | NextAuth.js v5 — Battle.net OAuth + Prisma adapter |
| Styling | Tailwind CSS v4 with a shared WoW-themed design token system |
| Data fetching | TanStack Query v5 — per-page API endpoints, 5-min stale time |
| Charts | Recharts |
| Drag & drop | dnd-kit (roster builder) |
| Email | Resend |
| Validation | Zod v4 |

## External APIs

| API | Purpose |
|-----|---------|
| [Blizzard Battle.net API](https://develop.battle.net/documentation/world-of-warcraft) | Character profiles, guild roster sync, realm data |
| [Warcraft Logs GraphQL API](https://www.warcraftlogs.com/v2-api-docs/warcraft/) | Parse %, fight rankings, report history, live log polling |

## Getting Started

### 1. Register API Clients

- **Battle.net**: https://develop.battle.net/access/clients  
  Add redirect URI: `http://localhost:3000/api/auth/callback/battlenet`
- **Warcraft Logs**: https://www.warcraftlogs.com/api/clients  
  *(required for Logs and Live Logs pages)*

### 2. Configure Environment

Create `.env.local` in the project root:

```env
# Database
DATABASE_URL=postgresql://...

# Battle.net OAuth
BLIZZARD_CLIENT_ID=
BLIZZARD_CLIENT_SECRET=
BLIZZARD_REGION=eu          # eu | us | kr | tw

# Warcraft Logs (optional — enables logs & live logs pages)
WCL_CLIENT_ID=
WCL_CLIENT_SECRET=

# NextAuth
AUTH_SECRET=                # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# Email (optional — enables password reset)
RESEND_API_KEY=
```

### 3. Set Up Database

```bash
npx prisma migrate dev --name init
```

### 4. Run Locally

```bash
npm run dev
```

## Multi-Tenancy

Each guild gets its own workspace at `/{guildSlug}`. Role hierarchy: `GM → OFFICER → MEMBER → TRIALIST`. Officers can manage roster, raids, and announcements. GMs have full settings access.

## Project Structure

```
src/
  app/
    (auth)/          # login, register, forgot/reset password, onboarding
    (dashboard)/
      [guildSlug]/   # all guild pages — overview, roster, raids, logs, mythic-plus, settings
    api/             # per-page data endpoints + auth, raids, roster, logs, mythic-plus
  components/        # shared UI components
  lib/               # auth config, prisma client, WCL client, utilities
prisma/
  schema.prisma      # Guild, Character, RaidEvent, Signup, LogReport, MythicPlusScore, …
```
