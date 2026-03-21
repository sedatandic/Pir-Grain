# plan.md

## 1) Objectives
- **Completed:** Clone the “PIR GRAIN & PULSES” commodity trading dashboard UX and core workflows.
- **Completed:** Deliver an MVP with working CRUD for Trades + Counterparties + Vessels + Shipment Docs, plus Dashboard + Calendar views.
- **Completed:** Implement a simple, reliable backend (FastAPI + MongoDB) and a responsive frontend (React + Tailwind + shadcn/ui).
- **Completed:** Ensure all routes, sidebar nav, status badges, and core interactions match the reference app closely.
- **Current objective:** Transition from MVP to “production-friendly hardening” (data quality, reporting depth, master-data management UI, and role-based access) while maintaining the cloned look/feel.

## 2) Implementation Steps

### Phase 1: Core Function/Feature POC (Isolation) — Not required
- App complexity is CRUD + simple auth + file upload; proceeded directly to V1 build.

### Phase 2: V1 App Development (MVP) — **Completed**
**User stories (V1) — Completed**
1. ✅ As a user, I want to sign in with a demo username/password so I can access the dashboard.
2. ✅ As a user, I want to create a trade with key commercial + shipment fields so I can track a deal end-to-end.
3. ✅ As a user, I want to change a trade’s status through the predefined pipeline so I can track progress.
4. ✅ As a user, I want to manage counterparties (buyers/sellers/co-brokers) so I can reuse them in trades.
5. ✅ As a user, I want to upload and attach shipment documents to a trade so I can keep all files centralized.
6. ✅ As a user, I want a dashboard overview (active/pending/completed + progress + upcoming events) so I can see the current state quickly.

**Backend (FastAPI + MongoDB) — Completed**
- Data layer
  - ✅ Collections implemented: `users`, `trades`, `partners`, `vessels`, `documents`, `commodities`, `origins`, `ports`, `surveyors`, `events`.
  - ✅ Pydantic models + CRUD endpoints; timestamps (`createdAt/updatedAt`) on core entities.
  - ✅ Trade reference generator: `generate_trade_ref()`.
- Auth (MVP)
  - ✅ JWT login endpoint; protected routes.
  - ✅ Demo user seeded: `salihkaragoz / salih123`.
- API endpoints (implemented)
  - ✅ `/api/auth/login`, `/api/auth/me`
  - ✅ `/api/trades` (list/create), `/api/trades/{id}` (get/update/delete)
  - ✅ `/api/trades/stats/overview` (dashboard KPIs)
  - ✅ `/api/partners` + filter by `type`
  - ✅ `/api/vessels` CRUD
  - ✅ `/api/documents` list/delete + upload via multipart
  - ✅ Reference lists: `/api/commodities`, `/api/origins`, `/api/ports`, `/api/surveyors`
  - ✅ `/api/events` list/create/delete
  - ✅ `/api/uploads/*` static hosting for uploaded files
- File upload
  - ✅ Multipart upload; files stored under `/app/backend/uploads`; returned `fileUrl` used by frontend.

**Frontend (React + Tailwind + shadcn/ui) — Completed**
- App shell + layout
  - ✅ Sidebar with exact nav structure + collapsible “Counterparties” section.
  - ✅ Route guard: redirect to `/login` when unauthenticated.
  - ✅ Logout clears auth and returns to login.
- Pages (implemented)
  - ✅ `/login`: card layout/colors; demo credentials shown; **invalid-credential error display fixed**.
  - ✅ `/dashboard`: KPI cards + trade progress + recent trades + upcoming events.
  - ✅ `/trades`: table + search/filter + modal create/edit + delete confirmation + status badge colors.
  - ✅ `/partners` + buyers/sellers/co-brokers subroutes: table + modal create/edit + delete confirmation.
  - ✅ `/vessels`: table + modal create/edit + delete confirmation.
  - ✅ `/documents`: list + upload dialog + link to trade + download + delete.
  - ✅ `/calendar`: month picker + daily event list + create event dialog.
  - ✅ `/commissions`: brokerage summary derived from trades.
  - ✅ `/reports`: recharts charts + summary stats.
  - ✅ `/settings`: profile display + placeholders for future preferences.
