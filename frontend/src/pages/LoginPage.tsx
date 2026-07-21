import { AlertTriangle, CheckCircle, Feather } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ROUTES } from '@/constants/routes'

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const verified = searchParams.get('verified') === 'true'
  const urlError = searchParams.get('error')
  const reset = searchParams.get('reset') === 'success'

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await auth.login({ email, password })
      navigate(ROUTES.home, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthFrame title="Welcome back" subtitle="Sign in to continue your private library.">
      {reset && (
        <div className="mb-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm flex items-start gap-3">
          <CheckCircle className="h-5 w-5 shrink-0 mt-0.5 text-emerald-500" />
          <div className="text-left">
            <p className="font-semibold text-emerald-800 dark:text-emerald-200">Password reset successful!</p>
            <p className="mt-0.5 text-emerald-700/80 dark:text-emerald-300/80">Your password has been reset. Please log in with your new password.</p>
          </div>
        </div>
      )}
      {verified && (
        <div className="mb-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm flex items-start gap-3">
          <CheckCircle className="h-5 w-5 shrink-0 mt-0.5 text-emerald-500" />
          <div className="text-left">
            <p className="font-semibold text-emerald-800 dark:text-emerald-200">Verification successful!</p>
            <p className="mt-0.5 text-emerald-700/80 dark:text-emerald-300/80">Your account has been activated. You can now log in.</p>
          </div>
        </div>
      )}
      {urlError && (
        <div className="mb-6 p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-sm flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-destructive" />
          <div className="text-left">
            <p className="font-semibold text-destructive/90">Verification failed!</p>
            <p className="mt-0.5 text-destructive/80">
              {urlError === 'expired_token'
                ? 'The verification link has expired. Please sign up again.'
                : 'The verification link is invalid or has already been used.'}
            </p>
          </div>
        </div>
      )}
      <form onSubmit={submit} className="space-y-4">
        <AuthInput label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <div className="flex flex-col space-y-1">
          <AuthInput label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
          <div className="text-right">
            <Link to={ROUTES.forgotPassword} className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>{submitting ? 'Signing in...' : 'Login'}</Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        New to Knowlix? <Link to={ROUTES.signup} className="text-primary hover:underline">Create an account</Link>
      </p>
    </AuthFrame>
  )
}

function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md p-6 md:p-7">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Feather className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <h1 className="font-serif text-3xl tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {children}
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
