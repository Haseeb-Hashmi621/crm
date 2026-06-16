import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, DollarSign, Building2, User, Tag,
  MessageSquare, PhoneCall, Send, Users,
  Plus, Trash2, Loader2, X, Check, Edit2, ExternalLink
} from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

const STAGES = {
  new: { label: 'New Lead', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  contacted: { label: 'Contacted', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' },
  proposal: { label: 'Proposal', color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
  negotiation: { label: 'Negotiation', color: 'bg-violet-500/10 text-violet-400 border-violet-500/30' },
  won: { label: 'Won', color: 'bg-green-500/10 text-green-400 border-green-500/30' },
  lost: { label: 'Lost', color: 'bg-red-500/10 text-red-400 border-red-500/30' },
}

const ACTIVITY_TYPES = [
  { id: 'note', label: 'Note', icon: MessageSquare, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
  { id: 'call', label: 'Call', icon: PhoneCall, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  { id: 'email', label: 'Email', icon: Send, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  { id: 'meeting', label: 'Meeting', icon: Users, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
]

const STAGE_LIST = ['new', 'contacted', 'proposal', 'negotiation', 'won', 'lost']

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

export default function DealDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [deal, setDeal] = useState(null)
  const [activities, setActivities] = useState([])
  const [loadingDeal, setLoadingDeal] = useState(true)
  const [loadingActivities, setLoadingActivities] = useState(true)

  // Activity compose
  const [activeType, setActiveType] = useState('note')
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)

  // Edit deal inline
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchDeal()
    fetchActivities()
  }, [id])

  const fetchDeal = async () => {
    try {
      const res = await api.get(`/deals/${id}`)
      setDeal(res.data)
      setEditForm({
        title: res.data.title || '',
        value: res.data.value || 0,
        stage: res.data.stage || 'new',
        contact_name: res.data.contact_name || '',
        company: res.data.company || '',
        owner: res.data.owner || '',
      })
    } catch (err) {
      toast.error('Deal not found')
      navigate('/dashboard/deals')
    } finally {
      setLoadingDeal(false)
    }
  }

  const fetchActivities = async () => {
    try {
      const res = await api.get(`/activities/deal/${id}`)
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
        contact_id: deal.id,
        deal_id: id,
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

  const handleSaveDeal = async () => {
    setSaving(true)
    try {
      const res = await api.put(`/deals/${id}`, {
        ...editForm,
        value: parseFloat(editForm.value) || 0,
      })
      setDeal(res.data)
      setEditing(false)
      toast.success('Deal updated!')
    } catch (err) {
      toast.error('Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleStageChange = async (newStage) => {
    try {
      const res = await api.put(`/deals/${id}`, { stage: newStage })
      setDeal(res.data)
      setEditForm(prev => ({ ...prev, stage: newStage }))
      toast.success(`Stage updated to ${STAGES[newStage].label}`)
      window.dispatchEvent(new Event('notification:refresh'))
    } catch (err) {
      toast.error('Failed to update stage')
    }
  }

  if (loadingDeal) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  const stageInfo = STAGES[deal?.stage] || STAGES.new

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate('/dashboard/deals')}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Pipeline
      </motion.button>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT — Deal Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1 space-y-4"
        >
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">

            {/* Title + badge */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 bg-violet-600/20 border border-violet-500/30 rounded-2xl flex items-center justify-center mb-3">
                <DollarSign className="w-7 h-7 text-violet-400" />
              </div>
              {!editing ? (
                <>
                  <h2 className="text-white font-bold text-lg">{deal?.title}</h2>
                  <p className="text-green-400 text-2xl font-bold mt-1">
                    ${(deal?.value || 0).toLocaleString()}
                  </p>
                  <span className={`mt-2 text-xs px-3 py-1 rounded-full border ${stageInfo.color}`}>
                    {stageInfo.label}
                  </span>
                </>
              ) : null}
            </div>

            {/* Deal info / edit form */}
            {!editing ? (
              <div className="space-y-3">
                {/* Contact — clickable if linked */}
                {deal?.contact_name && (
                  <div className="flex items-center gap-3 text-sm">
                    <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    {deal.contact_id ? (
                      <button
                        onClick={() => navigate(`/dashboard/contacts/${deal.contact_id}`)}
                        className="text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1.5 group"
                      >
                        <span className="group-hover:underline">{deal.contact_name}</span>
                        <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                      </button>
                    ) : (
                      <span className="text-gray-300">{deal.contact_name}</span>
                    )}
                  </div>
                )}

                {deal?.company && (
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-gray-300">{deal.company}</span>
                  </div>
                )}
                {deal?.owner && (
                  <div className="flex items-center gap-3 text-sm">
                    <Tag className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="text-gray-300">{deal.owner}</span>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setEditing(true)}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-2 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 transition-colors text-sm"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Deal
                </motion.button>
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { key: 'title', label: 'Deal Title' },
                  { key: 'value', label: 'Value ($)' },
                  { key: 'contact_name', label: 'Contact Name' },
                  { key: 'company', label: 'Company' },
                  { key: 'owner', label: 'Owner' },
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
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Stage</label>
                  <select
                    value={editForm.stage}
                    onChange={e => setEditForm({ ...editForm, stage: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
                  >
                    {STAGE_LIST.map(s => (
                      <option key={s} value={s}>{STAGES[s].label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setEditing(false)}
                    className="flex-1 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors flex items-center justify-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSaveDeal}
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

          {/* Stage Pipeline Progress */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-white text-sm font-medium mb-3">Pipeline Stage</p>
            <div className="space-y-2">
              {STAGE_LIST.map((stage) => {
                const info = STAGES[stage]
                const isCurrent = deal?.stage === stage
                return (
                  <motion.button
                    key={stage}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => !isCurrent && handleStageChange(stage)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all border ${
                      isCurrent
                        ? `${info.color} font-semibold`
                        : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <span>{info.label}</span>
                    {isCurrent && <Check className="w-3.5 h-3.5" />}
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* Activity stats */}
          <div className="grid grid-cols-2 gap-3">
            {ACTIVITY_TYPES.map(type => {
              const count = activities.filter(a => a.type === type.id).length
              const Icon = type.icon
              return (
                <div key={type.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-2">
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
                        <div className="flex flex-col items-center">
                          <ActivityIcon type={activity.type} />
                          {i < activities.length - 1 && (
                            <div className="w-px flex-1 bg-gray-800 mt-2" />
                          )}
                        </div>

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