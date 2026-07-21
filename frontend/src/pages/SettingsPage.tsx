import { Check, ChevronRight, Moon, Palette, Pencil, Sun, UserRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { authService } from '@/auth/authService'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { useThemeContext } from '@/components/layout/ThemeProvider'
import { Button } from '@/components/ui/Button'
import { SettingsGroup, SettingsRow } from '@/features/settings/SettingsGroup'
import { cn } from '@/utils/cn'

export function SettingsPage() {
  const { user, updateMe } = useAuth()
  const { theme, setTheme } = useThemeContext()
  const [editName, setEditName] = useState(user?.name ?? '')
  const [isEditingName, setIsEditingName] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showEmailVerifyModal, setShowEmailVerifyModal] = useState(false)
  const [showEmailEditModal, setShowEmailEditModal] = useState(false)
  const [verifyingEmailPassword, setVerifyingEmailPassword] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailVerifyError, setEmailVerifyError] = useState<string | null>(null)
  const [emailEditError, setEmailEditError] = useState<string | null>(null)

  useEffect(() => {
    setEditName(user?.name ?? '')
  }, [user])

  async function saveName() {
    const trimmed = editName.trim()
    if (!trimmed || trimmed === user?.name) {
      setIsEditingName(false)
      return
    }
    setSavingProfile(true)
    setNotice(null)
    setError(null)
    try {
      await updateMe({ name: trimmed })
      setNotice('Name updated.')
      setIsEditingName(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update name')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleVerifyPassword(password: string) {
    setVerifyingEmailPassword(true)
    setEmailVerifyError(null)
    try {
      const response = await authService.verifyPassword(password)
      if (response.ok) {
        setShowEmailVerifyModal(false)
        setEmailEditError(null)
        setShowEmailEditModal(true)
      }
    } catch (err) {
      setEmailVerifyError(err instanceof Error ? err.message : 'Incorrect password')
    } finally {
      setVerifyingEmailPassword(false)
    }
  }

  async function handleSaveEmail(newEmail: string) {
    const trimmed = newEmail.trim()
    if (!trimmed || trimmed === user?.email) {
      setShowEmailEditModal(false)
      return
    }
    setSavingEmail(true)
    setEmailEditError(null)
    try {
      await updateMe({ email: trimmed })
      setNotice('Email updated.')
      setShowEmailEditModal(false)
    } catch (err) {
      setEmailEditError(err instanceof Error ? err.message : 'Could not update email')
    } finally {
      setSavingEmail(false)
    }
  }

  async function handlePasswordSave(currentPassword: string, newPassword: string) {
    setSavingPassword(true)
    setNotice(null)
    setError(null)
    try {
      await updateMe({ currentPassword, newPassword })
      setNotice('Password updated successfully.')
      setShowPasswordModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password')
    } finally {
      setSavingPassword(false)
    }
  }

  const openPasswordModal = () => {
    setError(null)
    setNotice(null)
    setShowPasswordModal(true)
  }

  return (
    <PageShell variant="readable">
      <PageHeader title="Settings" description="Manage your account and theme." />
      <div className="space-y-8">
        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 text-destructive px-5 py-3 text-sm">
            {error}
          </div>
        )}

        <SettingsGroup icon={UserRound} title="Account">
          <SettingsRow label="Name" hint="Used for greetings and reports.">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm focus:outline-none sm:w-72"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={saveName}
                  disabled={savingProfile || !editName.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-50"
                  aria-label="Save name"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingName(false)
                    setEditName(user?.name ?? '')
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:bg-secondary"
                  aria-label="Cancel editing name"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground pr-2 font-normal">{user?.name}</span>
                <button
                  type="button"
                  onClick={() => setIsEditingName(true)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                  aria-label="Edit name"
                >
                  <Pencil className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
            )}
          </SettingsRow>
          
          <SettingsRow label="Email" hint="Used to sign in to your private workspace.">
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground pr-2 font-normal">{user?.email}</span>
              <button
                type="button"
                onClick={() => {
                  setEmailVerifyError(null)
                  setShowEmailVerifyModal(true)
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                aria-label="Edit email"
              >
                <Pencil className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          </SettingsRow>
          
          <button
            type="button"
            onClick={openPasswordModal}
            className="w-full text-left transition hover:bg-secondary/40 focus:outline-none"
          >
            <SettingsRow label="Change password" hint="Update your sign-in credentials.">
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </SettingsRow>
          </button>
        </SettingsGroup>

        <SettingsGroup icon={Palette} title="Appearance">
          <SettingsRow label="Theme" hint="Choose light or dark mode.">
            <IconSegmented value={theme} onChange={setTheme} />
          </SettingsRow>
        </SettingsGroup>
      </div>

      <ChangePasswordModal
        open={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSave={handlePasswordSave}
        saving={savingPassword}
        error={error}
        notice={notice}
      />

      <EmailPasswordVerifyModal
        open={showEmailVerifyModal}
        onClose={() => setShowEmailVerifyModal(false)}
        onVerify={handleVerifyPassword}
        loading={verifyingEmailPassword}
        error={emailVerifyError}
      />

      <EmailEditModal
        open={showEmailEditModal}
        onClose={() => setShowEmailEditModal(false)}
        onSave={handleSaveEmail}
        loading={savingEmail}
        error={emailEditError}
        currentEmail={user?.email ?? ''}
      />

      {notice && (
        <Toast message={notice} onClose={() => setNotice(null)} />
      )}
    </PageShell>
  )
}

function IconSegmented({ value, onChange }: { value: string; onChange: (value: 'light' | 'dark') => void }) {
  const options = [{ key: 'light', label: 'Light', icon: Sun }, { key: 'dark', label: 'Dark', icon: Moon }] as const
  return <div className="inline-flex rounded-lg border border-border bg-card p-0.5">{options.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => onChange(key)} className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition', value === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}><Icon className="h-3.5 w-3.5" strokeWidth={1.75} />{label}</button>)}</div>
}

interface ChangePasswordModalProps {
  open: boolean
  onClose: () => void
  onSave: (currentPassword: string, newPassword: string) => Promise<void>
  saving: boolean
  error: string | null
  notice: string | null
}

function ChangePasswordModal({ open, onClose, onSave, saving, error, notice }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setValidationError(null)
    }
  }, [open])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (newPassword.length < 8) {
      setValidationError('New password must be at least 8 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setValidationError('New passwords do not match.')
      return
    }

    onSave(currentPassword, newPassword)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 px-4 py-6 backdrop-blur-[2px]">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between gap-4 border-b border-border bg-secondary/30 px-6 py-5">
          <h2 className="font-serif text-xl tracking-tight">Change password</h2>
          <Button variant="ghost" size="icon" aria-label="Close modal" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {(error || validationError || notice) && (
            <div className={cn('rounded-xl border px-4 py-2.5 text-xs', (error || validationError) ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'border-primary/20 bg-accent text-accent-foreground')}>
              {error ?? validationError ?? notice}
            </div>
          )}

          <label className="block text-left">
            <span className="mb-1.5 block text-sm text-muted-foreground">Current password</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none"
              autoComplete="current-password"
              required
            />
          </label>

          <label className="block text-left">
            <span className="mb-1.5 block text-sm text-muted-foreground">New password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none"
              autoComplete="new-password"
              required
            />
          </label>

          <label className="block text-left">
            <span className="mb-1.5 block text-sm text-muted-foreground">Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none"
              autoComplete="new-password"
              required
            />
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !currentPassword || !newPassword}>
              {saving ? 'Updating...' : 'Update password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface EmailPasswordVerifyModalProps {
  open: boolean
  onClose: () => void
  onVerify: (password: string) => Promise<void>
  loading: boolean
  error: string | null
}

