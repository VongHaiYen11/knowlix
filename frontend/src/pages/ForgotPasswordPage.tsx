import { Feather, Mail, ArrowLeft } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { authService } from '@/auth/authService'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ROUTES } from '@/constants/routes'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await authService.forgotPassword(email)
      setIsSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link')
    } finally {
      setSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <Card className="w-full max-w-md p-8 md:p-10 text-center relative overflow-hidden border border-border/80 bg-card/60 backdrop-blur-md shadow-2xl">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />

          <div className="relative z-10 flex flex-col items-center">
            <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[0_0_20px_rgba(59,130,246,0.15)] animate-pulse">
              <Mail className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <h1 className="font-serif text-3xl tracking-tight mb-3">Check your email</h1>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              If an account exists with <strong className="text-foreground">{email}</strong>, we have sent a link to reset your password. Please check your inbox.
            </p>
            <div className="w-full h-[1px] bg-border/50 my-6" />
            <Link to={ROUTES.login} className="w-full">
              <Button className="w-full py-2.5 h-11 bg-primary text-primary-foreground font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200">
                Back to login
              </Button>
            </Link>
          </div>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md p-6 md:p-7 border border-border/80 bg-card/60 backdrop-blur-md shadow-2xl">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Feather className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <h1 className="font-serif text-3xl tracking-tight">Forgot password?</h1>
          <p className="mt-2 text-sm text-muted-foreground">Enter your email address and we'll send you a password reset link.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <AuthInput label="Email address" type="email" value={email} onChange={setEmail} autoComplete="email" />
          {error && <p className="text-sm text-destructive text-left">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Sending...' : 'Send reset link'}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground flex items-center justify-center gap-1.5">
          <Link to={ROUTES.login} className="text-primary hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to login
          </Link>
        </p>
      </Card>
    </main>
  )
}

function AuthInput({ label, value, onChange, ...props }: { label: string; value: string; onChange: (value: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  return (
    <label className="block text-left">
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
