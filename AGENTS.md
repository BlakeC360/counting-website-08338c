# AGENTS.md

This document describes the project for developers and AI agents working on this codebase.

## Project Overview

**Infinite Count** is a shared, never-ending counting game. Everyone on the site adds to one global number (1, 2, 3, …). If a player sends the wrong number (including a repeat of the current one) or counts twice in a row, the count resets to 0. A solo "60-second sprint" mode lets players see how high they can count alone in a minute. Three leaderboards show the most correct numbers all time, in the last 24 hours, and the best sprint scores.

### Game architecture

- **Data:** Netlify Database (Postgres) via Drizzle ORM. Schema in `db/schema.ts`; client in `db/index.ts` (lazily created, so importing it never needs `NETLIFY_DB_URL`). Migrations live in `netlify/database/migrations/` and are generated with `npx drizzle-kit generate --name <name>` — never hand-edit or apply them.
  - `game_state` — singleton row `id = 1` with the live count, who counted last, the all-time record, and details of the last reset. Created on demand with `ON CONFLICT DO NOTHING`.
  - `players` — anonymous players (random UUID from localStorage + display name) and a denormalised `total_count` used by the all-time board.
  - `counts` — log of every number sent (`ok` true/false, `reason` = `double` | `wrong`). Drives the 24h board and the recent feed.
  - `sprints` — one row per sprint attempt; the score is accepted only if ~60s passed server-side and the score is plausible (≤ 600).
- **Server logic:** `src/lib/game.functions.ts` (TanStack Start server functions). The counting move is a single atomic `UPDATE … WHERE current + 1 = n AND last_player_id IS DISTINCT FROM me`, so concurrent sends can't both succeed; if it matches no row, the count is reset.
- **Identity:** Google sign-in via Netlify Identity (`@netlify/identity`). `src/components/AuthProvider.tsx` handles the OAuth callback and loads the player via `getMe`. Server functions use `requirePlayer` / `requireActivePlayer` / `requireAdmin` middleware from `src/lib/auth.functions.ts`; server-only helpers (DB access) live in `src/lib/auth.server.ts` so the browser bundle never imports `db/` (doing so breaks hydration); the player is resolved from the Identity user (`players.user_id`), never from client input. Pre-sign-in players are claimed once via the old localStorage id. Admins = `ADMIN_EMAILS` in `auth.server.ts` or the Identity `admin` role. Player ids sent to the browser are one-way hashed (`publicId`).
- **Admin:** `/admin` (`src/routes/admin.tsx`, `src/lib/admin.functions.ts`) — search players, set coin balance, ban/unban. "Testing tools" (`adminUnlockEverything`) gives the admin's own player every cosmetic plus enough season XP to claim every reward. Banned players can't count, sprint, claim, buy or equip, and are hidden from leaderboards.
- **Boosts:** every 10 numbers in the current streak adds +0.5x XP and +0.25x coins (`boostFor` in `src/lib/season.ts`); fractional coins accrue in `players.boost_coins`.
- **Season catalog:** titles, badges (`public/badges/`), name fonts, rewards and sprint title thresholds live in `src/lib/season.ts`.
- **Number animations:** `NUMBER_ANIMS` in `src/lib/season.ts` (owned in `player_number_anims`, equipped in `players.number_anim`). `AnimatedNumber` renders the live count with the animation of whoever sent the current number (`lastPlayerAnim`). Styles are the `.num-anim-*` classes in `src/styles.css`; the 8-Bit one uses the Press Start 2P font.
- **Picture nametags:** reward nametags can show a picture (`src/components/count/NametagScenes.tsx`, mapped in `Nametag.tsx`) instead of an emoji. Cabin Campfire uses AI-generated photos in `public/nametags/`.
- **Names:** `Nametag` renders all display names non-selectable/non-copyable and applies the equipped name font.
- **UI:** `src/routes/index.tsx` (page, loader for SSR data), `src/components/count/` (`LiveCounter`, `SprintMode`, `Leaderboards`, `NameForm`). Live state polls every 1.5s; leaderboards every 10s and after each count/sprint.
- **Theme:** always dark (`className="dark"` on `<html>`); palette in the `.dark` block of `src/styles.css`. Fonts: Bricolage Grotesque (headings, `font-display`) and JetBrains Mono (numbers, `font-mono`), loaded from Google Fonts in `__root.tsx`.

