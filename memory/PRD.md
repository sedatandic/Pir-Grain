# PIR Grain & Pulses - Commodity Trading Dashboard

## Original Problem Statement
Build a comprehensive commodity trading dashboard for PIR Grain & Pulses. The project includes detailed data management for trades and counterparties, UI/UX customizations, role-based access control, notification system, business card scanning, reporting, PDF document generation, and a market data module with live prices, TMO tender tracking, Turkish exchange integration, and Telegram feed.

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
- Trade CRUD with complex data model
- Counterparties/Partners management
- Reference data (Commodities, Origins, Ports, Surveyors, Disport Agents)
- Vessels, Calendar/Events, Notifications, Dashboard

### PDF Generation
- Business Confirmation, Shipment Appropriation, Commission Invoice
- Date DD-MM-YYYY, commodity as "Name, Crop Year", DEMURRAGE row added

### Email Integration
- All 3 PDF documents via Resend with HTML body + attachment
- PIR logo on #1B7A3D green header
- Shipment Appropriation auto-attaches Bill of Ladings

### Port Line-Ups
- Upload/parse daily port report Excel, 92 dates, 12 ports, 10K+ vessels
- Date selector, port tabs, vessel table with days-since-arrival calculation

### Business Cards
- Auto-OCR on upload via GPT-4o Vision
- TABLE VIEW grouped by country, collapsible sections
- Detail dialog with card image, edit/delete actions, search

### Contracts Page Price Display
- Unit Price column shows discharge port price
- When discharge port matches a port variation: shows adjusted price only

### Market Data Module (Updated 2026-03-24)
- **Live Price Scraping**: Real-time data from Barchart.com for all commodities and currencies
- **Gold Price Fix**: Fixed regex to handle comma-separated numbers (e.g., "4,408.0")
- **Live Badges**: All commodities and currencies show green "Live" badge when source is Barchart
- **Auto-Refresh**: 15-minute auto-refresh with manual refresh button
- **KTB Integration**: Daily prices from Konya Ticaret Borsasi (ktb.org.tr)
- **TMO Tenders Redesign (2026-03-24)**: Matches user's spreadsheet format:
  - Header: "PIR GRAIN & PULSES" + "[Date] TMO [Commodity] TENDER ([Start]-[End]) Shipment"
  - Columns: PORT, COMPANY, QUANTITY (European format), CIF (red text), EXW ($ prefix)
  - TOTAL row at bottom, Create/Edit/Delete tenders, Add results with CIF/EXW prices

### Other Features
- Reports page with dynamic filters including "All Years" option
- Brokerage Invoices with PENDING/PAID workflow
- Bank Accounts & Vendors management in Settings

## Key API Endpoints
- `GET /api/market/prices` - Live market prices
- `GET /api/market/turkish-exchanges/scrape` - Scrape KTB prices
- `GET, POST /api/market/notes` - Market notes CRUD
- `GET, POST, PUT, DELETE /api/market/tenders` - TMO tenders CRUD
- `POST /api/market/tenders/{id}/results` - Add tender result

## Key DB Schema
- `market_prices`: { symbol, price, change, changePercent, source, timestamp }
- `turkish_exchange_prices`: { exchange, product, price, unit, date, category }
- `market_notes`: { commodity, period, content, tags, createdBy, createdAt }
- `tmo_tenders`: { tenderDate, commodity, totalQuantity, shipmentPeriodStart, shipmentPeriodEnd, status, results: [{ port, company, quantity, cifPrice, exwPrice }] }

## Prioritized Backlog

### P0
- Telegram Feed Integration (blocked: needs Bot Token + channel names from user)

### P1
- KTB Historical Data Views (daily/monthly/yearly period selectors)
- Gaziantep (GTB) Exchange Integration
- Full Server-Side RBAC (protect all API routes by role)

### P2
- Google Workspace Integration (email menu bar, Gmail access)
- Frontend Refactoring: MarketDataPage.js (1100+ lines), TradeDetailPage.js, NewTradePage.js
- Backend Refactoring: market_data.py modularization
- Clarify Soybeans removal from live prices

### P3
- Export Business Cards to CSV
- Create Counterparty from scanned business card
- Counterparty Departments CRUD
- Document Templates Page
