# Architecture

## Overview

Fatoora Pro is an Electron desktop application following the **main-process / preload / renderer** architecture pattern. The renderer runs a React single-page application that communicates with the main process via IPC through a preload bridge.

```
┌──────────────────────────────────────────────────┐
│                   Renderer                       │
│  (React + Ant Design + react-router + i18next)   │
│                                                   │
│  Pages: Dashboard, Products, NewInvoice, ...      │
│  Components: AppLayout, DataTable, FormModal     │
│  Utils: formatCurrency, buildPrintHtml           │
│  i18n: en.json, ar.json                          │
└───────────────┬──────────────────────────────────┘
                │ contextBridge (window.api.*)
                │ IPC (invoke / on)
┌───────────────▼──────────────────────────────────┐
│                   Main Process                    │
│              (Electron + Node.js)                 │
│                                                   │
│  IPC Handlers ──► Service Layer                   │
│                      ├── product.service.ts       │
│                      ├── invoice.service.ts       │
│                      ├── settings.service.ts      │
│                      └── import.service.ts        │
│                      │                            │
│                      ▼                            │
│              Database Layer                       │
│              (better-sqlite3)                     │
│              ┌──────────────┐                     │
│              │  SQLite DB   │                     │
│              └──────────────┘                     │
└──────────────────────────────────────────────────┘
```

## Process Separation

### Main Process (`src/main/`)
- Electron window management (`index.ts`)
- Database connection and migrations (`database/`)
- IPC handler registration (`ipc/`)
- Business logic services (`services/`)

### Preload (`src/preload/`)
- Exposes a restricted API to the renderer via `contextBridge`
- Only whitelisted IPC channels are accessible

### Renderer (`src/renderer/`)
- React 18 single-page application
- Ant Design 5 for UI components
- react-router-dom v6 for routing
- i18next + react-i18next for internationalization
- Communicates with main process exclusively through `window.api.*`

## Database

- **Engine**: SQLite via `better-sqlite3`
- **Mode**: WAL (Write-Ahead Logging) for concurrent read performance
- **Tables**: `products`, `invoices`, `invoice_items`, `settings`
- **Transactions**: Invoice creation and updates use atomic transactions

## Data Flow

1. User interacts with a React page
2. Page calls `window.api.serviceName.methodName()`
3. Preload bridge forwards to IPC `invoke` channel
4. Main process handler receives the call
5. Service executes business logic against SQLite
6. Result flows back through the same chain
7. React component updates state and re-renders

## Key Design Decisions

- **No web server**: The application is fully offline. The renderer loads from `file://` protocol in production.
- **Single-process SQLite**: `better-sqlite3` is synchronous — no async overhead for database operations.
- **Hidden BrowserWindow for printing**: Print output is rendered in a separate hidden window for clean A4 formatting, independent of the React UI.
- **Auto-generated product codes**: Products receive `PRD-XXXXX` codes automatically unless a code is explicitly provided (e.g., via CSV import).
