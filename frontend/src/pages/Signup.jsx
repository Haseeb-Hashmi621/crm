import { useState } from 'react'
import { Mail, Lock, User } from 'lucide-react'
import api from '../services/api'
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

export default function Signup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/signup', { email, password, full_name: fullName })
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout brandingVariant="signup">
      <AuthPageHeader title="Create account" subtitle="Start managing your business" />

      <AuthFormCard>
        <AuthError message={error} />

        <form onSubmit={handleSignup} className="space-y-5">
          <AuthInput
            label="Full Name"
            icon={User}
            index={0}
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Haseeb Hashmi"
            required
            autoComplete="name"
          />

          <AuthInput
            label="Email"
            icon={Mail}
            index={1}
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
            index={2}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="new-password"
          />

          <AuthSubmitButton loading={loading} loadingText="Creating account..." index={3}>
            Create account
          </AuthSubmitButton>
        </form>

        <AuthFooterLink text="Already have an account?" linkText="Sign in" href="/login" />
      </AuthFormCard>
    </AuthLayout>
  )
}
