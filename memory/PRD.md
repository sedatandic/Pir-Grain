# PIR Grain & Pulses - Commodity Trading Dashboard

## Core Architecture
- **Frontend**: React + Shadcn UI (port 3000)
- **Backend**: FastAPI (port 8001, prefix /api)
- **Database**: MongoDB (DB: pir_grain_pulses)
- **Auth**: JWT-based authentication

## What's Been Implemented

### Documentary Instructions Page (Latest: 2026-03-25)
- Full CRUD for Documentary Instructions linked to contracts
- Port dropdown shows "Name, Country" format (e.g., "Samsun, Türkiye")
- **Buyer Surveyor at Load Port**: Dropdown populated from surveyors collection
- **Seller Surveyor at Load Port**: Read-only field auto-populated from linked contract's B/L data (trade.sellerSurveyor)
- Email sending to seller with formatted HTML template including both surveyor fields
- Preview with copy/print functionality

### Market Data Module
- **Indications Tab** (first): 4 cards (Wheat, Corn, Barley, Others) with drill-down navigation: Years > Months > Weekdays (excludes weekends), inline commenting with display name and AM/PM time
- **Prices Tab**: Live from Barchart.com with Live badges, 15-min auto-refresh, area chart
- **Turkish Exchanges Tab**: KTB + GTB scrapers, Historical Data Views (Latest/Daily/Monthly navigation with date drill-down and monthly aggregation)
- **TMO Tenders Tab**: Collapsible cards, COMPANY/PORT/QUANTITY/CIF/EXW, Import/Export, dd/mm/yyyy date pickers
- **Coaster Freights Tab**: Weekly freight reports from sealines.su, PDF-to-image display, English + Russian text
- **Telegram Feed Sidebar**: 7 public channels scraped, in-app popup for messages

### Refactoring (2026-03-25)
- **MarketDataPage.js** refactored from 1543 lines to ~55 lines
- Split into 6 components: IndicationsTab, PricesTab, TurkishExchangesTab, TMOTendersTab, CoasterFreightsTab, TelegramSidebar
- All components in `/app/frontend/src/pages/market/`

### Core Features
- JWT Auth, Trade CRUD, Counterparties, Reference data
- PDF Generation, Email via Resend, Port Line-Ups, Business Cards OCR, Calendar, Reports
- URL Migration Guard system

## Key API Endpoints
- `POST /api/doc-instructions/`: Creates a new Documentary Instruction (includes sellerSurveyor)
- `GET /api/doc-instructions/`: Retrieves all Documentary Instructions
- `PUT /api/doc-instructions/{di_id}`: Updates a specific DI
- `DELETE /api/doc-instructions/{di_id}`: Deletes a specific DI
- `POST /api/doc-instructions/{di_id}/send-email`: Sends DI email to seller
- `GET /api/config/active-url`: Public endpoint for URL migration
- `GET /api/market/turkish-exchanges/ktb/monthly`: Monthly aggregated KTB data
- `GET /api/prices`: Live market prices (with in-memory cache)

## Prioritized Backlog
### P1
- Full Server-Side RBAC
### P2
- Google Workspace Integration
- Backend refactoring (extract scrapers.py module from market_data.py)
- Copy to Clipboard on TMO tender cards
- Automatic daily scraping for KTB/GTB
- Refactor NewTradePage.js (growing complexity)
### Clarifications Pending
- Should "CBOT - Soybeans" be removed from Live Prices table?
