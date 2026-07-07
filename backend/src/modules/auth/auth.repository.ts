import { pool } from '../../database/pool.js'
import type { AuthUser } from '../../types/request.js'
import type { UserRecord } from './auth.types.js'

function userFromRow(row: any): AuthUser {
  return { id: row.id, email: row.email, name: row.name, initials: row.initials }
}

function userRecordFromRow(row: any): UserRecord {
  return { ...userFromRow(row), passwordHash: row.password_hash }
}

export const authRepository = {
  async findByEmail(email: string): Promise<UserRecord | undefined> {
    const { rows } = await pool.query('SELECT id,email,password_hash,name,initials FROM app_users WHERE email=$1', [email])
    return rows[0] ? userRecordFromRow(rows[0]) : undefined
  },

  async findById(id: string): Promise<AuthUser | undefined> {
    const { rows } = await pool.query('SELECT id,email,name,initials FROM app_users WHERE id=$1', [id])
    return rows[0] ? userFromRow(rows[0]) : undefined
  },

  async create(input: { id: string; email: string; passwordHash: string; name: string; initials: string }): Promise<AuthUser> {
    const { rows } = await pool.query(
      `INSERT INTO app_users (id,email,password_hash,name,initials)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id,email,name,initials`,
      [input.id, input.email, input.passwordHash, input.name, input.initials],
    )
    return userFromRow(rows[0])
  },
}
