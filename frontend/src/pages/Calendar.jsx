import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X, Loader2,
  Clock, MapPin, Trash2, Check, Phone, Users, MessageSquare, CheckSquare,
  User as UserIcon
} from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

const TYPE_CONFIG = {
  meeting:  { label: 'Meeting',  icon: Users,         color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  call:     { label: 'Call',     icon: Phone,         color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30',  dot: 'bg-green-400' },
  reminder: { label: 'Reminder', icon: Clock,         color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-400' },
  task:     { label: 'Task',     icon: CheckSquare,   color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30', dot: 'bg-violet-400' },
  other:    { label: 'Other',    icon: MessageSquare, color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   dot: 'bg-blue-400' },
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function toLocalInputValue(date) {
  const pad = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function buildMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1)
  const startWeekday = firstOfMonth.getDay()
  const gridStart = new Date(year, month, 1 - startWeekday)
  const days = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    days.push(d)
  }
  return days
}

// ── Event Modal (Create / Edit) ────────────────────────────────────────────

function EventModal({ event, defaultDate, contacts, deals, onSave, onDelete, onClose }) {
  const isEdit = !!event
  const [form, setForm] = useState({
    title: event?.title || '',
    description: event?.description || '',
    location: event?.location || '',
    event_type: event?.event_type || 'meeting',
    start_time: event ? toLocalInputValue(new Date(event.start_time)) : toLocalInputValue(defaultDate || new Date()),
    end_time: event?.end_time ? toLocalInputValue(new Date(event.end_time)) : '',
    contact_id: event?.contact_id || null,
    deal_id: event?.deal_id || null,
    reminder_minutes: event?.reminder_minutes ?? '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    setSaving(true)
    try {
      await onSave({
        title: form.title.trim(),
        description: form.description.trim() || null,
        location: form.location.trim() || null,
        event_type: form.event_type,
        start_time: new Date(form.start_time).toISOString(),
        end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
        contact_id: form.contact_id || null,
        deal_id: form.deal_id || null,
        reminder_minutes: form.reminder_minutes !== '' ? parseInt(form.reminder_minutes) : null,
      })
      onClose()
    } catch {
      toast.error('Failed to save event')
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
          <h2 className="text-white font-semibold text-lg">{isEdit ? 'Edit Event' : 'New Event'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Title</label>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Client call with Acme Corp" autoFocus
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">Type</label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(TYPE_CONFIG).map(([id, cfg]) => {
                const Icon = cfg.icon
                return (
                  <button key={id} onClick={() => setForm({ ...form, event_type: id })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      form.event_type === id ? `${cfg.bg} ${cfg.color} ${cfg.border}` : 'bg-gray-800 text-gray-500 border-gray-700 hover:text-gray-300'
                    }`}>
                    <Icon className="w-3.5 h-3.5" />{cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Start</label>
              <input type="datetime-local" value={form.start_time}
                onChange={e => setForm({ ...form, start_time: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">End (optional)</label>
              <input type="datetime-local" value={form.end_time}
                onChange={e => setForm({ ...form, end_time: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Location (optional)</label>
            <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Zoom, Office, Client site"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Link Contact (optional)</label>
            <select value={form.contact_id || ''} onChange={e => setForm({ ...form, contact_id: e.target.value || null })}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors">
              <option value="">None</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
            </select>
          </div>

          {deals.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Link Deal (optional)</label>
              <select value={form.deal_id || ''} onChange={e => setForm({ ...form, deal_id: e.target.value || null })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors">
                <option value="">None</option>
                {deals.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Notes (optional)</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3} placeholder="Additional details..."
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          {isEdit && (
            <button onClick={() => onDelete(event.id)}
              className="px-4 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm transition-colors flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">
            Cancel
          </button>
          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Event'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main Calendar Page ───────────────────────────────────────────────────────

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [events, setEvents] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [contacts, setContacts] = useState([])
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [showModal, setShowModal] = useState(false)
  const [editEvent, setEditEvent] = useState(null)

  const monthDays = useMemo(
    () => buildMonthGrid(currentMonth.getFullYear(), currentMonth.getMonth()),
    [currentMonth]
  )

  useEffect(() => {
    fetchEvents()
    fetchUpcoming()
  }, [currentMonth])

  useEffect(() => {
    api.get('/contacts/').then(r => setContacts(r.data)).catch(() => {})
    api.get('/deals/').then(r => setDeals(r.data)).catch(() => {})
  }, [])

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const rangeStart = monthDays[0]
      const rangeEnd = monthDays[monthDays.length - 1]
      const res = await api.get('/calendar/range', {
        params: { start: rangeStart.toISOString(), end: rangeEnd.toISOString() }
      })
      setEvents(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUpcoming = async () => {
    try {
      const res = await api.get('/calendar/upcoming', { params: { limit: 6 } })
      setUpcoming(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const eventsByDay = useMemo(() => {
    const map = {}
    events.forEach(e => {
      const key = new Date(e.start_time).toDateString()
      if (!map[key]) map[key] = []
      map[key].push(e)
    })
    return map
  }, [events])

  const handleCreate = async (data) => {
    await api.post('/calendar/', data)
    toast.success('Event created!')
    fetchEvents()
    fetchUpcoming()
  }

  const handleUpdate = async (data) => {
    await api.patch(`/calendar/${editEvent.id}`, data)
    toast.success('Event updated!')
    fetchEvents()
    fetchUpcoming()
    setEditEvent(null)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this event?')) return
    try {
      await api.delete(`/calendar/${id}`)
      toast.success('Event deleted')
      setShowModal(false)
      setEditEvent(null)
      fetchEvents()
      fetchUpcoming()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const openCreateModal = (date) => {
    setEditEvent(null)
    setSelectedDay(date)
    setShowModal(true)
  }

  const openEditModal = (event) => {
    setEditEvent(event)
    setShowModal(true)
  }

  const goPrevMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  const goNextMonth = () => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  const goToday = () => {
    const now = new Date()
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDay(now)
  }

  const today = new Date()
  const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Calendar</h1>
            <p className="text-gray-400 mt-1">Schedule meetings, calls, and reminders</p>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => openCreateModal(selectedDay || new Date())}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Event
          </motion.button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar grid */}
          <div className="lg:col-span-3 bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-violet-400" />
                <h2 className="text-white font-semibold text-lg">{monthLabel}</h2>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={goPrevMonth} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={goToday} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                  Today
                </button>
                <button onClick={goNextMonth} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                  {WEEKDAYS.map(d => (
                    <div key={d} className="text-center text-gray-500 text-xs font-medium py-1.5">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {monthDays.map((day, i) => {
                    const inMonth = day.getMonth() === currentMonth.getMonth()
                    const isToday = isSameDay(day, today)
                    const isSelected = selectedDay && isSameDay(day, selectedDay)
                    const dayEvents = eventsByDay[day.toDateString()] || []

                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDay(day)}
                        onDoubleClick={() => openCreateModal(day)}
                        className={`min-h-[88px] p-1.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                          isSelected ? 'border-violet-500 bg-violet-500/10' :
                          isToday ? 'border-violet-500/40 bg-gray-800/60' :
                          'border-gray-800 hover:border-gray-700 hover:bg-gray-800/40'
                        } ${!inMonth ? 'opacity-30' : ''}`}
                      >
                        <span className={`text-xs font-medium ${isToday ? 'text-violet-400' : 'text-gray-400'}`}>
                          {day.getDate()}
                        </span>
                        <div className="flex flex-col gap-0.5 overflow-hidden">
                          {dayEvents.slice(0, 3).map(ev => {
                            const cfg = TYPE_CONFIG[ev.event_type] || TYPE_CONFIG.other
                            return (
                              <div
                                key={ev.id}
                                onClick={(e) => { e.stopPropagation(); openEditModal(ev) }}
                                className={`text-[9px] px-1 py-0.5 rounded truncate ${cfg.bg} ${cfg.color} flex items-center gap-1`}
                              >
                                <span className={`w-1 h-1 rounded-full ${cfg.dot} flex-shrink-0`} />
                                {ev.title}
                              </div>
                            )
                          })}
                          {dayEvents.length > 3 && (
                            <span className="text-[9px] text-gray-600 px-1">+{dayEvents.length - 3} more</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Sidebar: selected day + upcoming */}
          <div className="space-y-6">
            {/* Selected day list */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <h3 className="text-white font-semibold text-sm mb-1">
                {selectedDay ? selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : 'Select a day'}
              </h3>
              <p className="text-gray-500 text-xs mb-4">Double-click a day to add an event</p>

              {selectedDay && (eventsByDay[selectedDay.toDateString()] || []).length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-6">No events scheduled</p>
              ) : (
                <div className="space-y-2">
                  {(eventsByDay[selectedDay?.toDateString()] || []).map(ev => {
                    const cfg = TYPE_CONFIG[ev.event_type] || TYPE_CONFIG.other
                    const Icon = cfg.icon
                    return (
                      <div key={ev.id} onClick={() => openEditModal(ev)}
                        className={`p-3 rounded-xl border cursor-pointer transition-colors hover:bg-gray-800/60 ${cfg.bg} ${cfg.border}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                          <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                          {ev.status === 'completed' && <Check className="w-3 h-3 text-green-400 ml-auto" />}
                        </div>
                        <p className="text-white text-sm font-medium">{ev.title}</p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {ev.all_day ? 'All day' : new Date(ev.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </p>
                        {ev.location && (
                          <p className="text-gray-500 text-xs mt-0.5 flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" />{ev.location}
                          </p>
                        )}
                        {ev.contact && (
                          <p className="text-gray-500 text-xs mt-0.5 flex items-center gap-1">
                            <UserIcon className="w-2.5 h-2.5" />{ev.contact.first_name} {ev.contact.last_name}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Upcoming */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <h3 className="text-white font-semibold text-sm mb-4">Upcoming</h3>
              {upcoming.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-6">Nothing coming up</p>
              ) : (
                <div className="space-y-2">
                  {upcoming.map(ev => {
                    const cfg = TYPE_CONFIG[ev.event_type] || TYPE_CONFIG.other
                    const Icon = cfg.icon
                    const d = new Date(ev.start_time)
                    return (
                      <div key={ev.id} onClick={() => openEditModal(ev)}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-800/60 cursor-pointer transition-colors">
                        <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-xs font-medium truncate">{ev.title}</p>
                          <p className="text-gray-500 text-[10px]">
                            {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <EventModal
            event={editEvent}
            defaultDate={selectedDay}
            contacts={contacts}
            deals={deals}
            onSave={editEvent ? handleUpdate : handleCreate}
            onDelete={handleDelete}
            onClose={() => { setShowModal(false); setEditEvent(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}