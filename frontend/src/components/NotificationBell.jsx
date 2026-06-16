import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Users, TrendingUp, Activity, Mail, Check, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const TYPE_CONFIG = {
  contact_added:  { icon: Users,     color: 'text-violet-400', bg: 'bg-violet-500/10' },
  deal_added:     { icon: TrendingUp, color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
  deal_updated:   { icon: TrendingUp, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  activity_logged:{ icon: Activity,  color: 'text-green-400',  bg: 'bg-green-500/10'  },
  campaign_sent:  { icon: Mail,      color: 'text-pink-400',   bg: 'bg-pink-500/10'   },
}

function TimeAgo({ dateString }) {
  const date = new Date(dateString)
  const diff = Math.floor((Date.now() - date) / 1000)
  if (diff < 60)   return <span>{diff}s ago</span>
  if (diff < 3600) return <span>{Math.floor(diff / 60)}m ago</span>
  if (diff < 86400)return <span>{Math.floor(diff / 3600)}h ago</span>
  return <span>{date.toLocaleDateString()}</span>
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount]     = useState(0)
  const [open, setOpen]                   = useState(false)
  const [loading, setLoading]             = useState(false)
  const panelRef  = useRef(null)
  const buttonRef = useRef(null)
  const navigate  = useNavigate()

  // ── Fetch unread count (poll every 30s) ─────────────────────────────────
  const fetchCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count')
      setUnreadCount(res.data.count)
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 8_000)
    return () => clearInterval(interval)
  }, [fetchCount])

  useEffect(() => {
    const handler = () => fetchCount()
    window.addEventListener('notification:refresh', handler)
    return () => window.removeEventListener('notification:refresh', handler)
  }, [fetchCount])

  // ── Fetch full list when panel opens ────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/notifications/')
      setNotifications(res.data)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (open) fetchNotifications()
  }, [open, fetchNotifications])

  // ── Close on outside click ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (
        panelRef.current  && !panelRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleMarkRead = async (id, e) => {
    e.stopPropagation()
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      )
      setUnreadCount(c => Math.max(0, c - 1))
    } catch { /* silent */ }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    try {
      await api.delete(`/notifications/${id}`)
      const wasUnread = notifications.find(n => n.id === id && !n.read)
      setNotifications(prev => prev.filter(n => n.id !== id))
      if (wasUnread) setUnreadCount(c => Math.max(0, c - 1))
    } catch { /* silent */ }
  }

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read')
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch { /* silent */ }
  }

  const handleClearAll = async () => {
    try {
      await api.delete('/notifications/')
      setNotifications([])
      setUnreadCount(0)
    } catch { /* silent */ }
  }

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      api.put(`/notifications/${notification.id}/read`).catch(() => {})
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      )
      setUnreadCount(c => Math.max(0, c - 1))
    }
    if (notification.link) {
      navigate(notification.link)
      setOpen(false)
    }
  }

  return (
    <div className="relative px-4 mb-1">
      {/* Bell button */}
      <motion.button
        ref={buttonRef}
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative ${
          open
            ? 'bg-gray-800 text-white'
            : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`}
      >
        <div className="relative flex-shrink-0">
          <Bell className="w-4 h-4" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] bg-violet-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <span>Notifications</span>
        {unreadCount > 0 && (
          <span className="ml-auto text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-1.5 py-0.5 rounded-full font-medium">
            {unreadCount}
          </span>
        )}
      </motion.button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-4 right-4 top-full mt-1.5 bg-gray-900 border border-gray-700/80 rounded-xl shadow-2xl shadow-black/60 z-[200] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <span className="text-white text-xs font-semibold">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 text-violet-400">{unreadCount} new</span>
                )}
              </span>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-gray-500 hover:text-violet-400 transition-colors flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-[10px] text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Clear all
                  </button>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <Bell className="w-7 h-7 mx-auto mb-2 text-gray-700" />
                  <p className="text-gray-500 text-xs">No notifications yet</p>
                  <p className="text-gray-700 text-[10px] mt-0.5">Actions you take will show up here</p>
                </div>
              ) : (
                <div>
                  {notifications.map((n) => {
                    const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.activity_logged
                    const Icon   = config.icon
                    return (
                      <motion.div
                        key={n.id}
                        layout
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        onClick={() => handleNotificationClick(n)}
                        className={`group flex items-start gap-3 px-4 py-3 border-b border-gray-800/60 last:border-0 transition-colors cursor-pointer ${
                          n.link ? 'hover:bg-gray-800/50' : 'cursor-default'
                        } ${!n.read ? 'bg-violet-500/[0.03]' : ''}`}
                      >
                        {/* Icon */}
                        <div className={`w-7 h-7 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className={`text-xs font-medium leading-snug ${n.read ? 'text-gray-300' : 'text-white'}`}>
                              {n.title}
                            </p>
                            {/* Unread dot */}
                            {!n.read && (
                              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0 mt-1" />
                            )}
                          </div>
                          {n.message && (
                            <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">
                              {n.message}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-700 mt-1">
                            <TimeAgo dateString={n.created_at} />
                          </p>
                        </div>

                        {/* Action buttons (visible on hover) */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          {!n.read && (
                            <button
                              onClick={(e) => handleMarkRead(n.id, e)}
                              className="p-1 text-gray-600 hover:text-violet-400 transition-colors"
                              title="Mark as read"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDelete(n.id, e)}
                            className="p-1 text-gray-600 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}