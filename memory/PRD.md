# PIR Grain & Pulses - Commodity Trading Dashboard

## Core Architecture
- **Frontend**: React + Shadcn UI (port 3000)
- **Backend**: FastAPI (port 8001, prefix /api)
- **Database**: MongoDB (DB: pir_grain_pulses)
- **Auth**: JWT-based authentication

## What's Been Implemented

### Unified Brokerage Payment Logic (2026-04-01)
- Fixed mismatch between CommissionsPage, TradesPage, and VesselExecutionPage
- All 3 pages now use `trade.invoicePaid` field as unified source of truth for pending brokerage
- VesselExecutionPage: `isAwaitingBrokerage()` helper checks completed/brokerage status + !invoicePaid + has broker
- TradesPage: Year filter includes older completed trades with unpaid brokerage
- DB cleanup: MW1002, PIR-26-AZ8304, RC190126 status updated from 'brokerage' to 'completed' (all paid)
- Verified: BEK446 is the only pending brokerage contract across all pages

### Brokerage Payment Workflow (2026-03-31)
- Split completed contracts: "Awaiting Brokerage Payment" (commission unpaid) vs "Completed" (fully done)
- Contract stays in Awaiting Brokerage on Contracts page until commission invoice is paid
- Orange-themed table section between Completed and Washout

### Contract Completion Validation (2026-03-30)
- Payment Date and SWIFT Copy required before marking contract completed

### Global Search (2026-03-31)
- Full search across contracts, counterparties, vessels
- Turkish character transliteration (English to Turkish matching)
- 700px dropdown with grouped results and status badges

### Header & Layout Updates (2026-03-31)
- Page titles in content area, search box in header bar
- Subtitles removed from all pages

### Vessel Execution B/L Quantity Display (2026-03-30)
- Quantity column shows B/L Quantity when entered, falling back to contract quantity

### Shipment Documents View Button (2026-03-30)
- Added Eye (View) button to all files in Shipment Documents tab

### GAFTA Extension Field (2026-03-26)
- Added GAFTA Extension dropdown in Shipping Terms

### Vessel Nomination Enhancement (2026-03-26)
- Load Port, Seller Surveyor, Load Port Agent alongside vessel name

### Brokerage Invoices Filters (2026-03-25)
- 5 filter dropdowns: Seller, Buyer, Commodity, Origin, Destination

### NewTradePage Compact Layout (2026-03-25)
- All form fields fit in one screen without scrolling

### Core Features
- JWT Auth, Trade CRUD, Counterparties, Reference data, PDF Gen, Email via Resend
- Commissions to Accounting Sync, Accounting Enhancements
- Port Line-Ups (Daily & Monthly), Documentary Instructions, Calendar
- Market Data (Indications, Live Prices, Turkish Exchanges, TMO Tenders, Coaster Freights, Telegram Feed)
- Business Cards OCR, Reports, URL Migration Guard

## Key API Endpoints
- `POST /api/auth/login` - JWT login
- `GET/PUT /api/trades/{id}` - Trade CRUD
- `PATCH /api/trades/{id}/status` - Status change (validates payment date + SWIFT for completion)
- `POST /api/trades/{id}/buyer-payment` - Payment date trigger
- `POST /api/trades/{id}/draft-documents/bulk` - Draft docs bulk upload
- `POST /api/trades/{id}/swift-copy` - SWIFT copy upload
- `GET /api/invoices` - Invoice list (accounting)
- `POST /api/accounting/bank-statements/upload` - Bank statement upload
- `POST /api/port-lineups/monthly/upload` - Monthly lineup upload

## Credentials
- Admin: salih.karagoz / salih123
- Accountant: pir.accounts / pir123

## Prioritized Backlog
### P0
- Full Email Client Integration (Gmail in sidebar) - BLOCKED on user providing Google OAuth credentials
### P1
- Full Server-Side RBAC
### P2
- Refactor market_data.py (extract scrapers)
- TMO Tender copy-to-clipboard
- Automatic daily scraping (KTB/GTB)
- Break down large files (VesselExecutionPage 1200+ lines, TradesPage, PortLineupsPage)
### Clarifications Pending
- Should "CBOT - Soybeans" be removed from Live Prices table?
