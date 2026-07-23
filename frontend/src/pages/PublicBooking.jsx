import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarClock, Clock, MapPin, ChevronLeft, ChevronRight,
  Loader2, Check, ArrowLeft, CheckCircle2
} from 'lucide-react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const COLOR_CLASSES = {
  violet: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
  blue:   'bg-blue-500/20 text-blue-300 border-blue-500/40',
  green:  'bg-green-500/20 text-green-300 border-green-500/40',
  orange: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  pink:   'bg-pink-500/20 text-pink-300 border-pink-500/40',
  teal:   'bg-teal-500/20 text-teal-300 border-teal-500/40',
}

function formatDayLabel(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function PublicBooking() {
  const { userId } = useParams()

  const [meetingTypes, setMeetingTypes] = useState([])
  const [loadingTypes, setLoadingTypes] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [selectedType, setSelectedType] = useState(null)
  const [slotDays, setSlotDays] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedDayIdx, setSelectedDayIdx] = useState(0)
  const [selectedSlot, setSelectedSlot] = useState(null)

  const [form, setForm] = useState({ guest_name: '', guest_email: '', guest_phone: '', guest_notes: '' })
  const [booking, setBooking] = useState(false)
  const [confirmed, setConfirmed] = useState(null)

  useEffect(() => {
    axios.get(`${API_URL}/booking/${userId}/meeting-types`)
      .then(res => setMeetingTypes(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoadingTypes(false))
  }, [userId])

  const fetchSlots = async (meetingType) => {
    setLoadingSlots(true)
    setSelectedDayIdx(0)
    setSelectedSlot(null)
    try {
      const res = await axios.get(`${API_URL}/booking/${userId}/slots`, {
        params: { meeting_type_id: meetingType.id, days: 14 }
      })
      setSlotDays(res.data.days)
    } catch {
      setSlotDays([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleSelectType = (mt) => {
    setSelectedType(mt)
    fetchSlots(mt)
  }

  const handleBack = () => {
    setSelectedType(null)
    setSlotDays([])
    setSelectedSlot(null)
  }

  const handleConfirmBooking = async () => {
    if (!form.guest_name.trim() || !form.guest_email.trim()) {
      alert('Please enter your name and email')
      return
    }
    setBooking(true)
    try {
      const res = await axios.post(`${API_URL}/booking/${userId}/book`, {
        meeting_type_id: selectedType.id,
        start_time: selectedSlot.start,
        guest_name: form.guest_name.trim(),
        guest_email: form.guest_email.trim(),
        guest_phone: form.guest_phone.trim() || null,
        guest_notes: form.guest_notes.trim() || null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      })
      setConfirmed(res.data)
    } catch (err) {
      alert(err.response?.data?.detail || 'This slot may no longer be available — please pick another time.')
      fetchSlots(selectedType)
      setSelectedSlot(null)
    } finally {
      setBooking(false)
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="text-center">
          <CalendarClock className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-white font-semibold text-lg">Scheduling page not found</p>
          <p className="text-gray-500 text-sm mt-1">This booking link may be invalid or no longer active.</p>
        </div>
      </div>
    )
  }

  if (confirmed) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-white font-bold text-xl mb-2">You're booked!</h2>
          <p className="text-gray-400 text-sm mb-6">
            A confirmation has been sent to <span className="text-white">{confirmed.guest_email}</span>
          </p>
          <div className="bg-gray-800/60 rounded-xl p-4 text-left">
            <p className="text-white text-sm font-medium">{selectedType?.name}</p>
            <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              {new Date(confirmed.start_time).toLocaleString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'
              })}
            </p>
            {selectedType?.location && (
              <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" />{selectedType.location}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <AnimatePresence mode="wait">
          {!selectedType ? (
            <motion.div key="types" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-8">
                <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CalendarClock className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-white font-bold text-2xl">Book a time</h1>
                <p className="text-gray-400 text-sm mt-1">Choose a meeting type to see available times</p>
              </div>

              {loadingTypes ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-violet-500 animate-spin" /></div>
              ) : meetingTypes.length === 0 ? (
                <p className="text-gray-500 text-center py-16">No meeting types are available right now.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {meetingTypes.map(mt => {
                    const cc = COLOR_CLASSES[mt.color || 'violet']
                    return (
                      <button key={mt.id} onClick={() => handleSelectType(mt)}
                        className="text-left bg-gray-900 border border-gray-800 hover:border-violet-500/50 rounded-2xl p-5 transition-all group">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border mb-3 ${cc}`}>
                          <CalendarClock className="w-5 h-5" />
                        </div>
                        <p className="text-white font-semibold">{mt.name}</p>
                        {mt.description && <p className="text-gray-500 text-xs mt-1 line-clamp-2">{mt.description}</p>}
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-3">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{mt.duration_minutes} min</span>
                          {mt.location && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" />{mt.location}</span>}
                        </div>
                        <span className="inline-block mt-3 text-xs text-violet-400 group-hover:text-violet-300 font-medium">
                          Select →
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </motion.div>
          ) : !selectedSlot ? (
            <motion.div key="slots" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button onClick={handleBack} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to meeting types
              </button>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
                <p className="text-white font-semibold">{selectedType.name}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{selectedType.duration_minutes} min</span>
                  {selectedType.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{selectedType.location}</span>}
                </div>
              </div>

              {loadingSlots ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-violet-500 animate-spin" /></div>
              ) : slotDays.length === 0 ? (
                <p className="text-gray-500 text-center py-16">No available times in the next two weeks. Please check back later.</p>
              ) : (
                <div>
                  {/* Day tabs */}
                  <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-2">
                    <button onClick={() => setSelectedDayIdx(i => Math.max(0, i - 1))} disabled={selectedDayIdx === 0}
                      className="flex-shrink-0 p-2 text-gray-500 hover:text-white disabled:opacity-30 transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {slotDays.map((d, i) => (
                      <button key={d.date} onClick={() => setSelectedDayIdx(i)}
                        className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          selectedDayIdx === i ? 'bg-violet-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}>
                        {formatDayLabel(d.date)}
                      </button>
                    ))}
                    <button onClick={() => setSelectedDayIdx(i => Math.min(slotDays.length - 1, i + 1))} disabled={selectedDayIdx === slotDays.length - 1}
                      className="flex-shrink-0 p-2 text-gray-500 hover:text-white disabled:opacity-30 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Time slots */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slotDays[selectedDayIdx]?.slots.map(slot => (
                      <button key={slot.start} onClick={() => setSelectedSlot(slot)}
                        className="px-3 py-2.5 bg-gray-900 border border-gray-800 hover:border-violet-500 hover:bg-violet-500/10 text-gray-300 hover:text-white rounded-xl text-sm transition-all">
                        {new Date(slot.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button onClick={() => setSelectedSlot(null)} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to time slots
              </button>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
                <p className="text-white font-semibold">{selectedType.name}</p>
                <p className="text-violet-400 text-sm mt-1 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(selectedSlot.start).toLocaleString('en-US', {
                    weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'
                  })}
                </p>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1.5 block">Your Name</label>
                  <input type="text" value={form.guest_name} onChange={e => setForm({ ...form, guest_name: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1.5 block">Email</label>
                  <input type="email" value={form.guest_email} onChange={e => setForm({ ...form, guest_email: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1.5 block">Phone (optional)</label>
                  <input type="text" value={form.guest_phone} onChange={e => setForm({ ...form, guest_phone: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1.5 block">Notes (optional)</label>
                  <textarea value={form.guest_notes} onChange={e => setForm({ ...form, guest_notes: e.target.value })}
                    rows={3} placeholder="Anything you'd like us to know ahead of time?"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none" />
                </div>

                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  onClick={handleConfirmBooking} disabled={booking}
                  className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl text-sm font-medium transition-colors">
                  {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {booking ? 'Confirming...' : 'Confirm Booking'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}