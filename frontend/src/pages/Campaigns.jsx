import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, Plus, X, Loader2, Send, Trash2,
  Users, Eye, MousePointer, Clock, CheckCircle2,
  ChevronRight, AlertCircle
} from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30', icon: Clock },
  sent: { label: 'Sent', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', icon: CheckCircle2 },
}

function TimeAgo({ dateString }) {
  if (!dateString) return null
  const date = new Date(dateString)
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return <span>{diff}s ago</span>
  if (diff < 3600) return <span>{Math.floor(diff / 60)}m ago</span>
  if (diff < 86400) return <span>{Math.floor(diff / 3600)}h ago</span>
  return <span>{date.toLocaleDateString()}</span>
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [recipients, setRecipients] = useState([])
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [selectedContacts, setSelectedContacts] = useState([])
  const [sendToAll, setSendToAll] = useState(true)

  const [form, setForm] = useState({
    name: '',
    subject: '',
    body: '',
  })

  useEffect(() => {
    fetchCampaigns()
    fetchContacts()
  }, [])

  const fetchCampaigns = async () => {
    try {
      const res = await api.get('/campaigns/')
      setCampaigns(res.data)
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

  const handleCreate = async () => {
    if (!form.name || !form.subject || !form.body) {
      toast.error('Please fill in all fields')
      return
    }
    setSaving(true)
    try {
      await api.post('/campaigns/', form)
      toast.success('Campaign created!')
      fetchCampaigns()
      setShowCreateModal(false)
      setForm({ name: '', subject: '', body: '' })
    } catch (err) {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this campaign?')) return
    try {
      await api.delete(`/campaigns/${id}`)
      toast.success('Campaign deleted!')
      fetchCampaigns()
    } catch (err) {
      toast.error('Something went wrong')
    }
  }

  const openSendModal = (campaign) => {
    setSelectedCampaign(campaign)
    setSelectedContacts([])
    setSendToAll(true)
    setShowSendModal(true)
  }

  const handleSend = async () => {
    if (!selectedCampaign) return
    setSending(true)
    try {
      const payload = sendToAll
        ? { contact_ids: null }
        : { contact_ids: selectedContacts }

      const res = await api.post(`/campaigns/${selectedCampaign.id}/send`, payload)
      toast.success(`Campaign sent to ${res.data.sent} contacts!`)
      fetchCampaigns()
      setShowSendModal(false)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send campaign')
    } finally {
      setSending(false)
    }
  }

  const openDetailModal = async (campaign) => {
    setSelectedCampaign(campaign)
    setShowDetailModal(true)
    try {
      const res = await api.get(`/campaigns/${campaign.id}/recipients`)
      setRecipients(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const toggleContact = (id) => {
    setSelectedContacts(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const statCards = [
    { label: 'Total Campaigns', value: campaigns.length, icon: Mail, color: 'bg-violet-500' },
    { label: 'Sent', value: campaigns.filter(c => c.status === 'sent').length, icon: CheckCircle2, color: 'bg-green-500' },
    { label: 'Total Emails Sent', value: campaigns.reduce((sum, c) => sum + c.sent_count, 0), icon: Send, color: 'bg-blue-500' },
    { label: 'Drafts', value: campaigns.filter(c => c.status === 'draft').length, icon: Clock, color: 'bg-orange-500' },
  ]

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Email Campaigns</h1>
            <p className="text-gray-400 mt-1">Create and send email campaigns to your contacts</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </motion.button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-gray-900 rounded-2xl p-6 border border-gray-800"
            >
              <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-gray-400 text-sm">{stat.label}</p>
              <p className="text-white text-2xl font-bold mt-1">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Campaigns List */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <div className="p-6 border-b border-gray-800">
            <h2 className="text-white font-semibold">All Campaigns</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-20">
              <Mail className="w-12 h-12 mx-auto mb-3 text-gray-700" />
              <p className="text-gray-500">No campaigns yet</p>
              <p className="text-gray-600 text-sm mt-1">Create your first email campaign</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              <AnimatePresence>
                {campaigns.map((campaign, i) => {
                  const statusConfig = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft
                  const StatusIcon = statusConfig.icon
                  return (
                    <motion.div
                      key={campaign.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-6 hover:bg-gray-800/50 transition-colors group"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-violet-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Mail className="w-5 h-5 text-violet-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="text-white font-medium truncate">{campaign.name}</p>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} flex items-center gap-1 flex-shrink-0`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig.label}
                            </span>
                          </div>
                          <p className="text-gray-500 text-sm truncate">{campaign.subject}</p>
                          <div className="flex items-center gap-4 mt-1">
                            {campaign.status === 'sent' && (
                              <>
                                <span className="text-gray-600 text-xs flex items-center gap-1">
                                  <Send className="w-3 h-3" />
                                  {campaign.sent_count} sent
                                </span>
                                <span className="text-gray-600 text-xs flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  {campaign.open_count} opens
                                </span>
                              </>
                            )}
                            <span className="text-gray-600 text-xs">
                              {campaign.sent_at
                                ? <span>Sent <TimeAgo dateString={campaign.sent_at} /></span>
                                : <span>Created <TimeAgo dateString={campaign.created_at} /></span>
                              }
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {campaign.status === 'sent' && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            onClick={() => openDetailModal(campaign)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-xs transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Details
                          </motion.button>
                        )}
                        {campaign.status === 'draft' && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            onClick={() => openSendModal(campaign)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Send
                          </motion.button>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          onClick={() => handleDelete(campaign.id)}
                          className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>

      {/* Create Campaign Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-semibold text-lg">New Campaign</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1.5 block">Campaign Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. June Newsletter"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1.5 block">Email Subject</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="e.g. Special offer just for you!"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1.5 block">Email Body</label>
                  <p className="text-gray-600 text-xs mb-2">
                    Use {`{{name}}`}, {`{{email}}`}, {`{{company}}`} for personalization
                  </p>
                  <textarea
                    value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                    placeholder={`Hi {{name}},\n\nWrite your email content here...\n\nBest regards,\nYour Team`}
                    rows={10}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {saving ? 'Creating...' : 'Create Campaign'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Send Campaign Modal */}
      <AnimatePresence>
        {showSendModal && selectedCampaign && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-semibold">Send Campaign</h2>
                <button onClick={() => setShowSendModal(false)} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-gray-800 rounded-xl p-4 mb-6">
                <p className="text-white text-sm font-medium">{selectedCampaign.name}</p>
                <p className="text-gray-400 text-xs mt-1">{selectedCampaign.subject}</p>
              </div>

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-300 mb-3">Send to:</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      checked={sendToAll}
                      onChange={() => setSendToAll(true)}
                      className="accent-violet-500"
                    />
                    <span className="text-white text-sm">All contacts ({contacts.length})</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      checked={!sendToAll}
                      onChange={() => setSendToAll(false)}
                      className="accent-violet-500"
                    />
                    <span className="text-white text-sm">Select specific contacts</span>
                  </label>
                </div>
              </div>

              {!sendToAll && (
                <div className="mb-4 max-h-48 overflow-y-auto space-y-2 bg-gray-800 rounded-xl p-3">
                  {contacts.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No contacts found</p>
                  ) : (
                    contacts.map(contact => (
                      <label key={contact.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-700 rounded-lg p-2 transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedContacts.includes(contact.id)}
                          onChange={() => toggleContact(contact.id)}
                          className="accent-violet-500"
                        />
                        <div className="w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {contact.first_name?.[0]}{contact.last_name?.[0] || ''}
                        </div>
                        <div>
                          <p className="text-white text-sm">{contact.first_name} {contact.last_name}</p>
                          <p className="text-gray-500 text-xs">{contact.email || 'No email'}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              )}

              {!sendToAll && selectedContacts.length === 0 && (
                <div className="flex items-center gap-2 text-yellow-400 text-xs mb-4">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Please select at least one contact
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSendModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSend}
                  disabled={sending || (!sendToAll && selectedContacts.length === 0)}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? 'Sending...' : 'Send Now'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Campaign Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedCampaign && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-semibold">Campaign Details</h2>
                <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <Send className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                  <p className="text-white font-bold">{selectedCampaign.sent_count}</p>
                  <p className="text-gray-500 text-xs">Sent</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <Eye className="w-4 h-4 text-green-400 mx-auto mb-1" />
                  <p className="text-white font-bold">{selectedCampaign.open_count}</p>
                  <p className="text-gray-500 text-xs">Opens</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <MousePointer className="w-4 h-4 text-violet-400 mx-auto mb-1" />
                  <p className="text-white font-bold">{selectedCampaign.click_count}</p>
                  <p className="text-gray-500 text-xs">Clicks</p>
                </div>
              </div>

              <div>
                <p className="text-gray-400 text-sm font-medium mb-3">Recipients ({recipients.length})</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {recipients.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No recipients found</p>
                  ) : (
                    recipients.map(recipient => (
                      <div key={recipient.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                        <div>
                          <p className="text-white text-sm">{recipient.name || recipient.email}</p>
                          <p className="text-gray-500 text-xs">{recipient.email}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          recipient.status === 'sent'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                            : 'bg-red-500/10 text-red-400 border border-red-500/30'
                        }`}>
                          {recipient.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}