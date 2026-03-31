# PIR Grain & Pulses - Commodity Trading Dashboard

## Core Architecture
- **Frontend**: React + Shadcn UI (port 3000)
- **Backend**: FastAPI (port 8001, prefix /api)
- **Database**: MongoDB (DB: pir_grain_pulses)
- **Auth**: JWT-based authentication

## What's Been Implemented

### Brokerage Payment Workflow (2026-03-31)
- Split completed contracts: "Awaiting Brokerage Payment" (commission unpaid) vs "Completed" (fully done)
- Contract stays in Awaiting Brokerage on Contracts page until commission invoice is paid
- Orange-themed table section between Completed and Washout

### Contract Completion Validation (2026-03-30)
- Payment Date and SWIFT Copy required before marking contract completed

### Global Search (2026-03-31)
- Full search across contracts, counterparties, vessels
- Turkish character transliteration (English → Turkish matching)
- 700px dropdown with grouped results and status badges

### Header & Layout Updates (2026-03-31)
- Page titles in content area, search box in header bar
- Subtitles removed from all pages

### Vessel Execution B/L Quantity Display (2026-03-30)
- Quantity column in contract list tables now shows B/L Quantity when entered, falling back to contract quantity
- Applied to all 3 tables: Ongoing, Pending Vessel Nomination, Completed

### Shipment Documents View Button (2026-03-30)
- Added Eye (View) button to all files in Shipment Documents tab
- Uses blob-based window.open to view files in new tab without downloading
- Applied to both unassigned files and assigned document checklist files

### Regression Testing Pass (2026-03-30)
- Full regression after previous session's massive untested changes (iteration_17)
- Backend: 100% (25/25), Frontend: 100% pass rate
- All pages verified working: VesselExecution, Accounting (RBAC), Commissions, Calendar, MarketData, PortLineups, Settings

### Vessel Execution Empty State Fix (2026-03-30)
- Fixed blank page when no vessel-nominated contracts exist on /documents
- Added "Pending Vessel Nomination" table (amber theme) showing contracts awaiting vessel assignment
- Added empty state with ship icon when zero vessel nominations exist
- Fixed useEffect dependency bug (urlTradeId) so detail view loads correctly when navigating from list
- Fixed backend timezone import and decorator alignment in trades.py

### Regression Testing (2026-03-30)
- Full regression after previous session's massive untested changes
- Backend: 95%, Frontend: 100% pass rate
- Fixed active_url migration guard (stale URL in pir_grain_pulses.app_config)
- All pages verified: VesselExecution (list + detail), Accounting, Commissions, Calendar, MarketData, PortLineups, Settings

### GAFTA Extension Field (2026-03-26)
- Added GAFTA Extension dropdown (Allowed/Not Allowed, default: Allowed) in Shipping Terms after Shipment Period To
- Saved as `gaftaExtension` field on trade

### Vessel Nomination Enhancement (2026-03-26)
- Enhanced Vessel Nomination tab to show Load Port, Seller Surveyor, Load Port Agent alongside vessel name
- All 4 fields editable via dropdown selects (Edit/Save/Cancel flow)
- Vessel name dropdown from 208 vessels, ports from all ports, surveyors and agents from reference data

### Brokerage Invoices Filters (2026-03-25)
- Added 5 filter dropdowns: Seller, Buyer, Commodity, Origin, Destination
- Filters dynamically update summary cards and table totals

### NewTradePage Compact Layout (2026-03-25)
- All form fields fit in one screen without scrolling
- 6 sections: Contract Details, Parties, Commodity, Pricing & Terms, Shipping, Additional

### Commissions to Accounting Sync
- Buyer Payment Date in Vessel Execution triggers: contract completion, invoice generation, accounting entry

### Accounting Enhancements
- Bank Statements file upload, Invoice column with PDF download
- Due Date auto-calculates 15 days (skipping Turkey weekends)

### Port Line-Ups
- Daily and Monthly tabs with Excel upload for Monthly
- Monthly tab matches Daily tab style (dropdown file selector, table layout)

### Vessel Execution UI
- Split into list view (/documents) and detail view (/documents/:tradeId)
- List: Ongoing (green), Completed (gray), Pending Nomination (amber) tables
- Detail: 7 tabs - Nomination, DI, Drafts, B/L, Appropriation, Docs, Payment
- Draft Documents tab with drag-and-drop bulk upload
- SWIFT copy upload on Payment tab
- Mobile: scrollable tabs + contract selector dropdown

### Documentary Instructions Page
- Full CRUD linked to contracts, PDF generation, email sending

### Market Data Module
- Indications, Live Prices, Turkish Exchanges (KTB+GTB), TMO Tenders (4 categories: TMO, SAGO, OAIC, MIT), Coaster Freights, Telegram Feed

### Core Features
- JWT Auth, Trade CRUD, Counterparties, Reference data, PDF Gen, Email via Resend
- Port Line-Ups, Business Cards OCR, Calendar (multi-day events), Reports, URL Migration Guard

## Key API Endpoints
- `POST /api/auth/login` - JWT login
- `GET/PUT /api/trades/{id}` - Trade CRUD (includes vessel nomination fields)
- `POST /api/trades/{id}/buyer-payment` - Payment date trigger
- `POST /api/trades/{id}/draft-documents/bulk` - Draft docs bulk upload
- `POST /api/trades/{id}/swift-copy` - SWIFT copy upload
- `POST /api/accounting/invoices/{id}/file` - Invoice PDF upload
- `POST /api/accounting/bank-statements/upload` - Bank statement upload
- `POST /api/port-lineups/monthly/upload` - Monthly lineup upload
- `GET /api/config/active-url` - URL migration guard

## Credentials
- Admin: salih.karagoz / salih123
- Accountant: pir.accounts / pir123

## Prioritized Backlog
### P0
- Full Email Client Integration (Gmail in sidebar)
### P1
- Full Server-Side RBAC
### P2
- Refactor market_data.py (extract scrapers)
- TMO Tender copy-to-clipboard
- Automatic daily scraping (KTB/GTB)
- Break down large files (VesselExecutionPage 1200+ lines, PortLineupsPage)
### Clarifications Pending
- Should "CBOT - Soybeans" be removed from Live Prices table?
