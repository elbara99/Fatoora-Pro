import type Database from 'better-sqlite3'

export interface ProductRow {
  id: number
  code: string
  name: string
  selling_price: number
  is_active: number
  created_at: string
  updated_at: string
}

export interface ProductInput {
  code: string
  name: string
  selling_price?: number
}

export function createProductService(db: Database.Database) {
  const list = (): ProductRow[] => {
    return db.prepare(
      'SELECT * FROM products WHERE is_active = 1 ORDER BY name'
    ).all() as ProductRow[]
  }

  const search = (q: string): ProductRow[] => {
    return db.prepare(
      `SELECT * FROM products WHERE is_active = 1 AND (name LIKE ? OR code LIKE ?) ORDER BY name LIMIT 20`
    ).all(`%${q}%`, `%${q}%`) as ProductRow[]
  }

  const getById = (id: number): ProductRow | undefined => {
    return db.prepare('SELECT * FROM products WHERE id = ?').get(id) as ProductRow | undefined
  }

  const generateNextCode = (): string => {
    const row = db.prepare(
      `SELECT COALESCE(MAX(CAST(SUBSTR(code, 5) AS INTEGER)), 0) + 1 AS next
       FROM products WHERE code LIKE 'PRD-%'`
    ).get() as { next: number }
    return `PRD-${String(row.next).padStart(5, '0')}`
  }

  const create = (data: ProductInput): ProductRow => {
    const code = data.code && data.code.trim() ? data.code.trim() : generateNextCode()
    const result = db.prepare(`
      INSERT INTO products (code, name, selling_price)
      VALUES (@code, @name, @selling_price)
    `).run({ code, name: data.name, selling_price: data.selling_price ?? 0 })
    return getById(result.lastInsertRowid as number)!
  }

  const update = (id: number, data: Partial<ProductInput>): ProductRow | undefined => {
    const existing = getById(id)
    if (!existing) return undefined
    const merged = { ...existing, ...data }
    db.prepare(`
      UPDATE products SET code=@code, name=@name, selling_price=@selling_price,
        updated_at=datetime('now') WHERE id=@id
    `).run(merged)
    return getById(id)
  }

  const remove = (id: number): boolean => {
    return db.prepare('DELETE FROM products WHERE id = ?').run(id).changes > 0
  }

  return { list, search, getById, create, update, remove }
}
