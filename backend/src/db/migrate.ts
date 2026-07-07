import 'dotenv/config'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from './pool.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.resolve(__dirname, '../../migrations')
const migrationFiles = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort()

for (const file of migrationFiles) {
  const sql = await readFile(path.join(migrationsDir, file), 'utf8')
  await pool.query(sql)
  console.log(`Applied ${file}`)
}
await pool.end()

console.log('Database migrated')
