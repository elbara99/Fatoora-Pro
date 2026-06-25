import type Database from 'better-sqlite3'

export interface InvoiceRow {
  id: number
  invoice_number: string
  invoice_date: string
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
  notes?: string | null
  items: InvoiceItemInput[]
}

export function createInvoiceService(db: Database.Database) {
  const getItemsForInvoice = db.prepare(
    'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY line_sort'
  )

  const attachItems = (invoice: InvoiceRow): InvoiceRow & { items: any[] } => {
    const items = getItemsForInvoice.all(invoice.id) as any[]
    console.log(`[InvoiceService] invoice ${invoice.invoice_number} (id=${invoice.id}): loaded ${items.length} items`)
    return { ...invoice, items }
  }

  const list = (): (InvoiceRow & { items: any[] })[] => {
    const invoices = db.prepare('SELECT * FROM invoices ORDER BY created_at DESC').all() as InvoiceRow[]
    const result = invoices.map(attachItems)
    console.log(`[InvoiceService] list: ${result.length} invoices returned`)
    return result
  }

  const search = (q: string): (InvoiceRow & { items: any[] })[] => {
    const invoices = db.prepare(
      `SELECT * FROM invoices WHERE invoice_number LIKE ? ORDER BY created_at DESC LIMIT 50`
    ).all(`%${q}%`) as InvoiceRow[]
    const result = invoices.map(attachItems)
    console.log(`[InvoiceService] search: ${result.length} invoices returned`)
    return result
  }

  const getById = (id: number): (InvoiceRow & { items: any[] }) | undefined => {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as InvoiceRow | undefined
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
        INSERT INTO invoices (invoice_number, invoice_date, subtotal, total, notes)
        VALUES (@invoice_number, @invoice_date, @subtotal, @total, @notes)
      `).run({
        invoice_number: invoiceNumber,
        invoice_date: data.invoice_date,
        subtotal,
        total: subtotal,
        notes: data.notes ?? null
      })

      const invoiceId = result.lastInsertRowid as number
      const insertItem = db.prepare(`
        INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price, total, line_sort)
        VALUES (@invoice_id, @product_id, @product_name, @quantity, @unit_price, @total, @line_sort)
      `)

      console.log(`[InvoiceService] create: saving ${lineItems.length} items for invoice #${invoiceNumber}`)
      for (const item of lineItems) {
        insertItem.run({ invoice_id: invoiceId, ...item })
      }

      db.prepare(`UPDATE settings SET value = ? WHERE key = 'invoice_next_number'`).run(String(num + 1))
      return invoiceId
    })

    const newId = doCreate()
    const saved = db.prepare('SELECT COUNT(*) AS c FROM invoice_items WHERE invoice_id = ?').get(newId) as { c: number }
    console.log(`[InvoiceService] create: invoice #${invoiceNumber} saved (id=${newId}) with ${saved.c} items`)
    return db.prepare('SELECT * FROM invoices WHERE id = ?').get(newId) as InvoiceRow
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
        UPDATE invoices SET invoice_date = @invoice_date, subtotal = @subtotal, total = @total, notes = @notes
        WHERE id = @id
      `).run({
        id,
        invoice_date: data.invoice_date,
        subtotal,
        total: subtotal,
        notes: data.notes ?? null
      })

      db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(id)

      const insertItem = db.prepare(`
        INSERT INTO invoice_items (invoice_id, product_id, product_name, quantity, unit_price, total, line_sort)
        VALUES (@invoice_id, @product_id, @product_name, @quantity, @unit_price, @total, @line_sort)
      `)

      console.log(`[InvoiceService] update: saving ${lineItems.length} items for invoice id=${id}`)
      for (const item of lineItems) {
        insertItem.run({ invoice_id: id, ...item })
      }

      return id
    })

    const updatedId = doUpdate()
    const saved = db.prepare('SELECT COUNT(*) AS c FROM invoice_items WHERE invoice_id = ?').get(updatedId) as { c: number }
    console.log(`[InvoiceService] update: invoice id=${updatedId} updated with ${saved.c} items`)
    return db.prepare('SELECT * FROM invoices WHERE id = ?').get(updatedId) as InvoiceRow
  }

  const remove = (id: number): boolean => {
    return db.prepare('DELETE FROM invoices WHERE id = ?').run(id).changes > 0
  }

  return { list, search, getById, create, update, remove }
}
