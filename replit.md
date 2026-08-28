# Documenta

AI-ready personal document and administration assistant for Android and iOS, with a German-first, multilingual-ready interface.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/mobile-app/app/` — Expo Router screens and navigation
- `artifacts/mobile-app/context/AppContext.tsx` — local document model and AsyncStorage persistence
- `artifacts/mobile-app/constants/colors.ts` — semantic mobile theme tokens

## Architecture decisions

- Version one is offline-first: document metadata and local file URIs stay in AsyncStorage.
- Document acquisition and document metadata entry are separate routes.
- The document model already reserves fields for later OCR and integration-driven enrichment.
- Gmail, Outlook, Calendar, banking, AI/OCR, and subscriptions remain intentionally out of scope until requested.

## Product

- Add documents using the camera, image library, or PDF file picker.
- Capture structured German-language document details with type-dependent statuses.
- Browse saved documents and see newly saved items immediately on the dashboard.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
