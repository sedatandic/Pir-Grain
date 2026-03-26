# PIR Grain & Pulses - Commodity Trading Dashboard

## Core Architecture
- **Frontend**: React + Shadcn UI (port 3000)
- **Backend**: FastAPI (port 8001, prefix /api)
- **Database**: MongoDB (DB: test_database)
- **Auth**: JWT-based authentication

## What's Been Implemented

### GAFTA Extension Field (2026-03-26)
- Added GAFTA Extension dropdown (Allowed/Not Allowed, default: Allowed) in Shipping Terms after Shipment Period To
- Saved as `gaftaExtension` field on trade

### Vessel Nomination Enhancement (2026-03-26)
- Enhanced Vessel Nomination tab to show Load Port, Seller Surveyor, Load Port Agent alongside vessel name
- All 4 fields editable via dropdown selects (Edit/Save/Cancel flow)
- Vessel name dropdown from 208 vessels, ports from all ports, surveyors and agents from reference data
- Fixed active_url migration guard bug (stale URL in MongoDB)

### Regression Testing (2026-03-26)
- Full regression test after massive UI changes: Frontend 100%, Backend 82% (minor test fixture issues only)
- All pages verified: VesselExecution, Accounting, Commissions, PortLineups, MarketData, Contracts

### Brokerage Invoices Filters (2026-03-25)
- Added 5 filter dropdowns: Seller, Buyer, Commodity, Origin, Destination
- Filters dynamically update summary cards and table totals
- Clear All button when filters active

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
- Last Update labels, All Dates selection

### Vessel Execution UI
- Split into Ongoing (green) and Completed (gray) contract tables
- Tabs: BC, Vessel Nomination, DI, B/L, Shipment Appropriation, Shipment Docs, Payment Date
- Clickable uploaded document filenames

### Documentary Instructions Page
- Full CRUD linked to contracts, PDF generation, email sending

### Market Data Module
- Indications, Live Prices, Turkish Exchanges (KTB+GTB), TMO Tenders, Coaster Freights, Telegram Feed

### Core Features
- JWT Auth, Trade CRUD, Counterparties, Reference data, PDF Gen, Email via Resend
- Port Line-Ups, Business Cards OCR, Calendar, Reports, URL Migration Guard

## Key API Endpoints
- `POST /api/auth/login` - JWT login
- `GET/PUT /api/trades/{id}` - Trade CRUD (includes vessel nomination fields)
- `POST /api/trades/{id}/buyer-payment` - Payment date trigger
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
- Break down large files (VesselExecutionPage, PortLineupsPage)
### Clarifications Pending
- Should "CBOT - Soybeans" be removed from Live Prices table?
