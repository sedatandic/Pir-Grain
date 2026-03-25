# PIR Grain & Pulses - Commodity Trading Dashboard

## Core Architecture
- **Frontend**: React + Shadcn UI (port 3000)
- **Backend**: FastAPI (port 8001, prefix /api)
- **Database**: MongoDB
- **Auth**: JWT-based authentication

## What's Been Implemented

### Market Data Module (Latest: 2026-03-25)
- **Indications Tab** (first): 4 cards (Wheat, Corn, Barley, Others) with drill-down navigation: Years > Months > Weekdays (excludes weekends), inline commenting with display name and AM/PM time
- **Prices Tab**: Live from Barchart.com with Live badges, 15-min auto-refresh, area chart
- **Turkish Exchanges Tab**: KTB + GTB scrapers, **NEW: Historical Data Views** (Latest/Daily/Monthly navigation with date drill-down and monthly aggregation)
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

## Key API Endpoints
- `GET /api/market/turkish-exchanges` - Get prices (optional ?date=, ?exchange= filters)
- `GET /api/market/turkish-exchanges/dates` - Available dates grouped by exchange
- `GET /api/market/turkish-exchanges/monthly` - Monthly aggregated data (?exchange=, &year=, &month=)
- `GET /api/market/turkish-exchanges/scrape` - Scrape KTB + GTB
- `GET /api/market/prices` - Live market prices
- `GET, POST /api/market/notes` - Indications CRUD (now stores createdByName)
- `GET, POST, PUT, DELETE /api/market/tenders` - TMO tenders
- `GET /api/market/coaster-freights/{week}` - Freight reports with PDF images
- `GET /api/market/telegram/messages` - Telegram feed

## Prioritized Backlog
### P1
- Full Server-Side RBAC
### P2
- Google Workspace Integration
- Backend refactoring (extract scrapers.py module)
- Copy to Clipboard on TMO tender cards
- Automatic daily scraping for KTB/GTB
### Clarifications Pending
- Should "CBOT - Soybeans" be removed from Live Prices table?
