import type { AuthUser } from '../../types/request.js'

export interface UserRecord extends AuthUser {
  passwordHash: string
}

export interface AuthResult {
  user: AuthUser
  token: string
}
