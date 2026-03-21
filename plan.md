# plan.md

## 1) Objectives
- Clone the “PIR GRAIN & PULSES” commodity trading dashboard UX and core workflows.
- Deliver an MVP with working CRUD for Trades + Counterparties + Vessels + Shipment Docs, plus Dashboard + Calendar views.
- Implement a simple, reliable backend (FastAPI + MongoDB/motor) and a responsive frontend (React + Tailwind + shadcn/ui).
- Ensure all routes, sidebar nav, status badges, and core interactions match the reference app closely.

## 2) Implementation Steps

### Phase 1: Core Function/Feature POC (Isolation) — Not required
- App complexity is CRUD + simple auth + file upload; proceed directly to V1 build.

### Phase 2: V1 App Development (MVP)
**User stories (V1)**
1. As a user, I want to sign in with a demo username/password so I can access the dashboard.
2. As a user, I want to create a trade with key commercial + shipment fields so I can track a deal end-to-end.
3. As a user, I want to change a trade’s status through the predefined pipeline so I can track progress.
4. As a user, I want to manage counterparties (buyers/sellers/co-brokers) so I can reuse them in trades.
5. As a user, I want to upload and attach shipment documents to a trade so I can keep all files centralized.
6. As a user, I want a dashboard overview (active/pending/completed + progress + upcoming events) so I can see the current state quickly.

**Backend (FastAPI + MongoDB)**
- Data layer
  - Collections: users, trades, partners, vessels, documents, commodities, origins, ports, surveyors.
  - Pydantic models + CRUD service functions; ensure `createdAt/updatedAt` timestamps.
  - Trade reference generator: `generateTradeReference()` (human-friendly, unique).
- Auth (MVP)
  - Simple JWT login endpoint (demo user seeded); protect non-login routes.
  - Storage keys aligned with reverse engineering intent (e.g., `pir_auth`).
- API endpoints
  - `/auth/login`, `/auth/me`
  - `/trades` (list/create), `/trades/{id}` (get/update/delete)
  - `/partners` + filters by `type` for buyers/sellers/co-brokers
  - `/vessels` CRUD
  - `/documents` CRUD + upload endpoint (store metadata; file storage local disk for MVP)
  - Reference lists: `/commodities`, `/origins`, `/ports`, `/surveyors` CRUD-lite
- File upload
  - Multipart upload; save files under `/app/backend/uploads`; return URL for frontend.

**Frontend (React + Tailwind + shadcn/ui)**
- App shell + layout
  - Sidebar with exact nav structure + collapsible “Counterparties” section.
  - Top header with theme toggle + user menu (logout).
  - Route guard: redirect to `/login` when unauthenticated.
- Pages
  - `/login`: match card layout/colors; show demo credentials.
  - `/dashboard`: stat cards + trade progress + upcoming events widget + “Welcome back” copy.
  - `/trades`: table + search/filter + “New Trade” modal/drawer; edit/delete; status badge colors.
  - `/partners` + subroutes buyers/sellers/co-brokers: table + create/edit.
  - `/vessels`: table + create/edit.
  - `/documents`: list + upload + link to trade.
  - `/calendar`: simple month/week list view driven by trade shipment windows + manual events.
  - `/commissions`, `/reports`, `/settings`: MVP placeholders with consistent layout (avoid dead links).
- State/hooks
  - `useLocalStorage` + domain hooks (`useTrades`, `usePartners`, etc.) consistent with reverse-engineered naming.
  - Axios client with auth header; robust empty/loading/error states.

**Seed data**
- Seed demo user + a few partners/trades to populate dashboard and validate UI.

**End of Phase 2: Testing**
- Run one full E2E pass with testing agent:
  - Login → Dashboard renders stats
  - Create partner → Create trade using partner
  - Update trade status → reflects on dashboard
  - Upload doc → appears on documents list + trade association

### Phase 3: Adding More Features (Production-friendly hardening)
**User stories (Expansion)**
1. As a user, I want inline editing for trade status steps so updates are fast.
2. As a user, I want configurable master data (commodities/origins/ports/surveyors) so the system matches my business.
3. As a user, I want richer reports (by commodity/origin/status/date range) so I can analyze performance.
4. As a user, I want accounting entries/brokerage invoices tied to trades so I can track commissions.
5. As a user, I want calendar reminders and upcoming-deadline highlighting so I don’t miss shipment windows.
- Documents
  - Add document type labels + status tags; better file preview/download.
- Trades
  - Add advanced filters (status, date range, commodity, buyer/seller) + pagination.
  - Enforce trade status order rules (optional toggle).
- Accounting (/commissions)
  - Minimal invoice entity linked to trade; export CSV.
- Reports
  - Recharts visuals for status distribution and monthly volume.
- Testing
  - One E2E pass validating new filters, invoice creation, reports rendering.

### Phase 4: Auth/Role + Robustness + Polish
**User stories (Polish)**
1. As an admin, I want to manage users and roles so access is controlled.
2. As a user, I want session expiry + re-login prompts so security is clear.
3. As a user, I want optimistic UI + toasts for saves/errors so interactions feel reliable.
4. As a user, I want consistent empty states across pages so I always know what to do next.
5. As a user, I want import/export for partners/trades so onboarding data is easy.
- Proper RBAC (admin vs user), user management UI.
- Harden backend validation, indexes, and unique constraints (tradeRef).
- Add comprehensive regression tests (pytest) for API + basic frontend smoke tests.

## 3) Next Actions
1. Implement backend models + CRUD for partners/trades/vessels/documents and seed demo user.
2. Implement frontend app shell + sidebar + routing + auth guard.
3. Build `/login` and verify JWT flow end-to-end.
4. Build `/trades` CRUD + status pipeline + dashboard stats.
5. Add documents upload + documents page; run Phase-2 E2E test round.

## 4) Success Criteria
- All listed routes exist and are reachable from the sidebar; no dead navigation.
- Login works with demo credentials; protected pages redirect to `/login`.
- Trades CRUD works; statuses display as colored badges and update correctly.
- Counterparties CRUD works with buyer/seller/co-broker filtering.
- Documents can be uploaded, stored, listed, downloaded, and linked to trades.
- Dashboard shows correct counts and “Upcoming Events” derived from shipment windows.
- One full E2E test run passes without critical bugs or broken flows.
