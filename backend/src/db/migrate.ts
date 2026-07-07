import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from './pool.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationPath = path.resolve(__dirname, '../../migrations/001_init.sql')
const sql = await readFile(migrationPath, 'utf8')

await pool.query(sql)
await pool.end()

console.log('Database migrated')
