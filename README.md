# SHANVIS

> *Precision in Every Frame*

SHANVIS (Shan + Vision) is a specialized e-commerce platform for cameras and lenses, featuring an **AI Rig Builder** shopping agent and a photography-inspired **Motion & Spatial Web** interface.

## Tech Stack

- **Frontend:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Motion:** Lenis, GSAP (ScrollTrigger), Framer Motion
- **AI:** Vercel AI SDK + Google Gemini API
- **Database:** Supabase (PostgreSQL + pgvector)
- **Payments:** PayOS / SePay (VietQR), Stripe
- **Shipping:** GHN / Viettel Post

## Getting Started

Requirements: Node.js 20+, npm, and Docker (for the local Supabase stack).

```bash
npm install
cp .env.example .env.local
npm run db:start      # starts local Supabase, prints the URL and anon key
npm run db:reset      # applies migrations + seed data
npm run dev
```

Open http://localhost:3000.

| Script | Description |
| :--- | :--- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run db:reset` | Re-apply Supabase migrations and seed |
| `npm run db:types` | Generate DB types into `src/types/database.ts` |

## Project Structure

```
src/
  app/                 App Router routes, root layout, global styles
  components/
    ui/                Base UI (button, badge, card, input, spec-chip, focus-frame)
    bento/             Bento grid layout primitives
    layout/            Header, footer, container, logo
  config/              Site config (name, nav)
  data/                Static showcase content
  lib/                 Utilities, spec formatters, Supabase clients
  types/               Domain types (catalog)
supabase/
  migrations/          SQL schema: products, camera_specs, product_embeddings
  seed.sql             Sample catalog for local development
```

## Design System

- **Dark mode first:** background `#0D0D0F`, bento cards `#16161A` with a `rgba(255,255,255,0.08)` border, accent `#FF4D00`.
- **Typography:** Plus Jakarta Sans for UI text, JetBrains Mono (tabular figures) for specs like ISO, aperture and focal length.
- Tokens live in `src/app/globals.css` and are exposed as Tailwind colors (`bg-card`, `text-primary`, `border-border`...).

## Database

| Table | Purpose |
| :--- | :--- |
| `products` | Name, brand, category (`body` / `lens` / `accessory`), price (VND), stock |
| `camera_specs` | Specs as `JSONB`; `mount_type` and `sensor_size` are derived into typed, indexed columns |
| `product_embeddings` | `vector(768)` embeddings with an HNSW index, queried via `match_products()` |

Row Level Security is enabled: the storefront can read active products; writes and embeddings are server-only (service role).

## Branching

- `main` — stable, production-ready code
- `develop` — active development

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md).
