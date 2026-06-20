import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, Plus, X, Loader2, Send, Trash2,
  Users, Eye, Clock, CheckCircle2,
  AlertCircle, MessageSquare, Phone, FileText,
  MessageCircle, Info
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

const TemplatePicker = ({ templates, onSelect, onClose }) => (
  <div
    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
    onClick={onClose}
  >
    <div
      className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white font-semibold text-lg">Choose a Template</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>
      {templates.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">No templates found.</p>
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg transition-colors"
            >
              <p className="text-white text-sm font-medium">{t.name}</p>
              <p className="text-gray-400 text-xs mt-1 truncate">{t.subject}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  </div>
)

// ─── EMAIL CAMPAIGNS TAB ──────────────────────────────────────────────────────
function EmailCampaigns() {
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
  const [form, setForm] = useState({ name: '', subject: '', body: '' })
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [availableTemplates, setAvailableTemplates] = useState([])

  useEffect(() => { fetchCampaigns(); fetchContacts(); fetchTemplates() }, [])

  const fetchCampaigns = async () => {
    try { const res = await api.get('/campaigns/'); setCampaigns(res.data) }
    catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const fetchContacts = async () => {
    try { const res = await api.get('/contacts/'); setContacts(res.data) }
    catch (err) { console.error(err) }
  }

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/email-templates/')
      setAvailableTemplates(res.data)
    } catch (err) { console.error(err) }
  }

  const handleCreate = async () => {
    if (!form.name || !form.subject || !form.body) { toast.error('Please fill in all fields'); return }
    setSaving(true)
    try {
      await api.post('/campaigns/', form)
      toast.success('Campaign created!')
      fetchCampaigns()
      setShowCreateModal(false)
      setForm({ name: '', subject: '', body: '' })
    } catch { toast.error('Something went wrong') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this campaign?')) return
    try { await api.delete(`/campaigns/${id}`); toast.success('Deleted!'); fetchCampaigns() }
    catch { toast.error('Something went wrong') }
  }

  const openSendModal = (campaign) => {
    setSelectedCampaign(campaign); setSelectedContacts([]); setSendToAll(true); setShowSendModal(true)
  }

  const handleSend = async () => {
    if (!selectedCampaign) return
    setSending(true)
    try {
      const payload = sendToAll ? { contact_ids: null } : { contact_ids: selectedContacts }
      const res = await api.post(`/campaigns/${selectedCampaign.id}/send`, payload)
      toast.success(`Sent to ${res.data.sent} contacts!`)
      fetchCampaigns(); setShowSendModal(false)
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to send') }
    finally { setSending(false) }
  }

  const openDetailModal = async (campaign) => {
    setSelectedCampaign(campaign); setShowDetailModal(true)
    try { const res = await api.get(`/campaigns/${campaign.id}/recipients`); setRecipients(res.data) }
    catch (err) { console.error(err) }
  }

  const toggleContact = (id) =>
    setSelectedContacts(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])

  const handleTemplateSelect = (template) => {
    setForm({ name: form.name, subject: template.subject, body: template.body })
    setShowTemplatePicker(false)
  }

  const totalSent = campaigns.reduce((s, c) => s + c.sent_count, 0)
  const totalOpens = campaigns.reduce((s, c) => s + (c.open_count || 0), 0)
  const openRate = totalSent > 0 ? Math.round((totalOpens / totalSent) * 100) : 0

  const statCards = [
    { label: 'Total', value: campaigns.length, icon: Mail, color: 'bg-violet-500' },
    { label: 'Sent', value: campaigns.filter(c => c.status === 'sent').length, icon: CheckCircle2, color: 'bg-green-500' },
    { label: 'Emails Sent', value: totalSent, icon: Send, color: 'bg-blue-500' },
    { label: 'Open Rate', value: `${openRate}%`, icon: Eye, color: 'bg-pink-500' },
  ]

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }} className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-gray-400 text-sm">{stat.label}</p>
            <p className="text-white text-2xl font-bold mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">Email Campaigns</h2>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Campaign
          </motion.button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-violet-500 animate-spin" /></div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-20">
            <Mail className="w-12 h-12 mx-auto mb-3 text-gray-700" />
            <p className="text-gray-500">No email campaigns yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {campaigns.map((campaign, i) => {
              const statusConfig = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft
              const StatusIcon = statusConfig.icon
              return (
                <motion.div key={campaign.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-6 hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-violet-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-violet-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="text-white font-medium truncate">{campaign.name}</p>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} flex items-center gap-1 flex-shrink-0`}>
                          <StatusIcon className="w-3 h-3" />{statusConfig.label}
                        </span>
                      </div>
                      <p className="text-gray-500 text-sm truncate">{campaign.subject}</p>
                      <div className="flex items-center gap-4 mt-1">
                        {campaign.status === 'sent' && (
                          <>
                            <span className="text-gray-600 text-xs flex items-center gap-1">
                              <Send className="w-3 h-3" />{campaign.sent_count} sent
                            </span>
                            <span className="text-gray-600 text-xs flex items-center gap-1">
                              <Eye className="w-3 h-3 text-pink-400" />
                              {campaign.open_count || 0} opened
                              {campaign.sent_count > 0 && (
                                <span className="text-gray-700">
                                  ({Math.round(((campaign.open_count || 0) / campaign.sent_count) * 100)}%)
                                </span>
                              )}
                            </span>
                          </>
                        )}
                        <span className="text-gray-600 text-xs">
                          {campaign.sent_at
                            ? <span>Sent <TimeAgo dateString={campaign.sent_at} /></span>
                            : <span>Created <TimeAgo dateString={campaign.created_at} /></span>}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {campaign.status === 'sent' && (
                      <motion.button whileHover={{ scale: 1.05 }} onClick={() => openDetailModal(campaign)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-xs transition-colors">
                        <Eye className="w-3.5 h-3.5" />Details
                      </motion.button>
                    )}
                    {campaign.status === 'draft' && (
                      <motion.button whileHover={{ scale: 1.05 }} onClick={() => openSendModal(campaign)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs transition-colors">
                        <Send className="w-3.5 h-3.5" />Send
                      </motion.button>
                    )}
                    <motion.button whileHover={{ scale: 1.1 }} onClick={() => handleDelete(campaign.id)}
                      className="p-1.5 text-gray-600 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-semibold text-lg">New Email Campaign</h2>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowTemplatePicker(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-violet-400 rounded-lg text-xs transition-colors">
                    <FileText className="w-3.5 h-3.5" />Use Template
                  </button>
                  <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1.5 block">Campaign Name</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. June Newsletter"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1.5 block">Email Subject</label>
                  <input type="text" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                    placeholder="e.g. Special offer just for you!"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1.5 block">Email Body</label>
                  <p className="text-gray-600 text-xs mb-2">Use {`{{name}}`}, {`{{email}}`}, {`{{company}}`} for personalization</p>
                  <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}
                    placeholder={`Hi {{name}},\n\nWrite your email here...\n\nBest regards,\nYour Team`}
                    rows={10} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none font-mono" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">Cancel</button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleCreate} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {saving ? 'Creating...' : 'Create Campaign'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Send Modal */}
      <AnimatePresence>
        {showSendModal && selectedCampaign && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-semibold">Send Email Campaign</h2>
                <button onClick={() => setShowSendModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="bg-gray-800 rounded-xl p-4 mb-6">
                <p className="text-white text-sm font-medium">{selectedCampaign.name}</p>
                <p className="text-gray-400 text-xs mt-1">{selectedCampaign.subject}</p>
              </div>
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-300 mb-3">Send to:</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" checked={sendToAll} onChange={() => setSendToAll(true)} className="accent-violet-500" />
                    <span className="text-white text-sm">All contacts ({contacts.length})</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" checked={!sendToAll} onChange={() => setSendToAll(false)} className="accent-violet-500" />
                    <span className="text-white text-sm">Select specific contacts</span>
                  </label>
                </div>
              </div>
              {!sendToAll && (
                <div className="mb-4 max-h-48 overflow-y-auto space-y-2 bg-gray-800 rounded-xl p-3">
                  {contacts.map(contact => (
                    <label key={contact.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-700 rounded-lg p-2 transition-colors">
                      <input type="checkbox" checked={selectedContacts.includes(contact.id)}
                        onChange={() => toggleContact(contact.id)} className="accent-violet-500" />
                      <div className="w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {contact.first_name?.[0]}{contact.last_name?.[0] || ''}
                      </div>
                      <div>
                        <p className="text-white text-sm">{contact.first_name} {contact.last_name}</p>
                        <p className="text-gray-500 text-xs">{contact.email || 'No email'}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {!sendToAll && selectedContacts.length === 0 && (
                <div className="flex items-center gap-2 text-yellow-400 text-xs mb-4">
                  <AlertCircle className="w-3.5 h-3.5" />Please select at least one contact
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowSendModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">Cancel</button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSend}
                  disabled={sending || (!sendToAll && selectedContacts.length === 0)}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? 'Sending...' : 'Send Now'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedCampaign && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-semibold">Campaign Details</h2>
                <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <Send className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                  <p className="text-white font-bold">{selectedCampaign.sent_count}</p>
                  <p className="text-gray-500 text-xs">Sent</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <Eye className="w-4 h-4 text-pink-400 mx-auto mb-1" />
                  <p className="text-white font-bold">{selectedCampaign.open_count || 0}</p>
                  <p className="text-gray-500 text-xs">
                    Opened
                    {selectedCampaign.sent_count > 0 && (
                      <span className="text-gray-600">
                        {' '}({Math.round(((selectedCampaign.open_count || 0) / selectedCampaign.sent_count) * 100)}%)
                      </span>
                    )}
                  </p>
                </div>
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <Users className="w-4 h-4 text-violet-400 mx-auto mb-1" />
                  <p className="text-white font-bold">{recipients.length}</p>
                  <p className="text-gray-500 text-xs">Recipients</p>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recipients.map(r => (
                  <div key={r.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm">{r.name || r.email}</p>
                      <p className="text-gray-500 text-xs truncate">{r.email}</p>
                      {r.opened && r.opened_at && (
                        <p className="text-pink-400/80 text-[10px] mt-0.5 flex items-center gap-1">
                          <Eye className="w-2.5 h-2.5" />
                          Opened <TimeAgo dateString={r.opened_at} />
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {r.status === 'sent' && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                          r.opened
                            ? 'bg-pink-500/10 text-pink-400 border-pink-500/30'
                            : 'bg-gray-700/50 text-gray-500 border-gray-700'
                        }`}>
                          <Eye className="w-2.5 h-2.5" />
                          {r.opened ? 'Opened' : 'Unopened'}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'sent' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                        {r.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showTemplatePicker && (
        <TemplatePicker
          templates={availableTemplates}
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}
    </>
  )
}
// ─── SMS CAMPAIGNS TAB ────────────────────────────────────────────────────────
function SmsCampaigns() {
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
  const [form, setForm] = useState({ name: '', message: '' })

  const SMS_LIMIT = 160
  const charsLeft = SMS_LIMIT - form.message.length
  const segments = Math.ceil(form.message.length / SMS_LIMIT) || 1

  useEffect(() => { fetchCampaigns(); fetchContacts() }, [])

  const fetchCampaigns = async () => {
    try { const res = await api.get('/sms-campaigns/'); setCampaigns(res.data) }
    catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const fetchContacts = async () => {
    try { const res = await api.get('/contacts/'); setContacts(res.data) }
    catch (err) { console.error(err) }
  }

  const handleCreate = async () => {
    if (!form.name || !form.message) { toast.error('Please fill in all fields'); return }
    setSaving(true)
    try {
      await api.post('/sms-campaigns/', form)
      toast.success('SMS campaign created!')
      fetchCampaigns(); setShowCreateModal(false); setForm({ name: '', message: '' })
    } catch { toast.error('Something went wrong') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this SMS campaign?')) return
    try { await api.delete(`/sms-campaigns/${id}`); toast.success('Deleted!'); fetchCampaigns() }
    catch { toast.error('Something went wrong') }
  }

  const openSendModal = (campaign) => {
    setSelectedCampaign(campaign); setSelectedContacts([]); setSendToAll(true); setShowSendModal(true)
  }

  const handleSend = async () => {
    if (!selectedCampaign) return
    setSending(true)
    try {
      const payload = sendToAll ? { contact_ids: null } : { contact_ids: selectedContacts }
      const res = await api.post(`/sms-campaigns/${selectedCampaign.id}/send`, payload)
      toast.success(`SMS sent to ${res.data.sent} contacts! ${res.data.skipped > 0 ? `(${res.data.skipped} skipped — no phone)` : ''}`)
      fetchCampaigns(); setShowSendModal(false)
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to send') }
    finally { setSending(false) }
  }

  const openDetailModal = async (campaign) => {
    setSelectedCampaign(campaign); setShowDetailModal(true)
    try { const res = await api.get(`/sms-campaigns/${campaign.id}/recipients`); setRecipients(res.data) }
    catch (err) { console.error(err) }
  }

  const toggleContact = (id) =>
    setSelectedContacts(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])

  const contactsWithPhone = contacts.filter(c => c.phone)

  const statCards = [
    { label: 'Total', value: campaigns.length, icon: MessageSquare, color: 'bg-violet-500' },
    { label: 'Sent', value: campaigns.filter(c => c.status === 'sent').length, icon: CheckCircle2, color: 'bg-green-500' },
    { label: 'SMS Sent', value: campaigns.reduce((s, c) => s + c.sent_count, 0), icon: Phone, color: 'bg-blue-500' },
    { label: 'Drafts', value: campaigns.filter(c => c.status === 'draft').length, icon: Clock, color: 'bg-orange-500' },
  ]

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }} className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-gray-400 text-sm">{stat.label}</p>
            <p className="text-white text-2xl font-bold mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold">SMS Campaigns</h2>
            <p className="text-gray-500 text-xs mt-1">{contactsWithPhone.length} of {contacts.length} contacts have phone numbers</p>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New SMS Campaign
          </motion.button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-violet-500 animate-spin" /></div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-700" />
            <p className="text-gray-500">No SMS campaigns yet</p>
            <p className="text-gray-600 text-sm mt-1">Create your first SMS campaign to reach contacts via text</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {campaigns.map((campaign, i) => {
              const statusConfig = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft
              const StatusIcon = statusConfig.icon
              return (
                <motion.div key={campaign.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-6 hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-green-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="text-white font-medium truncate">{campaign.name}</p>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} flex items-center gap-1 flex-shrink-0`}>
                          <StatusIcon className="w-3 h-3" />{statusConfig.label}
                        </span>
                      </div>
                      <p className="text-gray-500 text-sm truncate">{campaign.message}</p>
                      <div className="flex items-center gap-4 mt-1">
                        {campaign.status === 'sent' && (
                          <span className="text-gray-600 text-xs flex items-center gap-1">
                            <Phone className="w-3 h-3" />{campaign.sent_count} sent
                          </span>
                        )}
                        <span className="text-gray-600 text-xs">
                          {campaign.sent_at
                            ? <span>Sent <TimeAgo dateString={campaign.sent_at} /></span>
                            : <span>Created <TimeAgo dateString={campaign.created_at} /></span>}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {campaign.status === 'sent' && (
                      <motion.button whileHover={{ scale: 1.05 }} onClick={() => openDetailModal(campaign)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-xs transition-colors">
                        <Eye className="w-3.5 h-3.5" />Details
                      </motion.button>
                    )}
                    {campaign.status === 'draft' && (
                      <motion.button whileHover={{ scale: 1.05 }} onClick={() => openSendModal(campaign)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs transition-colors">
                        <Send className="w-3.5 h-3.5" />Send SMS
                      </motion.button>
                    )}
                    <motion.button whileHover={{ scale: 1.1 }} onClick={() => handleDelete(campaign.id)}
                      className="p-1.5 text-gray-600 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-semibold text-lg">New SMS Campaign</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1.5 block">Campaign Name</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. June Promo SMS"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-300">Message</label>
                    <span className={`text-xs ${charsLeft < 0 ? 'text-red-400' : charsLeft < 20 ? 'text-yellow-400' : 'text-gray-500'}`}>
                      {form.message.length}/{SMS_LIMIT} · {segments} segment{segments !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-gray-600 text-xs mb-2">Use {`{{name}}`}, {`{{company}}`} for personalization</p>
                  <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                    placeholder="Hi {{name}}, we have a special offer for you!"
                    rows={5} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none" />
                  <div className="mt-1.5 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${charsLeft < 0 ? 'bg-red-500' : charsLeft < 20 ? 'bg-yellow-500' : 'bg-violet-500'}`}
                      style={{ width: `${Math.min((form.message.length / SMS_LIMIT) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">Cancel</button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleCreate} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {saving ? 'Creating...' : 'Create Campaign'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Send Modal */}
      <AnimatePresence>
        {showSendModal && selectedCampaign && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-semibold">Send SMS Campaign</h2>
                <button onClick={() => setShowSendModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="bg-gray-800 rounded-xl p-4 mb-4">
                <p className="text-white text-sm font-medium">{selectedCampaign.name}</p>
                <p className="text-gray-400 text-xs mt-1 line-clamp-2">{selectedCampaign.message}</p>
              </div>
              {contactsWithPhone.length < contacts.length && (
                <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4">
                  <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-yellow-400 text-xs">
                    {contacts.length - contactsWithPhone.length} contact{contacts.length - contactsWithPhone.length !== 1 ? 's' : ''} will be skipped (no phone number)
                  </p>
                </div>
              )}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-300 mb-3">Send to:</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" checked={sendToAll} onChange={() => setSendToAll(true)} className="accent-violet-500" />
                    <span className="text-white text-sm">All contacts with phone ({contactsWithPhone.length})</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" checked={!sendToAll} onChange={() => setSendToAll(false)} className="accent-violet-500" />
                    <span className="text-white text-sm">Select specific contacts</span>
                  </label>
                </div>
              </div>
              {!sendToAll && (
                <div className="mb-4 max-h-48 overflow-y-auto space-y-2 bg-gray-800 rounded-xl p-3">
                  {contactsWithPhone.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No contacts with phone numbers</p>
                  ) : (
                    contactsWithPhone.map(contact => (
                      <label key={contact.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-700 rounded-lg p-2 transition-colors">
                        <input type="checkbox" checked={selectedContacts.includes(contact.id)}
                          onChange={() => toggleContact(contact.id)} className="accent-violet-500" />
                        <div className="w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {contact.first_name?.[0]}{contact.last_name?.[0] || ''}
                        </div>
                        <div>
                          <p className="text-white text-sm">{contact.first_name} {contact.last_name}</p>
                          <p className="text-gray-500 text-xs">{contact.phone}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              )}
              {!sendToAll && selectedContacts.length === 0 && (
                <div className="flex items-center gap-2 text-yellow-400 text-xs mb-4">
                  <AlertCircle className="w-3.5 h-3.5" />Please select at least one contact
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowSendModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">Cancel</button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSend}
                  disabled={sending || (!sendToAll && selectedContacts.length === 0)}
                  className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? 'Sending...' : 'Send SMS'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedCampaign && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-semibold">SMS Campaign Details</h2>
                <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <Phone className="w-4 h-4 text-green-400 mx-auto mb-1" />
                  <p className="text-white font-bold">{selectedCampaign.sent_count}</p>
                  <p className="text-gray-500 text-xs">Sent</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <Users className="w-4 h-4 text-violet-400 mx-auto mb-1" />
                  <p className="text-white font-bold">{recipients.length}</p>
                  <p className="text-gray-500 text-xs">Recipients</p>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recipients.map(r => (
                  <div key={r.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-white text-sm">{r.name || r.phone}</p>
                      <p className="text-gray-500 text-xs">{r.phone}</p>
                      {r.error && <p className="text-red-400 text-xs mt-0.5">{r.error}</p>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'sent' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
// ─── WHATSAPP CAMPAIGNS TAB ───────────────────────────────────────────────────
function WhatsappCampaigns() {
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
  const [form, setForm] = useState({ name: '', message: '' })

  const WA_LIMIT = 4096
  const charsUsed = form.message.length
  const charsLeft = WA_LIMIT - charsUsed

  useEffect(() => { fetchCampaigns(); fetchContacts() }, [])

  const fetchCampaigns = async () => {
    try { const res = await api.get('/whatsapp-campaigns/'); setCampaigns(res.data) }
    catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const fetchContacts = async () => {
    try { const res = await api.get('/contacts/'); setContacts(res.data) }
    catch (err) { console.error(err) }
  }

  const handleCreate = async () => {
    if (!form.name || !form.message) { toast.error('Please fill in all fields'); return }
    setSaving(true)
    try {
      await api.post('/whatsapp-campaigns/', form)
      toast.success('WhatsApp campaign created!')
      fetchCampaigns(); setShowCreateModal(false); setForm({ name: '', message: '' })
    } catch { toast.error('Something went wrong') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this WhatsApp campaign?')) return
    try { await api.delete(`/whatsapp-campaigns/${id}`); toast.success('Deleted!'); fetchCampaigns() }
    catch { toast.error('Something went wrong') }
  }

  const openSendModal = (campaign) => {
    setSelectedCampaign(campaign); setSelectedContacts([]); setSendToAll(true); setShowSendModal(true)
  }

  const handleSend = async () => {
    if (!selectedCampaign) return
    setSending(true)
    try {
      const payload = sendToAll ? { contact_ids: null } : { contact_ids: selectedContacts }
      const res = await api.post(`/whatsapp-campaigns/${selectedCampaign.id}/send`, payload)
      toast.success(`WhatsApp sent to ${res.data.sent} contacts!${res.data.skipped > 0 ? ` (${res.data.skipped} skipped — no phone)` : ''}${res.data.failed > 0 ? ` (${res.data.failed} failed)` : ''}`)
      fetchCampaigns(); setShowSendModal(false)
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to send') }
    finally { setSending(false) }
  }

  const openDetailModal = async (campaign) => {
    setSelectedCampaign(campaign); setShowDetailModal(true)
    try { const res = await api.get(`/whatsapp-campaigns/${campaign.id}/recipients`); setRecipients(res.data) }
    catch (err) { console.error(err) }
  }

  const toggleContact = (id) =>
    setSelectedContacts(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])

  const contactsWithPhone = contacts.filter(c => c.phone)

  const statCards = [
    { label: 'Total', value: campaigns.length, icon: MessageCircle, color: 'bg-green-600' },
    { label: 'Sent', value: campaigns.filter(c => c.status === 'sent').length, icon: CheckCircle2, color: 'bg-green-500' },
    { label: 'Messages Sent', value: campaigns.reduce((s, c) => s + c.sent_count, 0), icon: Send, color: 'bg-emerald-500' },
    { label: 'Drafts', value: campaigns.filter(c => c.status === 'draft').length, icon: Clock, color: 'bg-orange-500' },
  ]

  return (
    <>
      {/* Sandbox info banner */}
      <div className="flex items-start gap-3 bg-green-500/10 border border-green-500/30 rounded-2xl p-4 mb-6">
        <Info className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-green-400 text-sm font-medium">WhatsApp Sandbox Active</p>
          <p className="text-green-400/70 text-xs mt-0.5">
            Each recipient must first join the sandbox by sending{' '}
            <span className="font-mono bg-green-500/20 px-1.5 py-0.5 rounded text-green-300">join origin-biggest</span>
            {' '}to{' '}
            <span className="font-mono bg-green-500/20 px-1.5 py-0.5 rounded text-green-300">+1 415 523 8886</span>
            {' '}on WhatsApp before they can receive messages.
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }} className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-gray-400 text-sm">{stat.label}</p>
            <p className="text-white text-2xl font-bold mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Campaign List */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold">WhatsApp Campaigns</h2>
            <p className="text-gray-500 text-xs mt-1">{contactsWithPhone.length} of {contacts.length} contacts have phone numbers</p>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New WA Campaign
          </motion.button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-green-500 animate-spin" /></div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-20">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-700" />
            <p className="text-gray-500">No WhatsApp campaigns yet</p>
            <p className="text-gray-600 text-sm mt-1">Create your first campaign to reach contacts on WhatsApp</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {campaigns.map((campaign, i) => {
              const statusConfig = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.draft
              const StatusIcon = statusConfig.icon
              return (
                <motion.div key={campaign.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-6 hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-green-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="text-white font-medium truncate">{campaign.name}</p>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} flex items-center gap-1 flex-shrink-0`}>
                          <StatusIcon className="w-3 h-3" />{statusConfig.label}
                        </span>
                      </div>
                      <p className="text-gray-500 text-sm truncate">{campaign.message}</p>
                      <div className="flex items-center gap-4 mt-1">
                        {campaign.status === 'sent' && (
                          <>
                            <span className="text-gray-600 text-xs flex items-center gap-1">
                              <MessageCircle className="w-3 h-3 text-green-500" />{campaign.sent_count} sent
                            </span>
                            {campaign.failed_count > 0 && (
                              <span className="text-red-500 text-xs flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />{campaign.failed_count} failed
                              </span>
                            )}
                          </>
                        )}
                        <span className="text-gray-600 text-xs">
                          {campaign.sent_at
                            ? <span>Sent <TimeAgo dateString={campaign.sent_at} /></span>
                            : <span>Created <TimeAgo dateString={campaign.created_at} /></span>}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {campaign.status === 'sent' && (
                      <motion.button whileHover={{ scale: 1.05 }} onClick={() => openDetailModal(campaign)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white text-xs transition-colors">
                        <Eye className="w-3.5 h-3.5" />Details
                      </motion.button>
                    )}
                    {campaign.status === 'draft' && (
                      <motion.button whileHover={{ scale: 1.05 }} onClick={() => openSendModal(campaign)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs transition-colors">
                        <Send className="w-3.5 h-3.5" />Send WA
                      </motion.button>
                    )}
                    <motion.button whileHover={{ scale: 1.1 }} onClick={() => handleDelete(campaign.id)}
                      className="p-1.5 text-gray-600 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-600/20 rounded-lg flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-green-400" />
                  </div>
                  <h2 className="text-white font-semibold text-lg">New WhatsApp Campaign</h2>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              {/* Sandbox reminder inside create modal */}
              <div className="flex items-start gap-2 bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-4">
                <Info className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-green-400/80 text-xs">
                  Recipients must have joined the sandbox before they can receive this message.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1.5 block">Campaign Name</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. June Promo WhatsApp"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-300">Message</label>
                    <span className={`text-xs ${charsLeft < 100 ? 'text-yellow-400' : 'text-gray-500'}`}>
                      {charsUsed}/{WA_LIMIT}
                    </span>
                  </div>
                  <p className="text-gray-600 text-xs mb-2">Use {`{{name}}`}, {`{{company}}`}, {`{{phone}}`} for personalization</p>
                  <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                    placeholder={`Hi {{name}} 👋\n\nWe have something special for you at {{company}}!\n\nReply to this message to learn more.`}
                    rows={6} className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-500 transition-colors resize-none" />
                  <div className="mt-1.5 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all bg-green-500"
                      style={{ width: `${Math.min((charsUsed / WA_LIMIT) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">Cancel</button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleCreate} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {saving ? 'Creating...' : 'Create Campaign'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Send Modal */}
      <AnimatePresence>
        {showSendModal && selectedCampaign && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-semibold">Send WhatsApp Campaign</h2>
                <button onClick={() => setShowSendModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="bg-gray-800 rounded-xl p-4 mb-4">
                <p className="text-white text-sm font-medium">{selectedCampaign.name}</p>
                <p className="text-gray-400 text-xs mt-1 line-clamp-2">{selectedCampaign.message}</p>
              </div>

              {/* Sandbox warning */}
              <div className="flex items-start gap-2 bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-4">
                <Info className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-green-400/80 text-xs">
                  Only contacts who have joined the sandbox (<span className="font-mono">join origin-biggest</span>) will receive this message.
                </p>
              </div>

              {contactsWithPhone.length < contacts.length && (
                <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4">
                  <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-yellow-400 text-xs">
                    {contacts.length - contactsWithPhone.length} contact{contacts.length - contactsWithPhone.length !== 1 ? 's' : ''} will be skipped (no phone number)
                  </p>
                </div>
              )}

              <div className="mb-4">
                <p className="text-sm font-medium text-gray-300 mb-3">Send to:</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" checked={sendToAll} onChange={() => setSendToAll(true)} className="accent-green-500" />
                    <span className="text-white text-sm">All contacts with phone ({contactsWithPhone.length})</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" checked={!sendToAll} onChange={() => setSendToAll(false)} className="accent-green-500" />
                    <span className="text-white text-sm">Select specific contacts</span>
                  </label>
                </div>
              </div>

              {!sendToAll && (
                <div className="mb-4 max-h-48 overflow-y-auto space-y-2 bg-gray-800 rounded-xl p-3">
                  {contactsWithPhone.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No contacts with phone numbers</p>
                  ) : (
                    contactsWithPhone.map(contact => (
                      <label key={contact.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-700 rounded-lg p-2 transition-colors">
                        <input type="checkbox" checked={selectedContacts.includes(contact.id)}
                          onChange={() => toggleContact(contact.id)} className="accent-green-500" />
                        <div className="w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {contact.first_name?.[0]}{contact.last_name?.[0] || ''}
                        </div>
                        <div>
                          <p className="text-white text-sm">{contact.first_name} {contact.last_name}</p>
                          <p className="text-gray-500 text-xs">{contact.phone}</p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              )}
              {!sendToAll && selectedContacts.length === 0 && (
                <div className="flex items-center gap-2 text-yellow-400 text-xs mb-4">
                  <AlertCircle className="w-3.5 h-3.5" />Please select at least one contact
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowSendModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">Cancel</button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSend}
                  disabled={sending || (!sendToAll && selectedContacts.length === 0)}
                  className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                  {sending ? 'Sending...' : 'Send WhatsApp'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedCampaign && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-semibold">WhatsApp Campaign Details</h2>
                <button onClick={() => setShowDetailModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <MessageCircle className="w-4 h-4 text-green-400 mx-auto mb-1" />
                  <p className="text-white font-bold">{selectedCampaign.sent_count}</p>
                  <p className="text-gray-500 text-xs">Sent</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <AlertCircle className="w-4 h-4 text-red-400 mx-auto mb-1" />
                  <p className="text-white font-bold">{selectedCampaign.failed_count}</p>
                  <p className="text-gray-500 text-xs">Failed</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-3 text-center">
                  <Users className="w-4 h-4 text-violet-400 mx-auto mb-1" />
                  <p className="text-white font-bold">{recipients.length}</p>
                  <p className="text-gray-500 text-xs">Total</p>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recipients.map(r => (
                  <div key={r.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm">{r.name || r.phone}</p>
                      <p className="text-gray-500 text-xs">{r.phone}</p>
                      {r.message_sid && (
                        <p className="text-gray-700 text-[10px] font-mono mt-0.5 truncate">{r.message_sid}</p>
                      )}
                      {r.error && <p className="text-red-400 text-xs mt-0.5 truncate">{r.error}</p>}
                    </div>
                    <span className={`ml-3 text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${r.status === 'sent' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── MAIN CAMPAIGNS PAGE ──────────────────────────────────────────────────────
export default function Campaigns() {
  const [activeTab, setActiveTab] = useState('email')

  const tabs = [
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'sms', label: 'SMS', icon: MessageSquare },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  ]

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Campaigns</h1>
          <p className="text-gray-400 mt-1">Send email, SMS, and WhatsApp campaigns to your contacts</p>
        </div>

        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit mb-8">
          {tabs.map(tab => (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? tab.id === 'whatsapp'
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'bg-violet-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </motion.button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'email' && <EmailCampaigns />}
            {activeTab === 'sms' && <SmsCampaigns />}
            {activeTab === 'whatsapp' && <WhatsappCampaigns />}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  )
}