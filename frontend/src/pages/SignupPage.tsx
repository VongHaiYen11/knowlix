import { Eye, EyeOff, Feather } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ROUTES } from '@/constants/routes'

export function SignupPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      await auth.signup({ name, email, password })
      navigate(ROUTES.home, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md p-6 md:p-7">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Feather className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <h1 className="font-serif text-3xl tracking-tight">Create your library</h1>
          <p className="mt-2 text-sm text-muted-foreground">One private workspace for your sources, notes, and research.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <AuthInput label="Name" value={name} onChange={setName} autoComplete="name" />
          <AuthInput label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
          <PasswordInput
            label="Password"
            value={password}
            onChange={setPassword}
            visible={passwordVisible}
            onVisibleChange={setPasswordVisible}
            autoComplete="new-password"
            minLength={8}
          />
          <PasswordInput
            label="Re-enter password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            visible={confirmPasswordVisible}
            onVisibleChange={setConfirmPasswordVisible}
            autoComplete="new-password"
            minLength={8}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>{submitting ? 'Creating...' : 'Sign up'}</Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account? <Link to={ROUTES.login} className="text-primary hover:underline">Login</Link>
        </p>
      </Card>
    </main>
  )
}

function AuthInput({ label, value, onChange, ...props }: { label: string; value: string; onChange: (value: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted-foreground">{label}</span>
      <input
        {...props}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        required
      />
    </label>
  )
}

function PasswordInput({
  label,
  value,
  onChange,
  visible,
  onVisibleChange,
  ...props
}: {
  label: string
  value: string
  onChange: (value: string) => void
  visible: boolean
  onVisibleChange: (visible: boolean) => void
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'>) {
  const Icon = visible ? EyeOff : Eye
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted-foreground">{label}</span>
      <div className="flex h-11 items-center rounded-lg border border-border bg-card px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
        <input
          {...props}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          required
        />
        <button
          type="button"
          onClick={() => onVisibleChange(!visible)}
          className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </label>
  )
}
