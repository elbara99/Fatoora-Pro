import type Database from 'better-sqlite3'

function schemaVersion(db: Database.Database): number {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'schema_version'").get() as { value: string } | undefined
  return row ? parseInt(row.value, 10) : 0
}

function setSchemaVersion(db: Database.Database, v: number): void {
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', ?)").run(String(v))
}

export function runMigrations(db: Database.Database): void {
  try {
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
      INSERT OR IGNORE INTO settings (key, value) VALUES ('language', 'ar');

      INSERT OR IGNORE INTO settings (key, value) VALUES ('invoice_next_number', '1');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('invoice_prefix', 'INV');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('schema_version', '0');
    `)
  } catch (err) {
    console.error('[Migration] Failed to create initial schema:', err)
    throw err
  }

  const v = schemaVersion(db)

  try {
    if (v < 1) {
      console.log('[Migration] Running v1: add supplier_name column')
      const cols = db.prepare("PRAGMA table_info('invoices')").all() as { name: string }[]
      if (!cols.find(c => c.name === 'supplier_name')) {
        db.exec("ALTER TABLE invoices ADD COLUMN supplier_name TEXT DEFAULT ''")
        console.log('[Migration] Added supplier_name column to invoices')
      }
      db.exec("CREATE INDEX IF NOT EXISTS idx_invoices_supplier ON invoices(supplier_name)")
      setSchemaVersion(db, 1)
    }
  } catch (err) {
    console.error('[Migration] Failed at v1 (supplier_name):', err)
    throw err
  }

  try {
    if (v < 2) {
      console.log('[Migration] Running v2: suppliers table + supplier_id')
      db.exec(`
        CREATE TABLE IF NOT EXISTS suppliers (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          name       TEXT    NOT NULL,
          phone      TEXT    NOT NULL DEFAULT '',
          address    TEXT    NOT NULL DEFAULT '',
          notes      TEXT    NOT NULL DEFAULT '',
          created_at TEXT    NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
      `)

      const invoiceCols = db.prepare("PRAGMA table_info('invoices')").all() as { name: string }[]
      if (!invoiceCols.find(c => c.name === 'supplier_id')) {
        const distinctSuppliers = db.prepare(
          "SELECT DISTINCT TRIM(supplier_name) AS name FROM invoices WHERE supplier_name IS NOT NULL AND TRIM(supplier_name) != ''"
        ).all() as { name: string }[]

        console.log(`[Migration] Found ${distinctSuppliers.length} unique suppliers to migrate`)

        const insertSupplier = db.prepare("INSERT INTO suppliers (name) VALUES (?)")
        for (const s of distinctSuppliers) {
          insertSupplier.run(s.name)
        }

        db.exec("ALTER TABLE invoices ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id)")

        db.exec(`
          UPDATE invoices SET supplier_id = (
            SELECT id FROM suppliers WHERE TRIM(suppliers.name) = TRIM(invoices.supplier_name)
          ) WHERE supplier_name IS NOT NULL AND TRIM(supplier_name) != ''
        `)

        db.exec("CREATE INDEX IF NOT EXISTS idx_invoices_supplier_id ON invoices(supplier_id)")
        console.log('[Migration] Linked existing invoices to suppliers')
      }
      setSchemaVersion(db, 2)
    }
  } catch (err) {
    console.error('[Migration] Failed at v2 (suppliers):', err)
    throw err
  }

  try {
    if (v < 3) {
      console.log('[Migration] Running v3: unique normalized supplier names')

      const supplierCols = db.prepare("PRAGMA table_info('suppliers')").all() as { name: string }[]
      if (!supplierCols.find(c => c.name === 'name_normalized')) {
        db.exec("ALTER TABLE suppliers ADD COLUMN name_normalized TEXT")
        console.log('[Migration] Added name_normalized column')
      }

      const rows = db.prepare('SELECT id, name FROM suppliers').all() as { id: number; name: string }[]
      const normalize = (name: string): string => name.trim().replace(/\s+/g, ' ').toLowerCase()
      const updateStmt = db.prepare('UPDATE suppliers SET name_normalized = ? WHERE id = ?')

      const normalizedMap = new Map<string, number[]>()
      for (const row of rows) {
        const n = normalize(row.name)
        updateStmt.run(n, row.id)
        if (!normalizedMap.has(n)) normalizedMap.set(n, [])
        normalizedMap.get(n)!.push(row.id)
      }

      const duplicates: { keep: number; remove: number[] }[] = []
      for (const [name, ids] of normalizedMap) {
        if (ids.length > 1) {
          duplicates.push({ keep: ids[0], remove: ids.slice(1) })
          console.log(`[Migration] Found duplicate supplier "${name}": IDs ${ids.join(', ')}`)
        }
      }

      if (duplicates.length > 0) {
        console.log(`[Migration] Merging ${duplicates.length} duplicate supplier groups`)
        const updateInvoice = db.prepare('UPDATE invoices SET supplier_id = ? WHERE supplier_id = ?')
        const deleteSupplier = db.prepare('DELETE FROM suppliers WHERE id = ?')
        const merge = db.transaction(() => {
          for (const dup of duplicates) {
            for (const removeId of dup.remove) {
              updateInvoice.run(dup.keep, removeId)
              deleteSupplier.run(removeId)
            }
          }
        })
        merge()
        console.log('[Migration] Duplicate suppliers merged successfully')
      }

      db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_name_normalized ON suppliers(name_normalized)")
      console.log('[Migration] Created unique index on name_normalized')
      setSchemaVersion(db, 3)
    }
  } catch (err) {
    console.error('[Migration] Failed at v3 (unique supplier names):', err)
    throw err
  }
}
