// frontend/src/pages/Tasks.jsx
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckSquare, Plus, X, Loader2, Search, Filter,
  Calendar, Phone, Mail, Users, Flag,
  Check, Trash2, Clock, AlertCircle,
  ChevronDown, User, Building2
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'

// ── Constants ─────────────────────────────────────────────────────────────────

const TASK_TYPES = {
  call:      { label: 'Call',      icon: Phone,       color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30'  },
  email:     { label: 'Email',     icon: Mail,        color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30'   },
  meeting:   { label: 'Meeting',   icon: Users,       color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  follow_up: { label: 'Follow-up', icon: CheckSquare, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
}

const PRIORITIES = {
  low:    { label: 'Low',    color: 'text-gray-400',   bg: 'bg-gray-500/10',   border: 'border-gray-500/30',   dot: 'bg-gray-400'   },
  medium: { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-400' },
  high:   { label: 'High',   color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    dot: 'bg-red-400'    },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isOverdue(task) {
  if (!task.due_at || task.status === 'completed') return false
  return new Date(task.due_at) < new Date()
}

function isDueToday(task) {
  if (!task.due_at || task.status === 'completed') return false
  const due = new Date(task.due_at)
  const now = new Date()
  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  )
}

function formatDue(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((d - now) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff < 0) return `${Math.abs(diff)}d overdue`
  if (diff < 7) return `In ${diff}d`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Contact Picker ────────────────────────────────────────────────────────────

function ContactPicker({ contacts, selectedId, onSelect }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selected = contacts.find(c => c.id === selectedId)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = contacts.filter(c => {
    const name = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase()
    return name.includes(search.toLowerCase()) || (c.email || '').toLowerCase().includes(search.toLowerCase())
  }).slice(0, 8)

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(o => !o)}
        className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between hover:border-violet-500 transition-colors"
      >
        {selected ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-violet-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
              {selected.first_name?.[0]}{selected.last_name?.[0] || ''}
            </div>
            <span>{selected.first_name} {selected.last_name}</span>
          </div>
        ) : (
          <span className="text-gray-500">Link to contact (optional)...</span>
        )}
        <div className="flex items-center gap-1">
          {selected && (
            <button onClick={e => { e.stopPropagation(); onSelect(null) }}
              className="text-gray-500 hover:text-red-400 transition-colors p-0.5">
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute left-0 right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-2 border-b border-gray-700">
              <input autoFocus type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search contacts..." className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
            <div className="max-h-44 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="text-gray-500 text-xs text-center py-4">No contacts found</p>
              ) : (
                filtered.map(c => (
                  <button key={c.id} onClick={() => { onSelect(c); setOpen(false); setSearch('') }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 transition-colors text-left">
                    <div className="w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {c.first_name?.[0]}{c.last_name?.[0] || ''}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-xs font-medium">{c.first_name} {c.last_name}</p>
                      {c.email && <p className="text-gray-500 text-[10px] truncate">{c.email}</p>}
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Task Card ─────────────────────────────────────────────────────────────────

function TaskCard({ task, onComplete, onDelete, onClick }) {
  const typeConfig = TASK_TYPES[task.task_type] || TASK_TYPES.follow_up
  const priorityConfig = PRIORITIES[task.priority] || PRIORITIES.medium
  const TypeIcon = typeConfig.icon
  const overdue = isOverdue(task)
  const dueToday = isDueToday(task)
  const completed = task.status === 'completed'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={() => onClick(task)}
      className={`group bg-gray-900 border rounded-2xl p-4 cursor-pointer transition-all hover:border-gray-700 ${
        completed ? 'opacity-60 border-gray-800' :
        overdue ? 'border-red-500/30 hover:border-red-500/50' :
        dueToday ? 'border-yellow-500/30 hover:border-yellow-500/50' :
        'border-gray-800'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Complete checkbox */}
        <button
          onClick={e => { e.stopPropagation(); if (!completed) onComplete(task.id) }}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
            completed
              ? 'bg-green-500 border-green-500'
              : 'border-gray-600 hover:border-violet-500'
          }`}
        >
          {completed && <Check className="w-3 h-3 text-white" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-medium ${completed ? 'line-through text-gray-500' : 'text-white'}`}>
              {task.title}
            </p>
            <button
              onClick={e => { e.stopPropagation(); onDelete(task.id) }}
              className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {task.notes && (
            <p className="text-gray-500 text-xs mt-1 line-clamp-2">{task.notes}</p>
          )}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {/* Type badge */}
            <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${typeConfig.bg} ${typeConfig.color} ${typeConfig.border}`}>
              <TypeIcon className="w-2.5 h-2.5" />
              {typeConfig.label}
            </span>

            {/* Priority */}
            <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${priorityConfig.bg} ${priorityConfig.color} ${priorityConfig.border}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${priorityConfig.dot}`} />
              {priorityConfig.label}
            </span>

            {/* Due date */}
            {task.due_at && (
              <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
                overdue ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                dueToday ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                'bg-gray-800 text-gray-400 border-gray-700'
              }`}>
                {overdue ? <AlertCircle className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                {formatDue(task.due_at)}
              </span>
            )}

            {/* Contact */}
            {task.contact && (
              <span className="flex items-center gap-1 text-[10px] text-gray-500">
                <User className="w-2.5 h-2.5" />
                {task.contact.first_name} {task.contact.last_name}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Task Modal (Create / Edit) ────────────────────────────────────────────────

function TaskModal({ task, contacts, onSave, onClose }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    notes: task?.notes || '',
    task_type: task?.task_type || 'follow_up',
    priority: task?.priority || 'medium',
    due_at: task?.due_at ? task.due_at.slice(0, 16) : '',
    contact_id: task?.contact?.id || null,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      await onSave({
        ...form,
        due_at: form.due_at ? new Date(form.due_at).toISOString() : null,
        contact_id: form.contact_id || null,
      })
      onClose()
    } catch {
      toast.error('Failed to save task')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">{task ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Task Title</label>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Follow up with client about proposal"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              autoFocus />
          </div>

          {/* Type + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Type</label>
              <div className="flex flex-col gap-1.5">
                {Object.entries(TASK_TYPES).map(([id, cfg]) => {
                  const Icon = cfg.icon
                  return (
                    <button key={id} onClick={() => setForm({ ...form, task_type: id })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                        form.task_type === id ? `${cfg.bg} ${cfg.color} ${cfg.border}` : 'bg-gray-800 text-gray-500 border-gray-700 hover:text-gray-300'
                      }`}>
                      <Icon className="w-3.5 h-3.5" />{cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Priority</label>
              <div className="flex flex-col gap-1.5">
                {Object.entries(PRIORITIES).map(([id, cfg]) => (
                  <button key={id} onClick={() => setForm({ ...form, priority: id })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                      form.priority === id ? `${cfg.bg} ${cfg.color} ${cfg.border}` : 'bg-gray-800 text-gray-500 border-gray-700 hover:text-gray-300'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />{cfg.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Due Date (optional)</label>
            <input type="datetime-local" value={form.due_at} onChange={e => setForm({ ...form, due_at: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
          </div>

          {/* Contact */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Link Contact</label>
            <ContactPicker contacts={contacts} selectedId={form.contact_id}
              onSelect={c => setForm({ ...form, contact_id: c ? c.id : null })} />
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Notes (optional)</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional context..." rows={3}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">Cancel</button>
          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'Saving...' : task ? 'Save Changes' : 'Create Task'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main Tasks Page ───────────────────────────────────────────────────────────

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [contacts, setContacts] = useState([])
  const [stats, setStats] = useState({ total_pending: 0, due_today: 0, overdue: 0, completed: 0 })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending')
  const [typeFilter, setTypeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const navigate = useNavigate()

  useEffect(() => {
    fetchAll()
    fetchContacts()
  }, [])

  const fetchAll = async () => {
    try {
      const [tasksRes, statsRes] = await Promise.all([
        api.get('/tasks/'),
        api.get('/tasks/stats'),
      ])
      setTasks(tasksRes.data)
      setStats(statsRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchContacts = async () => {
    try {
      const res = await api.get('/contacts/')
      setContacts(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreate = async (data) => {
    const res = await api.post('/tasks/', data)
    setTasks(prev => [res.data, ...prev])
    setStats(prev => ({ ...prev, total_pending: prev.total_pending + 1 }))
    toast.success('Task created!')
  }

  const handleUpdate = async (data) => {
    const res = await api.patch(`/tasks/${editTask.id}`, data)
    setTasks(prev => prev.map(t => t.id === editTask.id ? res.data : t))
    toast.success('Task updated!')
    setEditTask(null)
  }

  const handleComplete = async (taskId) => {
    const res = await api.post(`/tasks/${taskId}/complete`)
    setTasks(prev => prev.map(t => t.id === taskId ? res.data : t))
    setStats(prev => ({
      ...prev,
      total_pending: Math.max(0, prev.total_pending - 1),
      completed: prev.completed + 1,
    }))
    toast.success('Task completed!')
  }

  const handleDelete = async (taskId) => {
    if (!confirm('Delete this task?')) return
    try {
      await api.delete(`/tasks/${taskId}`)
      const task = tasks.find(t => t.id === taskId)
      setTasks(prev => prev.filter(t => t.id !== taskId))
      if (task?.status === 'pending') {
        setStats(prev => ({ ...prev, total_pending: Math.max(0, prev.total_pending - 1) }))
      }
      toast.success('Task deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleTaskClick = (task) => {
    setEditTask(task)
    setShowModal(true)
  }

  // Filter logic
  const filtered = tasks.filter(t => {
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.notes || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.contact ? `${t.contact.first_name} ${t.contact.last_name}`.toLowerCase().includes(search.toLowerCase()) : false)
    const matchStatus = statusFilter === 'all' || t.status === statusFilter
    const matchType = typeFilter === 'all' || t.task_type === typeFilter
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter
    return matchSearch && matchStatus && matchType && matchPriority
  })

  const statCards = [
    { label: 'Pending',   value: stats.total_pending, color: 'bg-violet-500', icon: CheckSquare },
    { label: 'Due Today', value: stats.due_today,     color: 'bg-yellow-500', icon: Clock       },
    { label: 'Overdue',   value: stats.overdue,       color: 'bg-red-500',    icon: AlertCircle },
    { label: 'Completed', value: stats.completed,     color: 'bg-green-500',  icon: Check       },
  ]

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Tasks</h1>
            <p className="text-gray-400 mt-1">Track follow-ups, calls, and meetings</p>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => { setEditTask(null); setShowModal(true) }}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Task
          </motion.button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }} className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <div className={`w-9 h-9 ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
                <stat.icon className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
              </div>
              <p className="text-gray-400 text-xs">{stat.label}</p>
              <p className="text-white text-2xl font-bold mt-0.5">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks..." className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
          </div>

          {/* Status */}
          <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
            {[['all', 'All'], ['pending', 'Pending'], ['completed', 'Done']].map(([id, label]) => (
              <button key={id} onClick={() => setStatusFilter(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === id ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'
                }`}>{label}</button>
            ))}
          </div>

          {/* Type */}
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="bg-gray-900 border border-gray-800 text-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors">
            <option value="all">All Types</option>
            {Object.entries(TASK_TYPES).map(([id, cfg]) => (
              <option key={id} value={id}>{cfg.label}</option>
            ))}
          </select>

          {/* Priority */}
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
            className="bg-gray-900 border border-gray-800 text-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors">
            <option value="all">All Priorities</option>
            {Object.entries(PRIORITIES).map(([id, cfg]) => (
              <option key={id} value={id}>{cfg.label}</option>
            ))}
          </select>
        </div>

        {/* Task list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <CheckSquare className="w-12 h-12 mx-auto mb-3 text-gray-700" />
            <p className="text-gray-500">
              {tasks.length === 0 ? 'No tasks yet' : 'No tasks match your filters'}
            </p>
            {tasks.length === 0 && (
              <p className="text-gray-600 text-sm mt-1">Create your first task to track follow-ups</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            <AnimatePresence>
              {filtered.map(task => (
                <TaskCard key={task.id} task={task}
                  onComplete={handleComplete}
                  onDelete={handleDelete}
                  onClick={handleTaskClick} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <TaskModal
            task={editTask}
            contacts={contacts}
            onSave={editTask ? handleUpdate : handleCreate}
            onClose={() => { setShowModal(false); setEditTask(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}