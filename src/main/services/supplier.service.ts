import type Database from 'better-sqlite3'

export interface SupplierRow {
  id: number
  name: string
  phone: string
  address: string
  notes: string
  created_at: string
  updated_at: string
}

export interface SupplierInput {
  name: string
  phone?: string
  address?: string
  notes?: string
}

export interface SupplierWithBalance extends SupplierRow {
  invoice_count: number
  total_purchases: number
  balance: number
  last_invoice_date: string | null
}

export interface SupplierDashboard {
  totalSuppliers: number
  totalBalance: number
  highestBalance: { name: string; balance: number } | null
  latestSuppliers: SupplierRow[]
  latestInvoices: { id: number; invoice_number: string; total: number; supplier_name: string; created_at: string }[]
  top5ByBalance: { name: string; balance: number }[]
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

export class DuplicateSupplierError extends Error {
  existingId: number
  existingName: string
  constructor(existingId: number, existingName: string) {
    super(`Supplier "${existingName}" already exists`)
    this.existingId = existingId
    this.existingName = existingName
    this.name = 'DuplicateSupplierError'
  }
}

export function createSupplierService(db: Database.Database) {
  const list = (): SupplierRow[] => {
    return db.prepare('SELECT * FROM suppliers ORDER BY name').all() as SupplierRow[]
  }

  const listWithBalances = (): SupplierWithBalance[] => {
    return db.prepare(`
      SELECT s.*,
        COUNT(i.id) AS invoice_count,
        COALESCE(SUM(i.total), 0) AS total_purchases,
        COALESCE(SUM(i.total), 0) AS balance,
        MAX(i.invoice_date) AS last_invoice_date
      FROM suppliers s
      LEFT JOIN invoices i ON i.supplier_id = s.id
      GROUP BY s.id
      ORDER BY s.name
    `).all() as SupplierWithBalance[]
  }

  const getById = (id: number): SupplierRow | undefined => {
    return db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as SupplierRow | undefined
  }

  const getWithBalance = (id: number): SupplierWithBalance | undefined => {
    return db.prepare(`
      SELECT s.*,
        COUNT(i.id) AS invoice_count,
        COALESCE(SUM(i.total), 0) AS total_purchases,
        COALESCE(SUM(i.total), 0) AS balance,
        MAX(i.invoice_date) AS last_invoice_date
      FROM suppliers s
      LEFT JOIN invoices i ON i.supplier_id = s.id
      WHERE s.id = ?
      GROUP BY s.id
    `).get(id) as SupplierWithBalance | undefined
  }

  const getInvoices = (supplierId: number, searchQ?: string): any[] => {
    if (searchQ) {
      return db.prepare(`
        SELECT * FROM invoices WHERE supplier_id = ? AND invoice_number LIKE ? ORDER BY invoice_date DESC
      `).all(supplierId, `%${searchQ}%`) as any[]
    }
    return db.prepare(`
      SELECT * FROM invoices WHERE supplier_id = ? ORDER BY invoice_date DESC
    `).all(supplierId) as any[]
  }

  const search = (q: string): SupplierRow[] => {
    return db.prepare(
      'SELECT * FROM suppliers WHERE name LIKE ? ORDER BY name LIMIT 20'
    ).all(`%${q}%`) as SupplierRow[]
  }

  const findByNormalizedName = (normalized: string): SupplierRow | undefined => {
    return db.prepare('SELECT * FROM suppliers WHERE name_normalized = ?').get(normalized) as SupplierRow | undefined
  }

  const create = (data: SupplierInput): SupplierRow => {
    const normalized = normalizeName(data.name)
    if (!normalized) throw new Error('Supplier name is required')
    const existing = findByNormalizedName(normalized)
    if (existing) throw new DuplicateSupplierError(existing.id, existing.name)
    const result = db.prepare(`
      INSERT INTO suppliers (name, name_normalized, phone, address, notes)
      VALUES (@name, @name_normalized, @phone, @address, @notes)
    `).run({
      name: data.name.trim(),
      name_normalized: normalized,
      phone: data.phone ?? '',
      address: data.address ?? '',
      notes: data.notes ?? ''
    })
    return db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid) as SupplierRow
  }

