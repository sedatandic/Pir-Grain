# PIR Grain & Pulses - Commodity Trading Dashboard

## Original Problem Statement
Build a comprehensive commodity trading dashboard for PIR Grain & Pulses with trade management, market data, TMO tender tracking, Turkish exchange prices, and Telegram integration.

## Core Architecture
- **Frontend**: React + Shadcn UI (port 3000)
- **Backend**: FastAPI (port 8001, prefix /api)
- **Database**: MongoDB
- **Auth**: JWT-based authentication

## What's Been Implemented

### Market Data Module (Latest: 2026-03-24)
- **Live Price Scraping**: Real-time from Barchart.com (commodities + currencies), Gold fix applied
- **Live Badges**: All items show green "Live" badge
- **Auto-Refresh**: 15-minute cycle
- **Market News Tab** (first tab): 4 always-open cards (Wheat, Corn, Barley, Others) with inline click-to-type commenting, author/date/time display
- **Turkish Exchanges Tab**: 
  - **KTB**: Konya Ticaret Borsasi scraper (ktb.org.tr)
  - **GTB**: Gaziantep Ticaret Borsasi scraper (gtb.org.tr/salon-satis-fiyatlari) - 8 products with Min/Max/Avg prices
  - Single "Fetch Prices" button scrapes both
- **TMO Tenders Tab**:
  - Collapsible cards with click-to-expand
  - Title: "[Qty] Mts [Commodity] [Import/Export] Tender - Dated: [dd/mm/yyyy]"
  - Columns: COMPANY, PORT, QUANTITY, CIF (red), EXW
  - Date pickers (dd/mm/yyyy) for all date fields
  - Turkish ports dropdown (9 ports)
  - Commodities: Feed Barley, Wheat, Feed Corn
  - Type: Import/Export
  - CRUD for tenders + individual result edit/delete
  - Newest dated tender shows first

### Core Features
- JWT Auth, Trade CRUD, Counterparties, Reference data
- PDF Generation (Business Confirmation, Shipment Appropriation, Commission Invoice)
- Email via Resend with auto-attached Bill of Ladings
- Port Line-Ups, Business Cards OCR, Calendar, Reports, Dashboard

## Key API Endpoints
- `GET /api/market/prices` - Live market prices
- `GET /api/market/turkish-exchanges/scrape` - Scrape KTB + GTB
- `GET /api/market/turkish-exchanges` - Get stored prices
- `GET, POST /api/market/notes` - Market news CRUD
- `GET, POST, PUT, DELETE /api/market/tenders` - TMO tenders
- `POST /api/market/tenders/{id}/results` - Add result
- `PUT /api/market/tenders/{id}/results/{idx}` - Edit result
- `DELETE /api/market/tenders/{id}/results/{idx}` - Delete result

## Prioritized Backlog

### P0
- Telegram Feed Integration (blocked: needs Bot Token + channel names)

### P1
- KTB Historical Data Views (daily/monthly/yearly period selectors)
- Full Server-Side RBAC

### P2
- Google Workspace Integration
- Frontend Refactoring (MarketDataPage.js 1200+ lines)
- Backend Refactoring (market_data.py modularization)

### P3
- Export Business Cards to CSV
- Create Counterparty from scanned business card
