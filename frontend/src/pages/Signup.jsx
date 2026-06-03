import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Lock, User, Loader2 } from 'lucide-react'
import api from '../services/api'
import { useNavigate } from 'react-router-dom'

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
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-flex items-center justify-center w-16 h-16 bg-violet-600 rounded-2xl mb-4"
          >
            <span className="text-white text-2xl font-bold">C</span>
          </motion.div>
          <h1 className="text-3xl font-bold text-white">Create account</h1>
          <p className="text-gray-400 mt-2">Start managing your business</p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-900 rounded-2xl p-8 border border-gray-800"
        >
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Haseeb Hashmi"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                  required
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Creating account...' : 'Create account'}
            </motion.button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Already have an account?{' '}
            <a href="/login" className="text-violet-400 hover:text-violet-300">
              Sign in
            </a>
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}