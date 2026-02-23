# Haunt

> See your Ghost databases as pixel art ghosts in a haunted mansion.

Each database is a ghost. Its size, activity, cache health, and status are reflected as visual properties — no charts, no tables, just ghosts.

## Quick Start

```bash
# Install
npm install

# Run with mock data (no Ghost connection needed)
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

| Stat | Visual Cue |
|------|-----------|
| Database size | Ghost physical size (bigger DB = bigger ghost) |
| Query activity | Movement speed and glow (busy = fast + bright) |
| Cache hit ratio | Expression (happy = healthy, sweating = poor) |
| Status | Running = floating, Paused = sleeping with Zzz |
| Table count | Badge below ghost |

## Ghost MCP Bridge

Haunt talks to Ghost through a bridge server:

```bash
cd server
npm install
npm start
```

Set `NEXT_PUBLIC_USE_MOCK=false` in `.env.local` to use live data.

## Tech Stack

- Next.js (App Router)
- Canvas 2D pixel art rendering
- TypeScript
- Ghost MCP (data source)

## Project Structure

```
src/
  app/          # Next.js pages and API routes
  components/   # MansionCanvas React component
  hooks/        # useGhostData, useAnimationLoop
  lib/          # Types, sprites, renderer, constants
server/         # Ghost MCP bridge (Express)
```
