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
- Loading Port as separate field from Base Port
- Port Variations with country names stored
- Trade Detail page with tabs (Summary, Shipment B/L, Documents)
- B/L Details dialog with Load Port, Discharge Port, Surveyors, Disport Agent
- Document checklist and bulk upload with drag-and-drop assignment
- Year-based filtering on Trades page

### PDF Generation (Updated 2026-03-23)
- **Business Confirmation PDF** - Date DD-MM-YYYY, commodity as "Name, Crop Year" without origin adj, DEMURRAGE row added
- **Shipment Appropriation PDF** - with port countries, framed layout
- **Commission Invoice PDF** - single-page professional layout
- All three PDFs share consistent corporate design (PIR logo, stamp, footer)
- Fixed duplicate route definitions that caused PDFs to return null
- Authenticated download via blob URLs

### Email Integration (Updated 2026-03-23)
- Send all three PDF documents via email with HTML body + attachment
- Email header uses PIR logo on #1B7A3D green background
- Business Confirmation email: DATE=DD-MM-YYYY, COMMODITY without origin adj + crop year, SHIPMENT dates on separate lines, removed LOADING/DISCHARGE PORT, added DEMURRAGE RATE
- Separate emails to buyer and seller with CC to internal users

### Port Line-Ups (2026-03-23)
- Upload daily port report Excel files (Gunluk Limanlar Raporu.xlsx)
- Parses multi-sheet Excel (92 sheets, one per date, organized by port sections)
- Stores 10,000+ vessel records in MongoDB
- Frontend page with date selector, port tabs, and vessel detail table
- Calculates "days since arrival" with color-coded badges
- Status badges (RIHTIMDA/green, DEMIR/amber, AYRILDI/grey)
- Search across vessels, cargo, buyers, sellers
- Footer stats with record count and total B/L tonnage

### Other Features
- Business Cards with GPT-4o Vision OCR
- Reports page with dynamic filters (Year, Seller, Buyer, Commodity, Origin)
- Brokerage Invoices with PENDING/PAID workflow
- Bank Accounts management in Settings
- Vendors management in Settings
- Commission auto-generation on trade completion

## Prioritized Backlog

### P1
- Full Server-Side RBAC (protect all API routes by role)

### P2
- **Frontend Refactoring (CRITICAL)**: TradeDetailPage.js (1000+ lines), NewTradePage.js (630+ lines)
- Counterparty Departments CRUD
- Document Templates Page

### P3
- Export Business Cards to CSV
- Create Counterparty from scanned business card

## Key Technical Notes
- PDF routes had duplicate @router.get decorators causing null responses - fixed 2026-03-23
- Date format across PDFs and emails standardized to DD-MM-YYYY with dashes
- Port lineups stored in `port_lineups` MongoDB collection (one doc per date)
- Resend email integration in sandbox mode (only verified addresses)
- openpyxl used for Excel file parsing
