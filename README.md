# Infinite Count

A shared counting game for the whole internet. Everyone adds to one number — 1, 2, 3, 4, 5… with no end. Two rules keep it interesting:

- **No repeats or wrong numbers.** Send anything other than the next number and the count resets to 0.
- **No going twice in a row.** Someone else has to count before you can go again, or it resets.

There's also a solo **60-second sprint**: count as high as you can by yourself in one minute (one slip and you're back to 0; your highest number counts).

## Leaderboards

- **All time** — most correct numbers ever sent
- **Last 24 hours** — most correct numbers in the past day
- **60s sprint** — best one-minute sprint score per player

## Tech

- [TanStack Start](https://tanstack.com/start) (React 19, file-based routing, server functions)
- Tailwind CSS 4 + shadcn/ui components
- [Netlify Database](https://docs.netlify.com) (managed Postgres) with Drizzle ORM
- Deployed on Netlify

## Running locally

```bash
pnpm install
netlify dev        # runs the app with Netlify Database emulation
```

Schema changes: edit `db/schema.ts`, then run `npx drizzle-kit generate --name <describe_change>`. Migrations in `netlify/database/migrations/` are applied automatically on deploy.

## Ideas for later

- Real-time push (instead of polling) for very busy rooms
- Optional accounts so players keep their stats across devices
- Per-player rate limiting / anti-bot checks
