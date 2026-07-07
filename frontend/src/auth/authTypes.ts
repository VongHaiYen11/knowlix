export interface AuthUser {
  id: string
  email: string
  name: string
  initials: string
}

export interface AuthResponse {
  user: AuthUser
}