### Tech Stack

| Layer         | Technology                                          |
| ------------- | --------------------------------------------------- |
| Framework     | TanStack Start                                      |
| Frontend      | React 19, TanStack Router                           |
| Build         | Vite 8                                              |
| Styling       | Tailwind CSS 4, theme variables in `src/styles.css` |
| UI Components | shadcn/ui (Radix UI + Tailwind)                     |
| Toasts        | sonner                                              |
| Icons         | lucide-react                                        |
| Language      | TypeScript 6.0 (strict mode)                        |
| Deployment    | Netlify, via `@netlify/vite-plugin-tanstack-start`  |

## Directory Structure

```
├── public
│   └── favicon.ico
├── src
│   ├── components
│   │   ├── error-pages.tsx # Themed 404 and route error pages with home/retry actions.
│   │   └── ui          # shadcn/ui controls, overlays, feedback, forms, and tables.
│   ├── examples
│   │   └── validated-form.tsx # Unmounted form pattern with validation, pending, error, and success states.
│   ├── lib
│   │   └── utils.ts    # cn() helper for merging Tailwind classes.
│   ├── routes
│   │   ├── __root.tsx  # HTML shell, <head> metadata (siteName, siteDescription), the tooltip provider, and the toast container.
│   │   └── index.tsx   # Home route (/): placeholder page to replace.
│   ├── router.tsx      # Creates the router from the generated route tree.
│   └── styles.css      # Tailwind import, theme variables for light and dark mode, base styles.
├── components.json     # shadcn/ui config, used by `npx shadcn add`.
├── netlify.toml        # Build command, publish directory, dev server ports.
├── package.json
├── tsconfig.json
└── vite.config.ts      # Vite path aliases and Tailwind, Netlify, TanStack Start, React plugins.
```

`src/routeTree.gen.ts` is generated by the router plugin when the dev server or build runs. Don't edit it.

Shared framework skill source lives in `frameworks/tanstack-start-react/.claude/skills` in this repository, separate from the standalone starter. Consult the matching framework/Netlify skills when available in a generated app; don't assume the starter contains a `.claude` directory.

## Key Concepts

### File-Based Routing

Route files in `src/routes/` define pages and endpoints:

- `__root.tsx` wraps every page.
- `index.tsx` is `/`.
- `about.tsx` would be `/about`.
- `api.*.ts` files are server API endpoints. See the `tanstack-start-api-routes` skill.

### Theme Variables

Colors and corner radius are CSS variables in `src/styles.css` (`--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--radius`, and more), with a second set under `.dark`. Tailwind exposes them as classes such as `bg-primary`, `text-muted-foreground`, and `border-border`.

Set these variables for the product before you build any page. In components, use the variable classes instead of raw colors like `bg-white` or `text-gray-600`, so the whole site changes when a variable changes.

### UI Components

Ready-made components are in `src/components/ui/`. Use them before writing your own, and restyle them through the theme variables or their variants. Add more with `npx shadcn add <name>`. Show a toast by calling `toast()` from `sonner`; the container is already mounted in `__root.tsx`. `TooltipProvider` is mounted there too, so `Tooltip` works anywhere without its own provider.

| Need               | Components                                                         |
| ------------------ | ------------------------------------------------------------------ |
| Actions and status | Button, Badge, Progress, Skeleton, Alert, Sonner                   |
| Forms              | Input, Textarea, Label, Checkbox, RadioGroup, Switch, Select, Form |
| Overlays and menus | Dialog, Sheet, Popover, DropdownMenu, Tooltip                      |
| Content and layout | Card, Tabs, Accordion, Separator, Table                            |