  const createOrGet = (name: string): SupplierRow => {
    const trimmed = name.trim()
    if (!trimmed) {
      const result = db.prepare("INSERT INTO suppliers (name, name_normalized) VALUES ('Unknown', 'unknown')").run()
      return db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid) as SupplierRow
    }
    const normalized = normalizeName(trimmed)
    const existing = findByNormalizedName(normalized)
    if (existing) return existing
    const result = db.prepare(`
      INSERT INTO suppliers (name, name_normalized) VALUES (@name, @name_normalized)
    `).run({ name: trimmed, name_normalized: normalized })
    return db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid) as SupplierRow
  }

  const update = (id: number, data: Partial<SupplierInput>): SupplierRow | undefined => {
    const existing = getById(id)
    if (!existing) return undefined
    const merged = { ...existing, ...data }
    if (data.name !== undefined && data.name !== existing.name) {
      const normalized = normalizeName(data.name)
      if (!normalized) throw new Error('Supplier name is required')
      const conflict = findByNormalizedName(normalized)
      if (conflict && conflict.id !== id) throw new DuplicateSupplierError(conflict.id, conflict.name)
      merged.name_normalized = normalized
      merged.name = data.name.trim()
    }
    db.prepare(`
      UPDATE suppliers SET name=@name, name_normalized=@name_normalized, phone=@phone, address=@address, notes=@notes, updated_at=datetime('now') WHERE id=@id
    `).run(merged)
    return getById(id)
  }

  const remove = (id: number): boolean => {
    const count = (db.prepare('SELECT COUNT(*) AS c FROM invoices WHERE supplier_id = ?').get(id) as { c: number }).c
    if (count > 0) return false
    return db.prepare('DELETE FROM suppliers WHERE id = ?').run(id).changes > 0
  }

  const getDashboard = (): SupplierDashboard => {
    const totalSuppliers = (db.prepare('SELECT COUNT(*) AS c FROM suppliers').get() as { c: number }).c

    const totalBalance = (db.prepare(`
      SELECT COALESCE(SUM(total), 0) AS t FROM invoices
    `).get() as { t: number }).t

    const highestBalance = db.prepare(`
      SELECT s.name, COALESCE(SUM(i.total), 0) AS balance
      FROM suppliers s
      LEFT JOIN invoices i ON i.supplier_id = s.id
      GROUP BY s.id
      ORDER BY balance DESC LIMIT 1
    `).get() as { name: string; balance: number } | undefined

    const latestSuppliers = db.prepare(`
      SELECT * FROM suppliers ORDER BY created_at DESC LIMIT 5
    `).all() as SupplierRow[]

    const latestInvoices = db.prepare(`
      SELECT i.id, i.invoice_number, i.total, COALESCE(s.name, i.supplier_name, '') AS supplier_name, i.created_at
      FROM invoices i
      LEFT JOIN suppliers s ON s.id = i.supplier_id
      ORDER BY i.created_at DESC LIMIT 5
    `).all() as { id: number; invoice_number: string; total: number; supplier_name: string; created_at: string }[]

    const top5ByBalance = db.prepare(`
      SELECT s.name, COALESCE(SUM(i.total), 0) AS balance
      FROM suppliers s
      LEFT JOIN invoices i ON i.supplier_id = s.id
      GROUP BY s.id
      ORDER BY balance DESC LIMIT 5
    `).all() as { name: string; balance: number }[]

    return { totalSuppliers, totalBalance, highestBalance: highestBalance ?? null, latestSuppliers, latestInvoices, top5ByBalance }
  }

  return { list, listWithBalances, getById, getWithBalance, getInvoices, search, create, createOrGet, update, remove, getDashboard }
}
