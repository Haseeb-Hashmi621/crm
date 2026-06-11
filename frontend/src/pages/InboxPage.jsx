import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Inbox, MessageSquare, PhoneCall, Send, Users,
  Search, Filter, X, Loader2, ChevronRight,
  Building2, Mail, RefreshCw, SlidersHorizontal,
  Calendar, TrendingUp
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  all: {
    label: 'All',
    icon: Inbox,
    color: 'text-gray-400',
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
    activeColor: 'bg-violet-600 text-white border-violet-500',
  },
  note: {
    label: 'Notes',
    icon: MessageSquare,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
    activeColor: 'bg-violet-600 text-white border-violet-500',
  },
  call: {
    label: 'Calls',
    icon: PhoneCall,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    activeColor: 'bg-green-600 text-white border-green-500',
  },
  email: {
    label: 'Emails',
    icon: Send,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    activeColor: 'bg-blue-600 text-white border-blue-500',
  },
  meeting: {
    label: 'Meetings',
    icon: Users,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    activeColor: 'bg-orange-600 text-white border-orange-500',
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

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

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function isSameDay(a, b) {
  const da = new Date(a)
  const db = new Date(b)
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
}

// ── Activity Item ─────────────────────────────────────────────────────────────

function ActivityItem({ item, index }) {
  const navigate = useNavigate()
  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.note
  const Icon = config.icon

  const contactName = item.contact
    ? `${item.contact.first_name || ''} ${item.contact.last_name || ''}`.trim()
    : 'Unknown Contact'

  const initials = item.contact
    ? `${item.contact.first_name?.[0] || ''}${item.contact.last_name?.[0] || ''}`.toUpperCase()
    : '?'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      onClick={() => item.contact && navigate(`/dashboard/contacts/${item.contact.id}`)}
      className="group flex items-start gap-4 px-6 py-4 border-b border-gray-800/60 last:border-0 hover:bg-gray-800/40 transition-colors cursor-pointer"
    >
      {/* Left — avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-9 h-9 bg-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
          {initials}
        </div>
        {/* Activity type badge */}
        <div className={`absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full ${config.bg} border ${config.border} flex items-center justify-center`}
          style={{ width: '18px', height: '18px' }}>
          <Icon className={`w-2.5 h-2.5 ${config.color}`} />
        </div>
      </div>

      {/* Center — content */}
      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-white text-sm font-medium">{contactName}</span>
          <span className="text-gray-600 text-xs">·</span>
          <span className={`text-xs font-semibold uppercase tracking-wide ${config.color}`}>
            {config.label.slice(0, -1)}
          </span>
          {item.contact?.company && (
            <>
              <span className="text-gray-600 text-xs">·</span>
              <span className="text-gray-500 text-xs flex items-center gap-1">
                <Building2 className="w-3 h-3" />{item.contact.company}
              </span>
            </>
          )}
          {item.deal && (
            <>
              <span className="text-gray-600 text-xs">·</span>
              <button
                onClick={e => { e.stopPropagation(); navigate(`/dashboard/deals/${item.deal.id}`) }}
                className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
              >
                <TrendingUp className="w-3 h-3" />
                {item.deal.title}
              </button>
            </>
          )}
        </div>

        {/* Activity content */}
        <p className="text-gray-400 text-sm leading-relaxed line-clamp-2">
          {item.content}
        </p>
      </div>

      {/* Right — time + arrow */}
      <div className="flex-shrink-0 flex flex-col items-end gap-2 ml-2">
        <span className="text-gray-600 text-xs whitespace-nowrap">
          <TimeAgo dateString={item.created_at} />
        </span>
        <ChevronRight className="w-4 h-4 text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </motion.div>
  )
}

// ── Date Divider ──────────────────────────────────────────────────────────────

function DateDivider({ date }) {
  const label = (() => {
    const d = new Date(date)
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (isSameDay(d, now)) return 'Today'
    if (isSameDay(d, yesterday)) return 'Yesterday'
    return formatDate(date)
  })()

  return (
    <div className="flex items-center gap-3 px-6 py-3 bg-gray-900/50 sticky top-0 z-10 backdrop-blur-sm border-b border-gray-800/60">
      <Calendar className="w-3.5 h-3.5 text-gray-600" />
      <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-px bg-gray-800" />
    </div>
  )
}

