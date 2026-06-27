import type Database from 'better-sqlite3'

export interface InvoiceRow {
  id: number
  invoice_number: string
  invoice_date: string
  supplier_id: number | null
  supplier_name: string
  subtotal: number
  total: number
  notes: string | null
  created_at: string
}

export interface InvoiceItemInput {
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
}

export interface InvoiceInput {
  invoice_date: string
  supplier_id: number
  supplier_name: string
  notes?: string | null
  items: InvoiceItemInput[]
}

export interface SupplierBalance {
  previousBalance: number
  newBalance: number
}

export function createInvoiceService(db: Database.Database) {
  const getItemsForInvoice = db.prepare(
    'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY line_sort'
  )

  const attachItems = (invoice: InvoiceRow): InvoiceRow & { items: any[] } => {
    const items = getItemsForInvoice.all(invoice.id) as any[]
    return { ...invoice, items }
  }

  const getSupplierBalance = (supplierId: number, excludeInvoiceId?: number): SupplierBalance => {
    let previousBalance: number
    if (excludeInvoiceId) {
      previousBalance = (db.prepare(
        'SELECT COALESCE(SUM(total), 0) AS t FROM invoices WHERE supplier_id = ? AND id != ?'
      ).get(supplierId, excludeInvoiceId) as { t: number }).t
    } else {
      previousBalance = (db.prepare(
        'SELECT COALESCE(SUM(total), 0) AS t FROM invoices WHERE supplier_id = ?'
      ).get(supplierId) as { t: number }).t
    }
    return { previousBalance, newBalance: previousBalance }
  }

  const list = (): (InvoiceRow & { items: any[] })[] => {
    const invoices = db.prepare(`
      SELECT i.*, COALESCE(s.name, i.supplier_name, '') AS supplier_name
      FROM invoices i
      LEFT JOIN suppliers s ON s.id = i.supplier_id
      ORDER BY i.created_at DESC
    `).all() as InvoiceRow[]
    const result = invoices.map(attachItems)
    return result
  }

  const search = (q: string): (InvoiceRow & { items: any[] })[] => {
    const invoices = db.prepare(`
      SELECT i.*, COALESCE(s.name, i.supplier_name, '') AS supplier_name
      FROM invoices i
      LEFT JOIN suppliers s ON s.id = i.supplier_id
      WHERE i.invoice_number LIKE ? OR COALESCE(s.name, i.supplier_name, '') LIKE ?
      ORDER BY i.created_at DESC LIMIT 50
    `).all(`%${q}%`, `%${q}%`) as InvoiceRow[]
    const result = invoices.map(attachItems)
    return result
  }

  const getById = (id: number): (InvoiceRow & { items: any[] }) | undefined => {
    const invoice = db.prepare(`
      SELECT i.*, COALESCE(s.name, i.supplier_name, '') AS supplier_name
      FROM invoices i
      LEFT JOIN suppliers s ON s.id = i.supplier_id
      WHERE i.id = ?
    `).get(id) as InvoiceRow | undefined
    if (!invoice) return undefined
    return attachItems(invoice)
  }

  const create = (data: InvoiceInput): InvoiceRow => {
    const nextVal = db.prepare(`SELECT value FROM settings WHERE key = 'invoice_next_number'`).get() as { value: string }
    const prefix = db.prepare(`SELECT value FROM settings WHERE key = 'invoice_prefix'`).get() as { value: string }
    const num = parseInt(nextVal.value, 10)
    const invoiceNumber = `${prefix.value}-${String(num).padStart(6, '0')}`

    const doCreate = db.transaction(() => {
      let subtotal = 0

      const lineItems = data.items.map((item, idx) => {
        const total = item.quantity * item.unit_price
        subtotal += total
        return { ...item, total, line_sort: idx }
      })

      const result = db.prepare(`
        INSERT INTO invoices (invoice_number, invoice_date, supplier_id, supplier_name, subtotal, total, notes)
        VALUES (@invoice_number, @invoice_date, @supplier_id, @supplier_name, @subtotal, @total, @notes)
      `).run({
        invoice_number: invoiceNumber,
        invoice_date: data.invoice_date,
        supplier_id: data.supplier_id,
        supplier_name: data.supplier_name,
        subtotal,
        total: subtotal,
        notes: data.notes ?? null
      })

      const invoiceId = result.lastInsertRowid as number
      const insertItem = db.prepare(`
        INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price, total, line_sort)
        VALUES (@invoice_id, @product_id, @product_name, @quantity, @unit_price, @total, @line_sort)
      `)

      for (const item of lineItems) {
        insertItem.run({ invoice_id: invoiceId, ...item })
      }

      db.prepare(`UPDATE settings SET value = ? WHERE key = 'invoice_next_number'`).run(String(num + 1))
      return invoiceId
    })

    const newId = doCreate()
    const saved = db.prepare('SELECT COUNT(*) AS c FROM invoice_items WHERE invoice_id = ?').get(newId) as { c: number }
    return db.prepare(`
      SELECT i.*, COALESCE(s.name, i.supplier_name, '') AS supplier_name
      FROM invoices i
      LEFT JOIN suppliers s ON s.id = i.supplier_id
      WHERE i.id = ?
    `).get(newId) as InvoiceRow
  }

  const update = (id: number, data: InvoiceInput): InvoiceRow => {
    const doUpdate = db.transaction(() => {
      let subtotal = 0

      const lineItems = data.items.map((item, idx) => {
        const total = item.quantity * item.unit_price
        subtotal += total
        return { ...item, total, line_sort: idx }
      })

      db.prepare(`
        UPDATE invoices SET invoice_date = @invoice_date, supplier_id = @supplier_id, supplier_name = @supplier_name, subtotal = @subtotal, total = @total, notes = @notes
        WHERE id = @id
      `).run({
        id,
        invoice_date: data.invoice_date,
        supplier_id: data.supplier_id,
        supplier_name: data.supplier_name,
        subtotal,
        total: subtotal,
        notes: data.notes ?? null
      })

      db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(id)

      const insertItem = db.prepare(`
        INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price, total, line_sort)
        VALUES (@invoice_id, @product_id, @product_name, @quantity, @unit_price, @total, @line_sort)
      `)

      for (const item of lineItems) {
        insertItem.run({ invoice_id: id, ...item })
      }

      return id
    })

    const updatedId = doUpdate()
    return db.prepare(`
      SELECT i.*, COALESCE(s.name, i.supplier_name, '') AS supplier_name
      FROM invoices i
      LEFT JOIN suppliers s ON s.id = i.supplier_id
      WHERE i.id = ?
    `).get(updatedId) as InvoiceRow
  }

  const remove = (id: number): boolean => {
    return db.prepare('DELETE FROM invoices WHERE id = ?').run(id).changes > 0
  }

  const getBySupplier = (supplierId: number): (InvoiceRow & { items: any[] })[] => {
    const invoices = db.prepare(`
      SELECT i.*, COALESCE(s.name, i.supplier_name, '') AS supplier_name
      FROM invoices i
      LEFT JOIN suppliers s ON s.id = i.supplier_id
      WHERE i.supplier_id = ?
      ORDER BY i.invoice_date ASC
    `).all(supplierId) as InvoiceRow[]
    return invoices.map(attachItems)
  }

  const searchAdvanced = (filters: {
    q?: string
    supplierId?: number | null
    dateFrom?: string
    dateTo?: string
    amountMin?: number
    amountMax?: number
  }): (InvoiceRow & { items: any[] })[] => {
    const conditions: string[] = []
    const params: any[] = []

    if (filters.q) {
      conditions.push('(i.invoice_number LIKE ? OR COALESCE(s.name, i.supplier_name, \'\') LIKE ?)')
      params.push(`%${filters.q}%`, `%${filters.q}%`)
    }
    if (filters.supplierId) {
      conditions.push('i.supplier_id = ?')
      params.push(filters.supplierId)
    }
    if (filters.dateFrom) {
      conditions.push('i.invoice_date >= ?')
      params.push(filters.dateFrom)
    }
    if (filters.dateTo) {
      conditions.push('i.invoice_date <= ?')
      params.push(filters.dateTo)
    }
    if (filters.amountMin !== undefined && filters.amountMin !== null) {
      conditions.push('i.total >= ?')
      params.push(filters.amountMin)
    }
    if (filters.amountMax !== undefined && filters.amountMax !== null) {
      conditions.push('i.total <= ?')
      params.push(filters.amountMax)
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''
    const invoices = db.prepare(`
      SELECT i.*, COALESCE(s.name, i.supplier_name, '') AS supplier_name
      FROM invoices i
      LEFT JOIN suppliers s ON s.id = i.supplier_id
      ${where}
      ORDER BY i.created_at DESC LIMIT 100
    `).all(...params) as InvoiceRow[]
    return invoices.map(attachItems)
  }

  return { list, search, searchAdvanced, getById, create, update, remove, getBySupplier, getSupplierBalance }
}
