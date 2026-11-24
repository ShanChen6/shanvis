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

> **Demo mode:** if `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are not set, the storefront serves the built-in demo catalog (`src/lib/catalog/demo-data.ts`, same data as `supabase/seed.sql`), so you can run `npm run dev` without a database.

| Script | Description |
| :--- | :--- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (Vitest) |
| `npm run db:reset` | Re-apply Supabase migrations and seed |
| `npm run db:types` | Generate DB types into `src/types/database.ts` |

## Project Structure

```
src/
  app/
    products/          Catalog listing with filters (/products)
    products/[slug]/   Product detail page
  components/
    ui/                Base UI (button, badge, card, input, sheet, spec-chip, focus-frame)
    bento/             Bento grid layout primitives
    layout/            Header, footer, container, logo
    catalog/           Filter panel, active filters, sort, search
    product/           Product card, media, spec table, sample gallery
    cart/              Cart provider, drawer, add-to-cart, compatibility notices
  config/              Site config (name, nav)
  data/                Static showcase content for the home page
  lib/
    catalog/           Data source (Supabase + demo fallback), filters, related products
    cart/              Cart store (localStorage) and mount compatibility rules
    supabase/          Supabase clients (browser, server, public, admin)
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
| `sample_photos` | Sample gallery photos with EXIF (`JSONB`) |
| `product_embeddings` | `vector(768)` embeddings with an HNSW index, queried via `match_products()` |

Row Level Security is enabled: the storefront can read active products; writes and embeddings are server-only (service role).

## Storefront

- **Catalog (`/products`)** — filters live in the URL (`?mount=sony-e&category=lens&sort=price-asc`) and are rendered on the server, so they work without JavaScript and are shareable. Options within a group are OR-ed, groups are AND-ed, and each option shows how many products it would return.
- **Product page (`/products/[slug]`)** — key specs, full spec table, sample gallery with EXIF tags, and compatible bodies/lenses.
- **Smart cart** — persisted in `localStorage` and synced across tabs. Every change is checked by `checkCartCompatibility()`:
  - lens mount doesn't match any body in the cart → error
  - interchangeable lens with only a fixed-lens body (e.g. X100VI) → error
  - APS-C lens on a full-frame body → warning (crop mode)
  - mount-specific accessory that fits no body → warning

## Branching

- `main` — stable, production-ready code
- `develop` — active development

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md).
