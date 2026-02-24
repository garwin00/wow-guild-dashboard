# WoW Guild Dashboard

A multi-tenant admin dashboard for World of Warcraft guilds. Track raid log performance, manage character signups, schedule raids, and build raid rosters.

## Features

- 🔐 **Battle.net OAuth** — Sign in with your Blizzard account
- 🗂️ **Roster Management** — Sync guild roster from Blizzard API, assign roles
- 📅 **Raid Scheduling** — Create events, open signups, manage responses
- 🎯 **Roster Builder** — Drag-and-drop roster composition tool with Discord export
- 📊 **Log Performance** — Warcraft Logs integration: parse %, fight breakdowns, player trends

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **PostgreSQL** + Prisma ORM
- **NextAuth.js v5** (Battle.net OAuth)
- **Tailwind CSS** + shadcn/ui
- **TanStack Query** for data fetching
- **Recharts** for parse charts
- **dnd-kit** for roster drag-and-drop

## APIs

| API | Purpose |
|-----|---------|
| [Blizzard Battle.net API](https://develop.battle.net/documentation/world-of-warcraft) | Character profiles, guild roster, realm data |
| [Warcraft Logs GraphQL API](https://www.warcraftlogs.com/v2-api-docs/warcraft/) | Parse %, fight rankings, report history |

## Getting Started

### 1. Register API Clients

- **Battle.net**: https://develop.battle.net/access/clients  
  Redirect URI: `http://localhost:3000/api/auth/callback/battlenet`
- **Warcraft Logs**: https://www.warcraftlogs.com/api/clients  

### 2. Configure Environment

Copy `.env.local` and fill in your values:

```env
DATABASE_URL=postgresql://...
BLIZZARD_CLIENT_ID=
BLIZZARD_CLIENT_SECRET=
BLIZZARD_REGION=eu
WCL_CLIENT_ID=
WCL_CLIENT_SECRET=
NEXTAUTH_SECRET=     # openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
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

Each guild gets its own workspace at `/{guildSlug}`. Guild Masters can invite members and officers. Role hierarchy: `GM > OFFICER > MEMBER > TRIALIST`.