// ── Contact Filter Dropdown ───────────────────────────────────────────────────

function ContactFilterDropdown({ contacts, selectedId, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const filtered = contacts.filter(c => {
    const name = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase()
    return name.includes(search.toLowerCase()) || (c.email || '').toLowerCase().includes(search.toLowerCase())
  }).slice(0, 8)

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -4, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.12 }}
      className="absolute top-full mt-1 right-0 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden"
    >
      <div className="p-2 border-b border-gray-800">
        <input
          autoFocus
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search contacts..."
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-violet-500 transition-colors"
        />
      </div>
      <div className="max-h-52 overflow-y-auto py-1">
        <button
          onClick={() => onSelect(null)}
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-gray-800 ${!selectedId ? 'text-violet-400' : 'text-gray-400'}`}
        >
          <Users className="w-3.5 h-3.5" />
          All Contacts
        </button>
        {filtered.map(c => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-gray-800 ${selectedId === c.id ? 'text-violet-400' : 'text-gray-300'}`}
          >
            <div className="w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
              {c.first_name?.[0]}{c.last_name?.[0] || ''}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{c.first_name} {c.last_name}</p>
              {c.email && <p className="text-[10px] text-gray-600 truncate">{c.email}</p>}
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-gray-600 text-xs text-center py-4">No contacts found</p>
        )}
      </div>
    </motion.div>
  )
}

// ── Main Inbox Page ───────────────────────────────────────────────────────────

