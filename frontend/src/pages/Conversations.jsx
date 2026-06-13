import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Send, Loader2, MessageSquare, PhoneCall, Mail,
  Users as UsersIcon, MessageCircle, Phone as PhoneIcon, ChevronLeft
} from 'lucide-react'
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

const SEND_CHANNELS = ['note', 'call', 'meeting', 'email', 'sms', 'whatsapp']

function TimeAgo({ dateString }) {
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
  const [conversations, setConversations] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [search, setSearch] = useState('')

  const [selected, setSelected] = useState(null)
  const [thread, setThread] = useState(null)
  const [loadingThread, setLoadingThread] = useState(false)

  const [channel, setChannel] = useState('note')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  const threadEndRef = useRef(null)

  useEffect(() => { fetchConversations() }, [])

  useEffect(() => {
    if (selected) fetchThread(selected.id)
  }, [selected])

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread])

  const fetchConversations = async () => {
    try {
      const res = await api.get('/conversations/')
      setConversations(res.data)
      if (!selected && res.data.length > 0) {
        setSelected(res.data[0].contact)
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
    } catch (err) {
      toast.error('Failed to load conversation')
    } finally {
      setLoadingThread(false)
    }
  }

  const handleSend = async () => {
    if (!selected || !content.trim()) return
    setSending(true)
    try {
      const payload = { channel, content: content.trim() }
      if (channel === 'email' && subject.trim()) payload.subject = subject.trim()

      const res = await api.post(`/conversations/${selected.id}/send`, payload)
      setThread(prev => ({ ...prev, messages: [...(prev?.messages || []), res.data.message] }))
      setContent('')
      setSubject('')

      // update list preview
      setConversations(prev => {
        const updated = prev.map(c => c.contact.id === selected.id
          ? {
              ...c,
              last_message_type: res.data.message.type,
              last_message_preview: res.data.message.content.slice(0, 120),
              last_message_at: res.data.message.created_at,
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

  const filtered = conversations.filter(c => {
    const c_ = c.contact
    const q = search.toLowerCase()
    return `${c_.first_name} ${c_.last_name} ${c_.email} ${c_.company} ${c_.phone}`.toLowerCase().includes(q)
  })

  const channelAvailable = (ch) => {
    if (!selected) return false
    if (ch === 'email') return !!selected.email
    if (ch === 'sms' || ch === 'whatsapp') return !!selected.phone
    return true
  }

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
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-800/60 transition-colors flex items-center gap-3 ${
                    isActive ? 'bg-gray-800' : 'hover:bg-gray-800/50'
                  }`}
                >
                  <div className="w-9 h-9 bg-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {c.first_name?.[0]}{c.last_name?.[0] || ''}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-white text-sm font-medium truncate">{c.first_name} {c.last_name}</p>
                      {item.last_message_at && (
                        <span className="text-gray-600 text-[10px] flex-shrink-0"><TimeAgo dateString={item.last_message_at} /></span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {item.last_message_type && <ChannelBadge type={item.last_message_type} />}
                      <p className="text-gray-500 text-xs truncate">
                        {item.last_message_preview || 'No messages yet'}
                      </p>
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
            <div className="p-4 border-b border-gray-800 flex items-center gap-3">
              <button onClick={() => setSelected(null)} className="lg:hidden text-gray-500 hover:text-white">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="w-9 h-9 bg-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {selected.first_name?.[0]}{selected.last_name?.[0] || ''}
              </div>
              <div className="min-w-0">
                <p className="text-white font-medium text-sm truncate">{selected.first_name} {selected.last_name}</p>
                <p className="text-gray-500 text-xs truncate">
                  {[selected.email, selected.phone, selected.company].filter(Boolean).join(' · ') || 'No contact details'}
                </p>
              </div>
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
                            {!isInbound && <ChannelBadge type={msg.type} />}
                            <span className="text-gray-600 text-[10px]">
                              <TimeAgo dateString={msg.created_at} />
                            </span>
                          </div>
                          <div className={`rounded-2xl px-4 py-2.5 border ${
                            isInbound
                              ? `${config.bg} ${config.border} rounded-tl-sm`
                              : `${config.bg} ${config.border} rounded-tr-sm`
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