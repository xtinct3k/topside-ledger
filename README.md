# Topside Ledger

An ARC Raiders workshop tracker: station levels, upgrade jobs, and every part you still need to haul.

**Stack:** Vite · React 18 · TypeScript · Framer Motion · Zustand (progress persisted to `localStorage`).

## Run locally

Needs Node 18+.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # outputs dist/
npm run typecheck
```

## Deploy to Vercel

Either:

- Push this folder to a GitHub repo, then **Vercel → Add New → Project → Import**. Vercel detects Vite; keep the defaults (build `npm run build`, output `dist`).
- Or from this folder: `npx vercel` (preview) and `npx vercel --prod`.

## Data

Progress lives in each visitor's browser, so nothing is shared between devices. Use the **⋯ menu → Export backup / Import backup** to move it.

Jobs, items and stations are defined in `src/data.ts`. Add an entry to `ITEMS` and reference it from a goal's `req` list.
