import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '../.env') })

const USE_SQLITE = process.env.DB_DRIVER === 'sqlite'

let db

if (USE_SQLITE) {
  console.log('Using in-memory SQLite (ephemeral — see README)')

  const { default: Database } = await import('better-sqlite3')
  const { createSqliteSchema } = await import('./schema.sqlite.js')

  const raw = new Database(':memory:')
  raw.pragma('foreign_keys = ON')
  createSqliteSchema(raw)

  const isSelect = (sql) => /^\s*select/i.test(sql)

  db = {
    execute: async (sql, params = []) => {
      try {
        const stmt = raw.prepare(sql)
        if (isSelect(sql)) {
          return [stmt.all(...params)]
        }
        const info = stmt.run(...params)
        return [{ insertId: info.lastInsertRowid, affectedRows: info.changes }]
      } catch (error) {
        if (/UNIQUE constraint failed/i.test(error.message)) {
          const dupError = new Error(error.message)
          dupError.code = 'ER_DUP_ENTRY'
          throw dupError
        }
        throw error
      }
    },
  }
} else {
  const { default: mysql } = await import('mysql2/promise')

  console.log('DB_USER:', process.env.DB_USER)
  console.log('DB_NAME:', process.env.DB_NAME)

  db = mysql.createPool({
    host:           process.env.DB_HOST,
    user:           process.env.DB_USER,
    password:       process.env.DB_PASSWORD,
    database:       process.env.DB_NAME,
  })
}

export default db
