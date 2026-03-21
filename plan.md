# plan.md

## 1) Objectives
- **Completed:** Clone the “PIR GRAIN & PULSES” commodity trading dashboard to match the **GitHub reference implementation** (`sedatandic/v0-commodity-trading-dashboard`) in both UX and functionality.
- **Completed:** Deliver a working full-stack app with seeded data, auth, CRUD workflows, and dashboard analytics.
- **Completed:** Ensure all routes, sidebar/header layout, categorized trade pipeline, and core interactions align with the reference app.
- **Completed (P0 bugfix):** Fix **logo visibility** on **Login page** and **Sidebar** so the full “PIR Grain and Pulses” logo is displayed correctly (verified via UI screenshots; uses `object-contain` + appropriate sizing).
- **Current objective:** Move from “feature-complete clone” to **production-friendly hardening** (data integrity, RBAC, document status tracking, deeper reporting, and operational polish) while preserving the reference look/feel.

## 2) Implementation Steps

### Phase 1: Core Function/Feature POC (Isolation) — Not required
- App complexity is CRUD + auth + charts + file upload; proceeded directly to build.

### Phase 2: V1 App Development (Initial MVP) — **Completed**
**User stories (V1) — Completed**
1. ✅ As a user, I want to sign in with a demo username/password so I can access the dashboard.
2. ✅ As a user, I want to create and manage trades so I can track deals end-to-end.
3. ✅ As a user, I want to change a trade’s status through a predefined pipeline so I can track progress.
4. ✅ As a user, I want to manage counterparties so I can reuse them in trades.
5. ✅ As a user, I want to upload and attach shipment documents so I can keep files centralized.
6. ✅ As a user, I want a dashboard overview and a calendar so I can see current state quickly.

> Note: Phase 2 produced a working MVP, but the GitHub reference app required a substantial model + UI rewrite which was implemented in Phase 3.

### Phase 3: GitHub-Accurate Rewrite (Source-of-Truth Clone) — **Completed**
A full rewrite was performed to match the GitHub repository’s information architecture, styling, and feature set.

**User stories (GitHub clone) — Completed**
1. ✅ As a user, I can navigate a light-themed sidebar + header shell consistent with the reference UI.
2. ✅ As a user, I can view Trades grouped into **Ongoing / Pending / Completed / Washout / Cancelled** sections.
3. ✅ As a user, I can update trade status **inline from the table**.
4. ✅ As a user, I can create a trade from a dedicated **/trades/new** page.
5. ✅ As a user, I can open a trade detail modal by clicking the **Contract No**.
6. ✅ As a user, I can manage counterparties with tabbed filtering and CRUD dialogs.
7. ✅ As a user, I can manage vessels including basic fleet stats.
8. ✅ As a user, I can view a custom monthly calendar grid and add events.
9. ✅ As a user, I can view brokerage commissions split into sections and totals.
10. ✅ As a user, I can manage accounting invoices in an **Accounting (/omega)** page.
11. ✅ As an admin, I can manage master/reference data and users from **Settings** via tabbed CRUD.

**Backend (FastAPI + MongoDB) — Completed**
- Data layer (updated to GitHub reference)
  - ✅ Collections implemented: `users`, `trades`, `partners`, `vessels`, `documents`, `commodities`, `origins`, `ports`, `surveyors`, `events`, `invoices`.
  - ✅ Trade model aligned to reference: `referenceNumber`, `tolerance`, `deliveryTerm`, `pricePerMT`, `currency`, `incoterms`, `originId`, `loadingPortId`, `dischargePortId`, `vesselName`, `brokeragePerMT`, `totalCommission`, `coBrokerId`, etc.
  - ✅ Partner types expanded: `buyer`, `seller`, `co-broker`, **`broker`** (seeded: PIR / Atria / Nord Star).
  - ✅ Inline status update endpoint: `PATCH /api/trades/{id}/status`.
- Auth
  - ✅ JWT login endpoint; protected routes.
  - ✅ Demo users seeded: `salihkaragoz / salih123` (admin), `piraccount / piraccount123` (accountant).
- API endpoints (implemented)
  - ✅ `/api/auth/login`, `/api/auth/me`
  - ✅ `/api/trades` (list/create), `/api/trades/{id}` (get/update/delete)
  - ✅ `/api/trades/{id}/status` (inline status patch)
  - ✅ `/api/trades/stats/overview` (dashboard KPIs)
  - ✅ `/api/partners` CRUD + filter/search
  - ✅ `/api/vessels` CRUD
  - ✅ `/api/documents` list/delete + upload via multipart
  - ✅ `/api/events` CRUD
  - ✅ Reference lists CRUD: `/api/commodities`, `/api/origins`, `/api/ports`, `/api/surveyors`
  - ✅ User admin endpoints: `/api/users` (list/create/delete)
  - ✅ Accounting endpoints: `/api/invoices` CRUD
  - ✅ `/api/uploads/*` static hosting for uploaded files
- Seed data
  - ✅ Trades, partners, vessels, surveyors, ports/origins/commodities, and events seeded on startup.

**Frontend (React + Tailwind + shadcn/ui) — Completed**
- App shell
  - ✅ Light sidebar (white) with nested “Counterparties” section.
  - ✅ Top header bar with notification bell + user initials/name.
  - ✅ Auth guard redirect to `/login` when unauthenticated.
  - ✅ Logout clears session and returns to login.
