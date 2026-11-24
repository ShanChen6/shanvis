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
    flagship/          Scrollytelling exploded view of the flagship body
    lens-lab/          Aperture / ISO comparison sliders
    rig-builder/       AI Rig Builder chat
    compare/           AI Spec Comparator
    api/rig-builder/   Streaming agent endpoint
  components/
    ui/                Base UI (button, badge, card, input, sheet, spec-chip, focus-frame)
    bento/             Bento grid layout primitives
    layout/            Header, footer, container, logo
    catalog/           Filter panel, active filters, sort, search
    product/           Product card, media, spec table, sample gallery
    cart/              Cart provider, drawer, add-to-cart, compatibility notices
    motion/            Smooth scroll (Lenis) and EVF focus-pull grid
    flagship/          Layered camera illustration and scroll-driven story
    lens-lab/          Compare slider and illustrated scenes
    ai/                Rig chat, kit card, message renderer
    compare/           Product picker, spec diff table, AI verdict
  config/              Site config (name, nav)
  data/                Static showcase content for the home page
  lib/
    catalog/           Data source (Supabase + demo fallback), filters, related products
    cart/              Cart store (localStorage) and mount compatibility rules
    motion/            Reduced-motion / hover hooks, Lenis handle
    optics/            Aperture blur and ISO noise mappings for Lens Lab
    ai/                Gemini model, rig agent + tools, comparison schema
    rate-limit.ts      In-memory per-IP rate limiter
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

## AI

Powered by the Vercel AI SDK (v7) and Google Gemini (`gemini-3.8-flash` by default, override with `GEMINI_MODEL`). Set `GOOGLE_GENERATIVE_AI_API_KEY` to enable; without it, AI pages show a notice and everything else works.

**AI Rig Builder (`/rig-builder`)** — a `ToolLoopAgent` with two tools:

| Tool | What it does |
| :--- | :--- |
| `searchCatalog` | Filters in-stock products by category, mount, sensor, max price, max aperture and keywords; returns compact spec summaries |
| `proposeRig` | Validates a body + lens (+ accessories) kit on the server: products exist and are in stock, mounts match, fixed-lens bodies get no lens, accessories fit, total is within budget |

Kit cards (with **Add the whole kit to cart**) are rendered only from `proposeRig` results with `valid: true`, so the model cannot put an incompatible or out-of-stock kit in front of the customer. Invalid proposals are sent back to the model with the reasons so it can fix them. The endpoint caps message size and history and is rate limited per IP (12 requests/minute, per server instance).

**AI Spec Comparator (`/compare?a=…&b=…`)** — the spec table is rendered from the database; the AI summary (strengths, trade-offs, pick-by-situation, beginner tip) is generated with `Output.object` against a Zod schema, streamed in behind a Suspense boundary and cached per product pair for days.

## Motion

| Effect | Where | Tech |
| :--- | :--- | :--- |
| Inertial smooth scroll | Whole site | Lenis, driven by GSAP's ticker so ScrollTrigger stays in sync |
| EVF focus pull | Product grids | Motion: other cards blur/dim, AF corners lock on, quick-spec readout |
| Shared element transition | Card / home thumbnail → product page | React `<ViewTransition>` (`share="morph"`) with a focus-rack blur |
| Scrollytelling | `/flagship` | GSAP ScrollTrigger scrubbing an exploded, layered SVG camera |
| Compare slider | `/lens-lab` | Aperture (background blur) and ISO (noise) before/after |

Animations only use `transform`, `opacity` and `filter`. With `prefers-reduced-motion: reduce`, Lenis, the focus-pull blur and view-transition animations are off, and the flagship page shows a static exploded view. On touch devices the focus pull is disabled.

## Branching

- `main` — stable, production-ready code
- `develop` — active development

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md).
