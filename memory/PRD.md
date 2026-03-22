# PIR Grain & Pulses - Commodity Trading Dashboard

## Original Problem Statement
Build a comprehensive commodity trading dashboard for PIR Grain & Pulses. The project includes detailed data management for trades and counterparties, UI/UX customizations, role-based access control, notification system, business card scanning, reporting, and PDF document generation.

## Core Architecture
- **Frontend**: React + Shadcn UI (port 3000)
- **Backend**: FastAPI (port 8001, prefix /api)
- **Database**: MongoDB
- **Auth**: JWT-based authentication

## User Personas
- **Admin** (salih.karagoz / salih123): Full access
- **User**: Trade management access
- **Accountant** (pir.accounts / pir123): Financial views

## What's Been Implemented

### Core Features
- JWT Authentication with role-based access
- Trade CRUD with complex data model (commodityDisplayName, cropYear, originAdjective)
- Counterparties/Partners management
- Commodities, Origins, Ports, Surveyors, Disport Agents reference data
- Vessels management
- Calendar/Events
- Notifications system
- Dashboard with trade statistics

### Trade Features
- New/Edit Trade form with all fields (parties, commodity, pricing, shipping, contacts)
- **Loading Port** as separate field from Base Port (fixed 2026-03-22)
- Port Variations with country names stored
- Trade Detail page with tabs (Summary, Shipment B/L, Documents)
- B/L Details dialog with Load Port, Discharge Port, Surveyors, Disport Agent
- Document checklist and bulk upload with drag-and-drop assignment
- Year-based filtering on Trades page

### PDF Generation
- **Business Confirmation PDF** - includes port countries in PRICE section
- **Shipment Appropriation PDF** - with port countries, framed layout
- **Commission Invoice PDF** - single-page professional layout
- All three PDFs share consistent corporate design (PIR logo, stamp, footer)
- Authenticated download via blob URLs

### Other Features
- Business Cards with GPT-4o Vision OCR
- Reports page with dynamic filters (Year, Seller, Buyer, Commodity, Origin)
- Brokerage Invoices with PENDING/PAID workflow
- Bank Accounts management in Settings
- Vendors management in Settings
- Commission auto-generation on trade completion

### UI/UX Updates (2026-03-22)
- Commissions page: merged columns, inline editing for brokerage rates
- Accounting page: "Invoice To" header, "Commodity" column added
- Removed crop year from commodity display names in table views
- "Pir Grain Contract Number" renamed to "Pir Grain Ref. No" on New/Edit Trade page
- Conditional "Prod. YYYY" vs "Crop YYYY" for processed commodities

## Prioritized Backlog

### P0 - Blocked
- Business Confirmation Email Integration (BLOCKED on Resend API key)

### P1
- Full Server-Side RBAC (protect all API routes by role)

### P2
- **Frontend Refactoring (CRITICAL)**: TradeDetailPage.js (880+ lines), NewTradePage.js (630+ lines) need component decomposition
- Counterparty Departments CRUD
- Document Templates Page
- Refactor PartnersPage.js (~430 lines)

### P3
- Export Business Cards to CSV
- Create Counterparty from scanned business card

## Key Technical Notes
- Ports have `type` field: "loading" or "discharge"
- Trade stores: loadingPortId/Name/Country, basePortId/Name/Country, dischargePortId/Name/Country
- Port variations store: portId, portName, portCountry, difference
- PDF generation uses `reportlab` with FreeSans fonts
- Authenticated PDF download uses blob + objectURL pattern
- Backend `null` handling uses MongoDB `$unset` for clearing fields
- `poppler-utils` installed for PDF text extraction testing
