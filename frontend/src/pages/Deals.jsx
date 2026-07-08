import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Loader2, DollarSign, User, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'

const STAGES = [
  { id: 'new', label: 'New Lead', color: 'border-blue-500', dot: 'bg-blue-500' },
  { id: 'contacted', label: 'Contacted', color: 'border-yellow-500', dot: 'bg-yellow-500' },
  { id: 'proposal', label: 'Proposal', color: 'border-orange-500', dot: 'bg-orange-500' },
  { id: 'negotiation', label: 'Negotiation', color: 'border-violet-500', dot: 'bg-violet-500' },
  { id: 'won', label: 'Won', color: 'border-green-500', dot: 'bg-green-500' },
  { id: 'lost', label: 'Lost', color: 'border-red-500', dot: 'bg-red-500' },
]

function scoreBadgeColor(score) {
  if (score >= 70) return 'bg-green-500/15 text-green-400 border-green-500/40'
  if (score >= 40) return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40'
  return 'bg-red-500/15 text-red-400 border-red-500/40'
}

// ── Contact Picker ────────────────────────────────────────────────────────────

function ContactPicker({ contacts, selectedId, onSelect }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const selected = contacts.find(c => c.id === selectedId)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = contacts.filter(c => {
    const name = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase()
    return name.includes(search.toLowerCase()) || (c.email || '').toLowerCase().includes(search.toLowerCase())
  }).slice(0, 8)

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(o => !o)}
        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between hover:border-violet-500 transition-colors"
      >
        {selected ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-violet-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
              {selected.first_name?.[0]}{selected.last_name?.[0] || ''}
            </div>
            <span>{selected.first_name} {selected.last_name}</span>
          </div>
        ) : (
          <span className="text-gray-500">Search contacts...</span>
        )}
        <div className="flex items-center gap-1">
          {selected && (
            <button
              onClick={(e) => { e.stopPropagation(); onSelect(null); setSearch('') }}
              className="text-gray-500 hover:text-red-400 transition-colors p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute left-0 right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-2 border-b border-gray-700">
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Type to search..."
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <div className="max-h-40 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="text-gray-500 text-xs text-center py-4">No contacts found</p>
              ) : (
                filtered.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => { onSelect(contact); setOpen(false); setSearch('') }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 transition-colors text-left"
                  >
                    <div className="w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {contact.first_name?.[0]}{contact.last_name?.[0] || ''}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-xs font-medium">{contact.first_name} {contact.last_name}</p>
                      {contact.email && <p className="text-gray-500 text-[10px] truncate">{contact.email}</p>}
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Owner Picker — real team members from /admin/users ────────────────────────

function OwnerPicker({ users, value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const selected = users.find(u => u.full_name === value) || null

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = (name) => name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const ROLE_COLORS = {
    admin: 'bg-violet-600',
    employee: 'bg-blue-600',
  }

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(o => !o)}
        className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between hover:border-violet-500 transition-colors"
      >
        {selected ? (
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 ${ROLE_COLORS[selected.role] || 'bg-gray-600'} rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0`}>
              {initials(selected.full_name)}
            </div>
            <span>{selected.full_name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              selected.role === 'admin'
                ? 'bg-violet-500/20 text-violet-300'
                : 'bg-blue-500/20 text-blue-300'
            }`}>
              {selected.role}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-500">
            <User className="w-3.5 h-3.5" />
            <span>Assign to team member...</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          {selected && (
            <button
              onClick={(e) => { e.stopPropagation(); onChange('') }}
              className="text-gray-500 hover:text-red-400 transition-colors p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute left-0 right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="py-1 max-h-48 overflow-y-auto">
              {users.length === 0 ? (
                <p className="text-gray-500 text-xs text-center py-4">No team members found</p>
              ) : (
                users.map(user => (
                  <button
                    key={user.id}
                    onClick={() => { onChange(user.full_name); setOpen(false) }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-700 transition-colors text-left"
                  >
                    <div className={`w-7 h-7 ${ROLE_COLORS[user.role] || 'bg-gray-600'} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                      {initials(user.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{user.full_name}</p>
                      <p className="text-gray-500 text-xs truncate">{user.email}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${
                      user.role === 'admin'
                        ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}>
                      {user.role}
                    </span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Deals Page ───────────────────────────────────────────────────────────

export default function Deals() {
  const [deals, setDeals] = useState([])
  const [contacts, setContacts] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '', value: '', stage: 'new',
    contact_name: '', company: '', contact_id: null, owner: ''
  })
  const [dragging, setDragging] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchDeals()
    fetchContacts()
    fetchUsers()
  }, [])

  const fetchDeals = async () => {
    try {
      const res = await api.get('/deals/')
      setDeals(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchContacts = async () => {
    try {
      const res = await api.get('/contacts/')
      setContacts(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users')
      setUsers(res.data)
    } catch (err) {
      // Non-admins get 403 — fallback to empty, owner field still works as text
      console.error(err)
    }
  }

  const resetForm = () => setForm({
    title: '', value: '', stage: 'new',
    contact_name: '', company: '', contact_id: null, owner: ''
  })

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Deal title is required'); return }
    setSaving(true)
    try {
      await api.post('/deals/', {
        ...form,
        value: parseFloat(form.value) || 0,
        contact_id: form.contact_id || null,
        owner: form.owner || null,
      })
      toast.success('Deal added!')
      fetchDeals()
      setShowModal(false)
      resetForm()
    } catch (err) {
      toast.error('Something went wrong')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDrop = async (stage, dealId) => {
    try {
      await api.put(`/deals/${dealId}`, { stage })
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage } : d))
    } catch (err) {
      console.error(err)
    }
  }

  const handleDeleteDeal = async (dealId) => {
    if (!confirm('Delete this deal?')) return
    try {
      await api.delete(`/deals/${dealId}`)
      toast.success('Deal deleted!')
      fetchDeals()
    } catch (err) {
      toast.error('Something went wrong')
    }
  }

  const totalValue = deals.filter(d => d.stage === 'won').reduce((sum, d) => sum + d.value, 0)

  // Avatar initials helper for owner on cards
  const ownerInitials = (name) => name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : null

  return (
    <div style={{ padding: '2rem', boxSizing: 'border-box', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Pipeline</h1>
            <p className="text-gray-400 mt-1">
              {deals.length} deals ·
              <span className="text-green-400 ml-1">${totalValue.toLocaleString()} won</span>
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Deal
          </motion.button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', overflowY: 'auto', flex: 1, paddingBottom: '1rem' }}>
            {STAGES.map((stage) => {
              const stageDeals = deals.filter(d => d.stage === stage.id)
              const stageValue = stageDeals.reduce((sum, d) => sum + d.value, 0)
              return (
                <div
                  key={stage.id}
                  style={{ flexShrink: 0, width: '240px' }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (dragging) handleDrop(stage.id, dragging)
                  }}
                >
                  <div className={`border-t-2 ${stage.color} bg-gray-900 rounded-xl p-3 mb-3`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${stage.dot}`} />
                        <span className="text-white text-sm font-medium">{stage.label}</span>
                      </div>
                      <span className="text-gray-500 text-xs">{stageDeals.length}</span>
                    </div>
                    {stageValue > 0 && (
                      <p className="text-gray-400 text-xs mt-1 ml-4">${stageValue.toLocaleString()}</p>
                    )}
                  </div>

                  <div style={{ minHeight: '8rem' }} className="space-y-3">
                    <AnimatePresence>
                      {stageDeals.map((deal) => (
                        <motion.div
                          key={deal.id}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          draggable
                          onDragStart={() => setDragging(deal.id)}
                          onDragEnd={() => setDragging(null)}
                          onClick={() => navigate(`/dashboard/deals/${deal.id}`)}
                          className="relative bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-violet-500/50 transition-colors"
                        >
                          {/* AI Score badge — Feature #50 */}
                          {deal.ai_score !== null && deal.ai_score !== undefined && (
                            <div
                              title={`AI win-likelihood score: ${deal.ai_score}`}
                              className={`absolute -top-2 -right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${scoreBadgeColor(deal.ai_score)}`}
                            >
                              <Sparkles className="w-2.5 h-2.5" />
                              {deal.ai_score}
                            </div>
                          )}

                          <div className="flex items-center justify-between mb-2">
                            <p className="text-white text-sm font-medium truncate flex-1">{deal.title}</p>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              onClick={(e) => { e.stopPropagation(); handleDeleteDeal(deal.id) }}
                              className="text-gray-600 hover:text-red-400 transition-colors ml-1 flex-shrink-0"
                            >
                              <X className="w-3 h-3" />
                            </motion.button>
                          </div>

                          {deal.contact_name && (
                            <p className="text-gray-500 text-xs mb-1">{deal.contact_name}</p>
                          )}
                          {deal.company && (
                            <p className="text-gray-500 text-xs mb-2">{deal.company}</p>
                          )}

                          <div className="flex items-center justify-between mt-2">
                            {deal.value > 0 && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-3 h-3 text-green-400" />
                                <span className="text-green-400 text-xs font-medium">
                                  {deal.value.toLocaleString()}
                                </span>
                              </div>
                            )}
                            {/* Owner avatar on card */}
                            {deal.owner && (
                              <div
                                className="w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ml-auto"
                                title={deal.owner}
                              >
                                {ownerInitials(deal.owner)}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* Add Deal Modal */}
      <AnimatePresence>
        {showModal && (
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
              className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white font-semibold">Add Deal</h2>
                <button
                  onClick={() => { setShowModal(false); resetForm() }}
                  className="text-gray-500 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1.5 block">Deal Title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Website redesign project"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                    autoFocus
                  />
                </div>

                {/* Value */}
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1.5 block">Value ($)</label>
                  <input
                    type="text"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder="0"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>

                {/* Company */}
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1.5 block">Company</label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    placeholder="e.g. Acme Corp"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>

                {/* Contact Picker */}
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1.5 block">Link Contact</label>
                  <ContactPicker
                    contacts={contacts}
                    selectedId={form.contact_id}
                    onSelect={(contact) => setForm({
                      ...form,
                      contact_id: contact ? contact.id : null,
                      contact_name: contact
                        ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim()
                        : ''
                    })}
                  />
                </div>

                {/* Owner Picker */}
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1.5 block">
                    Assign To
                    <span className="text-gray-500 font-normal ml-1">(team member)</span>
                  </label>
                  {users.length > 0 ? (
                    <OwnerPicker
                      users={users}
                      value={form.owner}
                      onChange={(name) => setForm({ ...form, owner: name })}
                    />
                  ) : (
                    // Fallback text input if user can't fetch team members (employee role)
                    <input
                      type="text"
                      value={form.owner}
                      onChange={(e) => setForm({ ...form, owner: e.target.value })}
                      placeholder="Owner name..."
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                    />
                  )}
                </div>

                {/* Stage */}
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-1.5 block">Stage</label>
                  <select
                    value={form.stage}
                    onChange={(e) => setForm({ ...form, stage: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500"
                  >
                    {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setShowModal(false); resetForm() }}
                  className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {saving ? 'Saving...' : 'Save Deal'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}