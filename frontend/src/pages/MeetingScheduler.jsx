import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarClock, Plus, X, Loader2, Trash2, Edit2, Check, Copy,
  Clock, Link as LinkIcon, Users, ToggleLeft, ToggleRight,
  CalendarX, XCircle, CheckCircle2, ExternalLink
} from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

const WEEKDAYS = [
  { id: 0, label: 'Monday' },
  { id: 1, label: 'Tuesday' },
  { id: 2, label: 'Wednesday' },
  { id: 3, label: 'Thursday' },
  { id: 4, label: 'Friday' },
  { id: 5, label: 'Saturday' },
  { id: 6, label: 'Sunday' },
]

const COLORS = ['violet', 'blue', 'green', 'orange', 'pink', 'teal']
const COLOR_CLASSES = {
  violet: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
  blue:   'bg-blue-500/20 text-blue-300 border-blue-500/40',
  green:  'bg-green-500/20 text-green-300 border-green-500/40',
  orange: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  pink:   'bg-pink-500/20 text-pink-300 border-pink-500/40',
  teal:   'bg-teal-500/20 text-teal-300 border-teal-500/40',
}

// ── Meeting Type Modal ────────────────────────────────────────────────────

function MeetingTypeModal({ meetingType, onSave, onClose }) {
  const isEdit = !!meetingType
  const [form, setForm] = useState({
    name: meetingType?.name || '',
    description: meetingType?.description || '',
    duration_minutes: meetingType?.duration_minutes ?? 30,
    buffer_before_minutes: meetingType?.buffer_before_minutes ?? 0,
    buffer_after_minutes: meetingType?.buffer_after_minutes ?? 10,
    color: meetingType?.color || 'violet',
    location: meetingType?.location || 'Phone / WhatsApp call',
    is_active: meetingType?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } catch {
      toast.error('Failed to save meeting type')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">{isEdit ? 'Edit Meeting Type' : 'New Meeting Type'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Name</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. 30-Minute Consultation" autoFocus
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Description</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              rows={2} placeholder="What is this meeting for?"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Duration (min)</label>
              <input type="number" min="5" step="5" value={form.duration_minutes}
                onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 30 })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Buffer before</label>
              <input type="number" min="0" step="5" value={form.buffer_before_minutes}
                onChange={e => setForm({ ...form, buffer_before_minutes: parseInt(e.target.value) || 0 })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Buffer after</label>
              <input type="number" min="0" step="5" value={form.buffer_after_minutes}
                onChange={e => setForm({ ...form, buffer_after_minutes: parseInt(e.target.value) || 0 })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Location</label>
            <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Zoom, Phone call, Office"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Color</label>
            <div className="flex items-center gap-2">
              {COLORS.map(c => (
                <button key={c} onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${COLOR_CLASSES[c].split(' ')[0]} ${
                    form.color === c ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-white border-transparent' : 'border-transparent opacity-60 hover:opacity-100'
                  }`} />
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input type="checkbox" checked={form.is_active}
              onChange={e => setForm({ ...form, is_active: e.target.checked })}
              className="accent-violet-500 w-4 h-4" />
            <span className="text-sm text-gray-300">Active (visible on your public booking page)</span>
          </label>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">
            Cancel
          </button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Meeting Type'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Availability Tab ──────────────────────────────────────────────────────

function AvailabilityTab() {
  const [days, setDays] = useState(
    WEEKDAYS.map(w => ({ day_of_week: w.id, start_time: '09:00', end_time: '17:00', is_active: false }))
  )
  const [overrides, setOverrides] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newOverride, setNewOverride] = useState({ date: '', reason: '' })

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const [availRes, overRes] = await Promise.all([
        api.get('/scheduler/availability'),
        api.get('/scheduler/overrides'),
      ])
      if (availRes.data.length > 0) {
        setDays(prev => prev.map(d => {
          const match = availRes.data.find(a => a.day_of_week === d.day_of_week)
          return match
            ? { day_of_week: d.day_of_week, start_time: match.start_time.slice(0,5), end_time: match.end_time.slice(0,5), is_active: match.is_active }
            : d
        }))
      }
      setOverrides(overRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const toggleDay = (dayId) => {
    setDays(prev => prev.map(d => d.day_of_week === dayId ? { ...d, is_active: !d.is_active } : d))
  }

  const updateDay = (dayId, key, value) => {
    setDays(prev => prev.map(d => d.day_of_week === dayId ? { ...d, [key]: value } : d))
  }

  const handleSaveSchedule = async () => {
    setSaving(true)
    try {
      await api.put('/scheduler/availability', { days })
      toast.success('Weekly availability saved!')
    } catch {
      toast.error('Failed to save availability')
    } finally {
      setSaving(false)
    }
  }

  const handleAddOverride = async () => {
    if (!newOverride.date) { toast.error('Pick a date'); return }
    try {
      const res = await api.post('/scheduler/overrides', {
        date: newOverride.date,
        is_blocked: true,
        reason: newOverride.reason || 'Blocked',
      })
      setOverrides(prev => [...prev, res.data].sort((a, b) => a.date.localeCompare(b.date)))
      setNewOverride({ date: '', reason: '' })
      toast.success('Day blocked')
    } catch {
      toast.error('Failed to add override')
    }
  }

  const handleRemoveOverride = async (id) => {
    try {
      await api.delete(`/scheduler/overrides/${id}`)
      setOverrides(prev => prev.filter(o => o.id !== id))
      toast.success('Override removed')
    } catch {
      toast.error('Failed to remove')
    }
  }

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-violet-500 animate-spin" /></div>

  return (
    <div className="space-y-6">
      {/* Weekly schedule */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <p className="text-white font-medium mb-1">Weekly Hours</p>
        <p className="text-gray-500 text-xs mb-4">Set the hours you're available for meetings each week</p>

        <div className="space-y-2">
          {WEEKDAYS.map(w => {
            const d = days.find(x => x.day_of_week === w.id)
            return (
              <div key={w.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                d.is_active ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-800/20 border-gray-800'
              }`}>
                <button onClick={() => toggleDay(w.id)} className="flex-shrink-0">
                  {d.is_active ? <ToggleRight className="w-7 h-7 text-green-400" /> : <ToggleLeft className="w-7 h-7 text-gray-600" />}
                </button>
                <span className={`text-sm w-24 flex-shrink-0 ${d.is_active ? 'text-white' : 'text-gray-600'}`}>{w.label}</span>
                {d.is_active ? (
                  <div className="flex items-center gap-2">
                    <input type="time" value={d.start_time}
                      onChange={e => updateDay(w.id, 'start_time', e.target.value)}
                      className="bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-violet-500" />
                    <span className="text-gray-500 text-xs">to</span>
                    <input type="time" value={d.end_time}
                      onChange={e => updateDay(w.id, 'end_time', e.target.value)}
                      className="bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-violet-500" />
                  </div>
                ) : (
                  <span className="text-gray-600 text-xs">Unavailable</span>
                )}
              </div>
            )
          })}
        </div>

        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={handleSaveSchedule} disabled={saving}
          className="mt-4 flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Weekly Hours'}
        </motion.button>
      </div>

      {/* Date overrides */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <p className="text-white font-medium mb-1 flex items-center gap-2">
          <CalendarX className="w-4 h-4 text-red-400" /> Blocked Dates
        </p>
        <p className="text-gray-500 text-xs mb-4">Block off specific days — holidays, travel, etc.</p>

        <div className="flex items-end gap-2 mb-4">
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">Date</label>
            <input type="date" value={newOverride.date}
              onChange={e => setNewOverride({ ...newOverride, date: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500" />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-400 mb-1 block">Reason (optional)</label>
            <input type="text" value={newOverride.reason}
              onChange={e => setNewOverride({ ...newOverride, reason: e.target.value })}
              placeholder="e.g. Public holiday"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500" />
          </div>
          <button onClick={handleAddOverride}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 rounded-lg text-sm transition-colors">
            <Plus className="w-3.5 h-3.5" /> Block
          </button>
        </div>

        {overrides.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-4">No blocked dates</p>
        ) : (
          <div className="space-y-2">
            {overrides.map(o => (
              <div key={o.id} className="flex items-center justify-between bg-gray-800/50 rounded-xl px-4 py-2.5">
                <div>
                  <p className="text-white text-sm">{new Date(o.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  {o.reason && <p className="text-gray-500 text-xs">{o.reason}</p>}
                </div>
                <button onClick={() => handleRemoveOverride(o.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Bookings Tab ──────────────────────────────────────────────────────────

function BookingsTab() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('upcoming')

  useEffect(() => { fetchBookings() }, [filter])

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const params = filter === 'upcoming' ? { upcoming_only: true } : filter === 'cancelled' ? { status: 'cancelled' } : {}
      const res = await api.get('/scheduler/bookings', { params })
      setBookings(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking? The guest will not be automatically notified.')) return
    try {
      await api.post(`/scheduler/bookings/${id}/cancel`, { reason: 'Cancelled by host' })
      toast.success('Booking cancelled')
      fetchBookings()
    } catch {
      toast.error('Failed to cancel')
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        {[['upcoming', 'Upcoming'], ['all', 'All'], ['cancelled', 'Cancelled']].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === id ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-violet-500 animate-spin" /></div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16">
          <CalendarClock className="w-10 h-10 mx-auto mb-3 text-gray-700" />
          <p className="text-gray-500 text-sm">No bookings {filter === 'upcoming' ? 'coming up' : 'found'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => {
            const cc = COLOR_CLASSES[b.meeting_type?.color || 'violet']
            const isCancelled = b.status === 'cancelled'
            return (
              <div key={b.id} className={`bg-gray-900 border rounded-2xl p-4 flex items-center gap-4 ${
                isCancelled ? 'border-gray-800 opacity-50' : 'border-gray-800'
              }`}>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${cc}`}>
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-white text-sm font-medium">{b.guest_name}</p>
                    <span className="text-gray-600 text-xs">·</span>
                    <span className="text-gray-400 text-xs">{b.meeting_type?.name || 'Meeting'}</span>
                    {isCancelled && (
                      <span className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-full">Cancelled</span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs">{b.guest_email}{b.guest_phone ? ` · ${b.guest_phone}` : ''}</p>
                  <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(b.start_time).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                  {b.guest_notes && <p className="text-gray-600 text-xs mt-1 italic truncate">"{b.guest_notes}"</p>}
                </div>
                {!isCancelled && new Date(b.start_time) > new Date() && (
                  <button onClick={() => handleCancel(b.id)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg text-xs transition-colors">
                    <XCircle className="w-3.5 h-3.5" /> Cancel
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function MeetingScheduler() {
  const [tab, setTab] = useState('types') // types | availability | bookings
  const [meetingTypes, setMeetingTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editType, setEditType] = useState(null)
  const [userId, setUserId] = useState(null)

  useEffect(() => {
    fetchTypes()
    api.get('/auth/me').then(r => setUserId(r.data.id)).catch(() => {})
  }, [])

  const fetchTypes = async () => {
    try {
      const res = await api.get('/scheduler/meeting-types')
      setMeetingTypes(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (data) => {
    const res = await api.post('/scheduler/meeting-types', data)
    setMeetingTypes(prev => [res.data, ...prev])
    toast.success('Meeting type created!')
  }

  const handleUpdate = async (data) => {
    const res = await api.patch(`/scheduler/meeting-types/${editType.id}`, data)
    setMeetingTypes(prev => prev.map(t => t.id === editType.id ? res.data : t))
    setEditType(null)
    toast.success('Meeting type updated!')
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this meeting type?')) return
    try {
      await api.delete(`/scheduler/meeting-types/${id}`)
      setMeetingTypes(prev => prev.filter(t => t.id !== id))
      toast.success('Deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleToggleActive = async (mt) => {
    try {
      const res = await api.patch(`/scheduler/meeting-types/${mt.id}`, { is_active: !mt.is_active })
      setMeetingTypes(prev => prev.map(t => t.id === mt.id ? res.data : t))
    } catch {
      toast.error('Failed to update')
    }
  }

  const publicLink = userId ? `${window.location.origin}/book/${userId}` : ''

  const copyLink = () => {
    navigator.clipboard.writeText(publicLink)
    toast.success('Booking link copied!')
  }

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <CalendarClock className="w-6 h-6 text-violet-400" />
              <h1 className="text-2xl font-bold text-white">Meeting Scheduler</h1>
            </div>
            <p className="text-gray-400">Let clients book time with you directly, Calendly-style</p>
          </div>
          {tab === 'types' && (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setEditType(null); setShowModal(true) }}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> New Meeting Type
            </motion.button>
          )}
        </div>

        {/* Public link banner */}
        {userId && (
          <div className="flex items-center gap-3 bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4 my-6">
            <LinkIcon className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <span className="text-violet-300 text-sm font-mono truncate flex-1">{publicLink}</span>
            <button onClick={copyLink} className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors flex-shrink-0">
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
            <a href={publicLink} target="_blank" rel="noreferrer" className="text-violet-400 hover:text-violet-300 transition-colors flex-shrink-0">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit mb-6">
          {[['types', 'Meeting Types'], ['availability', 'Availability'], ['bookings', 'Bookings']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === id ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'
              }`}>{label}</button>
          ))}
        </div>

        {tab === 'types' && (
          loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-violet-500 animate-spin" /></div>
          ) : meetingTypes.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-violet-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CalendarClock className="w-8 h-8 text-violet-400" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">No meeting types yet</h3>
              <p className="text-gray-500 max-w-sm mx-auto mb-6 text-sm">
                Create a meeting type — e.g. "30-Minute Consultation" — so clients can book it from your public page.
              </p>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors mx-auto">
                <Plus className="w-4 h-4" /> Create your first meeting type
              </motion.button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {meetingTypes.map((mt, i) => {
                  const cc = COLOR_CLASSES[mt.color || 'violet']
                  return (
                    <motion.div key={mt.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`bg-gray-900 border rounded-2xl p-5 transition-all ${mt.is_active ? 'border-gray-800 hover:border-gray-700' : 'border-gray-800 opacity-60'}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${cc}`}>
                          <CalendarClock className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleToggleActive(mt)} title={mt.is_active ? 'Deactivate' : 'Activate'}
                            className={mt.is_active ? 'text-gray-500 hover:text-yellow-400' : 'text-gray-500 hover:text-green-400'}>
                            {mt.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          <button onClick={() => { setEditType(mt); setShowModal(true) }} className="p-1 text-gray-500 hover:text-violet-400 transition-colors">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(mt.id)} className="p-1 text-gray-500 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-white font-semibold text-sm mb-1">{mt.name}</h3>
                      {mt.description && <p className="text-gray-500 text-xs line-clamp-2 mb-3">{mt.description}</p>}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{mt.duration_minutes} min</span>
                        {mt.location && <span className="truncate">{mt.location}</span>}
                      </div>
                      {!mt.is_active && (
                        <span className="inline-block mt-3 text-[10px] px-2 py-0.5 bg-gray-700/50 text-gray-500 border border-gray-700 rounded-full">Inactive</span>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )
        )}

        {tab === 'availability' && <AvailabilityTab />}
        {tab === 'bookings' && <BookingsTab />}
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <MeetingTypeModal
            meetingType={editType}
            onSave={editType ? handleUpdate : handleCreate}
            onClose={() => { setShowModal(false); setEditType(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}