export default function InboxPage() {
  const [items, setItems] = useState([])
  const [stats, setStats] = useState({ all: 0, note: 0, call: 0, email: 0, meeting: 0 })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)

  const [typeFilter, setTypeFilter] = useState('all')
  const [searchRaw, setSearchRaw] = useState('')
  const [selectedContact, setSelectedContact] = useState(null)
  const [contacts, setContacts] = useState([])
  const [showContactFilter, setShowContactFilter] = useState(false)

  const search = useDebounce(searchRaw, 300)

  // Fetch stats once
  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/inbox/stats')
      setStats(res.data)
    } catch (err) {
      console.error(err)
    }
  }, [])

  // Fetch contacts for filter dropdown
  const fetchContacts = useCallback(async () => {
    try {
      const res = await api.get('/contacts/')
      setContacts(res.data)
    } catch (err) {
      console.error(err)
    }
  }, [])

  // Fetch inbox items
  const fetchItems = useCallback(async (pageNum = 1, replace = true) => {
    if (pageNum === 1) setLoading(true)
    else setLoadingMore(true)

    try {
      const params = new URLSearchParams()
      params.set('page', pageNum)
      params.set('page_size', '20')
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (search.trim()) params.set('search', search.trim())
      if (selectedContact) params.set('contact_id', selectedContact.id)

      const res = await api.get(`/inbox/?${params.toString()}`)
      const data = res.data

      setTotal(data.total)
      setHasMore(data.has_more)
      setPage(pageNum)

      if (replace) {
        setItems(data.items)
      } else {
        setItems(prev => [...prev, ...data.items])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [typeFilter, search, selectedContact])

  // Initial load
  useEffect(() => {
    fetchStats()
    fetchContacts()
  }, [fetchStats, fetchContacts])

  // Refetch when filters change
  useEffect(() => {
    fetchItems(1, true)
  }, [fetchItems])

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchItems(page + 1, false)
    }
  }

  const handleRefresh = () => {
    fetchStats()
    fetchItems(1, true)
  }

  // Group items by date for dividers
  const groupedItems = items.reduce((groups, item) => {
    const dateKey = new Date(item.created_at).toDateString()
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(item)
    return groups
  }, {})

  const sortedDateKeys = Object.keys(groupedItems).sort(
    (a, b) => new Date(b) - new Date(a)
  )

  const typeOrder = ['all', 'note', 'call', 'email', 'meeting']

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <div className="flex-shrink-0 px-8 py-6 border-b border-gray-800 bg-gray-950">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Inbox</h1>
              <p className="text-gray-400 mt-1 text-sm">
                {total > 0 ? `${total.toLocaleString()} activities across all contacts` : 'All activity in one place'}
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3 py-2 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white rounded-xl text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </motion.button>
          </div>

          {/* Stat chips */}
          <div className="flex items-center gap-2 flex-wrap mb-5">
            {typeOrder.map(type => {
              const config = TYPE_CONFIG[type]
              const Icon = config.icon
              const count = stats[type] || 0
              const isActive = typeFilter === type

              return (
                <motion.button
                  key={type}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTypeFilter(type)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                    isActive
                      ? config.activeColor
                      : `bg-gray-900 text-gray-400 border-gray-800 hover:text-white hover:border-gray-700`
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {config.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-gray-800 text-gray-500'}`}>
                    {count.toLocaleString()}
                  </span>
                </motion.button>
              )
            })}
          </div>

          {/* Search + Contact filter bar */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchRaw}
                onChange={e => setSearchRaw(e.target.value)}
                placeholder="Search activity content..."
                className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              />
              {searchRaw && (
                <button
                  onClick={() => setSearchRaw('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Contact filter */}
            <div className="relative">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowContactFilter(o => !o)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border transition-all ${
                  selectedContact
                    ? 'bg-violet-600/20 border-violet-500/50 text-violet-300'
                    : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                {selectedContact
                  ? `${selectedContact.first_name} ${selectedContact.last_name}`
                  : 'Filter by contact'}
                {selectedContact && (
                  <button
                    onClick={e => { e.stopPropagation(); setSelectedContact(null) }}
                    className="text-violet-400 hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </motion.button>

              <AnimatePresence>
                {showContactFilter && (
                  <ContactFilterDropdown
                    contacts={contacts}
                    selectedId={selectedContact?.id}
                    onSelect={(c) => { setSelectedContact(c); setShowContactFilter(false) }}
                    onClose={() => setShowContactFilter(false)}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Active filters indicator */}
            {(searchRaw || selectedContact || typeFilter !== 'all') && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setSearchRaw(''); setSelectedContact(null); setTypeFilter('all') }}
                className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-gray-500 hover:text-white border border-gray-800 hover:border-gray-700 rounded-xl transition-colors"
              >
                <X className="w-3 h-3" />
                Clear filters
              </motion.button>
            )}
          </div>
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-y-auto bg-gray-950">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto mb-3" />
                <p className="text-gray-600 text-sm">Loading activities...</p>
              </div>
            </div>
          ) : items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-24 px-8"
            >
              <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mb-4 border border-gray-800">
                <Inbox className="w-8 h-8 text-gray-700" />
              </div>
              <p className="text-white font-semibold text-lg mb-2">
                {searchRaw || selectedContact || typeFilter !== 'all'
                  ? 'No activities match your filters'
                  : 'Your inbox is empty'}
              </p>
              <p className="text-gray-500 text-sm text-center max-w-sm">
                {searchRaw || selectedContact || typeFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Log notes, calls, emails, and meetings on your contacts to see them here.'}
              </p>
              {(searchRaw || selectedContact || typeFilter !== 'all') && (
                <button
                  onClick={() => { setSearchRaw(''); setSelectedContact(null); setTypeFilter('all') }}
                  className="mt-4 text-violet-400 hover:text-violet-300 text-sm transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </motion.div>
          ) : (
            <>
              {/* Grouped by date */}
              {sortedDateKeys.map(dateKey => (
                <div key={dateKey}>
                  <DateDivider date={groupedItems[dateKey][0].created_at} />
                  {groupedItems[dateKey].map((item, i) => (
                    <ActivityItem key={item.id} item={item} index={i} />
                  ))}
                </div>
              ))}

              {/* Load more */}
              {hasMore && (
                <div className="flex justify-center py-6">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 rounded-xl text-sm transition-colors"
                  >
                    {loadingMore ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {loadingMore ? 'Loading...' : `Load more (${total - items.length} remaining)`}
                  </motion.button>
                </div>
              )}

              {/* End of feed */}
              {!hasMore && items.length > 0 && (
                <div className="text-center py-8 text-gray-700 text-xs">
                  — {items.length} activities shown —
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}