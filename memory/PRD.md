# PIR Grain & Pulses - Trading Dashboard

## Original Problem Statement
Clone a commodity trading dashboard for PIR Grain & Pulses. The app evolved with feature requests, UI adjustments, and large-scale data seeding based on user feedback from `Pir App Eklenecekler.docx`.

## Tech Stack
- **Backend**: FastAPI (Python), MongoDB
- **Frontend**: React, TailwindCSS, shadcn/ui, Zustand (auth)
- **Auth**: JWT-based

## Core Features Implemented
- JWT authentication with role-based access (admin, user, accountant)
- Dashboard with KPI cards
- Collapsible sidebar + header with user menu and notifications
- Light/Dark mode theming
- **Trades**: Excel-like table with 16 statuses, filtering, row-click detail view
- **Trade Creation**: New Trade page with party selection (Seller, Buyer, Broker, Co-Broker). When a party is selected, their Trade Contacts and Execution Contacts appear as dropdowns for selection. Contacts are saved on the trade.
- **Trade Detail**: Multi-tab page (Confirmation, Shipment, Parties, Documents). Parties tab shows selected Trade/Execution contacts per party with name, email, phone.
- **Counterparties**: Partner list with business card detail view. Types: Seller, Buyer, Co-Broker. Origins field for sellers. Multiple Trade Contacts and Execution Contacts per counterparty.
- **Vessels**: 194 vessels seeded
- **Accounting**: Invoices and Bank Statements tabs (RBAC: admin/accountant only)
- **Calendar**: Event management
- **Settings**: Commodities, Ports, Origins, Surveyors, Users management
- **Notifications**: Bell icon with recent activities dropdown
- **Admin Password Change**: Admins can change any user's password
- **Server-Side RBAC**: Accountant role restricted to Accounting endpoints only; admin has full access; user role has access to all except Accounting and user management

## Data Seeded
- Commodities (20), Ports (34), Origins (7), Surveyors (14), Vessels (194)
- Partners: 175 total (95 buyers, 78 sellers, 2 co-brokers)
- Sample trades (10), Events (3)

## Credentials
- Admin: salih.karagoz / salih123
- Accountant: pir.accounts / pir123

## Architecture (Refactored Feb 2026)
```
/app/backend/
├── server.py          - FastAPI app orchestrator (imports routers)
├── config.py          - Config constants (DB, JWT, paths)
├── database.py        - MongoDB connection, collections, helpers
├── auth.py            - JWT auth, password hashing, get_current_user
├── models.py          - All Pydantic models
├── seed.py            - Database seeding logic
├── vessel_data.py     - Vessel seed data
├── routes/
│   ├── auth_routes.py    - Login, /me
│   ├── trades.py         - Trades CRUD + stats
│   ├── partners.py       - Partners/Counterparties CRUD
│   ├── vessels.py        - Vessels CRUD
│   ├── documents.py      - Document upload/delete
│   ├── reference_data.py - Commodities, Origins, Ports, Surveyors
│   ├── events.py         - Calendar events
│   ├── accounting.py     - Invoices, Bank Statements
│   ├── notifications.py  - Notifications read/delete
│   └── users.py          - User management + trade-statuses
└── tests/

/app/frontend/src/
├── pages/             - Page components
├── components/        - Layout + UI components
└── lib/               - Auth, API client, constants
```

## Backlog (Prioritized)
### P2
- Counterparty Departments CRUD (UI for adding/editing/deleting departments & contacts)
- Document Templates page

### P3
- File Uploads for Bank Statements & DI Documents

### Refactoring
- Extract PartnersPage.js into smaller components (400+ lines)