- Visual design alignment
  - ✅ Primary color: **navy** (#2B5B84-ish), secondary accent: **lime** (#8BC53F-ish).
  - ✅ Table-heavy layouts with centered cells and grid-like borders matching reference.
- Pages (implemented)
  - ✅ `/login`: reference-styled login + demo credentials + correct invalid-credential inline errors.
  - ✅ `/dashboard`: KPI cards, events list, trade progress with recent trades.
  - ✅ `/trades`: categorized tables + inline status editing + filters + trade detail modal.
  - ✅ `/trades/new`: dedicated creation form with sections.
  - ✅ `/partners` + subroutes: tabbed UX + CRUD dialogs.
  - ✅ `/vessels`: stats cards + CRUD.
  - ✅ `/documents`: contract-based matrix view (doc-type columns) consistent with reference UX.
  - ✅ `/calendar`: custom month grid + add event dialog + sidebar lists.
  - ✅ `/commissions`: brokerage totals + categorized sections.
  - ✅ `/omega`: accounting/invoices CRUD.
  - ✅ `/reports`: pie + bar charts + summary stats.
  - ✅ `/settings`: profile + CRUD tabs for commodities/origins/ports/surveyors/users.
- State + integration
  - ✅ Auth context + Axios client.
  - ✅ 401 interceptor excludes `/auth/login` so login errors render correctly.

**End of Phase 3: Testing — Completed**
- ✅ Full E2E pass executed.
  - Backend: **100% (38/38 tests passed)**
  - Frontend: **100%**
  - Integration: **100%**

### Phase 3.5: UX/Branding Bugfixes — **Completed**
- ✅ **P0 Logo visibility fix**
  - Login: logo displays fully and consistently.
  - Sidebar: logo displays fully in expanded and collapsed states.
  - Verification: confirmed visually with updated UI screenshots.

### Phase 4: Production Hardening + Data Quality + RBAC — **Next**
**User stories (Hardening)**
1. As an admin, I want RBAC enforcement (admin/accountant/user) so access is controlled.
2. As a user, I want stricter validation and uniqueness constraints so data stays clean (e.g., unique `referenceNumber`).
3. As a user, I want document statuses (received/reviewed/approved) so document tracking is actionable.
4. As a user, I want audit-friendly trade details (change history) so compliance is easier.
5. As a user, I want richer reports (date ranges, counterparties, commodity/origin slicing) to analyze performance.

**Planned enhancements (ordered)**
- Auth/RBAC (P0)
  - Enforce permissions **server-side** for master data + user management + accounting.
  - Add role-based navigation gating (hide/disable) on the frontend.
  - Add regression tests for RBAC rules.
- Documents: real status tracking workflow (P1)
  - Add per-document status (`missing/received/reviewed/approved` or similar) and timestamps.
  - Support linking documents to trades by **type** (e.g., BL/Invoice/COA/etc.) and compute completeness.
  - Update `/documents` UI from “matrix placeholder” to actionable per-trade/per-type status and upload actions.
  - Add tests for document upload + status transitions.
- Data integrity + performance (P1)
  - Add DB indexes + unique constraints (Mongo indexes) for `referenceNumber` (and other high-cardinality fields as needed).
  - Add backend validation for numeric ranges (tolerance %, prices, quantities) and date coherence (shipment start <= end).
  - Add pagination for list endpoints (trades/partners/documents) to support growth.
- Reports & exports (P2)
  - Expand charts: monthly volume trend, completion trend, top sellers/buyers, total commission by month.
  - Add filters (date range, status, counterparty, commodity, origin, ports) and export CSV.
- Trades: auditability (P2)
  - Add trade revision/audit log (who/when/what changed).
  - Optional enforcement of status transition ordering.
- Accounting (P2)
  - Tie invoices to trades (optional) + export CSV.
  - Add due/overdue auto-status.
- Testing & verification (continuous)
  - Add regression tests for RBAC, document workflows, and reporting filters.
  - Run another full E2E pass after Phase 4 changes.

## 3) Next Actions
1. **Implement RBAC end-to-end** (backend enforcement + frontend gating) and add RBAC regression coverage.
2. Implement **real document tracking**: per-trade/per-type upload + status workflow + completeness signals in UI.
3. Add **Mongo indexes/constraints** + stricter backend validation; introduce pagination where needed.
4. Expand **reports** with filtering + CSV export.
5. Run a full E2E/regression pass for Phase 4 hardening.

## 4) Success Criteria
- ✅ All listed routes exist and are reachable from the sidebar; no dead navigation.
- ✅ Login works with demo credentials; protected pages redirect to `/login`.
- ✅ Invalid login shows an inline error message.
- ✅ Trades render in categorized sections and inline status changes persist.
- ✅ New Trade flow works via `/trades/new`.
- ✅ Counterparties management works with tabbed filtering and CRUD.
- ✅ Vessels CRUD works and stats render.
- ✅ Calendar renders custom month grid and events can be created.
- ✅ Commissions, Accounting, Reports, and Settings pages render correctly with seeded data.
- ✅ One full E2E test run passes without critical bugs or broken flows.
- ✅ **Logo is fully visible** on Login page and Sidebar (expanded + collapsed).
- **Phase 4 success (next):** RBAC + data integrity constraints + document status workflow + richer reports, while preserving GitHub-reference UX consistency.