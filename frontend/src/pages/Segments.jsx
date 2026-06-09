import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Filter, Plus, X, Loader2, Users, Trash2,
  Edit2, ChevronRight, Check, Eye, Tag,
  Mail, Phone, Building2, Search
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'

// ── Constants ────────────────────────────────────────────────────────────────

const SEGMENT_COLORS = [
  { id: 'violet', label: 'Violet', ring: 'bg-violet-500', text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/30' },
  { id: 'blue',   label: 'Blue',   ring: 'bg-blue-500',   text: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30'   },
  { id: 'green',  label: 'Green',  ring: 'bg-green-500',  text: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30'  },
  { id: 'orange', label: 'Orange', ring: 'bg-orange-500', text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  { id: 'pink',   label: 'Pink',   ring: 'bg-pink-500',   text: 'text-pink-400',   bg: 'bg-pink-500/10',   border: 'border-pink-500/30'   },
  { id: 'teal',   label: 'Teal',   ring: 'bg-teal-500',   text: 'text-teal-400',   bg: 'bg-teal-500/10',   border: 'border-teal-500/30'   },
]

const FIELDS = [
  { id: 'first_name', label: 'First Name' },
  { id: 'last_name',  label: 'Last Name'  },
  { id: 'email',      label: 'Email'      },
  { id: 'phone',      label: 'Phone'      },
  { id: 'company',    label: 'Company'    },
  { id: 'tag',        label: 'Tag'        },
  { id: 'has_email',  label: 'Has Email'  },
  { id: 'has_phone',  label: 'Has Phone'  },
]

const OPERATORS_BY_FIELD = {
  first_name: ['contains', 'not_contains', 'equals', 'not_equals', 'is_empty', 'is_not_empty', 'starts_with'],
  last_name:  ['contains', 'not_contains', 'equals', 'not_equals', 'is_empty', 'is_not_empty', 'starts_with'],
  email:      ['contains', 'not_contains', 'equals', 'not_equals', 'is_empty', 'is_not_empty', 'ends_with'],
  phone:      ['contains', 'not_contains', 'is_empty', 'is_not_empty', 'starts_with'],
  company:    ['contains', 'not_contains', 'equals', 'not_equals', 'is_empty', 'is_not_empty'],
  tag:        ['has_tag', 'not_has_tag'],
  has_email:  ['is_true', 'is_false'],
  has_phone:  ['is_true', 'is_false'],
}

const OPERATOR_LABELS = {
  contains:     'contains',
  not_contains: 'does not contain',
  equals:       'equals',
  not_equals:   'does not equal',
  is_empty:     'is empty',
  is_not_empty: 'is not empty',
  starts_with:  'starts with',
  ends_with:    'ends with',
  has_tag:      'has tag',
  not_has_tag:  'does not have tag',
  is_true:      'is yes',
  is_false:     'is no',
}

const VALUE_NEEDED = ['contains', 'not_contains', 'equals', 'not_equals', 'starts_with', 'ends_with', 'has_tag', 'not_has_tag']

function getColorConfig(colorId) {
  return SEGMENT_COLORS.find(c => c.id === colorId) || SEGMENT_COLORS[0]
}

// ── Filter Rule Row ───────────────────────────────────────────────────────────

function FilterRow({ rule, index, onChange, onRemove, tags }) {
  const operators = OPERATORS_BY_FIELD[rule.field] || ['contains']
  const needsValue = VALUE_NEEDED.includes(rule.operator)

  const handleFieldChange = (field) => {
    const newOperators = OPERATORS_BY_FIELD[field] || ['contains']
    onChange(index, { field, operator: newOperators[0], value: '' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      className="flex items-center gap-2 flex-wrap"
    >
      {index > 0 && (
        <span className="text-xs font-semibold text-violet-400 uppercase w-8 text-center flex-shrink-0">AND</span>
      )}
      {index === 0 && <span className="w-8 flex-shrink-0" />}

      {/* Field */}
      <select
        value={rule.field}
        onChange={e => handleFieldChange(e.target.value)}
        className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors"
      >
        {FIELDS.map(f => (
          <option key={f.id} value={f.id}>{f.label}</option>
        ))}
      </select>

      {/* Operator */}
      <select
        value={rule.operator}
        onChange={e => onChange(index, { ...rule, operator: e.target.value, value: '' })}
        className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors"
      >
        {operators.map(op => (
          <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
        ))}
      </select>

      {/* Value */}
      {needsValue && (
        rule.field === 'tag' ? (
          <select
            value={rule.value || ''}
            onChange={e => onChange(index, { ...rule, value: e.target.value })}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors flex-1 min-w-32"
          >
            <option value="">Select tag...</option>
            {tags.map(t => (
              <option key={t.id} value={t.name}>{t.name}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={rule.value || ''}
            onChange={e => onChange(index, { ...rule, value: e.target.value })}
            placeholder="Value..."
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors flex-1 min-w-32"
          />
        )
      )}

      <button
        onClick={() => onRemove(index)}
        className="p-1.5 text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  )
}

// ── Segment Builder Modal ─────────────────────────────────────────────────────

function SegmentModal({ segment, tags, onSave, onClose }) {
  const [name, setName] = useState(segment?.name || '')
  const [description, setDescription] = useState(segment?.description || '')
  const [color, setColor] = useState(segment?.color || 'violet')
  const [filters, setFilters] = useState(
    segment?.filters?.length
      ? segment.filters
      : [{ field: 'company', operator: 'contains', value: '' }]
  )
  const [preview, setPreview] = useState(null)
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)

  const addFilter = () => {
    setFilters(prev => [...prev, { field: 'company', operator: 'contains', value: '' }])
  }

  const updateFilter = (idx, updated) => {
    setFilters(prev => prev.map((f, i) => i === idx ? updated : f))
  }

  const removeFilter = (idx) => {
    setFilters(prev => prev.filter((_, i) => i !== idx))
  }

  const handlePreview = async () => {
    setPreviewing(true)
    try {
      const res = await api.post('/segments/preview/contacts', { filters })
      setPreview(res.data)
    } catch (err) {
      toast.error('Preview failed')
    } finally {
      setPreviewing(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Segment name is required'); return }
    setSaving(true)
    try {
      await onSave({ name, description, color, filters })
      onClose()
    } catch {
      toast.error('Failed to save segment')
    } finally {
      setSaving(false)
    }
  }

  return (
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
        className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 className="text-white font-semibold text-lg">
              {segment ? 'Edit Segment' : 'Create Smart List'}
            </h2>
            <p className="text-gray-500 text-xs mt-0.5">
              Contacts matching ALL rules are included automatically
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Name + Color */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Segment Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. High-value leads, VIP customers..."
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Color</label>
              <div className="flex items-center gap-2 mt-1">
                {SEGMENT_COLORS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setColor(c.id)}
                    className={`w-7 h-7 rounded-full ${c.ring} transition-all ${
                      color === c.id ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">
              Description <span className="text-gray-600 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this segment for?"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {/* Filter Rules */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-3 block">Filter Rules</label>
            <div className="space-y-3">
              <AnimatePresence>
                {filters.map((rule, i) => (
                  <FilterRow
                    key={i}
                    rule={rule}
                    index={i}
                    onChange={updateFilter}
                    onRemove={removeFilter}
                    tags={tags}
                  />
                ))}
              </AnimatePresence>
            </div>
            <button
              onClick={addFilter}
              className="mt-3 flex items-center gap-2 text-violet-400 hover:text-violet-300 text-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> Add rule
            </button>
          </div>

          {/* Preview */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-300">Preview Contacts</label>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handlePreview}
                disabled={previewing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white rounded-lg text-xs transition-colors"
              >
                {previewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                {previewing ? 'Loading...' : 'Preview'}
              </motion.button>
            </div>

            {preview && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/60 border border-gray-700 rounded-xl p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-violet-400" />
                  <span className="text-white text-sm font-medium">
                    {preview.count} contact{preview.count !== 1 ? 's' : ''} match
                  </span>
                  {preview.count === 0 && (
                    <span className="text-gray-500 text-xs">— try adjusting your rules</span>
                  )}
                </div>
                {preview.contacts.slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-center gap-3 py-2 border-b border-gray-700/50 last:border-0">
                    <div className="w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {c.first_name?.[0]}{c.last_name?.[0] || ''}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium">{c.first_name} {c.last_name}</p>
                      <p className="text-gray-500 text-[10px] truncate">{c.email || c.company || 'No details'}</p>
                    </div>
                    {c.tags?.slice(0, 2).map(t => (
                      <span key={t.id} className="text-[10px] px-1.5 py-0.5 bg-violet-500/20 text-violet-300 rounded-full">
                        {t.name}
                      </span>
                    ))}
                  </div>
                ))}
                {preview.count > 5 && (
                  <p className="text-gray-600 text-xs mt-2 text-center">
                    +{preview.count - 5} more contacts
                  </p>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors"
          >
            Cancel
          </button>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'Saving...' : segment ? 'Save Changes' : 'Create Segment'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Segment Detail Panel ──────────────────────────────────────────────────────

function SegmentDetail({ segment, onClose, onEdit, onDelete }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const color = getColorConfig(segment.color)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/segments/${segment.id}/contacts`)
        setData(res.data)
      } catch {
        toast.error('Failed to load contacts')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [segment.id])

  const filtered = data?.contacts?.filter(c => {
    const q = search.toLowerCase()
    return (
      `${c.first_name} ${c.last_name} ${c.email} ${c.company}`.toLowerCase().includes(q)
    )
  }) || []

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-end z-50"
      onClick={onClose}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        className="h-full w-full max-w-lg bg-gray-900 border-l border-gray-800 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${color.bg} border ${color.border} flex items-center justify-center`}>
                <Filter className={`w-5 h-5 ${color.text}`} />
              </div>
              <div>
                <h2 className="text-white font-bold">{segment.name}</h2>
                {segment.description && (
                  <p className="text-gray-500 text-xs mt-0.5">{segment.description}</p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter summary */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {segment.filters?.map((f, i) => (
              <span
                key={i}
                className={`text-xs px-2.5 py-1 rounded-full ${color.bg} ${color.text} border ${color.border}`}
              >
                {FIELDS.find(x => x.id === f.field)?.label} {OPERATOR_LABELS[f.operator]}
                {f.value ? ` "${f.value}"` : ''}
              </span>
            ))}
            {(!segment.filters || segment.filters.length === 0) && (
              <span className="text-gray-500 text-xs">No filters — matches all contacts</span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-4">
            {data && (
              <span className={`text-sm font-semibold ${color.text}`}>
                {data.contact_count} contact{data.contact_count !== 1 ? 's' : ''}
              </span>
            )}
            <div className="flex-1" />
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => onEdit(segment)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white rounded-lg text-xs transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => onDelete(segment.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </motion.button>
          </div>

          {/* Search within segment */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search within segment..."
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-10 h-10 mx-auto mb-3 text-gray-700" />
              <p className="text-gray-500 text-sm">
                {search ? 'No matches in this segment' : 'No contacts match these filters'}
              </p>
            </div>
          ) : (
            <div>
              {filtered.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => navigate(`/dashboard/contacts/${c.id}`)}
                  className="flex items-center gap-3 px-6 py-4 border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 bg-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {c.first_name?.[0]}{c.last_name?.[0] || ''}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">
                      {c.first_name} {c.last_name}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {c.email && (
                        <span className="text-gray-500 text-xs flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 flex-shrink-0" />{c.email}
                        </span>
                      )}
                      {c.company && (
                        <span className="text-gray-500 text-xs flex items-center gap-1">
                          <Building2 className="w-3 h-3 flex-shrink-0" />{c.company}
                        </span>
                      )}
                    </div>
                    {c.tags?.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {c.tags.slice(0, 3).map(t => (
                          <span key={t.id} className="text-[10px] px-1.5 py-0.5 bg-violet-500/20 text-violet-300 rounded-full">
                            {t.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Segments() {
  const [segments, setSegments] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editSegment, setEditSegment] = useState(null)
  const [viewSegment, setViewSegment] = useState(null)

  useEffect(() => {
    fetchSegments()
    fetchTags()
  }, [])

  const fetchSegments = async () => {
    try {
      const res = await api.get('/segments/')
      setSegments(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTags = async () => {
    try {
      const res = await api.get('/tags/')
      setTags(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreate = async (data) => {
    const res = await api.post('/segments/', data)
    setSegments(prev => [res.data, ...prev])
    toast.success('Segment created!')
  }

  const handleUpdate = async (data) => {
    const res = await api.put(`/segments/${editSegment.id}`, data)
    setSegments(prev => prev.map(s => s.id === editSegment.id ? res.data : s))
    // Refresh view if open
    if (viewSegment?.id === editSegment.id) setViewSegment(res.data)
    toast.success('Segment updated!')
    setEditSegment(null)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this segment? Contacts are not affected.')) return
    try {
      await api.delete(`/segments/${id}`)
      setSegments(prev => prev.filter(s => s.id !== id))
      if (viewSegment?.id === id) setViewSegment(null)
      toast.success('Segment deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const openEdit = (seg) => {
    setEditSegment(seg)
    setShowModal(true)
    setViewSegment(null)
  }

  const totalUniqueContacts = segments.reduce((acc, s) => acc, 0)

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Smart Lists</h1>
            <p className="text-gray-400 mt-1">
              Auto-updating contact groups based on rules you define
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setEditSegment(null); setShowModal(true) }}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Segment
          </motion.button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Segments', value: segments.length, icon: Filter, color: 'bg-violet-500' },
            { label: 'Filter Rules', value: segments.reduce((s, seg) => s + (seg.filters?.length || 0), 0), icon: Check, color: 'bg-blue-500' },
            { label: 'Available Tags', value: tags.length, icon: Tag, color: 'bg-green-500' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-gray-900 rounded-2xl p-5 border border-gray-800 flex items-center gap-4"
            >
              <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">{stat.label}</p>
                <p className="text-white text-2xl font-bold">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Segments grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          </div>
        ) : segments.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-violet-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Filter className="w-8 h-8 text-violet-400" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">No segments yet</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-6">
              Create smart lists to automatically group contacts by rules like company, tags, or missing info.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setEditSegment(null); setShowModal(true) }}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors mx-auto"
            >
              <Plus className="w-4 h-4" />
              Create your first segment
            </motion.button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {segments.map((seg, i) => {
                const color = getColorConfig(seg.color)
                const isViewing = viewSegment?.id === seg.id
                return (
                  <motion.div
                    key={seg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setViewSegment(isViewing ? null : seg)}
                    className={`bg-gray-900 border rounded-2xl p-5 cursor-pointer transition-all hover:border-gray-700 group ${
                      isViewing
                        ? `border-${seg.color}-500/50 ring-1 ring-${seg.color}-500/30`
                        : 'border-gray-800'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-10 h-10 rounded-xl ${color.bg} border ${color.border} flex items-center justify-center`}>
                        <Filter className={`w-5 h-5 ${color.text}`} />
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => { e.stopPropagation(); openEdit(seg) }}
                          className="p-1.5 text-gray-500 hover:text-violet-400 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(seg.id) }}
                          className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-white font-semibold mb-1">{seg.name}</h3>
                    {seg.description && (
                      <p className="text-gray-500 text-xs mb-3 line-clamp-2">{seg.description}</p>
                    )}

                    {/* Filter pills */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {seg.filters?.slice(0, 3).map((f, idx) => (
                        <span
                          key={idx}
                          className={`text-[10px] px-2 py-0.5 rounded-full ${color.bg} ${color.text} border ${color.border}`}
                        >
                          {FIELDS.find(x => x.id === f.field)?.label} {OPERATOR_LABELS[f.operator]}
                          {f.value ? ` "${f.value}"` : ''}
                        </span>
                      ))}
                      {seg.filters?.length > 3 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-500 border border-gray-700">
                          +{seg.filters.length - 3} more
                        </span>
                      )}
                      {(!seg.filters || seg.filters.length === 0) && (
                        <span className="text-[10px] text-gray-600">All contacts</span>
                      )}
                    </div>

                    <div className={`flex items-center gap-1.5 text-xs ${color.text} font-medium`}>
                      <Users className="w-3.5 h-3.5" />
                      <span>Click to view contacts</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <SegmentModal
            segment={editSegment}
            tags={tags}
            onSave={editSegment ? handleUpdate : handleCreate}
            onClose={() => { setShowModal(false); setEditSegment(null) }}
          />
        )}
      </AnimatePresence>

      {/* Detail Slide-over */}
      <AnimatePresence>
        {viewSegment && (
          <SegmentDetail
            segment={viewSegment}
            onClose={() => setViewSegment(null)}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>
    </div>
  )
}