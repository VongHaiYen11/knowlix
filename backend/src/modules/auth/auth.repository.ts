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

  async findRecordById(id: string): Promise<UserRecord | undefined> {
    const { rows } = await pool.query('SELECT id,email,password_hash,name,initials FROM app_users WHERE id=$1', [id])
    return rows[0] ? userRecordFromRow(rows[0]) : undefined
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

  async update(id: string, input: { email?: string; name?: string; initials?: string; passwordHash?: string }): Promise<AuthUser> {
    const { rows } = await pool.query(
      `UPDATE app_users
       SET email=COALESCE($2,email),
           name=COALESCE($3,name),
           initials=COALESCE($4,initials),
           password_hash=COALESCE($5,password_hash)
       WHERE id=$1
       RETURNING id,email,name,initials`,
      [id, input.email, input.name, input.initials, input.passwordHash],
    )
    return userFromRow(rows[0])
  },

  async deleteVerificationByEmail(email: string): Promise<void> {
    await pool.query('DELETE FROM email_verifications WHERE email = $1', [email])
  },

  async createVerification(token: string, input: { email: string; passwordHash: string; name: string; initials: string; expiresAt: Date }): Promise<void> {
    await pool.query(
      `INSERT INTO email_verifications (token, email, password_hash, name, initials, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [token, input.email, input.passwordHash, input.name, input.initials, input.expiresAt],
    )
  },

  async findVerificationByToken(token: string): Promise<any | undefined> {
    const { rows } = await pool.query(
      'SELECT token, email, password_hash, name, initials, expires_at FROM email_verifications WHERE token = $1',
      [token],
    )
    return rows[0]
  },

  async deleteVerificationByToken(token: string): Promise<void> {
    await pool.query('DELETE FROM email_verifications WHERE token = $1', [token])
  },

  async deleteResetTokenByEmail(email: string): Promise<void> {
    await pool.query('DELETE FROM password_resets WHERE email = $1', [email])
  },

  async createResetToken(token: string, email: string, expiresAt: Date): Promise<void> {
    await pool.query(
      `INSERT INTO password_resets (token, email, expires_at)
       VALUES ($1, $2, $3)`,
      [token, email, expiresAt],
    )
  },

  async findResetRecordByToken(token: string): Promise<any | undefined> {
    const { rows } = await pool.query(
      'SELECT token, email, expires_at FROM password_resets WHERE token = $1',
      [token],
    )
    return rows[0]
  },

  async deleteResetToken(token: string): Promise<void> {
    await pool.query('DELETE FROM password_resets WHERE token = $1', [token])
  },

  async updatePasswordByEmail(email: string, passwordHash: string): Promise<void> {
    await pool.query(
      'UPDATE app_users SET password_hash = $2 WHERE email = $1',
      [email, passwordHash],
    )
  },
}
