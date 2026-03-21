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
- **Trade Detail**: Multi-tab page (Confirmation, Shipment, Parties, Documents) with commodity-based document checklist
- **Counterparties**: Partner list with business card detail view. Types: Seller, Buyer, Co-Broker. Origins field for sellers. Multiple Trade Contacts and Execution Contacts per counterparty.
- **Vessels**: 194 vessels seeded
- **Accounting**: Invoices and Bank Statements tabs (RBAC: admin/accountant only)
- **Calendar**: Event management
- **Settings**: Commodities, Ports, Origins, Surveyors, Users management
- **Notifications**: Bell icon with recent activities dropdown
- **Admin Password Change**: Admins can change any user's password

## Data Seeded
- Commodities (20), Ports (34), Origins (7), Surveyors (14), Vessels (194)
- Partners: 177 total (95 buyers, 79 sellers, 2 co-brokers, 1 broker)
- Sample trades (8), Events (3)

## Credentials
- Admin: salih.karagoz / salih123
- Non-admin: pir.accounts / pir123

## Architecture
```
/app/backend/server.py        - Monolithic FastAPI backend
/app/backend/vessel_data.py   - Vessel seed data
/app/backend/seed_buyers.py   - Buyer counterparty seed data
/app/backend/seed_sellers.py  - Seller counterparty seed data
/app/frontend/src/pages/      - Page components
/app/frontend/src/components/  - Layout + UI components
/app/frontend/src/lib/        - Auth, API client, constants
```

## Backlog (Prioritized)
### P1
- Full Server-Side RBAC (protect all backend routes by role)

### P2
- Counterparty Departments CRUD (UI for adding/editing/deleting departments & contacts)
- Document Templates page

### P3
- File Uploads for Bank Statements & DI Documents

### Refactoring
- Break down monolithic server.py into separate route/model/service modules
- Extract Settings page tab logic into individual components
