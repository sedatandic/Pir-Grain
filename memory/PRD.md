# PIR Grain & Pulses - Commodity Trading Dashboard

## Core Architecture
- **Frontend**: React + Shadcn UI (port 3000)
- **Backend**: FastAPI (port 8001, prefix /api)
- **Database**: MongoDB
- **Auth**: JWT-based authentication

## What's Been Implemented

### Market Data Module (Latest: 2026-03-25)
- **Indications Tab** (first): 4 cards (Wheat, Corn, Barley, Others) with drill-down navigation: Years → Months → Weekdays (excludes weekends), inline commenting
- **Prices Tab**: Live from Barchart.com with Live badges, 15-min auto-refresh
- **Turkish Exchanges Tab**: KTB + GTB scrapers (single "Fetch Prices" button)
- **TMO Tenders Tab**: Collapsible cards, COMPANY/PORT/QUANTITY/CIF/EXW, Import/Export, dd/mm/yyyy date pickers
- **Coaster Freights Tab**: Weekly freight reports from sealines.su, "Week 12 (16-22 March 2026)" format, PDF download, last 8 weeks
- **Telegram Feed Sidebar**: 7 public channels scraped, in-app popup for messages

### Core Features
- JWT Auth, Trade CRUD, Counterparties, Reference data
- PDF Generation, Email via Resend, Port Line-Ups, Business Cards OCR, Calendar, Reports

## Key API Endpoints
- `GET /api/market/coaster-freights/{week_number}` - Scrape freight report for given week
- `GET /api/market/prices` - Live market prices
- `GET /api/market/turkish-exchanges/scrape` - Scrape KTB + GTB
- `GET, POST /api/market/notes` - Indications CRUD
- `GET, POST, PUT, DELETE /api/market/tenders` - TMO tenders

## Prioritized Backlog
### P1
- KTB Historical Data Views (daily/monthly/yearly)
- Full Server-Side RBAC
### P2
- Google Workspace Integration
- Frontend/Backend Refactoring
