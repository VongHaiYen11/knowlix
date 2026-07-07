import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { UnauthorizedError } from '../errors/index.js'

interface SessionPayload extends jwt.JwtPayload {
  sub: string
}

export function signSessionToken(userId: string): string {
  return jwt.sign({}, env.jwtSecret, { subject: userId, expiresIn: '7d' })
}

export function verifySessionToken(token: string): SessionPayload {
  try {
    const payload = jwt.verify(token, env.jwtSecret)
    if (typeof payload === 'string' || !payload.sub) throw new UnauthorizedError()
    return payload as SessionPayload
  } catch {
    throw new UnauthorizedError()
  }
}
