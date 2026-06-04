import { useState, useEffect } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { Mail, Lock, Loader2 } from 'lucide-react'
import api from '../services/api'
import useAuthStore from '../store/authStore'
import { useNavigate } from 'react-router-dom'

function CursorGlow() {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const springX = useSpring(x, { stiffness: 80, damping: 20 })
  const springY = useSpring(y, { stiffness: 80, damping: 20 })

  useEffect(() => {
    const move = (e) => {
      x.set(e.clientX - 200)
      y.set(e.clientY - 200)
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])

  return (
    <motion.div
      animate={{ opacity: [0.15, 0.25, 0.15] }}
      transition={{ duration: 3, repeat: Infinity }}
      style={{
        left: springX,
        top: springY,
        background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)',
        position: 'fixed',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}

function FloatingParticles() {
  const particles = Array.from({ length: 20 }, (_, i) => i)
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-violet-500"
          style={{
            width: Math.random() * 4 + 1,
            height: Math.random() * 4 + 1,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: Math.random() * 0.3 + 0.1,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.1, 0.4, 0.1],
          }}
          transition={{
            duration: Math.random() * 4 + 3,
            repeat: Infinity,
            delay: Math.random() * 3,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

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
    } catch (err) {
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex overflow-hidden relative">
      <CursorGlow />

      {/* Left side */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center overflow-hidden">
        <FloatingParticles />

        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background: '#7c3aed',
            position: 'absolute',
            top: '10%',
            left: '10%',
            width: '384px',
            height: '384px',
            borderRadius: '50%',
            opacity: 0.2,
            filter: 'blur(64px)',
          }}
        />
        <motion.div
          animate={{ x: [0, -20, 0], y: [0, 40, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          style={{
            background: '#2563eb',
            position: 'absolute',
            bottom: '10%',
            right: '10%',
            width: '320px',
            height: '320px',
            borderRadius: '50%',
            opacity: 0.15,
            filter: 'blur(64px)',
          }}
        />

        <div className="relative z-10 text-center px-12">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="w-20 h-20 bg-violet-600 rounded-3xl flex items-center justify-center mx-auto mb-8"
              style={{ boxShadow: '0 0 40px rgba(124,58,237,0.4)' }}
            >
              <span className="text-white text-4xl font-bold">C</span>
            </motion.div>
            <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
              Grow your<br />business faster
            </h1>
            <p className="text-gray-400 text-lg leading-relaxed">
              The all-in-one CRM to manage contacts, track deals, and automate your workflow.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.7 }}
            whileHover={{ scale: 1.02, x: 4 }}
            style={{ transition: 'all 0.15s ease' }}
            className="mt-10 bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-5 text-left cursor-default"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <p className="text-gray-400 text-xs">Total Revenue</p>
            </div>
            <p className="text-white text-3xl font-bold">$48,295</p>
            <p className="text-green-400 text-xs mt-2">↑ 24% this month</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7, duration: 0.7 }}
            whileHover={{ scale: 1.02, x: -4 }}
            style={{ transition: 'all 0.15s ease' }}
            className="mt-4 bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl p-5 text-left cursor-default"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              <p className="text-gray-400 text-xs">Active Deals</p>
            </div>
            <p className="text-white text-3xl font-bold">142</p>
            <p className="text-violet-400 text-xs mt-2">↑ 8 new this week</p>
          </motion.div>
        </div>
      </div>

      {/* Right side — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-12 h-12 bg-violet-600 rounded-xl flex items-center justify-center mb-6 lg:hidden"
            >
              <span className="text-white text-xl font-bold">C</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-white"
            >
              Welcome back
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="text-gray-400 mt-2"
            >
              Sign in to your CRM account
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-900/90 backdrop-blur-sm rounded-2xl p-8 border border-gray-800"
            style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
          >
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <label className="text-sm font-medium text-gray-300 mb-2 block">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-violet-400 transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-all"
                    required
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <label className="text-sm font-medium text-gray-300 mb-2 block">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 group-focus-within:text-violet-400 transition-colors" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-all"
                    required
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(139,92,246,0.4)' }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? 'Signing in...' : 'Sign in'}
                </motion.button>
              </motion.div>
            </form>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-center text-gray-500 text-sm mt-6"
            >
              Don't have an account?{' '}
              <a href="/signup" className="text-violet-400 hover:text-violet-300 transition-colors">
                Sign up
              </a>
            </motion.p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}