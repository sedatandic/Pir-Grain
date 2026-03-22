# PIR Grain & Pulses - Trading Dashboard

## Original Problem Statement
Clone a commodity trading dashboard for PIR Grain & Pulses. The app evolved with feature requests, UI adjustments, and large-scale data seeding based on user feedback from `Pir App Eklenecekler.docx`.

## Tech Stack
- **Backend**: FastAPI (Python), MongoDB
- **Frontend**: React, TailwindCSS, shadcn/ui, Zustand (auth)
- **Auth**: JWT-based
- **AI**: emergentintegrations (GPT-4o Vision for OCR)

## Core Features Implemented
- JWT authentication with role-based access (admin, user, accountant)
- Dashboard with KPI cards
- Collapsible sidebar + header with user menu and notifications
- Light/Dark mode theming
- **Trades**: Excel-like table with 16 statuses, filtering, row-click detail view, clickable seller/buyer/broker names
- **Trade Creation**: New Trade page with party selection (Seller, Buyer, Broker, Co-Broker)
- **Trade Detail**: Multi-tab page (Confirmation, Shipment, Parties, Documents)
- **Counterparties**: Partner list with business card detail view
- **Vessels**: 194 vessels seeded
- **Accounting**: Invoices and Bank Statements tabs (RBAC: admin/accountant only), dynamic vendor/seller dropdowns
- **Calendar**: Event management with redesigned right panel (Upcoming Payments, Meetings, Holidays)
- **Commissions**: Port display with countries, multi-bank PDF invoice generation
- **Settings**: Commodities, Ports, Origins, Surveyors, Disport Agents, Vendors, Bank Accounts, Users management
- **Business Cards**: AI-powered OCR scanning using GPT-4o Vision
- **Reports**: Multi-tab reporting with KPIs, Top 10 charts, drill-downs
- **Notifications**: Bell icon (admin only) with recent activities
- **Admin Password Change**: Admins can change any user's password
- **Server-Side RBAC**: Accountant restricted to Accounting; admin has full access

## Data Seeded
- Commodities (20), Ports (34), Origins (7), Surveyors (14), Vessels (194)
- Partners: 175 total (95 buyers, 78 sellers, 2 co-brokers)
- Sample trades (10), Events (3)

## Credentials
- Admin: salih.karagoz / salih123
- Accountant: pir.accounts / pir123

## Architecture
```
/app/backend/
├── server.py          - FastAPI app orchestrator
├── config.py          - Config constants
├── database.py        - MongoDB connection, collections
├── auth.py            - JWT auth, password hashing
├── models.py          - All Pydantic models
├── seed.py            - Database seeding
├── vessel_data.py     - Vessel seed data
├── routes/
│   ├── auth_routes.py    - Login, /me
│   ├── trades.py         - Trades CRUD + stats
│   ├── partners.py       - Partners CRUD
│   ├── vessels.py        - Vessels CRUD
│   ├── documents.py      - Document upload/delete
│   ├── reference_data.py - Commodities, Origins, Ports, Surveyors
│   ├── events.py         - Calendar events
│   ├── accounting.py     - Invoices, Bank Statements
│   ├── notifications.py  - Notifications
│   ├── users.py          - User management
│   ├── commission_invoice.py - PDF generation
│   ├── business_cards.py - OCR + CRUD
│   ├── vendors.py        - Vendor CRUD
│   └── bank_accounts.py  - Bank Account CRUD
└── tests/

/app/frontend/src/
├── pages/             - Page components
├── components/        - Layout + UI components
└── lib/               - Auth, API client, constants
```

## Completed (March 22, 2026)
- **Bank Accounts Management UI**: Added "Bank Accounts" tab in Settings with full CRUD (add, edit, delete). Currency dropdown with USD/EUR/GBP/TRY/CHF/AED/UAH. Address textarea. 100% test pass rate.
- **Trades Year Filter**: Added year-based filter dropdown (2026, 2025, 2024) to Trades page. Defaults to current year (2026). For current year, also shows incomplete trades from previous years (not completed/cancelled/washout). 100% test pass rate.

## Backlog (Prioritized)
### P1
- Full Server-Side RBAC: Protect all API routes based on roles (admin, user, accountant)

### P2
- Refactor large frontend pages: TradesPage.js (~500 lines), TradeDetailPage.js (~620 lines), NewTradePage.js (~500 lines), PartnersPage.js (~430 lines)
- Counterparty Departments CRUD (UI for adding/editing/deleting departments & contacts)
- Document Templates page

### P3
- Export Business Cards to CSV or create Counterparty from card
- File Uploads for Bank Statements & DI Documents