- State/hooks
  - ✅ Auth context (`useAuth`) and Axios client with auth header.
  - ✅ Fixed Axios 401 interceptor to **not** redirect on `/auth/login` (enables inline login error messaging).

**Seed data — Completed**
- ✅ Demo user + partners + trades + vessels + surveyors + events seeded on startup.

**End of Phase 2: Testing — Completed**
- ✅ Full E2E pass executed.
  - Backend: **100% pass**
  - Frontend: **95%+ pass**, remaining issue fixed (login error messaging).

### Phase 3: Adding More Features (Production-friendly hardening) — **Next**
**User stories (Expansion)**
1. As a user, I want inline editing for trade status steps so updates are fast.
2. As a user, I want configurable master data (commodities/origins/ports/surveyors) so the system matches my business.
3. As a user, I want richer reports (by commodity/origin/status/date range) so I can analyze performance.
4. As a user, I want accounting entries/brokerage invoices tied to trades so I can track commissions.
5. As a user, I want calendar reminders and upcoming-deadline highlighting so I don’t miss shipment windows.

**Planned enhancements**
- Documents
  - Add document review states (received/reviewed/approved) and metadata dialog preview.
  - Add filters by `docType`, `tradeRef`, and date range.
- Trades
  - Advanced filters (status, date range, commodity, buyer/seller) + pagination.
  - Optional enforcement of status order transitions.
  - Add trade detail drawer/page for audit-friendly viewing.
- Master data
  - Add UI pages for maintaining commodities/origins/ports/surveyors.
- Accounting (/commissions)
  - Introduce an Invoice/Commission entity linked to trade; export CSV.
- Calendar
  - Derive events from shipment window dates and highlight nearing deadlines.
- Reports
  - Expand charts (monthly volume, completion trend, top counterparties).
- Testing
  - Run one E2E pass validating new filters, invoice creation, and report rendering.

### Phase 4: Auth/Role + Robustness + Polish — **Later**
**User stories (Polish)**
1. As an admin, I want to manage users and roles so access is controlled.
2. As a user, I want session expiry + re-login prompts so security is clear.
3. As a user, I want optimistic UI + toasts for saves/errors so interactions feel reliable.
4. As a user, I want consistent empty states across pages so I always know what to do next.
5. As a user, I want import/export for partners/trades so onboarding data is easy.

**Planned hardening**
- Proper RBAC (admin vs user), user management UI.
- Harden backend validation, indexes, and unique constraints (e.g., `tradeRef`).
- Improve error handling consistency (HTTP status codes, error schemas).
- Add comprehensive regression tests (pytest) for API + basic frontend smoke tests.

## 3) Next Actions
1. Phase 3 kickoff: define the “Trade Details” view + advanced filtering requirements.
2. Add master-data management UI (commodities/origins/ports/surveyors) with CRUD dialogs.
3. Add derived calendar events from shipment windows + deadline highlighting.
4. Introduce brokerage invoice entity + CSV export.
5. Run a second E2E test pass after Phase 3 features land.

## 4) Success Criteria
- ✅ All listed routes exist and are reachable from the sidebar; no dead navigation.
- ✅ Login works with demo credentials; protected pages redirect to `/login`.
- ✅ Invalid login shows an inline error message.
- ✅ Trades CRUD works; statuses display as colored badges and update correctly.
- ✅ Counterparties CRUD works with buyer/seller/co-broker filtering.
- ✅ Documents can be uploaded, stored, listed, downloaded, and linked to trades.
- ✅ Dashboard shows correct counts and Upcoming Events.
- ✅ Calendar works with event creation and date-based filtering.
- ✅ Commissions and Reports pages render correctly with seeded data.
- ✅ One full E2E test run passes without critical bugs or broken flows.
- Phase 3 success (future): master-data UI + advanced filters + invoices + derived calendar events + expanded reports with maintained UX consistency.
