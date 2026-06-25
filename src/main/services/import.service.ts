import { dialog } from 'electron'
import fs from 'fs'
import { parse } from 'csv-parse/sync'
import type Database from 'better-sqlite3'

export interface ImportResult {
  imported: number
  updated: number
  failed: number
  errors: string[]
}

export async function importProductsFromCsv(db: Database.Database): Promise<ImportResult> {
  const result = await dialog.showOpenDialog({
    title: 'Import Products from CSV',
    filters: [{ name: 'CSV Files', extensions: ['csv'] }],
    properties: ['openFile']
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { imported: 0, updated: 0, failed: 0, errors: [] }
  }

  const filePath = result.filePaths[0]
  const content = fs.readFileSync(filePath, 'utf-8')

  let records: any[]
  try {
    records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true
    })
  } catch (err: any) {
    return { imported: 0, updated: 0, failed: 1, errors: [`Failed to parse CSV: ${err.message}`] }
  }

  let imported = 0
  let updated = 0
  let failed = 0
  const errors: string[] = []

  const findStmt = db.prepare('SELECT id FROM products WHERE code = ?')
  const insertStmt = db.prepare(`
    INSERT INTO products (code, name, selling_price) VALUES (@code, @name, @selling_price)
  `)
  const updateStmt = db.prepare(`
    UPDATE products SET name = @name, selling_price = @selling_price, updated_at = datetime('now') WHERE id = @id
  `)

  const doImport = db.transaction(() => {
    for (let i = 0; i < records.length; i++) {
      const row = records[i]
      const rowNum = i + 2
      const itemId = String(row.item_id ?? '').trim()
      const name = String(row.canonical_name ?? '').trim()
      const priceStr = String(row.price ?? '').trim()

      if (!itemId) { failed++; errors.push(`Row ${rowNum}: missing item_id`); continue }
      if (!name) { failed++; errors.push(`Row ${rowNum}: missing canonical_name`); continue }

      const price = parseFloat(priceStr.replace(',', '.'))
      if (isNaN(price) || price < 0) { failed++; errors.push(`Row ${rowNum}: invalid price "${row.price}"`); continue }

      const existing = findStmt.get(itemId) as { id: number } | undefined
      if (existing) {
        updateStmt.run({ id: existing.id, name, selling_price: price })
        updated++
      } else {
        insertStmt.run({ code: itemId, name, selling_price: price })
        imported++
      }
    }
  })

  try {
    doImport()
  } catch (err: any) {
    failed += records.length - imported - updated - failed
    errors.push(`Transaction failed: ${err.message}`)
  }

  return { imported, updated, failed, errors }
}
