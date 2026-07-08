import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Send, Loader2, MessageSquare, PhoneCall, Mail,
  Users as UsersIcon, MessageCircle, Phone as PhoneIcon,
  ChevronLeft, Sparkles, X, CheckCircle2, FileText, Tag,
  ChevronDown, ChevronUp, Check
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'

const CHANNEL_CONFIG = {
  note:     { icon: MessageSquare, color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/30',  label: 'Note' },
  call:     { icon: PhoneCall,     color: 'text-green-400',   bg: 'bg-green-500/10',   border: 'border-green-500/30',   label: 'Call' },
  email:    { icon: Mail,          color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    label: 'Email' },
  meeting:  { icon: UsersIcon,     color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  label: 'Meeting' },
  sms:      { icon: PhoneIcon,     color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30',    label: 'SMS' },
  whatsapp: { icon: MessageCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'WhatsApp' },
}

const SENTIMENT_CONFIG = {
  positive: { label: 'Positive', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  neutral:  { label: 'Neutral',  color: 'text-gray-400',  bg: 'bg-gray-500/10',  border: 'border-gray-500/30' },
  negative: { label: 'Negative', color: 'text-red-400',   bg: 'bg-red-500/10',   border: 'border-red-500/30' },
}

function SentimentBadge({ sentiment }) {
  if (!sentiment) return null
  const cfg = SENTIMENT_CONFIG[sentiment] || SENTIMENT_CONFIG.neutral
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border} font-medium`}>
      {cfg.label}
    </span>
  )
}

const SEND_CHANNELS = ['note', 'call', 'meeting', 'email', 'sms', 'whatsapp']

function TimeAgo({ dateString }) {
  if (!dateString) return null
  const date = new Date(dateString)
  const diff = Math.floor((Date.now() - date) / 1000)
  if (diff < 60) return <span>{diff}s</span>
  if (diff < 3600) return <span>{Math.floor(diff / 60)}m</span>
  if (diff < 86400) return <span>{Math.floor(diff / 3600)}h</span>
  if (diff < 604800) return <span>{Math.floor(diff / 86400)}d</span>
  return <span>{date.toLocaleDateString()}</span>
}

function ChannelBadge({ type, size = 'sm' }) {
  const config = CHANNEL_CONFIG[type] || CHANNEL_CONFIG.note
  const Icon = config.icon
  const dim = size === 'sm' ? 'w-5 h-5' : 'w-8 h-8'
  const iconDim = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'
  return (
    <div className={`${dim} rounded-full ${config.bg} border ${config.border} flex items-center justify-center flex-shrink-0`}>
      <Icon className={`${iconDim} ${config.color}`} />
    </div>
  )
}

export default function Conversations() {
  const navigate = useNavigate()

  const [conversations, setConversations]   = useState([])
  const [loadingList, setLoadingList]       = useState(true)
  const [search, setSearch]                 = useState('')

  const [selected, setSelected]             = useState(null)
  const [thread, setThread]                 = useState(null)
  const [loadingThread, setLoadingThread]   = useState(false)

  const [channel, setChannel]               = useState('note')
  const [subject, setSubject]               = useState('')
  const [content, setContent]               = useState('')
  const [sending, setSending]               = useState(false)

  // AI smart reply state
  const [aiSuggestions, setAiSuggestions]         = useState([])
  const [aiLoading, setAiLoading]                 = useState(false)
  const [aiSuggestionsFor, setAiSuggestionsFor]   = useState(null)

  // AI summary + tagging state
  const [summaryOpen, setSummaryOpen]             = useState(false)
  const [summaryLoading, setSummaryLoading]       = useState(false)
  const [summaryData, setSummaryData]             = useState(null)   // { summary, suggested_tags }
  const [summaryFor, setSummaryFor]               = useState(null)   // contact id
  const [pendingTags, setPendingTags]             = useState([])     // tags agent hasn't accepted/rejected yet
  const [acceptedTags, setAcceptedTags]           = useState([])     // tags agent approved
  const [rejectedTags, setRejectedTags]           = useState([])     // tags agent dismissed
  const [savingTags, setSavingTags]               = useState(false)

  // unreadMap: contactId -> true
  const [unreadMap, setUnreadMap]           = useState({})

  const threadEndRef      = useRef(null)
  const selectedRef       = useRef(null)
  const conversationsRef  = useRef([])
  const threadRef         = useRef(null)
  const lastPreviewRef    = useRef({})

  useEffect(() => { selectedRef.current = selected }, [selected])
  useEffect(() => { conversationsRef.current = conversations }, [conversations])
  useEffect(() => { threadRef.current = thread }, [thread])

  useEffect(() => { fetchConversations() }, [])

  useEffect(() => {
    if (selected) fetchThread(selected.id)
    // Clear AI state on contact switch
    setAiSuggestions([])
    setAiSuggestionsFor(null)
    setSummaryOpen(false)
    setSummaryData(null)
    setSummaryFor(null)
    setPendingTags([])
    setAcceptedTags([])
    setRejectedTags([])
  }, [selected])

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread])

  // Poll active thread every 5 seconds
  const notifiedMessageIdsRef = useRef(new Set())

  useEffect(() => {
    const interval = setInterval(async () => {
      const currentSelected = selectedRef.current
      if (!currentSelected) return
      try {
        const res = await api.get(`/conversations/${currentSelected.id}`)
        const newThread = res.data
        const oldMessages = threadRef.current?.messages || []
        const newMessages = newThread?.messages || []

        if (newMessages.length > oldMessages.length) {
          const added = newMessages.slice(oldMessages.length)
          added.forEach(msg => {
            if (
              msg.content.startsWith('[Inbound]') &&
              !notifiedMessageIdsRef.current.has(msg.id)
            ) {
              notifiedMessageIdsRef.current.add(msg.id)
              const label = CHANNEL_CONFIG[msg.type]?.label || msg.type
              toast(`↙ New ${label} from ${currentSelected.first_name}`, {
                icon: '💬',
                duration: 5000,
              })
            }
          })
        }
        setThread(newThread)
      } catch {
        // silent fail
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Poll conversation list every 8 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get('/conversations/')
        const newConvos = res.data

        const newUnread = {}
        newConvos.forEach(item => {
          const contactId = item.contact?.id
          if (!contactId) return
          const preview = item.last_message_preview ?? null
          const prevPreview = lastPreviewRef.current[contactId]
          if (preview && preview !== prevPreview) {
            lastPreviewRef.current[contactId] = preview
            const isInbound = preview.startsWith('[Inbound]')
            const isCurrentChat = selectedRef.current?.id === contactId
            if (isInbound && !isCurrentChat) {
              newUnread[contactId] = true
            }
          }
        })

        if (Object.keys(newUnread).length > 0) {
          setUnreadMap(prev => ({ ...prev, ...newUnread }))
        }
        setConversations(newConvos)
      } catch {
        // silent fail
      }
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  // Esc key — deselect current conversation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedRef.current) {
        setSelected(null)
        setAiSuggestions([])
        setAiSuggestionsFor(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const fetchConversations = async () => {
    try {
      const res = await api.get('/conversations/')
      const convos = res.data
      setConversations(convos)
      convos.forEach(item => {
        const contactId = item.contact?.id
        if (contactId) {
          lastPreviewRef.current[contactId] = item.last_message_preview ?? null
        }
      })
      if (!selectedRef.current && convos.length > 0) {
        setSelected(convos[0].contact)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingList(false)
    }
  }

  const fetchThread = async (contactId) => {
    setLoadingThread(true)
    try {
      const res = await api.get(`/conversations/${contactId}`)
      setThread(res.data)
    } catch {
      toast.error('Failed to load conversation')
    } finally {
      setLoadingThread(false)
    }
  }

  const handleSelectContact = (contact) => {
    setSelected(contact)
    setUnreadMap(prev => {
      const next = { ...prev }
      delete next[contact.id]
      return next
    })
  }

  // ── AI Smart Reply ──────────────────────────────────────────────────────────

  const handleAiReply = async () => {
    if (!selected || !thread?.messages?.length) return
    const contactId = selected.id
    setAiLoading(true)
    setAiSuggestions([])
    setAiSuggestionsFor(null)
    try {
      const res = await api.post('/ai/suggest-reply', {
        contact_name: `${selected.first_name} ${selected.last_name || ''}`.trim(),
        messages: thread.messages.map(m => ({
          type: m.type,
          content: m.content,
          created_at: m.created_at,
        }))
      })
      if (selectedRef.current?.id === contactId) {
        setAiSuggestions(res.data.suggestions || [])
        setAiSuggestionsFor(contactId)
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'AI suggestion failed')
    } finally {
      setAiLoading(false)
    }
  }

  const handlePickSuggestion = (suggestion) => {
    setContent(suggestion)
    setAiSuggestions([])
    setAiSuggestionsFor(null)
    if (channel === 'note' || channel === 'call' || channel === 'meeting') {
      const messages = thread?.messages || []
      const lastInbound = [...messages].reverse().find(m => m.content.startsWith('[Inbound]'))
      if (lastInbound?.type === 'whatsapp' && selected?.phone) {
        setChannel('whatsapp')
      } else if (selected?.phone) {
        setChannel('sms')
      }
    }
  }

  // ── AI Summarize ────────────────────────────────────────────────────────────

  const handleSummarize = async () => {
    if (!selected || !thread?.messages?.length) return
    const contactId = selected.id

    // If summary already loaded for this contact, just toggle panel
    if (summaryFor === contactId && summaryData) {
      setSummaryOpen(prev => !prev)
      return
    }

    setSummaryLoading(true)
    setSummaryOpen(true)
    setSummaryData(null)
    setPendingTags([])
    setAcceptedTags([])
    setRejectedTags([])

    try {
      const res = await api.post('/ai/summarize', {
        contact_name: `${selected.first_name} ${selected.last_name || ''}`.trim(),
        messages: thread.messages.map(m => ({
          type: m.type,
          content: m.content,
          created_at: m.created_at,
        }))
      })
      if (selectedRef.current?.id === contactId) {
        setSummaryData(res.data)
        setSummaryFor(contactId)
        setPendingTags(res.data.suggested_tags || [])
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Summary failed')
      setSummaryOpen(false)
    } finally {
      setSummaryLoading(false)
    }
  }

  const handleAcceptTag = (tag) => {
    setPendingTags(prev => prev.filter(t => t !== tag))
    setAcceptedTags(prev => [...prev, tag])
  }

  const handleRejectTag = (tag) => {
    setPendingTags(prev => prev.filter(t => t !== tag))
    setRejectedTags(prev => [...prev, tag])
  }

  const handleUndoTag = (tag) => {
    setAcceptedTags(prev => prev.filter(t => t !== tag))
    setRejectedTags(prev => prev.filter(t => t !== tag))
    setPendingTags(prev => [...prev, tag])
  }

  const handleSaveTags = async () => {
    if (!acceptedTags.length || !selected) return
    setSavingTags(true)
    try {
      for (const tagName of acceptedTags) {
        // Create the tag
        const tagRes = await api.post('/tags/', { name: tagName })
        const tagId = tagRes.data.id
        // Assign it to the contact
        await api.post(`/tags/contacts/${selected.id}/add/${tagId}`)
      }
      toast.success(`${acceptedTags.length} tag${acceptedTags.length > 1 ? 's' : ''} saved!`)
      setAcceptedTags([])
    } catch (err) {
      toast.error('Failed to save tags')
    } finally {
      setSavingTags(false)
    }
  }

  // ── Send message ────────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!selected || !content.trim()) return
    setSending(true)
    try {
      const payload = { channel, content: content.trim() }
      if (channel === 'email' && subject.trim()) payload.subject = subject.trim()

      const res = await api.post(`/conversations/${selected.id}/send`, payload)
      const newMessage = res.data.message

      setThread(prev => ({ ...prev, messages: [...(prev?.messages || []), newMessage] }))
      setContent('')
      setSubject('')
      setAiSuggestions([])
      setAiSuggestionsFor(null)

      const outboundPreview = newMessage.content?.slice(0, 120) ?? ''
      lastPreviewRef.current[selected.id] = outboundPreview

      setConversations(prev => {
        const updated = prev.map(c => c.contact.id === selected.id
          ? {
              ...c,
              last_message_preview: outboundPreview,
              last_message_type: newMessage.type,
              last_message_at: newMessage.created_at,
            }
          : c)
        return updated.sort((a, b) => {
          const ta = a.last_message_at ? new Date(a.last_message_at) : 0
          const tb = b.last_message_at ? new Date(b.last_message_at) : 0
          return tb - ta
        })
      })

      toast.success(channel === 'note' || channel === 'call' || channel === 'meeting' ? 'Logged!' : 'Message sent!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const filtered = conversations.filter(c => {
    const c_ = c.contact
    const q = search.toLowerCase()
    return `${c_.first_name} ${c_.last_name} ${c_.email || ''} ${c_.company || ''} ${c_.phone || ''}`.toLowerCase().includes(q)
  })

  const channelAvailable = (ch) => {
    if (!selected) return false
    if (ch === 'email') return !!selected.email
    if (ch === 'sms' || ch === 'whatsapp') return !!selected.phone
    return true
  }

  const getPreview = (raw) => {
    if (!raw) return null
    return raw.replace(/^\[Inbound\]\s*/i, '').slice(0, 60) || null
  }

  const visibleSuggestions = aiSuggestionsFor === selected?.id ? aiSuggestions : []

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex">
      {/* LEFT — Conversation list */}
      <div className="w-80 flex-shrink-0 border-r border-gray-800 flex flex-col bg-gray-950">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-white font-bold text-lg mb-3">Conversations</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-700" />
              <p className="text-gray-500 text-sm">No conversations found</p>
            </div>
          ) : (
            filtered.map(item => {
              const c = item.contact
              const isActive = selected?.id === c.id
              const isUnread = !!unreadMap[c.id]
              const rawPreview = item.last_message_preview
              const preview = getPreview(rawPreview)
              const msgType = item.last_message_type
              const msgAt = item.last_message_at
              const isInbound = rawPreview?.startsWith('[Inbound]')
              const actConfig = msgType ? (CHANNEL_CONFIG[msgType] || CHANNEL_CONFIG.note) : null

              return (
                <button
                  key={c.id}
                  onClick={() => handleSelectContact(c)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-800/60 transition-colors flex items-center gap-3 ${
                    isActive ? 'bg-gray-800' : 'hover:bg-gray-800/50'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                      isActive ? 'bg-violet-500' : 'bg-violet-600'
                    }`}>
                      {c.first_name?.[0]}{c.last_name?.[0] || ''}
                    </div>
                    {isUnread && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-violet-500 border-2 border-gray-950 rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-medium truncate ${isUnread ? 'text-white' : 'text-gray-200'}`}>
                        {c.first_name} {c.last_name}
                      </p>
                      {msgAt && (
                        <span className="text-gray-600 text-[10px] flex-shrink-0">
                          <TimeAgo dateString={msgAt} />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                      {actConfig && (
                        <div className="flex-shrink-0">
                          <actConfig.icon className={`w-3 h-3 ${actConfig.color}`} />
                        </div>
                      )}
                      {preview ? (
                        <p className={`text-xs truncate ${isUnread ? 'text-gray-300 font-medium' : 'text-gray-500'}`}>
                          {isInbound ? '' : '↗ '}{preview}
                        </p>
                      ) : (
                        <p className="text-gray-600 text-xs italic">No messages yet</p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* RIGHT — Thread */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-950">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-gray-600">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Select a conversation to get started</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-gray-800">
              <div className="p-4 flex items-center gap-3">
                <button onClick={() => setSelected(null)} className="lg:hidden text-gray-500 hover:text-white">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigate(`/dashboard/contacts/${selected.id}`)}
                  className="flex items-center gap-3 min-w-0 text-left group flex-1"
                  title="View contact details"
                >
                  <div className="w-9 h-9 bg-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 group-hover:ring-2 group-hover:ring-violet-400/50 transition-all">
                    {selected.first_name?.[0]}{selected.last_name?.[0] || ''}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-medium text-sm truncate group-hover:text-violet-300 transition-colors">
                      {selected.first_name} {selected.last_name}
                    </p>
                    <p className="text-gray-500 text-xs truncate">
                      {[selected.email, selected.phone, selected.company].filter(Boolean).join(' · ') || 'No contact details'}
                    </p>
                  </div>
                </button>

                {/* Summarize button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSummarize}
                  disabled={summaryLoading || !thread?.messages?.length}
                  title={!thread?.messages?.length ? 'No messages to summarize' : 'AI summary & tag suggestions'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex-shrink-0 ${
                    summaryOpen
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:border-gray-600'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {summaryLoading
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <FileText className="w-3.5 h-3.5" />
                  }
                  {summaryLoading ? 'Summarizing...' : summaryOpen ? 'Hide Summary' : 'Summarize'}
                  {!summaryLoading && (summaryOpen
                    ? <ChevronUp className="w-3 h-3" />
                    : <ChevronDown className="w-3 h-3" />
                  )}
                </motion.button>
              </div>

              {/* Summary Panel */}
              <AnimatePresence>
                {summaryOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 border-t border-gray-800/60">
                      {summaryLoading ? (
                        <div className="flex items-center gap-2 py-3 text-gray-500 text-sm">
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                          Generating summary and tag suggestions...
                        </div>
                      ) : summaryData ? (
                        <div className="pt-3 space-y-3">
                          {/* Summary text */}
                          <div className="flex gap-2">
                            <FileText className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <p className="text-gray-300 text-sm leading-relaxed">{summaryData.summary}</p>
                          </div>

                          {/* Tag review */}
                          {(pendingTags.length > 0 || acceptedTags.length > 0 || rejectedTags.length > 0) && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5">
                                <Tag className="w-3 h-3 text-gray-500" />
                                <span className="text-xs text-gray-500 font-medium">Suggested tags — accept or dismiss each:</span>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {/* Pending tags — awaiting decision */}
                                {pendingTags.map(tag => (
                                  <div key={tag} className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-full pl-3 pr-1 py-1">
                                    <span className="text-xs text-gray-300">{tag}</span>
                                    <button
                                      onClick={() => handleAcceptTag(tag)}
                                      className="w-5 h-5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/40 flex items-center justify-center transition-colors"
                                      title="Accept tag"
                                    >
                                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                                    </button>
                                    <button
                                      onClick={() => handleRejectTag(tag)}
                                      className="w-5 h-5 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center transition-colors"
                                      title="Dismiss tag"
                                    >
                                      <X className="w-2.5 h-2.5 text-red-400" />
                                    </button>
                                  </div>
                                ))}

                                {/* Accepted tags */}
                                {acceptedTags.map(tag => (
                                  <button
                                    key={tag}
                                    onClick={() => handleUndoTag(tag)}
                                    title="Click to undo"
                                    className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-full px-3 py-1 text-xs hover:bg-emerald-500/10 transition-colors"
                                  >
                                    <Check className="w-2.5 h-2.5" />
                                    {tag}
                                  </button>
                                ))}

                                {/* Rejected tags — faded, click to undo */}
                                {rejectedTags.map(tag => (
                                  <button
                                    key={tag}
                                    onClick={() => handleUndoTag(tag)}
                                    title="Click to undo"
                                    className="flex items-center gap-1 bg-gray-800/40 border border-gray-700/40 text-gray-600 rounded-full px-3 py-1 text-xs line-through hover:text-gray-400 transition-colors"
                                  >
                                    {tag}
                                  </button>
                                ))}
                              </div>

                              {/* Save accepted tags button */}
                              {acceptedTags.length > 0 && (
                                <motion.button
                                  initial={{ opacity: 0, y: 4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  whileTap={{ scale: 0.97 }}
                                  onClick={handleSaveTags}
                                  disabled={savingTags}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                                >
                                  {savingTags
                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : <Tag className="w-3 h-3" />
                                  }
                                  {savingTags ? 'Saving...' : `Save ${acceptedTags.length} tag${acceptedTags.length > 1 ? 's' : ''} to contact`}
                                </motion.button>
                              )}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Thread messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingThread ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
                </div>
              ) : !thread?.messages?.length ? (
                <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                  No messages yet — say hello below
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {thread.messages.map(msg => {
                    const config = CHANNEL_CONFIG[msg.type] || CHANNEL_CONFIG.note
                    const isInbound = msg.content.startsWith('[Inbound]')
                    const displayContent = isInbound
                      ? msg.content.replace(/^\[Inbound\]\s*/, '')
                      : msg.content

                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}
                      >
                        <div className="max-w-[70%]">
                          <div className={`flex items-center gap-2 mb-1 ${isInbound ? '' : 'justify-end'}`}>
                            {isInbound && <ChannelBadge type={msg.type} />}
                            <span className={`text-[10px] font-semibold uppercase tracking-wide ${config.color}`}>
                              {isInbound ? `↙ ${config.label}` : config.label}
                            </span>
                            {isInbound && <SentimentBadge sentiment={msg.sentiment} />}
                            {!isInbound && <ChannelBadge type={msg.type} />}
                            <span className="text-gray-600 text-[10px]">
                              <TimeAgo dateString={msg.created_at} />
                            </span>
                          </div>
                          <div className={`rounded-2xl px-4 py-2.5 border ${config.bg} ${config.border} ${
                            isInbound ? 'rounded-tl-sm' : 'rounded-tr-sm'
                          }`}>
                            <p className="text-gray-200 text-sm whitespace-pre-wrap">{displayContent}</p>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              )}
              <div ref={threadEndRef} />
            </div>

            {/* Composer */}
            <div className="border-t border-gray-800 p-4">
              {/* Channel selector */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                {SEND_CHANNELS.map(ch => {
                  const config = CHANNEL_CONFIG[ch]
                  const Icon = config.icon
                  const isActive = channel === ch
                  const available = channelAvailable(ch)
                  return (
                    <button
                      key={ch}
                      disabled={!available}
                      onClick={() => setChannel(ch)}
                      title={!available ? `Contact has no ${ch === 'email' ? 'email' : 'phone number'}` : ''}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? `${config.bg} ${config.color} border ${config.border}`
                          : 'bg-gray-800 text-gray-500 border border-transparent hover:border-gray-700 hover:text-gray-300'
                      } ${!available ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </button>
                  )
                })}
              </div>

              {/* AI Suggestion chips */}
              <AnimatePresence>
                {visibleSuggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="mb-3 max-h-48 overflow-y-auto"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                      <span className="text-xs text-violet-400 font-medium">AI suggestions — click to use</span>
                      <button
                        onClick={() => { setAiSuggestions([]); setAiSuggestionsFor(null) }}
                        className="ml-auto flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-0.5 rounded-md hover:bg-gray-800"
                      >
                        <X className="w-3 h-3" />
                        Dismiss
                      </button>
                    </div>
                    <div className="flex flex-col gap-2">
                      {visibleSuggestions.map((suggestion, idx) => (
                        <motion.button
                          key={idx}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.07 }}
                          onClick={() => handlePickSuggestion(suggestion)}
                          className="group text-left text-sm text-gray-300 bg-violet-500/10 border border-violet-500/25 hover:border-violet-500/50 hover:bg-violet-500/20 rounded-xl px-4 py-2.5 transition-all flex items-start gap-2"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-violet-500/40 group-hover:text-violet-400 transition-colors mt-0.5 flex-shrink-0" />
                          <span>{suggestion}</span>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {channel === 'email' && (
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Subject..."
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm mb-2 focus:outline-none focus:border-violet-500 transition-colors"
                />
              )}

              <div className="flex items-end gap-2">
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend()
                  }}
                  placeholder={
                    channel === 'note' ? 'Write a note... (Ctrl+Enter to save)' :
                    channel === 'call' ? 'Log call notes... (Ctrl+Enter to save)' :
                    channel === 'meeting' ? 'Log meeting notes... (Ctrl+Enter to save)' :
                    `Write a ${CHANNEL_CONFIG[channel].label} message... (Ctrl+Enter to send)`
                  }
                  rows={2}
                  className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none placeholder-gray-600"
                />

                {/* AI Reply button */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAiReply}
                    disabled={aiLoading || !thread?.messages?.length}
                    title={!thread?.messages?.length ? 'No messages yet to generate suggestions from' : 'Get AI reply suggestions'}
                    className="flex items-center justify-center bg-violet-900/60 hover:bg-violet-800/80 disabled:opacity-40 disabled:cursor-not-allowed text-violet-300 w-11 h-11 rounded-xl transition-colors border border-violet-700/50"
                  >
                    {aiLoading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Sparkles className="w-4 h-4" />
                    }
                  </motion.button>
                  {aiLoading && (
                    <span className="text-[9px] text-violet-400/70 whitespace-nowrap">Thinking...</span>
                  )}
                </div>

                {/* Send button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={sending || !content.trim() || !channelAvailable(channel)}
                  className="flex items-center justify-center bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white w-11 h-11 rounded-xl transition-colors flex-shrink-0"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </motion.button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}