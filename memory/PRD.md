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
- Trade CRUD with complex data model
- Counterparties/Partners management
- Reference data (Commodities, Origins, Ports, Surveyors, Disport Agents)
- Vessels, Calendar/Events, Notifications, Dashboard

### PDF Generation (Updated 2026-03-23)
- Business Confirmation, Shipment Appropriation, Commission Invoice
- Date DD-MM-YYYY, commodity as "Name, Crop Year", DEMURRAGE row added
- Fixed duplicate route definitions that caused null responses

### Email Integration (Updated 2026-03-23)
- All 3 PDF documents via Resend with HTML body + attachment
- PIR logo on #1B7A3D green header
- Business Confirmation: no LOADING/DISCHARGE PORT, added DEMURRAGE RATE

### Port Line-Ups (2026-03-23)
- Upload/parse daily port report Excel, 92 dates, 12 ports, 10K+ vessels
- Date selector, port tabs, vessel table with days-since-arrival calculation

### Business Cards (Updated 2026-03-23)
- Auto-OCR on upload via GPT-4o Vision (name, company, position, city, country, email, whatsapp, website)
- TABLE VIEW grouped by country (replaced card grid)
- Columns: Name, Company, Position, City, Country, Email, WhatsApp, Website, Keywords
- Collapsible country sections with contact counts
- Detail dialog with card image, edit/delete actions, search

### Other Features
- Reports page with dynamic filters including "All Years" option (fixed 2026-03-23)
- Brokerage Invoices with PENDING/PAID workflow
- Bank Accounts & Vendors management in Settings

## Prioritized Backlog

### P1
- Full Server-Side RBAC (protect all API routes by role)

### P2
- Frontend Refactoring: TradeDetailPage.js (1000+ lines), NewTradePage.js (630+ lines)
- Counterparty Departments CRUD
- Document Templates Page

### P3
- Export Business Cards to CSV
- Create Counterparty from scanned business card
