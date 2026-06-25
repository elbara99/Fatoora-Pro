import { BrowserWindow, ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import { createProductService } from '../services/product.service'
import { createInvoiceService } from '../services/invoice.service'
import { createSettingsService } from '../services/settings.service'
import { importProductsFromCsv } from '../services/import.service'

export function registerHandlers(db: Database.Database): void {
  const products = createProductService(db)
  const invoices = createInvoiceService(db)
  const settings = createSettingsService(db)

  ipcMain.handle('print:invoice', async (_e, html: string) => {
    const win = new BrowserWindow({ show: false })
    await new Promise<void>((resolve, reject) => {
      win.webContents.once('did-finish-load', () => resolve())
      win.webContents.once('did-fail-load', (_e, errCode, errDesc) => reject(new Error(errDesc)))
      win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    })
    win.webContents.print({}, () => win.close())
  })

  ipcMain.handle('products:list', () => products.list())
  ipcMain.handle('products:search', (_e, q: string) => products.search(q))
  ipcMain.handle('products:get', (_e, id: number) => products.getById(id))
  ipcMain.handle('products:create', (_e, data) => products.create(data))
  ipcMain.handle('products:update', (_e, id: number, data) => products.update(id, data))
  ipcMain.handle('products:delete', (_e, id: number) => products.remove(id))
  ipcMain.handle('products:importCsv', () => importProductsFromCsv(db))

  ipcMain.handle('invoices:list', () => invoices.list())
  ipcMain.handle('invoices:search', (_e, q: string) => invoices.search(q))
  ipcMain.handle('invoices:get', (_e, id: number) => invoices.getById(id))
  ipcMain.handle('invoices:create', (_e, data) => invoices.create(data))
  ipcMain.handle('invoices:update', (_e, id: number, data) => invoices.update(id, data))
  ipcMain.handle('invoices:delete', (_e, id: number) => invoices.remove(id))

  ipcMain.handle('settings:getAll', () => settings.getAll())
  ipcMain.handle('settings:set', (_e, key: string, value: string) => settings.set(key, value))
  ipcMain.handle('settings:setMany', (_e, data) => settings.setMany(data))
  ipcMain.handle('settings:uploadLogo', () => settings.uploadLogo())

  ipcMain.handle('dashboard:summary', () => {
    const today = new Date().toISOString().slice(0, 10)
    const monthStart = new Date()
    monthStart.setDate(1)
    const monthStr = monthStart.toISOString().slice(0, 10)

    const todayCount = (db.prepare(
      `SELECT COUNT(*) AS c FROM invoices WHERE date(invoice_date) = ?`
    ).get(today) as { c: number }).c

    const todayTotal = (db.prepare(
      `SELECT COALESCE(SUM(total), 0) AS t FROM invoices WHERE date(invoice_date) = ?`
    ).get(today) as { t: number }).t

    const monthTotal = (db.prepare(
      `SELECT COALESCE(SUM(total), 0) AS t FROM invoices WHERE invoice_date >= ?`
    ).get(monthStr) as { t: number }).t

    const lastInvoice = db.prepare(
      `SELECT invoice_number, total, created_at FROM invoices ORDER BY created_at DESC LIMIT 1`
    ).get() as { invoice_number: string; total: number; created_at: string } | undefined

    return { todayCount, todayTotal, monthTotal, lastInvoice }
  })
}
