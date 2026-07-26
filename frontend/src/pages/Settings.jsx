import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Lock, Save, Loader2, Check, Eye, EyeOff, Shield, Bell, Palette, Moon } from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Profile form
  const [profileForm, setProfileForm] = useState({ full_name: '', email: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  // Password form
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [savingPassword, setSavingPassword] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    fetchMe()
  }, [])

  const fetchMe = async () => {
    try {
      const res = await api.get('/auth/me')
      setUser(res.data)
      setProfileForm({ full_name: res.data.full_name || '', email: res.data.email || '' })
    } catch (err) {
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!profileForm.full_name.trim()) {
      toast.error('Name cannot be empty')
      return
    }
    setSavingProfile(true)
    try {
      const res = await api.put('/auth/me', profileForm)
      setUser(res.data)
      setProfileSaved(true)
      toast.success('Profile updated!')
      setTimeout(() => setProfileSaved(false), 2000)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (!passwordForm.current_password || !passwordForm.new_password) {
      toast.error('Please fill in all fields')
      return
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New passwords do not match')
      return
    }
    if (passwordForm.new_password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setSavingPassword(true)
    try {
      await api.post('/auth/change-password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      })
      toast.success('Password changed!')
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to change password')
    } finally {
      setSavingPassword(false)
    }
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400 mb-8">Manage your account preferences</p>

        <div className="flex gap-6">
          {/* Sidebar tabs */}
          <div className="w-48 flex-shrink-0">
            <nav className="space-y-1">
              {TABS.map(tab => (
                <motion.button
                  key={tab.id}
                  whileHover={{ x: 2 }}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'bg-violet-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </motion.button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Avatar section */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <h2 className="text-white font-semibold mb-4">Your Profile</h2>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold">
                      {initials}
                    </div>
                    <div>
                      <p className="text-white font-medium">{user?.full_name}</p>
                      <p className="text-gray-400 text-sm">{user?.email}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-1.5 block">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <input
                          type="text"
                          value={profileForm.full_name}
                          onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })}
                          className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-1.5 block">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <input
                          type="email"
                          value={profileForm.email}
                          onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                          className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                        />
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                    >
                      {savingProfile ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : profileSaved ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {savingProfile ? 'Saving...' : profileSaved ? 'Saved!' : 'Save Changes'}
                    </motion.button>
                  </div>
                </div>

                {/* Appearance — Dark only for now; Light/System removed until
                    the app has real light-mode styles (see project notes) */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <h2 className="text-white font-semibold mb-1">Appearance</h2>
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border bg-violet-600 text-white border-violet-500 w-fit">
                    <Moon className="w-4 h-4" />
                    Dark
                  </div>
                </div>

                {/* Account info */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <h2 className="text-white font-semibold mb-4">Account Info</h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-800">
                      <span className="text-gray-400 text-sm">Account ID</span>
                      <span className="text-gray-500 text-xs font-mono">{user?.id?.slice(0, 8)}...</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-400 text-sm">Plan</span>
                      <span className="text-xs bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2.5 py-1 rounded-full font-medium">
                        Free
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <h2 className="text-white font-semibold mb-1">Change Password</h2>
                  <p className="text-gray-500 text-sm mb-6">Make sure your password is at least 6 characters</p>

                  <div className="space-y-4">
                    {/* Current password */}
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-1.5 block">Current Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <input
                          type={showCurrent ? 'text' : 'password'}
                          value={passwordForm.current_password}
                          onChange={e => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                          placeholder="••••••••"
                          className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                        />
                        <button
                          onClick={() => setShowCurrent(!showCurrent)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                        >
                          {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* New password */}
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-1.5 block">New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <input
                          type={showNew ? 'text' : 'password'}
                          value={passwordForm.new_password}
                          onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                          placeholder="••••••••"
                          className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                        />
                        <button
                          onClick={() => setShowNew(!showNew)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                        >
                          {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {/* Password strength */}
                      {passwordForm.new_password && (
                        <div className="mt-2">
                          <div className="flex gap-1">
                            {[1,2,3,4].map(i => (
                              <div
                                key={i}
                                className={`h-1 flex-1 rounded-full transition-colors ${
                                  passwordForm.new_password.length >= i * 3
                                    ? i <= 1 ? 'bg-red-500'
                                    : i <= 2 ? 'bg-yellow-500'
                                    : i <= 3 ? 'bg-blue-500'
                                    : 'bg-green-500'
                                    : 'bg-gray-700'
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {passwordForm.new_password.length < 4 ? 'Too short' :
                             passwordForm.new_password.length < 7 ? 'Weak' :
                             passwordForm.new_password.length < 10 ? 'Good' : 'Strong'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Confirm password */}
                    <div>
                      <label className="text-sm font-medium text-gray-300 mb-1.5 block">Confirm New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                        <input
                          type={showConfirm ? 'text' : 'password'}
                          value={passwordForm.confirm_password}
                          onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                          placeholder="••••••••"
                          className={`w-full bg-gray-800 border text-white rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none transition-colors ${
                            passwordForm.confirm_password && passwordForm.confirm_password !== passwordForm.new_password
                              ? 'border-red-500 focus:border-red-500'
                              : passwordForm.confirm_password && passwordForm.confirm_password === passwordForm.new_password
                              ? 'border-green-500 focus:border-green-500'
                              : 'border-gray-700 focus:border-violet-500'
                          }`}
                        />
                        <button
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                        >
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {passwordForm.confirm_password && passwordForm.confirm_password !== passwordForm.new_password && (
                        <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
                      )}
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleChangePassword}
                      disabled={savingPassword}
                      className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
                    >
                      {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                      {savingPassword ? 'Updating...' : 'Update Password'}
                    </motion.button>
                  </div>
                </div>

                {/* Session info */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                  <h2 className="text-white font-semibold mb-1">Session</h2>
                  <p className="text-gray-500 text-sm mb-4">Your current login session</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      <div>
                        <p className="text-white text-sm">Active session</p>
                        <p className="text-gray-500 text-xs">Token expires in 30 minutes of inactivity</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

          </div>
        </div>
      </motion.div>
    </div>
  )
}