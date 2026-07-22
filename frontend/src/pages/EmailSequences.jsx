import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Repeat, Plus, X, Loader2, Trash2, Edit2, Check, Users,
  Clock, Mail, ChevronDown, ChevronUp, Play, Pause, XCircle,
  CheckCircle2, AlertCircle, GripVertical, Copy as CopyIcon
} from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  draft:    { label: 'Draft',    color: 'text-gray-400',   bg: 'bg-gray-500/10',   border: 'border-gray-500/30' },
  active:   { label: 'Active',   color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30' },
  paused:   { label: 'Paused',   color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  archived: { label: 'Archived', color: 'text-gray-500',   bg: 'bg-gray-500/10',   border: 'border-gray-500/30' },
}

const ENROLLMENT_STATUS_CONFIG = {
  active:    { label: 'Active',    color: 'text-green-400',  bg: 'bg-green-500/10',  icon: Play },
  paused:    { label: 'Paused',    color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: Pause },
  completed: { label: 'Completed', color: 'text-blue-400',   bg: 'bg-blue-500/10',   icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', color: 'text-gray-500',   bg: 'bg-gray-500/10',   icon: XCircle },
  exited:    { label: 'Replied',   color: 'text-violet-400', bg: 'bg-violet-500/10', icon: Mail },
  failed:    { label: 'Failed',    color: 'text-red-400',    bg: 'bg-red-500/10',    icon: AlertCircle },
}

function fmtDelay(days, hours) {
  const parts = []
  if (days) parts.push(`${days}d`)
  if (hours) parts.push(`${hours}h`)
  return parts.length ? parts.join(' ') : 'Immediately'
}

// ── Step Editor Row ───────────────────────────────────────────────────────

function StepRow({ step, index, onChange, onRemove }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center pt-1">
          <GripVertical className="w-4 h-4 text-gray-700" />
          <span className="text-violet-400 text-xs font-bold mt-1">#{index + 1}</span>
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-gray-500 text-xs">Send after</span>
            </div>
            <input
              type="number" min="0" value={step.delay_days}
              onChange={e => onChange(index, { ...step, delay_days: parseInt(e.target.value) || 0 })}
              className="w-16 bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:border-violet-500"
            />
            <span className="text-gray-500 text-xs">days</span>
            <input
              type="number" min="0" max="23" value={step.delay_hours}
              onChange={e => onChange(index, { ...step, delay_hours: parseInt(e.target.value) || 0 })}
              className="w-16 bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:border-violet-500"
            />
            <span className="text-gray-500 text-xs">hours</span>
            <span className="text-gray-600 text-xs ml-auto">
              {index === 0 ? 'from enrollment' : 'after previous step'}
            </span>
            <button onClick={() => onRemove(index)} className="text-gray-600 hover:text-red-400 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <input
            type="text" value={step.subject}
            onChange={e => onChange(index, { ...step, subject: e.target.value })}
            placeholder="Email subject — use {{name}}, {{company}}"
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
          />
          <textarea
            value={step.body}
            onChange={e => onChange(index, { ...step, body: e.target.value })}
            placeholder={`Hi {{name}},\n\nWrite this step's email...`}
            rows={4}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 resize-none font-mono"
          />
        </div>
      </div>
    </div>
  )
}

// ── Sequence Builder Modal ────────────────────────────────────────────────

function SequenceModal({ sequence, onSave, onClose }) {
  const isEdit = !!sequence
  const [form, setForm] = useState({
    name: sequence?.name || '',
    description: sequence?.description || '',
    exit_on_reply: sequence?.exit_on_reply ?? true,
    from_name: sequence?.from_name || '',
  })
  const [steps, setSteps] = useState(
    sequence?.steps?.length
      ? sequence.steps.map(s => ({ subject: s.subject, body: s.body, delay_days: s.delay_days, delay_hours: s.delay_hours }))
      : [{ subject: '', body: '', delay_days: 0, delay_hours: 0 }]
  )
  const [saving, setSaving] = useState(false)

  const addStep = () => setSteps(prev => [...prev, { subject: '', body: '', delay_days: 3, delay_hours: 0 }])
  const updateStep = (idx, updated) => setSteps(prev => prev.map((s, i) => i === idx ? updated : s))
  const removeStep = (idx) => setSteps(prev => prev.filter((_, i) => i !== idx))

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Sequence name is required'); return }
    const validSteps = steps.filter(s => s.subject.trim() && s.body.trim())
    if (validSteps.length === 0) { toast.error('Add at least one complete step'); return }

    setSaving(true)
    try {
      await onSave({ ...form, steps: validSteps })
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save sequence')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-2xl max-h-[92vh] flex flex-col">

        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-600/20 rounded-xl flex items-center justify-center">
              <Repeat className="w-5 h-5 text-violet-400" />
            </div>
            <h2 className="text-white font-semibold text-lg">{isEdit ? 'Edit Sequence' : 'New Email Sequence'}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Sequence Name</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. New Lead Nurture, Post-Demo Follow-up" autoFocus
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Description <span className="text-gray-500 font-normal">(optional)</span></label>
            <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="What is this sequence for?"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">From Name <span className="text-gray-500 font-normal">(optional)</span></label>
              <input type="text" value={form.from_name} onChange={e => setForm({ ...form, from_name: e.target.value })}
                placeholder="e.g. Your Sales Team"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
            <div className="flex items-end pb-2.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.exit_on_reply}
                  onChange={e => setForm({ ...form, exit_on_reply: e.target.checked })}
                  className="accent-violet-500 w-4 h-4" />
                <span className="text-sm text-gray-300">Stop sequence if contact replies</span>
              </label>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-300">Email Steps</label>
              <span className="text-gray-600 text-xs">Use {'{{'}'name{'}}'},  {'{{'}'email{'}}'},  {'{{'}'company{'}}'}</span>
            </div>
            <div className="space-y-3">
              {steps.map((step, idx) => (
                <StepRow key={idx} step={step} index={idx} onChange={updateStep} onRemove={removeStep} />
              ))}
            </div>
            <button onClick={addStep}
              className="mt-3 flex items-center gap-1.5 text-violet-400 hover:text-violet-300 text-sm transition-colors">
              <Plus className="w-4 h-4" /> Add step
            </button>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-800">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">
            Cancel
          </button>
          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Sequence'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Enroll Modal ───────────────────────────────────────────────────────────

function EnrollModal({ sequence, contacts, onEnroll, onClose }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])
  const [enrolling, setEnrolling] = useState(false)

  const filtered = contacts.filter(c => {
    const q = search.toLowerCase()
    return `${c.first_name} ${c.last_name} ${c.email || ''} ${c.company || ''}`.toLowerCase().includes(q)
  })

  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleEnroll = async () => {
    if (selected.length === 0) { toast.error('Select at least one contact'); return }
    setEnrolling(true)
    try {
      const result = await onEnroll(selected)
      toast.success(`Enrolled ${result.enrolled} contact${result.enrolled !== 1 ? 's' : ''}${result.skipped ? ` (${result.skipped} skipped)` : ''}`)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to enroll')
    } finally {
      setEnrolling(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-white font-semibold">Enroll Contacts — {sequence.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 border-b border-gray-800">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No contacts found</p>
          ) : filtered.map(c => (
            <label key={c.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-800 rounded-xl cursor-pointer transition-colors">
              <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} className="accent-violet-500 w-4 h-4" />
              <div className="w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {c.first_name?.[0]}{c.last_name?.[0] || ''}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm truncate">{c.first_name} {c.last_name}</p>
                <p className="text-gray-500 text-xs truncate">{c.email || 'No email — will be skipped'}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="flex gap-3 p-4 border-t border-gray-800">
          <span className="text-gray-500 text-xs flex items-center">{selected.length} selected</span>
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">
            Cancel
          </button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleEnroll} disabled={enrolling}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex items-center gap-2">
            {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            {enrolling ? 'Enrolling...' : 'Enroll'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Sequence Detail (enrollments + stats) ───────────────────────────────────

function SequenceDetail({ sequence, onClose, onEnrollClick, onRefreshStats }) {
  const [enrollments, setEnrollments] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [enrRes, statsRes] = await Promise.all([
        api.get(`/email-sequences/${sequence.id}/enrollments`),
        api.get(`/email-sequences/${sequence.id}/stats`),
      ])
      setEnrollments(enrRes.data)
      setStats(statsRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [sequence.id])

  const handleAction = async (enrollmentId, action) => {
    try {
      await api.post(`/email-sequences/enrollments/${enrollmentId}/${action}`)
      toast.success(`Enrollment ${action}d`)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.detail || `Failed to ${action}`)
    }
  }

  const copyId = () => {
    navigator.clipboard.writeText(sequence.id)
    toast.success('Sequence ID copied — use it in Automation rules')
  }

  return (
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-end z-50" onClick={onClose}>
      <motion.div onClick={e => e.stopPropagation()}
        className="h-full w-full max-w-xl bg-gray-900 border-l border-gray-800 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-white font-bold text-lg">{sequence.name}</h2>
              {sequence.description && <p className="text-gray-500 text-xs mt-0.5">{sequence.description}</p>}
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <button onClick={copyId} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-violet-400 transition-colors mb-4">
            <CopyIcon className="w-3 h-3" /> Copy Sequence ID (for Automation rules)
          </button>

          {stats && (
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: 'Active', value: stats.active, color: 'text-green-400' },
                { label: 'Completed', value: stats.completed, color: 'text-blue-400' },
                { label: 'Paused', value: stats.paused, color: 'text-yellow-400' },
                { label: 'Emails Sent', value: stats.total_emails_sent, color: 'text-violet-400' },
              ].map(s => (
                <div key={s.label} className="bg-gray-800/60 rounded-xl p-2.5 text-center">
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-gray-500 text-[10px]">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onEnrollClick}
            className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <Users className="w-4 h-4" /> Enroll Contacts
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-violet-500 animate-spin" /></div>
          ) : enrollments.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-10 h-10 mx-auto mb-3 text-gray-700" />
              <p className="text-gray-500 text-sm">No contacts enrolled yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {enrollments.map(e => {
                const cfg = ENROLLMENT_STATUS_CONFIG[e.status] || ENROLLMENT_STATUS_CONFIG.active
                const Icon = cfg.icon
                return (
                  <div key={e.id} className="flex items-center gap-3 px-6 py-3.5">
                    <div className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {e.contact?.first_name?.[0]}{e.contact?.last_name?.[0] || ''}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm truncate">{e.contact?.first_name} {e.contact?.last_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} flex items-center gap-1`}>
                          <Icon className="w-2.5 h-2.5" />{cfg.label}
                        </span>
                        <span className="text-gray-600 text-[10px]">Step {e.current_step_index + 1}</span>
                        {e.next_send_at && e.status === 'active' && (
                          <span className="text-gray-600 text-[10px]">Next: {new Date(e.next_send_at).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {e.status === 'active' && (
                        <button onClick={() => handleAction(e.id, 'pause')} title="Pause"
                          className="p-1.5 text-gray-500 hover:text-yellow-400 transition-colors"><Pause className="w-3.5 h-3.5" /></button>
                      )}
                      {e.status === 'paused' && (
                        <button onClick={() => handleAction(e.id, 'resume')} title="Resume"
                          className="p-1.5 text-gray-500 hover:text-green-400 transition-colors"><Play className="w-3.5 h-3.5" /></button>
                      )}
                      {['active', 'paused'].includes(e.status) && (
                        <button onClick={() => handleAction(e.id, 'cancel')} title="Cancel"
                          className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"><XCircle className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function EmailSequences() {
  const [sequences, setSequences] = useState([])
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editSequence, setEditSequence] = useState(null)
  const [viewSequence, setViewSequence] = useState(null)
  const [enrollSequence, setEnrollSequence] = useState(null)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const [seqRes, contactsRes] = await Promise.all([
        api.get('/email-sequences/'),
        api.get('/contacts/'),
      ])
      setSequences(seqRes.data)
      setContacts(contactsRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (data) => {
    const res = await api.post('/email-sequences/', data)
    setSequences(prev => [res.data, ...prev])
    toast.success('Sequence created!')
  }

  const handleUpdate = async (data) => {
    const res = await api.patch(`/email-sequences/${editSequence.id}`, data)
    setSequences(prev => prev.map(s => s.id === editSequence.id ? res.data : s))
    setEditSequence(null)
    toast.success('Sequence updated!')
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this sequence? All enrollments will be removed.')) return
    try {
      await api.delete(`/email-sequences/${id}`)
      setSequences(prev => prev.filter(s => s.id !== id))
      toast.success('Sequence deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleToggleStatus = async (sequence) => {
    const next = sequence.status === 'active' ? 'paused' : 'active'
    try {
      const res = await api.patch(`/email-sequences/${sequence.id}`, { status: next })
      setSequences(prev => prev.map(s => s.id === sequence.id ? res.data : s))
      toast.success(`Sequence ${next}`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleEnroll = async (contactIds) => {
    const res = await api.post(`/email-sequences/${enrollSequence.id}/enroll`, { contact_ids: contactIds })
    return res.data
  }

  const openEdit = (seq) => { setEditSequence(seq); setShowBuilder(true) }

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Repeat className="w-6 h-6 text-violet-400" />
              <h1 className="text-2xl font-bold text-white">Email Sequences</h1>
            </div>
            <p className="text-gray-400">Automated multi-step drip campaigns for nurturing contacts over time</p>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => { setEditSequence(null); setShowBuilder(true) }}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Sequence
          </motion.button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-violet-500 animate-spin" /></div>
        ) : sequences.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-violet-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Repeat className="w-8 h-8 text-violet-400" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">No sequences yet</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-6 text-sm">
              Build a multi-step nurture sequence — e.g. Day 0 welcome, Day 3 case study, Day 7 offer — and enroll contacts manually or via Automation.
            </p>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowBuilder(true)}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors mx-auto">
              <Plus className="w-4 h-4" /> Create your first sequence
            </motion.button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {sequences.map((seq, i) => {
                const cfg = STATUS_CONFIG[seq.status] || STATUS_CONFIG.draft
                return (
                  <motion.div key={seq.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setViewSequence(seq)}
                    className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all cursor-pointer group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 bg-violet-600/20 rounded-xl flex items-center justify-center">
                        <Repeat className="w-5 h-5 text-violet-400" />
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={e => { e.stopPropagation(); openEdit(seq) }}
                          className="p-1.5 text-gray-500 hover:text-violet-400 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(seq.id) }}
                          className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <h3 className="text-white font-semibold mb-1">{seq.name}</h3>
                    {seq.description && <p className="text-gray-500 text-xs mb-3 line-clamp-2">{seq.description}</p>}
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}>{cfg.label}</span>
                      <span className="text-[10px] text-gray-600">{seq.steps.length} step{seq.steps.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={e => { e.stopPropagation(); handleToggleStatus(seq) }}
                        disabled={seq.status === 'draft'}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed border border-gray-700 text-gray-300 hover:text-white rounded-lg text-xs transition-colors">
                        {seq.status === 'active' ? <><Pause className="w-3 h-3" /> Pause</> : <><Play className="w-3 h-3" /> Activate</>}
                      </button>
                      <button onClick={e => { e.stopPropagation(); setEnrollSequence(seq) }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 rounded-lg text-xs transition-colors">
                        <Users className="w-3 h-3" /> Enroll
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showBuilder && (
          <SequenceModal
            sequence={editSequence}
            onSave={editSequence ? handleUpdate : handleCreate}
            onClose={() => { setShowBuilder(false); setEditSequence(null) }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewSequence && (
          <SequenceDetail
            sequence={viewSequence}
            onClose={() => setViewSequence(null)}
            onEnrollClick={() => setEnrollSequence(viewSequence)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {enrollSequence && (
          <EnrollModal
            sequence={enrollSequence}
            contacts={contacts}
            onEnroll={handleEnroll}
            onClose={() => setEnrollSequence(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}