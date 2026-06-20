// frontend/src/pages/Mail.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail, Inbox, Send, FileText, Trash2,
  Star, StarOff, MailOpen, MailIcon,
  Reply, Forward, Paperclip, Search,
  Plus, X, Loader2, RefreshCw, ChevronLeft,
  User, Building2, Sparkles, Check, Tag,
  Archive, MoreHorizontal, Eye, Clock,
  AlertCircle, ExternalLink
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'

// ── Constants ─────────────────────────────────────────────

const FOLDERS = [
  { id: 'inbox',  label: 'Inbox',  icon: Inbox,    color: 'text-violet-400' },
  { id: 'sent',   label: 'Sent',   icon: Send,     color: 'text-blue-400' },
  { id: 'drafts', label: 'Drafts', icon: FileText,  color: 'text-yellow-400' },
  { id: 'trash',  label: 'Trash',  icon: Trash2,   color: 'text-red-400' },
]

// ── Helpers ────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const isThisYear = d.getFullYear() === now.getFullYear()
  if (isThisYear) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateFull(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

function useDebounce(value, delay) {
  const [d, setD] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return d
}

// ── Compose Modal ──────────────────────────────────────────

function ComposeModal({ initial = {}, onClose, onSent, currentUser }) {
  const [form, setForm] = useState({
    to: initial.recipient_email || '',
    cc: initial.cc_emails || '',
    subject: initial.subject || '',
    body: initial.body || '',
    contact_id: initial.contact_id || null,
  })
  const [sending, setSending] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [showCc, setShowCc] = useState(!!(initial.cc_emails))
  const [contacts, setContacts] = useState([])
  const [contactSearch, setContactSearch] = useState('')
  const [showContactPicker, setShowContactPicker] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const isDraft = !!initial.id && initial.folder === 'drafts'
  const [draftId, setDraftId] = useState(initial.id || null)

  useEffect(() => {
    api.get('/contacts/').then(r => setContacts(r.data)).catch(() => {})
  }, [])

  const filteredContacts = contacts.filter(c => {
    const q = contactSearch.toLowerCase()
    return `${c.first_name} ${c.last_name} ${c.email || ''}`.toLowerCase().includes(q)
  }).slice(0, 6)

  const handleSend = async () => {
    if (!form.to.trim()) { toast.error('Recipient email is required'); return }
    if (!form.subject.trim()) { toast.error('Subject is required'); return }
    setSending(true)
    try {
      await api.post('/mail/send', {
        recipient_email: form.to.trim(),
        cc_emails: form.cc.trim() || null,
        subject: form.subject.trim(),
        body: form.body.trim(),
        contact_id: form.contact_id || null,
      })
      // Delete draft if it was one
      if (draftId) {
        await api.delete(`/mail/${draftId}`).catch(() => {})
      }
      toast.success('Email sent!')
      onSent?.()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const handleSaveDraft = async () => {
    setSavingDraft(true)
    try {
      const payload = {
        id: draftId || undefined,
        recipient_email: form.to.trim() || null,
        cc_emails: form.cc.trim() || null,
        subject: form.subject.trim() || null,
        body: form.body.trim() || null,
        contact_id: form.contact_id || null,
      }
      const res = await api.post('/mail/draft', payload)
      setDraftId(res.data.id)
      toast.success('Draft saved')
      onSent?.()
    } catch {
      toast.error('Failed to save draft')
    } finally {
      setSavingDraft(false)
    }
  }

  const handleAiSuggest = async () => {
    if (!form.subject.trim()) { toast.error('Add a subject first'); return }
    setAiLoading(true)
    try {
      // Ask Groq to draft a professional email
      const res = await api.post('/ai/suggest-reply', {
        contact_name: form.to || 'the recipient',
        messages: [{
          type: 'email',
          content: `[Context] Drafting email with subject: "${form.subject}". ${form.body ? 'Current draft: ' + form.body : ''}`,
          created_at: new Date().toISOString(),
        }]
      })
      const suggestion = res.data.suggestions?.[0]
      if (suggestion) {
        setForm(prev => ({ ...prev, body: suggestion }))
        toast.success('AI draft generated!')
      }
    } catch {
      toast.error('AI generation failed')
    } finally {
      setAiLoading(false)
    }
  }

  const selectContact = (contact) => {
    setForm(prev => ({
      ...prev,
      to: contact.email || prev.to,
      contact_id: contact.id,
    }))
    setContactSearch('')
    setShowContactPicker(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      className="fixed bottom-4 right-6 w-[560px] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl shadow-black/60 z-[200] flex flex-col"
      style={{ maxHeight: '85vh' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 bg-gray-800 rounded-t-2xl">
        <span className="text-white text-sm font-semibold">
          {isDraft ? 'Edit Draft' : 'New Message'}
        </span>
        <div className="flex items-center gap-2">
          <button onClick={handleSaveDraft} disabled={savingDraft}
            className="text-xs text-gray-400 hover:text-violet-400 transition-colors flex items-center gap-1">
            {savingDraft ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
            Save draft
          </button>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto">
        {/* To */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-800">
          <span className="text-gray-500 text-sm w-10 flex-shrink-0">To</span>
          <div className="flex-1 relative">
            <input
              type="email"
              value={form.to}
              onChange={e => setForm({ ...form, to: e.target.value })}
              placeholder="recipient@email.com"
              className="w-full bg-transparent text-white text-sm focus:outline-none placeholder-gray-600"
            />
          </div>
          <button
            onClick={() => setShowContactPicker(o => !o)}
            className="text-gray-600 hover:text-violet-400 transition-colors flex-shrink-0"
            title="Pick from contacts"
          >
            <User className="w-4 h-4" />
          </button>
          <button onClick={() => setShowCc(o => !o)}
            className="text-gray-600 hover:text-gray-400 text-xs transition-colors">Cc</button>
        </div>

        {/* Contact picker */}
        <AnimatePresence>
          {showContactPicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="px-5 py-2 border-b border-gray-800 bg-gray-800/60">
                <input
                  autoFocus
                  type="text"
                  value={contactSearch}
                  onChange={e => setContactSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-violet-500 transition-colors"
                />
                <div className="mt-2 space-y-1 max-h-36 overflow-y-auto">
                  {filteredContacts.map(c => (
                    <button key={c.id} onClick={() => selectContact(c)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-700 transition-colors text-left">
                      <div className="w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                        {c.first_name?.[0]}{c.last_name?.[0] || ''}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-xs font-medium">{c.first_name} {c.last_name}</p>
                        <p className="text-gray-500 text-[10px] truncate">{c.email || 'No email'}</p>
                      </div>
                    </button>
                  ))}
                  {filteredContacts.length === 0 && (
                    <p className="text-gray-600 text-xs px-2 py-2">No contacts found</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CC */}
        <AnimatePresence>
          {showCc && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-800">
                <span className="text-gray-500 text-sm w-10 flex-shrink-0">Cc</span>
                <input
                  type="text"
                  value={form.cc}
                  onChange={e => setForm({ ...form, cc: e.target.value })}
                  placeholder="cc@email.com, another@email.com"
                  className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-gray-600"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subject */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-800">
          <span className="text-gray-500 text-sm w-10 flex-shrink-0">Subj</span>
          <input
            type="text"
            value={form.subject}
            onChange={e => setForm({ ...form, subject: e.target.value })}
            placeholder="Subject"
            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-gray-600"
          />
        </div>

        {/* Body */}
        <div className="px-5 py-3">
          <textarea
            value={form.body}
            onChange={e => setForm({ ...form, body: e.target.value })}
            placeholder="Write your message here..."
            rows={10}
            className="w-full bg-transparent text-white text-sm focus:outline-none resize-none placeholder-gray-600 leading-relaxed"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800 bg-gray-800/40 rounded-b-2xl">
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {sending ? 'Sending...' : 'Send'}
          </motion.button>

          <button
            onClick={handleAiSuggest}
            disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-900/60 hover:bg-violet-800/80 border border-violet-700/40 text-violet-300 rounded-xl text-xs transition-colors"
            title="AI draft"
          >
            {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            AI Draft
          </button>
        </div>

        <div className="flex items-center gap-2">
          {form.contact_id && (
            <span className="text-[10px] text-violet-400 flex items-center gap-1">
              <User className="w-3 h-3" /> Contact linked
            </span>
          )}
          <button onClick={onClose}
            className="text-gray-600 hover:text-red-400 transition-colors"
            title="Discard">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Email List Item ────────────────────────────────────────

function EmailListItem({ email, selected, onSelect, folder, onStar, onDelete, onToggleRead }) {
  const isUnread = !email.is_read
  const showSender = folder === 'inbox' || folder === 'trash'
  const displayName = showSender ? email.sender_name : (email.recipient_email || 'Draft')
  const displayEmail = showSender ? email.sender_email : email.recipient_email

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onSelect}
      className={`group flex items-center gap-3 px-4 py-3 border-b border-gray-800/60 cursor-pointer transition-all relative ${
        selected
          ? 'bg-violet-600/10 border-l-2 border-l-violet-500'
          : isUnread
          ? 'bg-gray-800/30 border-l-2 border-l-violet-400'
          : 'border-l-2 border-l-transparent hover:bg-gray-800/30'
      }`}
    >
      {/* Star */}
      <button
        onClick={e => { e.stopPropagation(); onStar(email.id) }}
        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Star className={`w-4 h-4 ${email.is_starred ? 'text-yellow-400 fill-yellow-400 opacity-100 !opacity-100' : 'text-gray-600'}`} />
      </button>
      {email.is_starred && !selected && (
        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 flex-shrink-0 absolute left-4 group-hover:hidden" />
      )}

      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
        selected ? 'bg-violet-600' : 'bg-gray-700'
      }`}>
        {displayName?.[0]?.toUpperCase() || '?'}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-sm truncate ${isUnread ? 'font-semibold text-white' : 'font-medium text-gray-300'}`}>
            {displayName}
          </span>
          <span className="text-[10px] text-gray-500 flex-shrink-0">{formatDate(email.created_at)}</span>
        </div>
        <p className={`text-xs truncate ${isUnread ? 'text-gray-200' : 'text-gray-400'}`}>
          {email.subject || '(no subject)'}
        </p>
        <p className="text-[10px] text-gray-600 truncate">
          {email.body?.replace(/---------- Forwarded message ----------.*/s, '').slice(0, 80)}
        </p>
      </div>

      {/* Hover actions */}
      <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
        {email.has_attachments && <Paperclip className="w-3.5 h-3.5 text-gray-500" />}
        <button onClick={e => { e.stopPropagation(); onToggleRead(email.id) }}
          className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-violet-400 transition-colors"
          title={email.is_read ? 'Mark unread' : 'Mark read'}>
          {email.is_read ? <MailIcon className="w-3.5 h-3.5" /> : <MailOpen className="w-3.5 h-3.5" />}
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete(email.id) }}
          className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-red-400 transition-colors"
          title="Delete">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

// ── Email Detail Panel ─────────────────────────────────────

function EmailDetail({ emailId, folder, onBack, onReply, onForward, onDelete, onRefresh }) {
  const [email, setEmail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [aiSummary, setAiSummary] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [showReplyBox, setShowReplyBox] = useState(false)
  const [showForwardBox, setShowForwardBox] = useState(false)
  const [replyBody, setReplyBody] = useState('')
  const [fwdTo, setFwdTo] = useState('')
  const [fwdBody, setFwdBody] = useState('')
  const [sending, setSending] = useState(false)
  const [contacts, setContacts] = useState([])
  const [aiChecklist, setAiChecklist] = useState(null)
  const [aiWarnings, setAiWarnings] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    if (!emailId) return
    setLoading(true)
    setAiSummary(null)
    setShowReplyBox(false)
    setShowForwardBox(false)
    setAiChecklist(null)
    setAiWarnings([])
    api.get(`/mail/${emailId}`)
      .then(r => setEmail(r.data))
      .catch(() => toast.error('Failed to load email'))
      .finally(() => setLoading(false))
  }, [emailId])

  useEffect(() => {
    api.get('/contacts/').then(r => setContacts(r.data)).catch(() => {})
  }, [])

  const handleStar = async () => {
    const res = await api.patch(`/mail/${email.id}/star`)
    setEmail(e => ({ ...e, is_starred: res.data.is_starred }))
  }

  const handleMove = async (targetFolder) => {
    await api.patch(`/mail/${email.id}/move`, { folder: targetFolder })
    toast.success(`Moved to ${targetFolder}`)
    onRefresh?.()
    onBack()
  }

  const handleReply = async () => {
    if (!replyBody.trim()) return
    setSending(true)
    try {
      await api.post('/mail/reply', {
        original_email_id: email.id,
        body: replyBody,
      })
      toast.success('Reply sent!')
      setShowReplyBox(false)
      setReplyBody('')
      setAiChecklist(null)
      setAiWarnings([])
      onRefresh?.()
    } catch {
      toast.error('Failed to send reply')
    } finally {
      setSending(false)
    }
  }

  const handleForward = async () => {
    if (!fwdTo.trim()) return
    setSending(true)
    try {
      await api.post('/mail/forward', {
        original_email_id: email.id,
        recipient_email: fwdTo.trim(),
        body: fwdBody,
      })
      toast.success('Email forwarded!')
      setShowForwardBox(false)
      setFwdTo('')
      setFwdBody('')
      onRefresh?.()
    } catch {
      toast.error('Failed to forward')
    } finally {
      setSending(false)
    }
  }

  const handleAiSummarize = async () => {
    if (!email?.body) return
    setAiLoading(true)
    try {
      const res = await api.post('/ai/summarize', {
        contact_name: email.sender_name || email.sender_email,
        messages: [{
          type: 'email',
          content: `Subject: ${email.subject}\n\n${email.body}`,
          created_at: email.created_at,
        }]
      })
      setAiSummary(res.data)
    } catch {
      toast.error('AI summary failed')
    } finally {
      setAiLoading(false)
    }
  }

  // ── AI Reply — now uses the dedicated two-pass email endpoint ──────────────
  const handleAiReply = async () => {
    if (!email?.body) return
    setAiLoading(true)
    setAiChecklist(null)
    setAiWarnings([])
    try {
      const res = await api.post('/ai/generate-email-reply', {
        email_body: email.body,
        email_subject: email.subject || '',
        sender_name: email.sender_name || email.sender_email || 'the sender',
      })
      if (res.data.draft) {
        setReplyBody(res.data.draft)
        setShowReplyBox(true)
        setAiChecklist(res.data.checklist || [])
        setAiWarnings(res.data.warnings || [])
        if (res.data.warnings?.length > 0) {
          toast(
            `Draft ready — please double-check: ${res.data.warnings.join(', ')}`,
            { icon: '⚠️', duration: 6000 }
          )
        } else {
          toast.success(`Draft addresses all ${res.data.item_count} point${res.data.item_count !== 1 ? 's' : ''} raised`)
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'AI reply generation failed')
    } finally {
      setAiLoading(false)
    }
  }

  if (!emailId) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-700">
        <div className="text-center">
          <MailIcon className="w-16 h-16 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Select an email to read</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
      </div>
    )
  }

  if (!email) return null

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-950">
      {/* Email header */}
      <div className="flex-shrink-0 border-b border-gray-800 px-6 py-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button onClick={onBack} className="text-gray-500 hover:text-white transition-colors flex-shrink-0 lg:hidden">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-white font-semibold text-lg leading-snug">
              {email.subject || '(no subject)'}
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={handleStar}
              className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
              title={email.is_starred ? 'Unstar' : 'Star'}>
              <Star className={`w-4 h-4 ${email.is_starred ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500'}`} />
            </button>
            {folder !== 'trash' ? (
              <button onClick={() => handleMove('trash')}
                className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-red-400 transition-colors"
                title="Move to trash">
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={() => handleMove('inbox')}
                className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-violet-400 transition-colors"
                title="Move to inbox">
                <Inbox className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Sender info */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 bg-violet-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {email.sender_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white text-sm font-medium">{email.sender_name}</span>
              <span className="text-gray-500 text-xs">&lt;{email.sender_email}&gt;</span>
            </div>
            <div className="text-gray-500 text-xs mt-0.5">
              To: {email.recipient_email}
              {email.cc_emails && ` · CC: ${email.cc_emails}`}
            </div>
            <div className="text-gray-600 text-[10px] mt-0.5">{formatDateFull(email.created_at)}</div>
          </div>
        </div>

        {/* CRM Contact link */}
        {email.contact && (
          <div
            onClick={() => navigate(`/dashboard/contacts/${email.contact.id}`)}
            className="flex items-center gap-2 px-3 py-2 bg-violet-600/10 border border-violet-500/20 rounded-xl cursor-pointer hover:bg-violet-600/20 transition-colors w-fit"
          >
            <User className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-violet-300 text-xs font-medium">
              {email.contact.first_name} {email.contact.last_name}
            </span>
            {email.contact.company && (
              <>
                <span className="text-violet-500 text-xs">·</span>
                <Building2 className="w-3 h-3 text-violet-500" />
                <span className="text-violet-400/70 text-xs">{email.contact.company}</span>
              </>
            )}
            <ExternalLink className="w-3 h-3 text-violet-500" />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <button
            onClick={() => { setShowReplyBox(o => !o); setShowForwardBox(false) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              showReplyBox
                ? 'bg-violet-600/20 text-violet-300 border-violet-500/40'
                : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
            }`}
          >
            <Reply className="w-3.5 h-3.5" /> Reply
          </button>
          <button
            onClick={() => { setShowForwardBox(o => !o); setShowReplyBox(false) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              showForwardBox
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40'
                : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
            }`}
          >
            <Forward className="w-3.5 h-3.5" /> Forward
          </button>
          <button
            onClick={handleAiSummarize}
            disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-gray-800 text-gray-400 border-gray-700 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors disabled:opacity-40"
          >
            {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
            Summarize
          </button>
          <button
            onClick={handleAiReply}
            disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-gray-800 text-gray-400 border-gray-700 hover:text-violet-400 hover:border-violet-500/40 transition-colors disabled:opacity-40"
            title="Generates a full reply addressing every point raised in the email"
          >
            {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            AI Reply
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Thread (original email) */}
        {email.thread?.length > 0 && (
          <div className="mb-5 p-4 bg-gray-800/40 border border-gray-800 rounded-xl opacity-60">
            <p className="text-gray-500 text-xs mb-2">
              — Original message from {email.thread[0].sender_name} ({email.thread[0].sender_email}) —
            </p>
            <p className="text-gray-400 text-sm whitespace-pre-wrap leading-relaxed">
              {email.thread[0].body}
            </p>
          </div>
        )}

        {/* AI Summary */}
        <AnimatePresence>
          {aiSummary && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-5 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 text-xs font-semibold">AI Summary</span>
                <button onClick={() => setAiSummary(null)} className="ml-auto text-gray-500 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">{aiSummary.summary}</p>
              {aiSummary.suggested_tags?.length > 0 && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <Tag className="w-3 h-3 text-gray-500" />
                  <span className="text-gray-500 text-xs">Tags:</span>
                  {aiSummary.suggested_tags.map(t => (
                    <span key={t} className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email body */}
        <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
          {email.body}
        </div>
      </div>

      {/* Reply box */}
      <AnimatePresence>
        {showReplyBox && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-shrink-0 border-t border-gray-800 overflow-hidden"
          >
            <div className="px-6 py-4">
              <div className="text-xs text-gray-500 mb-2">
                Replying to <span className="text-violet-400">{email.sender_email}</span>
              </div>

              {/* AI checklist coverage indicator */}
              {aiChecklist && aiChecklist.length > 0 && (
                <div className="mb-3 p-3 bg-violet-500/5 border border-violet-500/15 rounded-xl">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-3 h-3 text-violet-400" />
                    <span className="text-violet-400 text-[10px] font-semibold uppercase tracking-wide">
                      AI addressed {aiChecklist.length} point{aiChecklist.length !== 1 ? 's' : ''} from this email
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {aiChecklist.map(item => {
                      const isWarned = aiWarnings.includes(item.request)
                      return (
                        <span
                          key={item.id}
                          className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                            isWarned
                              ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}
                          title={item.request}
                        >
                          {isWarned ? <AlertCircle className="w-2.5 h-2.5" /> : <Check className="w-2.5 h-2.5" />}
                          {item.request.length > 30 ? item.request.slice(0, 30) + '…' : item.request}
                        </span>
                      )
                    })}
                  </div>
                  {aiWarnings.length > 0 && (
                    <p className="text-yellow-400/80 text-[10px] mt-2 flex items-start gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      Please review — these points may need a manual check before sending.
                    </p>
                  )}
                </div>
              )}

              <textarea
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                placeholder="Write your reply..."
                rows={6}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none"
                autoFocus
              />
              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={handleAiReply}
                  disabled={aiLoading}
                  className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-40"
                >
                  {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {aiChecklist ? 'Regenerate with AI' : 'Generate with AI'}
                </button>
                <div className="flex gap-2">
                  <button onClick={() => { setShowReplyBox(false); setAiChecklist(null); setAiWarnings([]) }}
                    className="px-3 py-2 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg transition-colors">
                    Cancel
                  </button>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={handleReply} disabled={sending || !replyBody.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors">
                    {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    {sending ? 'Sending...' : 'Send Reply'}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forward box */}
      <AnimatePresence>
        {showForwardBox && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-shrink-0 border-t border-gray-800 overflow-hidden"
          >
            <div className="px-6 py-4">
              <div className="mb-3">
                <input
                  type="email"
                  value={fwdTo}
                  onChange={e => setFwdTo(e.target.value)}
                  placeholder="Forward to email..."
                  autoFocus
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
              <textarea
                value={fwdBody}
                onChange={e => setFwdBody(e.target.value)}
                placeholder="Add a message (optional)..."
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none"
              />
              <div className="flex gap-2 mt-3">
                <button onClick={() => setShowForwardBox(false)}
                  className="px-3 py-2 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg transition-colors">
                  Cancel
                </button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleForward} disabled={sending || !fwdTo.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors">
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Forward className="w-3.5 h-3.5" />}
                  {sending ? 'Forwarding...' : 'Forward'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Mail Page ─────────────────────────────────────────

export default function MailPage() {
  const [folder, setFolder] = useState('inbox')
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [folderCounts, setFolderCounts] = useState({ inbox: 0, sent: 0, drafts: 0, trash: 0, unread: 0 })
  const [selectedId, setSelectedId] = useState(null)
  const [showCompose, setShowCompose] = useState(false)
  const [searchRaw, setSearchRaw] = useState('')
  const [filterMode, setFilterMode] = useState('all')   // all | unread | starred
  const [currentUser, setCurrentUser] = useState(null)

  const search = useDebounce(searchRaw, 300)

  useEffect(() => {
    api.get('/auth/me').then(r => setCurrentUser(r.data)).catch(() => {})
  }, [])

  const fetchFolderCounts = useCallback(async () => {
    try {
      const res = await api.get('/mail/folder-counts')
      setFolderCounts(res.data)
    } catch {}
  }, [])

  const fetchEmails = useCallback(async (pageNum = 1, replace = true) => {
    if (pageNum === 1) setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('folder', folder)
      params.set('page', pageNum)
      params.set('page_size', '25')
      if (filterMode !== 'all') params.set('filter', filterMode)
      if (search.trim()) params.set('search', search.trim())

      const res = await api.get(`/mail/?${params}`)
      const data = res.data
      setTotal(data.total)
      setHasMore(data.has_more)
      setPage(pageNum)
      if (replace) setEmails(data.items)
      else setEmails(prev => [...prev, ...data.items])
    } catch {
      toast.error('Failed to load emails')
    } finally {
      setLoading(false)
    }
  }, [folder, filterMode, search])

  useEffect(() => {
    setSelectedId(null)
    setEmails([])
    fetchEmails(1, true)
    fetchFolderCounts()
  }, [folder, filterMode, search])

  const handleRefresh = () => {
    fetchEmails(1, true)
    fetchFolderCounts()
  }

  const handleStar = async (id) => {
    const res = await api.patch(`/mail/${id}/star`)
    setEmails(prev => prev.map(e => e.id === id ? { ...e, is_starred: res.data.is_starred } : e))
  }

  const handleToggleRead = async (id) => {
    const res = await api.patch(`/mail/${id}/read`)
    setEmails(prev => prev.map(e => e.id === id ? { ...e, is_read: res.data.is_read } : e))
    fetchFolderCounts()
  }

  const handleDelete = async (id) => {
    const email = emails.find(e => e.id === id)
    if (!email) return
    if (email.folder === 'trash') {
      if (!confirm('Permanently delete this email?')) return
      await api.delete(`/mail/${id}`)
      toast.success('Permanently deleted')
    } else {
      await api.patch(`/mail/${id}/move`, { folder: 'trash' })
      toast.success('Moved to trash')
    }
    setEmails(prev => prev.filter(e => e.id !== id))
    if (selectedId === id) setSelectedId(null)
    fetchFolderCounts()
  }

  const handleSelect = (id) => {
    setSelectedId(id)
    // Mark as read optimistically
    setEmails(prev => prev.map(e => e.id === id ? { ...e, is_read: true } : e))
    fetchFolderCounts()
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      {/* Left sidebar — folder nav */}
      <div className="w-52 flex-shrink-0 border-r border-gray-800 flex flex-col bg-gray-900/50">
        <div className="p-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCompose(true)}
            className="w-full flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Compose
          </motion.button>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {FOLDERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFolder(f.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors ${
                folder === f.id
                  ? 'bg-violet-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <f.icon className="w-4 h-4" />
                {f.label}
              </div>
              {f.id === 'inbox' && folderCounts.unread > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  folder === f.id ? 'bg-white/20 text-white' : 'bg-violet-500/20 text-violet-300'
                }`}>
                  {folderCounts.unread}
                </span>
              )}
              {f.id !== 'inbox' && folderCounts[f.id] > 0 && (
                <span className="text-[10px] text-gray-600">{folderCounts[f.id]}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Filter chips */}
        <div className="px-3 pb-4 space-y-1">
          <p className="text-gray-600 text-[10px] uppercase tracking-wider px-3 mb-2">Filter</p>
          {[
            { id: 'all', label: 'All Mail' },
            { id: 'unread', label: 'Unread' },
            { id: 'starred', label: 'Starred' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilterMode(f.id)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors ${
                filterMode === f.id ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Email list column */}
      <div className={`flex-shrink-0 border-r border-gray-800 flex flex-col bg-gray-950 ${
        selectedId ? 'w-72' : 'flex-1'
      }`}>
        {/* List header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-white font-semibold capitalize">{folder}</h2>
              {total > 0 && <p className="text-gray-500 text-xs">{total} emails</p>}
            </div>
            <button onClick={handleRefresh} className="text-gray-500 hover:text-white transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={searchRaw}
              onChange={e => setSearchRaw(e.target.value)}
              placeholder="Search emails..."
              className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-violet-500 transition-colors"
            />
            {searchRaw && (
              <button onClick={() => setSearchRaw('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Email list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-16">
              <MailIcon className="w-10 h-10 mx-auto mb-3 text-gray-700" />
              <p className="text-gray-500 text-sm">
                {searchRaw ? 'No emails match' : `${folder.charAt(0).toUpperCase() + folder.slice(1)} is empty`}
              </p>
            </div>
          ) : (
            <>
              <AnimatePresence>
                {emails.map(email => (
                  <EmailListItem
                    key={email.id}
                    email={email}
                    selected={selectedId === email.id}
                    onSelect={() => handleSelect(email.id)}
                    folder={folder}
                    onStar={handleStar}
                    onDelete={handleDelete}
                    onToggleRead={handleToggleRead}
                  />
                ))}
              </AnimatePresence>
              {hasMore && (
                <div className="flex justify-center py-4">
                  <button onClick={() => fetchEmails(page + 1, false)}
                    className="text-xs text-gray-500 hover:text-violet-400 transition-colors">
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Email detail */}
      {selectedId && (
        <EmailDetail
          emailId={selectedId}
          folder={folder}
          onBack={() => setSelectedId(null)}
          onRefresh={handleRefresh}
        />
      )}

      {/* Compose modal */}
      <AnimatePresence>
        {showCompose && (
          <ComposeModal
            currentUser={currentUser}
            onClose={() => setShowCompose(false)}
            onSent={handleRefresh}
          />
        )}
      </AnimatePresence>
    </div>
  )
}