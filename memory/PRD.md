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
- **Market News Tab** (first tab): 4 always-open cards (Wheat, Corn, Barley, Others) with inline commenting
- **Turkish Exchanges Tab**: KTB + GTB scrapers (both fetched with single button)
- **TMO Tenders Tab**: Collapsible cards, COMPANY/PORT/QUANTITY/CIF/EXW columns, Import/Export type, dd/mm/yyyy date pickers
- **Telegram Feed Sidebar**: Live feed from 4 public channels (ipavensky, andre_sizov, demetraholding_dh, RusgrainUnion) — scraped from web previews, no bot token needed

### Core Features
- JWT Auth, Trade CRUD, Counterparties, Reference data
- PDF Generation, Email via Resend, Port Line-Ups, Business Cards OCR, Calendar, Reports

## Prioritized Backlog

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
