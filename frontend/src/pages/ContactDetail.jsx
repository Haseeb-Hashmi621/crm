import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Mail, Phone, Building2, Calendar,
  MessageSquare, PhoneCall, Send, Users,
  Plus, Trash2, Loader2, Edit2, X, Check
} from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

const ACTIVITY_TYPES = [
  { id: 'note', label: 'Note', icon: MessageSquare, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
  { id: 'call', label: 'Call', icon: PhoneCall, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  { id: 'email', label: 'Email', icon: Send, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  { id: 'meeting', label: 'Meeting', icon: Users, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
]

function TimeAgo({ dateString }) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)

  if (diff < 60) return <span>{diff}s ago</span>
  if (diff < 3600) return <span>{Math.floor(diff / 60)}m ago</span>
  if (diff < 86400) return <span>{Math.floor(diff / 3600)}h ago</span>
  if (diff < 604800) return <span>{Math.floor(diff / 86400)}d ago</span>
  return <span>{date.toLocaleDateString()}</span>
}

function ActivityIcon({ type }) {
  const found = ACTIVITY_TYPES.find(t => t.id === type) || ACTIVITY_TYPES[0]
  const Icon = found.icon
  return (
    <div className={`w-8 h-8 rounded-full ${found.bg} border ${found.border} flex items-center justify-center flex-shrink-0`}>
      <Icon className={`w-3.5 h-3.5 ${found.color}`} />
    </div>
  )
}

export default function ContactDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [contact, setContact] = useState(null)
  const [activities, setActivities] = useState([])
  const [loadingContact, setLoadingContact] = useState(true)
  const [loadingActivities, setLoadingActivities] = useState(true)

  // Activity compose state
  const [activeType, setActiveType] = useState('note')
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)

  // Edit contact inline
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchContact()
    fetchActivities()
  }, [id])

  const fetchContact = async () => {
    try {
      const res = await api.get(`/contacts/${id}`)
      setContact(res.data)
      setEditForm({
        first_name: res.data.first_name || '',
        last_name: res.data.last_name || '',
        email: res.data.email || '',
        phone: res.data.phone || '',
        company: res.data.company || '',
      })
    } catch (err) {
      toast.error('Contact not found')
      navigate('/dashboard/contacts')
    } finally {
      setLoadingContact(false)
    }
  }

  const fetchActivities = async () => {
    try {
      const res = await api.get(`/activities/${id}`)
      setActivities(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingActivities(false)
    }
  }

  const handlePostActivity = async () => {
    if (!content.trim()) return
    setPosting(true)
    try {
      await api.post('/activities/', {
        contact_id: id,
        type: activeType,
        content: content.trim(),
      })
      setContent('')
      toast.success('Activity logged!')
      fetchActivities()
    } catch (err) {
      toast.error('Failed to log activity')
      console.error(err)
    } finally {
      setPosting(false)
    }
  }

  const handleDeleteActivity = async (activityId) => {
    try {
      await api.delete(`/activities/${activityId}`)
      setActivities(prev => prev.filter(a => a.id !== activityId))
      toast.success('Deleted')
    } catch (err) {
      toast.error('Failed to delete')
    }
  }

  const handleSaveContact = async () => {
    setSaving(true)
    try {
      const res = await api.put(`/contacts/${id}`, editForm)
      setContact(res.data)
      setEditing(false)
      toast.success('Contact updated!')
    } catch (err) {
      toast.error('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  if (loadingContact) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  const initials = `${contact?.first_name?.[0] || ''}${contact?.last_name?.[0] || ''}`.toUpperCase()

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate('/dashboard/contacts')}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Contacts
      </motion.button>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT — Contact Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1"
        >
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            {/* Avatar + name */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-violet-600 rounded-full flex items-center justify-center text-white text-xl font-bold mb-3">
                {initials || '?'}
              </div>
              {!editing ? (
                <>
                  <h2 className="text-white font-bold text-lg">
                    {contact?.first_name} {contact?.last_name}
                  </h2>
                  {contact?.company && (
                    <p className="text-gray-400 text-sm mt-0.5">{contact.company}</p>
                  )}
                </>
              ) : null}
            </div>

            {/* Contact info / edit form */}
            {!editing ? (
              <div className="space-y-3">
                {contact?.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-gray-300 truncate">{contact.email}</span>
                  </div>
                )}
                {contact?.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-gray-300">{contact.phone}</span>
                  </div>
                )}
                {contact?.company && (
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-gray-300">{contact.company}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <span className="text-gray-500 text-xs">
                    {activities.length} activities logged
                  </span>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setEditing(true)}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-2 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors text-sm"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Contact
                </motion.button>
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { key: 'first_name', label: 'First Name' },
                  { key: 'last_name', label: 'Last Name' },
                  { key: 'email', label: 'Email' },
                  { key: 'phone', label: 'Phone' },
                  { key: 'company', label: 'Company' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-gray-500 mb-1 block">{f.label}</label>
                    <input
                      value={editForm[f.key]}
                      onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setEditing(false)}
                    className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors flex items-center justify-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSaveContact}
                    disabled={saving}
                    className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-1"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Save
                  </motion.button>
                </div>
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            {ACTIVITY_TYPES.map(type => {
              const count = activities.filter(a => a.type === type.id).length
              const Icon = type.icon
              return (
                <div key={type.id} className={`bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-2`}>
                  <div className={`w-7 h-7 rounded-lg ${type.bg} flex items-center justify-center`}>
                    <Icon className={`w-3.5 h-3.5 ${type.color}`} />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{count}</p>
                    <p className="text-gray-500 text-xs">{type.label}s</p>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* RIGHT — Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          {/* Compose box */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-5">
            <p className="text-white text-sm font-medium mb-3">Log Activity</p>

            {/* Type selector */}
            <div className="flex gap-2 mb-3">
              {ACTIVITY_TYPES.map(type => {
                const Icon = type.icon
                const isActive = activeType === type.id
                return (
                  <motion.button
                    key={type.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveType(type.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? `${type.bg} ${type.color} border ${type.border}`
                        : 'bg-gray-800 text-gray-500 border border-transparent hover:border-gray-700 hover:text-gray-300'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {type.label}
                  </motion.button>
                )
              })}
            </div>

            {/* Text area */}
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handlePostActivity()
              }}
              placeholder={`Log a ${activeType}... (Ctrl+Enter to submit)`}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none placeholder-gray-600"
            />

            <div className="flex items-center justify-between mt-3">
              <p className="text-gray-600 text-xs">{content.length} chars</p>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handlePostActivity}
                disabled={posting || !content.trim()}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                {posting ? 'Logging...' : 'Log Activity'}
              </motion.button>
            </div>
          </div>

          {/* Activity list */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-white text-sm font-medium">Activity History</p>
              <span className="text-gray-500 text-xs">{activities.length} total</span>
            </div>

            {loadingActivities ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-700" />
                <p className="text-gray-500 text-sm">No activities yet</p>
                <p className="text-gray-600 text-xs mt-1">Log a note, call, or email above</p>
              </div>
            ) : (
              <div className="space-y-1">
                <AnimatePresence>
                  {activities.map((activity, i) => {
                    const typeInfo = ACTIVITY_TYPES.find(t => t.id === activity.type) || ACTIVITY_TYPES[0]
                    return (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10, height: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="group flex gap-3 py-3 border-b border-gray-800 last:border-0"
                      >
                        {/* Timeline dot */}
                        <div className="flex flex-col items-center">
                          <ActivityIcon type={activity.type} />
                          {i < activities.length - 1 && (
                            <div className="w-px flex-1 bg-gray-800 mt-2" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-semibold uppercase tracking-wide ${typeInfo.color}`}>
                                {typeInfo.label}
                              </span>
                              <span className="text-gray-600 text-xs">
                                <TimeAgo dateString={activity.created_at} />
                              </span>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              onClick={() => handleDeleteActivity(activity.id)}
                              className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all flex-shrink-0 mt-0.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </motion.button>
                          </div>
                          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                            {activity.content}
                          </p>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
