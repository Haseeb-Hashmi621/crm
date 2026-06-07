import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Users, TrendingUp, Mail, X, Loader2, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const TYPE_CONFIG = {
  contact: {
    icon: Users,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    label: 'Contact',
    getPath: (id) => `/dashboard/contacts/${id}`,
  },
  deal: {
    icon: TrendingUp,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    label: 'Deal',
    getPath: () => `/dashboard/deals`,
  },
  campaign: {
    icon: Mail,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    label: 'Campaign',
    getPath: () => `/dashboard/campaigns`,
  },
}

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef(null)
  const containerRef = useRef(null)
  const navigate = useNavigate()
  const debouncedQuery = useDebounce(query, 280)

  // Fetch results when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.length < 1) {
      setResults([])
      setLoading(false)
      return
    }
    const fetch = async () => {
      setLoading(true)
      try {
        const res = await api.get(`/search/?q=${encodeURIComponent(debouncedQuery)}`)
        setResults(res.data.results)
        setActiveIndex(-1)
      } catch (err) {
        console.error(err)
        setResults([])
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [debouncedQuery])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleKeyDown = (e) => {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      handleSelect(results[activeIndex])
    }
  }

  const handleSelect = useCallback((result) => {
    const config = TYPE_CONFIG[result.type]
    if (config) {
      navigate(config.getPath(result.id))
    }
    setQuery('')
    setResults([])
    setOpen(false)
  }, [navigate])

  const handleClear = () => {
    setQuery('')
    setResults([])
    inputRef.current?.focus()
  }

  const showDropdown = open && query.trim().length > 0

  // Group results by type
  const grouped = results.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {})

  const typeOrder = ['contact', 'deal', 'campaign']

  return (
    <div ref={containerRef} className="relative px-4 mb-2">
      {/* Search Input */}
      <div className="relative group">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors ${
          open ? 'text-violet-400' : 'text-gray-600'
        }`} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search..."
          className="w-full bg-gray-800/60 border border-gray-700/60 text-white rounded-lg pl-8 pr-16 py-2 text-xs focus:outline-none focus:border-violet-500/70 focus:bg-gray-800 transition-all placeholder-gray-600"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && (
            <Loader2 className="w-3 h-3 text-gray-500 animate-spin" />
          )}
          {query && !loading && (
            <button
              onClick={handleClear}
              className="text-gray-600 hover:text-gray-400 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          {!query && (
            <kbd className="text-gray-700 text-[9px] font-mono bg-gray-900 border border-gray-700 rounded px-1 py-0.5">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute left-4 right-4 top-full mt-1.5 bg-gray-900 border border-gray-700/80 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-[100]"
          >
            {/* No results */}
            {!loading && results.length === 0 && query.trim().length > 0 && (
              <div className="px-4 py-6 text-center">
                <Search className="w-6 h-6 mx-auto mb-2 text-gray-700" />
                <p className="text-gray-500 text-xs">No results for "{query}"</p>
              </div>
            )}

            {/* Results grouped by type */}
            {results.length > 0 && (
              <div className="py-1.5 max-h-72 overflow-y-auto">
                {typeOrder.map((type) => {
                  const group = grouped[type]
                  if (!group || group.length === 0) return null
                  const config = TYPE_CONFIG[type]
                  const Icon = config.icon

                  return (
                    <div key={type}>
                      {/* Group Header */}
                      <div className="flex items-center gap-2 px-3 py-1.5">
                        <Icon className={`w-3 h-3 ${config.color}`} />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                          {config.label}s
                        </span>
                        <div className="flex-1 h-px bg-gray-800" />
                        <span className="text-[10px] text-gray-700">{group.length}</span>
                      </div>

                      {/* Group Items */}
                      {group.map((result) => {
                        const flatIndex = results.indexOf(result)
                        const isActive = flatIndex === activeIndex

                        return (
                          <motion.button
                            key={result.id}
                            whileHover={{ x: 2 }}
                            onClick={() => handleSelect(result)}
                            onMouseEnter={() => setActiveIndex(flatIndex)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors group/item ${
                              isActive ? 'bg-gray-800' : 'hover:bg-gray-800/60'
                            }`}
                          >
                            {/* Type icon */}
                            <div className={`w-6 h-6 rounded-md ${config.bg} flex items-center justify-center flex-shrink-0`}>
                              <Icon className={`w-3 h-3 ${config.color}`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-xs font-medium truncate">{result.title}</p>
                              {(result.subtitle || result.meta) && (
                                <p className="text-gray-500 text-[10px] truncate">
                                  {result.subtitle}
                                  {result.subtitle && result.meta && ' · '}
                                  {result.meta && (
                                    <span className={`${config.color} opacity-80`}>{result.meta}</span>
                                  )}
                                </p>
                              )}
                            </div>

                            {/* Arrow on hover */}
                            <ArrowRight className={`w-3 h-3 text-gray-700 flex-shrink-0 transition-opacity ${
                              isActive ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'
                            }`} />
                          </motion.button>
                        )
                      })}
                    </div>
                  )
                })}

                {/* Footer */}
                <div className="border-t border-gray-800 px-3 py-1.5 flex items-center gap-3">
                  <span className="text-[10px] text-gray-700">
                    {results.length} result{results.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-[10px] text-gray-700 ml-auto">
                    ↑↓ navigate · ↵ open · esc close
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}