import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Sparkles, ArrowUpRight, MessageCircle } from 'lucide-react'
import api from '../services/api'

function genSessionId() {
  return 'sess-' + Math.random().toString(36).slice(2) + Date.now()
}

const GREETING = "Good day. This is Zahra from Setup in Oman. How may I help you with your company setup in the Sultanate of Oman?"

const QUICK_REPLIES = [
  'How much does it cost?',
  'Can a foreigner own 100 percent?',
  'How long does the process take?',
  'What documents do you need?',
  'Talk to a consultant',
]

const WHATSAPP_NUMBER_DISPLAY = '+968 9596 3381'
const WHATSAPP_LINK = 'https://wa.me/96895963381'

// Natural reply pacing — short replies land in 3-8s, long ones (>280 chars)
// take 12-15s, so Zahra feels like she's composing rather than firing back
// a canned instant response.
const LONG_REPLY_CHARS = 280
function replyDelayMs(replyText) {
  const isLong = (replyText || '').length > LONG_REPLY_CHARS
  const min = isLong ? 12000 : 3000
  const max = isLong ? 15000 : 8000
  return min + Math.random() * (max - min)
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-violet-400"
          animate={{ y: [0, -3, 0], opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

// Same avatar language used across the CRM (Contacts, Deals, NotificationBell):
// a violet gradient circle with an initial. The subtle rotating sheen + glow
// ring is the one deliberate "premium" flourish — same technique as the
// spinning logomark on the Login page — kept singular rather than scattered.
function ZahraAvatar({ size = 'md' }) {
  const dims = size === 'lg' ? 'w-11 h-11 text-base' : 'w-9 h-9 text-sm'
  return (
    <div className={`relative ${dims} flex-shrink-0`}>
      <motion.div
        aria-hidden="true"
        className="absolute -inset-1 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 opacity-40 blur-md"
        animate={{ opacity: [0.25, 0.5, 0.25] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className={`relative ${dims} rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center overflow-hidden shadow-[0_4px_16px_rgba(124,58,237,0.45)]`}>
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 opacity-40"
          style={{ background: 'conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.5) 8%, transparent 20%)' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        />
        <span className="relative text-white font-bold">Z</span>
      </div>
      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-gray-900" />
    </div>
  )
}

export default function ZahraChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([]) // {role, content}
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showChips, setShowChips] = useState(true)
  const sessionIdRef = useRef(genSessionId())
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending, open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 250)
  }, [open])

  const dispatch = async (text) => {
    if (!text || sending) return
    const nextMessages = [...messages, { role: 'user', content: text }]
    setMessages(nextMessages)
    setInput('')
    setShowChips(false)
    setSending(true)

    const startedAt = Date.now()
    let reply

    try {
      const res = await api.post('/website-chat/message', {
        session_id: sessionIdRef.current,
        messages: nextMessages,
      })
      reply = res.data.reply
    } catch {
      reply = `I am sorry, something went wrong on my side. Please try again, or WhatsApp us at ${WHATSAPP_NUMBER_DISPLAY} and our team will help you right away.`
    }

    // Hold the typing indicator until the natural pause has elapsed — if the
    // network was already slower than the target, this is a no-op.
    const target = replyDelayMs(reply)
    const remaining = Math.max(0, target - (Date.now() - startedAt))

    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      setSending(false)
    }, remaining)
  }

  const handleSend = () => dispatch(input.trim())

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Floating launcher — same gradient + shadow language as the app's
          auth logomark and primary buttons */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        onClick={() => setOpen(o => !o)}
        title={open ? 'Close chat' : 'Chat with Zahra'}
        className="fixed bottom-6 right-6 z-[999] w-[60px] h-[60px] rounded-2xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-600 shadow-[0_10px_30px_-6px_rgba(124,58,237,0.55)] border border-white/10"
      >
        {!open && (
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-2xl border border-violet-400/50"
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 rounded-2xl opacity-40"
          style={{ background: 'conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.35) 8%, transparent 20%)' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        />
        <span className="relative z-10">
          <AnimatePresence mode="wait" initial={false}>
            {open ? (
              <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }} className="flex">
                <X className="w-5 h-5 text-white" strokeWidth={2} />
              </motion.span>
            ) : (
              <motion.span key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }} className="flex">
                <MessageCircle className="w-5 h-5 text-white" strokeWidth={2} fill="rgba(255,255,255,0.15)" />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-[92px] right-6 z-[998] w-[400px] max-w-[92vw] h-[620px] max-h-[78vh] rounded-2xl border border-gray-800 bg-gray-900/95 backdrop-blur-xl shadow-2xl shadow-black/60 flex flex-col overflow-hidden"
            role="region"
            aria-label="Chat with Zahra, Setup in Oman"
          >
            {/* ambient dot-grid, same texture as the auth background */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none opacity-60"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(139,92,246,0.08) 1px, transparent 0)',
                backgroundSize: '28px 28px',
              }}
            />

            {/* Header */}
            <div className="relative z-10 flex items-center gap-3 px-5 py-4 border-b border-gray-800 bg-gradient-to-b from-violet-500/[0.06] to-transparent flex-shrink-0">
              <ZahraAvatar size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-semibold tracking-tight leading-tight">Zahra</p>
                <p className="text-gray-500 text-xs mt-0.5">Setup in Oman &middot; Assistant</p>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] font-medium text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Online
              </span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-gray-800 transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-4 py-5 space-y-3" aria-live="polite">
              <div className="flex justify-center mb-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-gray-600 bg-gray-800/60 border border-gray-800 px-3 py-1 rounded-full">
                  Today
                </span>
              </div>

              {/* Greeting */}
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-end gap-2 justify-start">
                <div className="max-w-[82%] bg-gray-800/80 border border-gray-700/60 rounded-2xl rounded-bl-md px-4 py-3">
                  <p className="text-gray-200 text-[13.5px] leading-relaxed">{GREETING}</p>
                </div>
              </motion.div>

              {/* Quick reply chips */}
              {showChips && messages.length === 0 && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="flex flex-col gap-1.5 pt-1">
                  {QUICK_REPLIES.map((s, i) => (
                    <motion.button
                      key={s}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.06 }}
                      whileHover={{ x: 2 }}
                      onClick={() => dispatch(s)}
                      className="group flex items-center justify-between gap-2 text-left px-3.5 py-2.5 rounded-xl text-xs font-medium text-gray-300 bg-gray-800/60 border border-gray-700 hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-white transition-colors"
                    >
                      <span>{s}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-violet-400 transition-colors flex-shrink-0" />
                    </motion.button>
                  ))}
                </motion.div>
              )}

              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-3 ${
                      m.role === 'user'
                        ? 'rounded-br-md bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-[0_4px_14px_rgba(91,33,182,0.35)]'
                        : 'rounded-bl-md bg-gray-800/80 border border-gray-700/60 text-gray-200'
                    }`}
                  >
                    <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  </div>
                </motion.div>
              ))}

              {sending && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="bg-gray-800/80 border border-gray-700/60 rounded-2xl rounded-bl-md px-4 py-3">
                    <TypingDots />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Composer */}
            <div className="relative z-10 border-t border-gray-800 bg-gray-900/80 px-3 pt-3 pb-2 flex-shrink-0">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about company setup in Oman..."
                  rows={1}
                  maxLength={1000}
                  className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-[13.5px] placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-colors resize-none max-h-20"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  aria-label="Send message"
                  className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors flex-shrink-0 shadow-[0_4px_14px_rgba(124,58,237,0.3)]"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>
              <p className="text-center text-gray-600 text-[10.5px] mt-2.5">
                Prefer a person? WhatsApp{' '}
                <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 transition-colors">
                  {WHATSAPP_NUMBER_DISPLAY}
                </a>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}