Use `Form` with React Hook Form and the Zod resolver. Start from `src/examples/validated-form.tsx`; it isn't mounted or connected to a backend. Its required `onSubmit` callback must reject on failure. See [the form pattern](docs/forms.md) for HTTP submission and error handling.

Use Sheet for a mobile menu and DropdownMenu for short action lists. Give Dialog and Sheet an accessible title and description. Pair Checkbox, RadioGroup, Switch, and inputs with visible labels. Reserve tables for tabular data and wrap them in their provided scroll container.

### Design Choices

Set the product's palette, heading/body fonts, and layout before building its screens. Use an explicit user design when supplied; otherwise choose defaults that fit the product. Keep Basic's placeholder until you replace it with the requested product.

- Set `--font-body` and `--font-heading` in `src/styles.css`. Use `font-display` for headings when the product needs a separate heading font.
- Use `max-w-content` for a page container and `max-w-reading` for long text. Keep consistent horizontal padding, such as `px-4 sm:px-6`, and a small repeated spacing scale, such as `gap-4`, `gap-6`, and `py-12`.
- Keep one main heading per page and a clear heading order. Use muted text for supporting copy, not essential low-contrast labels.
- Preserve focus rings. Give icon-only buttons an accessible name. Ensure actions work with a keyboard and on narrow screens.
- Use short color/opacity transitions. Add `motion-reduce:transition-none` or `motion-reduce:animate-none` when adding motion; don't make essential content depend on animation.
- Provide loading, empty, error, and success states for each data-driven screen. Skeletons should follow the shape of the content they replace.

### Routing and Server Data

Router types are registered in `src/router.tsx`, so use typed `Link` destinations and route parameters. The root route supplies the themed 404 page; the router's default error component supplies the safe retry/home page, including child-route SSR failures. Use `throw notFound()` for absent records; keep unexpected failures on the error path. See [routing conventions](src/routes/README.md).

Start with route loaders and server functions for server data. Validate server-function input with `.validator(...)`, keep secrets on the server, and handle HTTP failures before returning data. See [the data-fetching pattern](docs/data-fetching.md). Add TanStack Query only when client-side caching, mutations, or background refresh are needed.

### Browser Storage

Pages are rendered on the server first, where `window` and `localStorage` don't exist. Read `localStorage` inside `useEffect`, not during render or in a `useState` initializer, or the first render will differ from the server HTML and React will log a hydration error.

## Configuration Files

| File             | Purpose                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| `vite.config.ts` | Vite path aliases and Tailwind, Netlify, TanStack Start, React plugins                           |
| `tsconfig.json`  | Strict TypeScript, with the `@/*` alias for `src/*`                                              |
| `netlify.toml`   | Builds with `vite build`, publishes `dist/client`, dev server on port 8888 proxying Vite on 3000 |

## Development Commands

Use Node 22.13+ on the Node 22 line, Node 24, or Node 26+. The installed lint and test tools set this minimum alongside the framework.

```bash
npm run dev        # Start the Vite dev server on port 3000
npm run build      # Production build
npm run typecheck  # Type-check with tsc; the build doesn't
npm run lint       # Check TypeScript and React Hooks rules
npm run format:check # Check formatting
npm run format     # Format project files
npm test           # Run local form, control, and error page tests
npm run preview    # Preview the production build
```

## Conventions

- Components: PascalCase. Utilities and hooks: camelCase. Route files: kebab-case.
- Import from `src` with the `@/` alias.
- TypeScript fails on unused locals and parameters, so remove what you don't use.
- Use React hooks for state.
- Run the dev server or build once to generate route types before type-checking a fresh copy.
- Run build, typecheck, lint, format:check, and tests before reporting completion. Verify changed user flows locally; a passing build doesn't prove an interaction works.

## Application Name

Set the product's name and description in `src/routes/__root.tsx`:

- `siteName` is the page title and the title shown when the link is shared.
- `siteDescription` is the meta description and the description shown when the link is shared.

Then replace the placeholder heading and text in `src/routes/index.tsx`.
