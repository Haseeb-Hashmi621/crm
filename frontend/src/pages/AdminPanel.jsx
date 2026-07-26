import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Users, Plus, X, Loader2, Edit2,
  Trash2, Check, AlertCircle, Crown, User
} from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

const ROLE_CONFIG = {
  admin:    { label: 'Admin',    color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30', icon: Crown },
  manager:  { label: 'Manager',  color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   icon: Shield },
  agent:    { label: 'Agent',    color: 'text-teal-400',   bg: 'bg-teal-500/10',   border: 'border-teal-500/30',   icon: User },
  employee: { label: 'Employee', color: 'text-gray-400',   bg: 'bg-gray-500/10',   border: 'border-gray-500/30',   icon: User },
}

function TimeAgo({ dateStr }) {
  if (!dateStr) return null
  return <span>{new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
}

function UserModal({ user, onSave, onClose }) {
  const isEdit = !!user
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    role: user?.role || 'employee',
    password: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error('Name is required'); return }
    if (!form.email.trim()) { toast.error('Email is required'); return }
    if (!isEdit && form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">{isEdit ? 'Edit User' : 'New User'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Full Name</label>
            <input type="text" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
              placeholder="John Smith" autoFocus
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="john@company.com"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">
              Password {isEdit && <span className="text-gray-500 font-normal">(leave blank to keep current)</span>}
            </label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder={isEdit ? 'New password (optional)' : 'Min 6 characters'}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ROLE_CONFIG).map(([roleId, cfg]) => {
                const Icon = cfg.icon
                return (
                  <button key={roleId} onClick={() => setForm({ ...form, role: roleId })}
                    className={`flex items-center gap-2 justify-center px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      form.role === roleId
                        ? `${cfg.bg} ${cfg.color} ${cfg.border}`
                        : 'bg-gray-800 text-gray-500 border-gray-700 hover:text-gray-300'
                    }`}>
                    <Icon className="w-4 h-4" />
                    {cfg.label}
                  </button>
                )
              })}
            </div>
            {form.role === 'admin' && (
              <p className="text-yellow-400 text-xs mt-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Admins have full access including user management
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">
            Cancel
          </button>
          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create User'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function AdminPanel() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)

  useEffect(() => {
    api.get('/auth/me').then(r => setCurrentUserId(r.data.id)).catch(() => {})
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users')
      setUsers(res.data)
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error('Admin access required')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (data) => {
    const res = await api.post('/admin/users', {
      full_name: data.full_name,
      email: data.email,
      password: data.password,
      role: data.role,
    })
    setUsers(prev => [...prev, res.data])
    toast.success('User created!')
  }

  const handleUpdate = async (data) => {
    const payload = {
      full_name: data.full_name,
      email: data.email,
      role: data.role,
    }
    if (data.password) payload.password = data.password
    const res = await api.patch(`/admin/users/${editUser.id}`, payload)
    setUsers(prev => prev.map(u => u.id === editUser.id ? res.data : u))
    toast.success('User updated!')
    setEditUser(null)
  }

  const handleDelete = async (userId) => {
    if (!confirm('Delete this user? This cannot be undone.')) return
    try {
      await api.delete(`/admin/users/${userId}`)
      setUsers(prev => prev.filter(u => u.id !== userId))
      toast.success('User deleted')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete')
    }
  }

  const adminCount = users.filter(u => u.role === 'admin').length
  const managerCount = users.filter(u => u.role === 'manager').length
  const agentCount = users.filter(u => u.role === 'agent').length
  const employeeCount = users.filter(u => u.role === 'employee').length

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Shield className="w-6 h-6 text-violet-400" />
              <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            </div>
            <p className="text-gray-400">Manage team members and their access levels</p>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => { setEditUser(null); setShowModal(true) }}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add User
          </motion.button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Users',  value: users.length,   color: 'bg-gray-700',    icon: Users  },
            { label: 'Admins',       value: adminCount,     color: 'bg-violet-600',  icon: Crown  },
            { label: 'Managers',     value: managerCount,   color: 'bg-blue-600',    icon: Shield },
            { label: 'Agents',       value: agentCount,     color: 'bg-teal-600',    icon: User   },
            { label: 'Employees',    value: employeeCount,  color: 'bg-gray-500',    icon: User   },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-gray-900 rounded-2xl p-5 border border-gray-800 flex items-center gap-4">
              <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">{stat.label}</p>
                <p className="text-white text-2xl font-bold">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Users table */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-white font-semibold">Team Members</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-700" />
              <p className="text-gray-500">No users found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-4">User</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-4">Email</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-4">Role</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-4">Joined</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {users.map((user, i) => {
                    const roleCfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.employee
                    const RoleIcon = roleCfg.icon
                    const isSelf = user.id === currentUserId
                    const initials = user.full_name
                      ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                      : user.email[0].toUpperCase()

                    return (
                      <motion.tr key={user.id}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="border-b border-gray-800 last:border-0 hover:bg-gray-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                              user.role === 'admin' ? 'bg-violet-600' : 'bg-blue-600'
                            }`}>
                              {initials}
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">
                                {user.full_name}
                                {isSelf && <span className="ml-2 text-[10px] text-violet-400 font-normal">(you)</span>}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-sm">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${roleCfg.bg} ${roleCfg.color} ${roleCfg.border}`}>
                            <RoleIcon className="w-3 h-3" />
                            {roleCfg.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-xs">
                          <TimeAgo dateStr={user.created_at} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <motion.button whileHover={{ scale: 1.1 }}
                              onClick={() => { setEditUser(user); setShowModal(true) }}
                              className="p-1.5 text-gray-500 hover:text-violet-400 transition-colors"
                              title="Edit">
                              <Edit2 className="w-4 h-4" />
                            </motion.button>
                            {!isSelf && (
                              <motion.button whileHover={{ scale: 1.1 }}
                                onClick={() => handleDelete(user.id)}
                                className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                                title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>

        {/* Info box */}
        <div className="mt-6 bg-violet-500/10 border border-violet-500/20 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-violet-300 text-sm font-medium mb-1">Role Permissions</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                <div>
                  <p className="text-violet-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5" /> Admin
                  </p>
                  <ul className="text-gray-400 text-xs space-y-0.5">
                    <li>• Full access to all features</li>
                    <li>• User management (this panel)</li>
                    <li>• View and manage all team data</li>
                    <li>• System settings</li>
                  </ul>
                </div>
                <div>
                  <p className="text-blue-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Manager
                  </p>
                  <ul className="text-gray-400 text-xs space-y-0.5">
                    <li>• View and manage team data</li>
                    <li>• Send campaigns & messages</li>
                    <li>• Access mail hub & tasks</li>
                    <li>• No user management access</li>
                  </ul>
                </div>
                <div>
                  <p className="text-teal-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Agent
                  </p>
                  <ul className="text-gray-400 text-xs space-y-0.5">
                    <li>• Manage their own contacts & deals</li>
                    <li>• Send campaigns & messages</li>
                    <li>• Access mail hub & tasks</li>
                    <li>• No user management access</li>
                  </ul>
                </div>
                <div>
                  <p className="text-gray-400 text-xs font-semibold mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Employee
                  </p>
                  <ul className="text-gray-400 text-xs space-y-0.5">
                    <li>• Manage their own contacts & deals</li>
                    <li>• Send campaigns & messages</li>
                    <li>• Access mail hub & tasks</li>
                    <li>• No user management access</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <UserModal
            user={editUser}
            onSave={editUser ? handleUpdate : handleCreate}
            onClose={() => { setShowModal(false); setEditUser(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}