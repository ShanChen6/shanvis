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
| `npm test` | Unit and integration tests (Vitest) |
| `npm run images:optimize -- <dir>` | Convert photos to AVIF + WebP masters (see [Images](#images)) |
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
    checkout/          Checkout form + server actions
    orders/[publicId]/ Order page with VietQR and live payment status
    admin/             Admin: login, orders, inventory, new product
    api/payments/      PayOS webhook, demo transfer simulation
    api/orders/        Order status (polled by the order page)
    api/shipping/      GHN address master data
  proxy.ts             Redirects signed-out visitors away from /admin
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
    checkout/ orders/ admin/  Checkout, order and admin UI
  config/              Site config (name, nav)
  data/                Static showcase content for the home page
  lib/
    catalog/           Data source (Supabase + demo fallback), filters, related products
    cart/              Cart store (localStorage) and mount compatibility rules
    motion/            Reduced-motion / hover hooks, Lenis handle
    optics/            Aperture blur and ISO noise mappings for Lens Lab
    ai/                Gemini model, rig agent + tools, comparison schema
    media/             Which image URLs next/image may optimize
    rate-limit.ts      In-memory per-IP rate limiter
    store/             Orders + catalog writes: Supabase backend and in-memory demo backend
    payments/          PayOS provider, demo provider, webhook handling
    shipping/          GHN client, parcel/insurance rules, flat-rate fallback
    checkout/          Checkout validation schema
    admin/             Admin session auth, product form schema
    supabase/          Supabase clients (browser, server, public, admin)
  types/               Domain types (catalog)
scripts/
  optimize-images.mjs  Convert product / sample photos to AVIF + WebP masters
supabase/
  migrations/          SQL schema: products, camera_specs, product_embeddings
  seed.sql             Sample catalog for local development
  tests/orders.sql     Scenario tests for the order SQL functions
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
| `orders`, `order_items`, `order_payments` | Orders with price snapshots, stock reservations and every bank transfer received |
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

## Checkout, Payments & Shipping

1. **Checkout (`/checkout`)** — contact + delivery address. The server re-prices every line from the database, re-checks mount compatibility, quotes shipping and calls `place_order`, which **reserves stock atomically** (all lines or nothing).
2. **Payment** — a PayOS payment link is created for the order (15-minute window, transfer note `SV<orderCode>` to fit PayOS's 9-character limit). The order page renders the **VietQR** code server-side and polls the status every 2 s.
3. **Webhook (`/api/payments/payos/webhook`)** — the signature is verified with the official `@payos/node` SDK before anything is recorded. `record_order_payment` is idempotent per bank reference, adds up partial transfers, and flags under/over-payments or late payments without stock in `needs_attention` for the admin.
4. **Expiry** — unpaid orders expire after the window and release their stock.

| Mode | When | Behaviour |
| :--- | :--- | :--- |
| PayOS | `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` set | Real VietQR transfers. PayOS has no sandbox: test with small amounts. Register the webhook URL in my.payos.vn. |
| Demo | PayOS not configured, in development (or `ALLOW_DEMO_PAYMENTS=true`) | A "Simulate bank transfer" button sends a signed webhook through the same verification path. **Refused in production by default.** |
| Disabled | Production without PayOS | Checkout shows that online payment is unavailable. |

**Shipping** — with `GHN_TOKEN`/`GHN_SHOP_ID`, the address is picked from GHN's province/district/ward lists and the fee comes from GHN's fee API (standard service). Parcel weight is computed from product weights plus packaging. The declared value for insurance is the order subtotal **capped at 5,000,000 VND** (GHN's documented maximum, configurable), and the checkout says so when an order is worth more. Without GHN a flat fee is used.

> GHN's developer portal blocks automated access, so endpoint/field names were cross-checked against a maintained SDK rather than the portal itself. Verify against a GHN dev account (`GHN_ENV=dev`) before going live.

## Admin (`/admin`)

Set `ADMIN_PASSWORD` (12+ characters) to enable. Sessions are HMAC-signed, `HttpOnly`, `SameSite=Strict` cookies scoped to `/admin` and expire after 8 hours; login attempts are rate limited. `proxy.ts` redirects signed-out visitors, and every admin page and server action checks the session again.

- **Orders** — status filters, stats, orders needing attention; mark paid orders as shipped with a tracking code, cancel unpaid orders (releases stock).
- **Inventory** — edit stock, hide/publish products, see which products have a search vector and generate missing ones.
- **New product** — body / lens / accessory form with spec validation. Saving creates the product and its specs in one transaction and generates a 768-dim Gemini embedding into `product_embeddings` (skipped if AI is not configured).

## Demo mode

With no Supabase URL configured, the app runs fully in memory: the demo catalog, orders, stock and admin edits live in the server process and reset on restart. This is for local development only.

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

Animations run on the GPU: scroll-driven and hover motion only changes `transform` and `opacity`.

- **Focus pull** fades in a veil with a fixed `backdrop-filter` blur instead of animating `filter` on each card.
- **Compare slider** moves two composited layers with `translateX` instead of re-clipping (and re-blurring) the scene on every pointer move.
- **Flagship** chapters have no backdrop blur over the animating 3D camera, which phones would re-blur every frame.
- **View transitions** keep the focus-rack blur on desktop (it runs on the compositor); touch devices get transform + opacity only.

With `prefers-reduced-motion: reduce`, Lenis, the focus pull, view-transition animations and smooth chat scrolling are off, CSS animations and transitions are cut to ~0 ms, and the flagship page shows a static exploded view. On touch devices the focus pull is disabled.

## Images

Product photos (`products.images`) and sample shots (`sample_photos.image_url`) are rendered with `next/image`, which serves **AVIF** (or **WebP** for browsers without AVIF) at the width the layout needs:

- `formats: ["image/avif", "image/webp"]`, qualities `[60, 75]`, device sizes up to 2560 px, 31-day cache for optimized variants.
- Only `/images/**` (no query string) and Supabase public storage URLs are optimized. Any other URL renders the tinted placeholder instead of failing the page (`src/lib/media/image-src.ts`).
- Every image has a `sizes` hint; only the product page hero is preloaded.

To prepare new photos, convert the originals once:

```bash
npm run images:optimize -- ./photos/originals public/images   # or any output dir to upload to Supabase Storage
```

The script applies EXIF orientation, converts to sRGB, caps the long edge at 2400 px (`--max=`), strips all metadata (GPS, serial numbers) and writes `<name>.avif` + `<name>.webp`. Files that are already up to date are skipped (`--force` to redo).

## Testing

```bash
npm test          # Vitest: unit + integration
npm run typecheck
npm run lint
```

| Suite | What it covers |
| :--- | :--- |
| `src/app/checkout/order-flow.test.ts` | The real checkout server action, PayOS webhook, demo transfer and order status routes against the in-memory store: happy path, incompatible kits, sold-out items, payment link failure (order cancelled, stock released), forged/tampered/unsigned webhooks, failed transfers, retries, under/over-payment, expiry and late payment |
| `src/lib/ai/rig-accuracy.test.ts` | Every body x lens and body x accessory pair in the catalog checked against an independent mount oracle; crop-mode warnings; agreement between the AI Rig Builder and the smart cart; `searchCatalog` mount filters |
| `supabase/tests/orders.sql` | The same order scenarios against the SQL functions (run with `psql` after `npm run db:reset`, see the file header) |

Before a release, also run the production build and click through checkout with demo payments: `npm run build && ALLOW_DEMO_PAYMENTS=true npm start`.

## Branching

- `main` — stable, production-ready code
- `develop` — active development

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md).
