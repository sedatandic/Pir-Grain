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
- **Loading Port** as separate field from Base Port
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

### Email Integration (Resend)
- Send all three PDF documents via email with HTML body + attachment
- Separate emails to buyer and seller with CC to internal users
- Company logo embedded in emails

### Port Line-Ups (NEW - 2026-03-23)
- Upload daily port report Excel files (Gunluk Limanlar Raporu.xlsx)
- Parses multi-sheet Excel (92 sheets, one per date, organized by port sections)
- Stores 10,000+ vessel records in MongoDB
- Frontend page with date selector, port tabs, and vessel detail table
- Calculates "days since arrival" with color-coded badges
- Status badges (RIHTIMDA/green, DEMIR/amber, AYRILDI/grey)
- Search across vessels, cargo, buyers, sellers
- Footer stats with record count and total B/L tonnage
- Sidebar navigation with Anchor icon

### Other Features
- Business Cards with GPT-4o Vision OCR
- Reports page with dynamic filters (Year, Seller, Buyer, Commodity, Origin)
- Brokerage Invoices with PENDING/PAID workflow
- Bank Accounts management in Settings
- Vendors management in Settings
- Commission auto-generation on trade completion

### UI/UX Updates
- Commissions page: merged columns, inline editing for brokerage rates
- Accounting page: "Invoice To" header, "Commodity" column added
- Removed crop year from commodity display names in table views
- Conditional "Prod. YYYY" vs "Crop YYYY" for processed commodities

## Prioritized Backlog

### P1
- Full Server-Side RBAC (protect all API routes by role)

### P2
- **Frontend Refactoring (CRITICAL)**: TradeDetailPage.js (1000+ lines), NewTradePage.js (630+ lines) need component decomposition
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
- `openpyxl` used for Excel file parsing (port lineups)
- Port lineups stored in `port_lineups` MongoDB collection (one doc per date)
- Resend email integration in sandbox mode (only verified addresses)

## Key DB Collections
- **trades**: Core trade records with buyer/seller, commodity, pricing, shipping
- **invoices**: Brokerage commission invoices with PENDING/PAID status
- **partners**: Counterparty companies (sellers, buyers, co-brokers)
- **port_lineups**: Daily port report data parsed from Excel uploads
- **vessels**: Vessel registry for trade assignments
