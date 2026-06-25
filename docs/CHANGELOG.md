# Changelog

## [1.0.0] — 2026-06-25

### Added

- Product management with auto-generated codes (`PRD-NNNNN`)
- CSV import for bulk product upload
- Invoice creation with line item management
- Invoice editing with full transaction support
- Invoice history with search and preview
- Professional A4 invoice printing via hidden BrowserWindow
- Dashboard with today's and monthly sales summaries
- Settings page (company info, logo upload, language)
- About page with application information
- Bilingual interface: English and Arabic (RTL)
- Keyboard shortcut (F12 / Ctrl+Shift+I) for DevTools toggle

### Technical

- Electron 32 with context isolation enabled
- React 18 + TypeScript + Ant Design 5
- SQLite database with WAL mode
- `better-sqlite3` native module rebuilt for Electron
- Single-transaction invoice save and update operations
- Reusable `DataTable` and `FormModal` components
- `formatCurrency` utility for consistent DA formatting
- Template-based print HTML generation
