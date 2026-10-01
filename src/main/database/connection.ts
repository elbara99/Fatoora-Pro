import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'

let db: Database.Database

/**
 * Returns the database path for this installation/copy.
 *
 * Portable builds get their own database inside a folder next to the EXE.
 * The EXE filename is part of the folder name, so copies such as:
 *   Fatoora Pro Portable.exe
 *   Fatoora Pro - Shop 2.exe
 * can safely keep different data even when they are stored in the same directory.
 *
 * Non-portable/installed builds keep using Electron's userData directory,
 * preserving the existing behavior.
 */
function getDatabasePath(): string {
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR
  const portableFile = process.env.PORTABLE_EXECUTABLE_FILE

  if (app.isPackaged && portableDir) {
    const executableName = path
      .basename(portableFile || process.execPath, path.extname(portableFile || process.execPath))
      .replace(/[<>:"/\\|?*]/g, '_')
      .trim() || 'Fatoora Pro'

    const dataDir = path.join(portableDir, 'data', executableName)
    fs.mkdirSync(dataDir, { recursive: true })

    return path.join(dataDir, 'fatoora-pro.db')
  }

  return path.join(app.getPath('userData'), 'fatoora-pro.db')
}

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = getDatabasePath()
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
  }
  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = undefined as unknown as Database.Database
  }
}
