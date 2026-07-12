import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Loader2, Sparkles, ArrowUpRight } from 'lucide-react'
import api from '../services/api'

function genSessionId() {
  return 'sess-' + Math.random().toString(36).slice(2) + Date.now()
}

const GREETING = "Good day. This is Zahra from Setup in Oman. How may I help you with your company setup in the Sultanate of Oman?"

const SUGGESTIONS = [
  'What does an SPC cost?',
  'How long does formation take?',
  'Do I need to visit Oman?',
]

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-0.5">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-violet-300/80"
          animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

export default function ZahraChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([]) // {role, content} — sent to API
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
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
    setSending(true)

    try {
      const res = await api.post('/website-chat/message', {
        session_id: sessionIdRef.current,
        messages: nextMessages,
      })
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, something went wrong on my end. Please try again in a moment.",
      }])
    } finally {
      setSending(false)
    }
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
      {/* ── Floating launcher ─────────────────────────────────────────── */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.92 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        onClick={() => setOpen(o => !o)}
        title={open ? 'Close chat' : 'Chat with Zahra'}
        className="fixed bottom-6 right-6 z-[999] w-[60px] h-[60px] rounded-full flex items-center justify-center group"
        style={{
          background: 'linear-gradient(155deg, #8b5cf6 0%, #6d28d9 45%, #4c1d95 100%)',
          boxShadow: '0 10px 15px -3px rgba(76,29,149,0.35), 0 4px 6px -4px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06) inset',
        }}
      >
        {/* subtle rotating sheen */}
        <motion.span
          aria-hidden="true"
          className="absolute inset-0 rounded-full opacity-40"
          style={{
            background: 'conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.35) 8%, transparent 20%)',
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
        />
        {/* idle presence pulse when closed */}
        {!open && (
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 rounded-full border border-violet-400/50"
            animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <span className="relative z-10">
          <AnimatePresence mode="wait" initial={false}>
            {open ? (
              <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }} className="flex">
                <X className="w-5 h-5 text-white" strokeWidth={2} />
              </motion.span>
            ) : (
              <motion.span key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }} className="flex">
                <Sparkles className="w-5 h-5 text-white" strokeWidth={2} />
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </motion.button>

      {/* ── Chat panel ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-[92px] right-6 z-[998] w-[392px] max-w-[92vw] h-[600px] max-h-[76vh] rounded-[22px] flex flex-col overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(20,20,28,0.97) 0%, rgba(10,10,14,0.99) 100%)',
              boxShadow: '0 25px 60px -12px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.06)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* gradient top accent line */}
            <div className="h-[3px] w-full flex-shrink-0" style={{ background: 'linear-gradient(90deg, #4c1d95, #8b5cf6, #c4b5fd, #8b5cf6, #4c1d95)' }} />

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0 border-b border-white/[0.06]">
              <div className="relative flex-shrink-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(155deg, #a78bfa 0%, #7c3aed 55%, #4c1d95 100%)',
                    boxShadow: '0 4px 14px rgba(124,58,237,0.4), 0 0 0 1px rgba(255,255,255,0.08) inset',
                  }}
                >
                  <span className="text-white text-sm font-semibold tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>Z</span>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#111114]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-[13.5px] font-semibold tracking-tight leading-tight">Zahra</p>
                <p className="text-gray-500 text-[11px] leading-tight mt-0.5">Setup in Oman · Assistant</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-5 space-y-3.5"
              style={{
                backgroundImage: 'radial-gradient(circle at 15% 0%, rgba(139,92,246,0.06) 0%, transparent 45%)',
              }}
            >
              {/* Greeting bubble */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex justify-start"
              >
                <div
                  className="max-w-[86%] rounded-2xl rounded-tl-md px-4 py-3"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <p className="text-gray-200 text-[13.5px] leading-relaxed">{GREETING}</p>
                </div>
              </motion.div>

              {/* Suggestion chips — shown until the first message is sent */}
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="flex flex-col gap-1.5 pt-1"
                >
                  {SUGGESTIONS.map((s, i) => (
                    <motion.button
                      key={s}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.06 }}
                      whileHover={{ x: 2, borderColor: 'rgba(167,139,250,0.5)' }}
                      onClick={() => dispatch(s)}
                      className="group flex items-center justify-between gap-2 text-left px-3.5 py-2.5 rounded-xl text-[12.5px] text-gray-300 transition-colors"
                      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
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
                    className={`max-w-[86%] rounded-2xl px-4 py-3 ${m.role === 'user' ? 'rounded-tr-md' : 'rounded-tl-md'}`}
                    style={m.role === 'user'
                      ? {
                          background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
                          boxShadow: '0 4px 14px rgba(91,33,182,0.35)',
                        }
                      : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }
                    }
                  >
                    <p className={`text-[13.5px] leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'text-white' : 'text-gray-200'}`}>
                      {m.content}
                    </p>
                  </div>
                </motion.div>
              ))}

              {sending && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div
                    className="rounded-2xl rounded-tl-md px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <TypingDots />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Composer */}
            <div className="p-3 flex-shrink-0 border-t border-white/[0.06]" style={{ background: 'rgba(255,255,255,0.015)' }}>
              <div
                className="flex items-end gap-2 rounded-2xl px-3 py-2 transition-colors focus-within:border-violet-500/50"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 bg-transparent text-white text-[13.5px] py-1.5 focus:outline-none resize-none placeholder-gray-600"
                />
                <motion.button
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="flex items-center justify-center w-9 h-9 rounded-xl text-white transition-all flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    background: input.trim() && !sending
                      ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
                      : 'rgba(255,255,255,0.06)',
                  }}
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </motion.button>
              </div>
              <p className="text-center text-gray-700 text-[10px] mt-2 tracking-wide">Powered by Setup in Oman</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}