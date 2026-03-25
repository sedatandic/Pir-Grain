# PIR Grain & Pulses - Commodity Trading Dashboard

## Core Architecture
- **Frontend**: React + Shadcn UI (port 3000)
- **Backend**: FastAPI (port 8001, prefix /api)
- **Database**: MongoDB (DB: pir_grain_pulses)
- **Auth**: JWT-based authentication

## What's Been Implemented

### NewTradePage Compact Layout (Latest: 2026-03-25)
- Complete redesign: All form fields fit in one screen without scrolling
- Removed Card wrappers, replaced with compact section headers (uppercase, border-bottom)
- 6 sections: Contract Details (4-col), Parties (5-col), Commodity (5-col), Pricing & Terms (7-col), Shipping (5-col), Additional (5-col)
- Save/Cancel buttons moved to header row
- Port Variations shown inline with +/- differences
- Excluded Disports & Surveyors: collapsible, starts collapsed
- Compact inputs (h-7), compact labels (text-[11px])

### Documentary Instructions Page
- Full CRUD for Documentary Instructions linked to contracts
- Port dropdown shows "Name, Country" format
- Buyer/Seller Surveyor fields, Email sending with formatted HTML
- Works as embedded component inside VesselExecutionPage

### Vessel Execution Pipeline
- `VesselExecutionPage.js`: Unified tab system for Business Confirmations, Vessel Nominations, Documentary Instructions, B/L Details, Shipment Docs

### Market Data Module
- **Indications Tab**: Structured dropdown form (Seller/Commodity/Port/Origin/Shipment/Qty/Price)
- **Prices Tab**: Live from Barchart.com with auto-refresh
- **Turkish Exchanges Tab**: KTB + GTB scrapers with historical data
- **TMO Tenders Tab**: Collapsible cards with Import/Export
- **Coaster Freights Tab**: Weekly freight reports
- **Telegram Feed Sidebar**: 7 public channels

### Core Features
- JWT Auth, Trade CRUD, Counterparties, Reference data
- PDF Generation, Email via Resend, Port Line-Ups, Business Cards OCR, Calendar (Staff Leave with date ranges), Reports
- URL Migration Guard system
- Partners: Tax ID No, Tax Office fields
- Trades: Port price sorting, Marmara-anchored middle index

## Key API Endpoints
- `POST /api/doc-instructions/`: Creates Documentary Instruction
- `GET /api/doc-instructions/`: Retrieves all DIs
- `GET /api/trades`: Trades list
- `GET /api/config/active-url`: Active URL for migration guard
- `PUT /api/config/active-url`: Update active URL
- `GET /api/prices`: Live market prices

## Prioritized Backlog
### P1
- Full Server-Side RBAC
### P2
- Google Workspace / Gmail Integration
- Backend refactoring (extract scrapers.py from market_data.py)
- Copy to Clipboard on TMO tender cards
- Automatic daily scraping for KTB/GTB
### Clarifications Pending
- Should "CBOT - Soybeans" be removed from Live Prices table?
