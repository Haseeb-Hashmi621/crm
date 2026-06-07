import { useState } from 'react'
import { Mail, Lock } from 'lucide-react'
import api from '../services/api'
import useAuthStore from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import AuthLayout from '../components/auth/AuthLayout'
import {
  AuthFormCard,
  AuthError,
  AuthInput,
  AuthSubmitButton,
  AuthFooterLink,
  AuthPageHeader,
} from '../components/auth/AuthFormPrimitives'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/login', { email, password })
      setAuth(null, res.data.access_token)
      navigate('/dashboard')
    } catch {
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout brandingVariant="login">
      <AuthPageHeader title="Welcome back" subtitle="Sign in to your CRM account" />

      <AuthFormCard>
        <AuthError message={error} />

        <form onSubmit={handleLogin} className="space-y-5">
          <AuthInput
            label="Email"
            icon={Mail}
            index={0}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />

          <AuthInput
            label="Password"
            icon={Lock}
            index={1}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />

          <AuthSubmitButton loading={loading} loadingText="Signing in..." index={2}>
            Sign in
          </AuthSubmitButton>
        </form>

        <AuthFooterLink text="Don't have an account?" linkText="Sign up" href="/signup" />
      </AuthFormCard>
    </AuthLayout>
  )
}
