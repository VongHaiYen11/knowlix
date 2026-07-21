import { apiClient } from '@/repositories/apiClient'
import type { AuthResponse, AuthUser } from './authTypes'

export const authService = {
  async me(): Promise<AuthUser> {
    return apiClient.get<AuthUser>('/api/v1/me')
  },
  async login(input: { email: string; password: string }): Promise<AuthUser> {
    const response = await apiClient.post<AuthResponse>('/api/v1/auth/login', input)
    return response.user
  },
  async signup(input: { name: string; email: string; password: string }): Promise<{ ok: boolean; message: string }> {
    return apiClient.post<{ ok: boolean; message: string }>('/api/v1/auth/signup', input)
  },
  async logout(): Promise<void> {
    await apiClient.post<{ ok: true }>('/api/v1/auth/logout', {})
  },
  async updateMe(input: { name?: string; email?: string; currentPassword?: string; newPassword?: string }): Promise<AuthUser> {
    return apiClient.patch<AuthUser>('/api/v1/me', input)
  },
  async forgotPassword(email: string): Promise<{ ok: boolean; message: string }> {
    return apiClient.post<{ ok: boolean; message: string }>('/api/v1/auth/forgot-password', { email })
  },
  async resetPassword(input: { token: string; password: string }): Promise<{ ok: boolean; message: string }> {
    return apiClient.post<{ ok: boolean; message: string }>('/api/v1/auth/reset-password', input)
  },
}