function EmailPasswordVerifyModal({ open, onClose, onVerify, loading, error }: EmailPasswordVerifyModalProps) {
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (open) {
      setPassword('')
    }
  }, [open])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onVerify(password)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 px-4 py-6 backdrop-blur-[2px]">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between gap-4 border-b border-border bg-secondary/30 px-6 py-5">
          <h2 className="font-serif text-xl tracking-tight">Security Check</h2>
          <Button variant="ghost" size="icon" aria-label="Close modal" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Please enter your current password to confirm you want to edit your email address.
          </p>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 text-destructive px-4 py-2.5 text-xs text-left">
              {error}
            </div>
          )}

          <label className="block text-left">
            <span className="mb-1.5 block text-sm text-muted-foreground">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none"
              autoComplete="current-password"
              autoFocus
              required
            />
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !password}>
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface EmailEditModalProps {
  open: boolean
  onClose: () => void
  onSave: (email: string) => Promise<void>
  loading: boolean
  error: string | null
  currentEmail: string
}

function EmailEditModal({ open, onClose, onSave, loading, error, currentEmail }: EmailEditModalProps) {
  const [email, setEmail] = useState(currentEmail)

  useEffect(() => {
    if (open) {
      setEmail(currentEmail)
    }
  }, [open, currentEmail])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(email)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 px-4 py-6 backdrop-blur-[2px]">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between gap-4 border-b border-border bg-secondary/30 px-6 py-5">
          <h2 className="font-serif text-xl tracking-tight">Edit Email Address</h2>
          <Button variant="ghost" size="icon" aria-label="Close modal" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 text-destructive px-4 py-2.5 text-xs text-left">
              {error}
            </div>
          )}

          <label className="block text-left">
            <span className="mb-1.5 block text-sm text-muted-foreground">New email address</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none"
              autoComplete="email"
              autoFocus
              required
            />
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !email.trim() || email.trim() === currentEmail}>
              {loading ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000)
    return () => clearTimeout(timer)
  }, [message, onClose])

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-accent text-accent-foreground px-4 py-3 text-sm shadow-lg animate-in slide-in-from-bottom-5 fade-in duration-300 min-w-64 max-w-sm">
      <span className="font-medium">{message}</span>
      <button
        type="button"
        onClick={onClose}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-accent-foreground/60 transition hover:bg-primary-foreground/10 hover:text-accent-foreground"
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
