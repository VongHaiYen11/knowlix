import { KeyRound, Moon, Palette, Sparkles, Sun, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { PageHeader } from '@/components/common/PageHeader'
import { PageShell } from '@/components/common/PageShell'
import { useThemeContext } from '@/components/layout/ThemeProvider'
import { Button } from '@/components/ui/Button'
import { SettingsFooter, SettingsGroup, SettingsRow } from '@/features/settings/SettingsGroup'
import { getModelPreference, MODEL_OPTIONS, setModelPreference, type ModelPreference } from '@/utils/modelPreference'
import { cn } from '@/utils/cn'

export function SettingsPage() {
  const { user, updateMe } = useAuth()
  const { theme, setTheme } = useThemeContext()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [model, setModel] = useState<ModelPreference>(() => getModelPreference())
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(user?.name ?? '')
    setEmail(user?.email ?? '')
  }, [user])

  async function saveProfile() {
    setSavingProfile(true)
    setNotice(null)
    setError(null)
    try {
      await updateMe({ name: name.trim(), email: email.trim() })
      setNotice('Profile updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  async function savePassword() {
    setSavingPassword(true)
    setNotice(null)
    setError(null)
    try {
      await updateMe({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setNotice('Password updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password')
    } finally {
      setSavingPassword(false)
    }
  }

  function chooseModel(nextModel: ModelPreference) {
    setModel(nextModel)
    setModelPreference(nextModel)
    setNotice('Model preference saved.')
    setError(null)
  }

  return (
    <PageShell variant="readable">
      <PageHeader title="Settings" description="Manage your account, theme, and model preference." />
      <div className="space-y-8">
        {(notice || error) && (
          <div className={cn('rounded-2xl border px-5 py-3 text-sm', error ? 'border-destructive/30 bg-destructive/5 text-destructive' : 'border-primary/20 bg-accent text-accent-foreground')}>
            {error ?? notice}
          </div>
        )}

        <SettingsGroup icon={UserRound} title="Account">
          <SettingsRow label="Name" hint="Used for greetings and reports.">
            <input value={name} onChange={(event) => setName(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm focus:outline-none sm:w-72" />
          </SettingsRow>
          <SettingsRow label="Email" hint="Used to sign in to your private workspace.">
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm focus:outline-none sm:w-72" />
          </SettingsRow>
          <SettingsFooter>
            <Button size="sm" onClick={saveProfile} disabled={savingProfile || !name.trim() || !email.trim()}>{savingProfile ? 'Saving...' : 'Save changes'}</Button>
          </SettingsFooter>
        </SettingsGroup>

        <SettingsGroup icon={KeyRound} title="Password">
          <SettingsRow label="Current password" hint="Required before choosing a new password.">
            <input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm focus:outline-none sm:w-72" autoComplete="current-password" />
          </SettingsRow>
          <SettingsRow label="New password" hint="Use at least 8 characters.">
            <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm focus:outline-none sm:w-72" autoComplete="new-password" />
          </SettingsRow>
          <SettingsFooter>
            <Button size="sm" onClick={savePassword} disabled={savingPassword || !currentPassword || newPassword.length < 8}>{savingPassword ? 'Saving...' : 'Update password'}</Button>
          </SettingsFooter>
        </SettingsGroup>

        <SettingsGroup icon={Palette} title="Appearance">
          <SettingsRow label="Theme" hint="Choose light or dark mode.">
            <IconSegmented value={theme} onChange={setTheme} />
          </SettingsRow>
        </SettingsGroup>

        <SettingsGroup icon={Sparkles} title="Model">
          <SettingsRow label="LLM model" hint="Used by research, inspiration, and maintenance requests.">
            <select value={model} onChange={(event) => chooseModel(event.target.value as ModelPreference)} className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none sm:w-72">
              {MODEL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </SettingsRow>
          <SettingsRow label="Current model" hint={MODEL_OPTIONS.find((option) => option.value === model)?.hint ?? 'Selected model for LLM requests.'}>
            <span className="text-sm text-muted-foreground">{model}</span>
          </SettingsRow>
        </SettingsGroup>
      </div>
    </PageShell>
  )
}

function IconSegmented({ value, onChange }: { value: string; onChange: (value: 'light' | 'dark') => void }) {
  const options = [{ key: 'light', label: 'Light', icon: Sun }, { key: 'dark', label: 'Dark', icon: Moon }] as const
  return <div className="inline-flex rounded-lg border border-border bg-card p-0.5">{options.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => onChange(key)} className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition', value === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}><Icon className="h-3.5 w-3.5" strokeWidth={1.75} />{label}</button>)}</div>
}
