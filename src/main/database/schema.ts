import type Database from 'better-sqlite3'

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      code          TEXT    NOT NULL UNIQUE,
      name          TEXT    NOT NULL,
      selling_price REAL    NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
      is_active     INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT    NOT NULL UNIQUE,
      invoice_date   TEXT    NOT NULL,
      subtotal       REAL    NOT NULL DEFAULT 0,
      total          REAL    NOT NULL DEFAULT 0,
      notes          TEXT,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id  INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      product_id  INTEGER NOT NULL REFERENCES products(id),
      product_name TEXT   NOT NULL,
      quantity    REAL    NOT NULL CHECK (quantity > 0),
      unit_price  REAL    NOT NULL CHECK (unit_price >= 0),
      total       REAL    NOT NULL CHECK (total >= 0),
      line_sort   INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
    CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
    CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

    INSERT OR IGNORE INTO settings (key, value) VALUES ('company_name', 'My Company');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('address', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('phone', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('logo', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('invoice_paper_size', 'A4');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('language', 'en');

    INSERT OR IGNORE INTO settings (key, value) VALUES ('invoice_next_number', '1');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('invoice_prefix', 'INV');
  `)
}
