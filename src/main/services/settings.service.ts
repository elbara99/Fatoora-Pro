import { dialog } from 'electron'
import fs from 'fs'
import type Database from 'better-sqlite3'

export interface SettingsMap {
  [key: string]: string
}

export function createSettingsService(db: Database.Database) {
  const getAll = (): SettingsMap => {
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
    const map: SettingsMap = {}
    for (const row of rows) {
      map[row.key] = row.value
    }
    return map
  }

  const set = (key: string, value: string): void => {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
  }

  const setMany = (data: SettingsMap): void => {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    const doSet = db.transaction(() => {
      for (const [key, value] of Object.entries(data)) {
        stmt.run(key, value)
      }
    })
    doSet()
  }

  const uploadLogo = async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      title: 'Select Logo',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const filePath = result.filePaths[0]
    const buffer = fs.readFileSync(filePath)
    const ext = filePath.split('.').pop()?.toLowerCase() || 'png'
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/webp'
    return `data:${mime};base64,${buffer.toString('base64')}`
  }

  return { getAll, set, setMany, uploadLogo }
}
