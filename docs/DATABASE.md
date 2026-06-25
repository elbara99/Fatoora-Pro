# Database

## Engine

- **SQLite** via `better-sqlite3` (v11)
- **Journal Mode**: WAL (Write-Ahead Logging)
- **Foreign Keys**: Enabled

## Schema

### `products`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `code` | TEXT | UNIQUE NOT NULL | Auto-generated as `PRD-NNNNN` |
| `name` | TEXT | NOT NULL | |
| `selling_price` | REAL | NOT NULL DEFAULT 0 | |
| `created_at` | TEXT | DEFAULT datetime('now') | |
| `updated_at` | TEXT | DEFAULT datetime('now') | |

### `invoices`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `invoice_number` | TEXT | UNIQUE NOT NULL | |
| `invoice_date` | TEXT | NOT NULL | |
| `subtotal` | REAL | NOT NULL DEFAULT 0 | |
| `grand_total` | REAL | NOT NULL DEFAULT 0 | |
| `notes` | TEXT | | |
| `created_at` | TEXT | DEFAULT datetime('now') | |
| `updated_at` | TEXT | DEFAULT datetime('now') | |

### `invoice_items`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | |
| `invoice_id` | INTEGER | NOT NULL REFERENCES invoices(id) ON DELETE CASCADE | |
| `product_id` | INTEGER | NOT NULL REFERENCES products(id) | |
| `product_name` | TEXT | NOT NULL | Denormalized for historical accuracy |
| `quantity` | INTEGER | NOT NULL DEFAULT 1 | |
| `unit_price` | REAL | NOT NULL DEFAULT 0 | |
| `line_total` | REAL | NOT NULL DEFAULT 0 | |

### `settings`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `key` | TEXT | PRIMARY KEY | |
| `value` | TEXT | | JSON-encoded |

### Default Settings

```json
{
  "company_name": "",
  "address": "",
  "phone": "",
  "logo": "",
  "invoice_paper_size": "A4",
  "language": "en"
}
```

## Connections

- The database file is created at `{app.getPath('userData')}/fatoora-pro.db`
- A single connection is opened at app startup and closed on quit
- All queries are synchronous (better-sqlite3 API)
- Migrations run automatically on first launch

## Invoice Numbering

Invoice numbers follow the format `INV-YYYYMMDD-NNNN` where:
- `YYYYMMDD` is the current date
- `NNNN` is a zero-padded sequential counter per day

Example: `INV-20260625-0001`
