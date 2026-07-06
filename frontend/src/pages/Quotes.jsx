// frontend/src/pages/Quotes.jsx
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileSignature, Plus, X, Loader2, Search, Edit2,
  Trash2, Check, Download, Send, Building2, User,
  Package, GripVertical, ChevronDown, DollarSign,
  Calendar, Eye, ExternalLink, Clock, CheckCircle2,
  XCircle, FileText, AlertCircle
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  draft:    { label: 'Draft',    icon: FileText,      color: 'text-gray-400',   bg: 'bg-gray-500/10',   border: 'border-gray-500/30' },
  sent:     { label: 'Sent',     icon: Send,           color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30' },
  accepted: { label: 'Accepted', icon: CheckCircle2,  color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30' },
  declined: { label: 'Declined', icon: XCircle,        color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30' },
  expired:  { label: 'Expired',  icon: Clock,          color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
}

const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'PKR', 'AED', 'SAR', 'INR', 'CAD', 'AUD']
const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', PKR: 'Rs ', AED: 'AED ', SAR: 'SAR ', INR: '₹', CAD: 'C$', AUD: 'A$' }

function fmtMoney(amount, currency = 'USD') {
  const symbol = CURRENCY_SYMBOLS[currency] || currency + ' '
  return `${symbol}${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function TimeAgo({ dateString }) {
  if (!dateString) return null
  const date = new Date(dateString)
  const diff = Math.floor((Date.now() - date) / 1000)
  if (diff < 60) return <span>{diff}s ago</span>
  if (diff < 3600) return <span>{Math.floor(diff / 60)}m ago</span>
  if (diff < 86400) return <span>{Math.floor(diff / 3600)}h ago</span>
  if (diff < 604800) return <span>{Math.floor(diff / 86400)}d ago</span>
  return <span>{date.toLocaleDateString()}</span>
}

// ── Product Picker (for adding line items from catalog) ─────────────────────

function ProductPicker({ products, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8)

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.1 }}
      className="absolute z-50 top-full mt-1 left-0 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
    >
      <div className="p-2 border-b border-gray-700">
        <input
          autoFocus
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search your product catalog..."
          className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-violet-500 transition-colors"
        />
      </div>
      <div className="max-h-56 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-gray-500 text-xs text-center py-4">
            {products.length === 0 ? 'No products in catalog yet' : 'No matches'}
          </p>
        ) : (
          filtered.map(p => (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-gray-700 transition-colors text-left border-b border-gray-700/50 last:border-0"
            >
              <div className="min-w-0">
                <p className="text-white text-xs font-medium truncate">{p.name}</p>
                {p.category && <p className="text-gray-500 text-[10px]">{p.category}</p>}
              </div>
              <span className="text-violet-400 text-xs font-medium flex-shrink-0">
                {fmtMoney(p.price, p.currency)}
              </span>
            </button>
          ))
        )}
      </div>
    </motion.div>
  )
}

// ── Quote Builder Modal ──────────────────────────────────────────────────────

function QuoteBuilderModal({ quote, contacts, deals, products, onSave, onClose }) {
  const isEdit = !!quote
  const [form, setForm] = useState({
    title: quote?.title || '',
    contact_id: quote?.contact_id || null,
    deal_id: quote?.deal_id || null,
    client_name: quote?.client_name || '',
    client_email: quote?.client_email || '',
    client_company: quote?.client_company || '',
    notes: quote?.notes || 'Payment due within 14 days. Prices valid for 30 days from issue date.',
    currency: quote?.currency || 'USD',
    discount_type: quote?.discount_type || 'percent',
    discount_value: quote?.discount_value ?? 0,
    tax_percent: quote?.tax_percent ?? 0,
    valid_until: quote?.valid_until ? quote.valid_until.slice(0, 10) : '',
  })
  const [lineItems, setLineItems] = useState(
    quote?.line_items?.length
      ? quote.line_items.map(li => ({ ...li, _key: li.id }))
      : [{ _key: 'new-0', name: '', description: '', quantity: 1, unit_price: 0, product_id: null }]
  )
  const [showProductPicker, setShowProductPicker] = useState(null) // index of row, or null
  const [showContactPicker, setShowContactPicker] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const addLineItem = () => {
    setLineItems(prev => [...prev, { _key: `new-${Date.now()}`, name: '', description: '', quantity: 1, unit_price: 0, product_id: null }])
  }

  const updateLineItem = (idx, patch) => {
    setLineItems(prev => prev.map((li, i) => i === idx ? { ...li, ...patch } : li))
  }

  const removeLineItem = (idx) => {
    setLineItems(prev => prev.filter((_, i) => i !== idx))
  }

  const insertProduct = (idx, product) => {
    updateLineItem(idx, {
      product_id: product.id,
      name: product.name,
      description: product.description || '',
      unit_price: product.price,
    })
    setShowProductPicker(null)
  }

  const selectContact = (contact) => {
    setForm(prev => ({
      ...prev,
      contact_id: contact.id,
      client_name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
      client_email: contact.email || prev.client_email,
      client_company: contact.company || prev.client_company,
    }))
    setShowContactPicker(false)
    setContactSearch('')
  }

  const filteredContacts = contacts.filter(c => {
    const q = contactSearch.toLowerCase()
    return `${c.first_name} ${c.last_name} ${c.email || ''}`.toLowerCase().includes(q)
  }).slice(0, 6)

  // Live totals
  const subtotal = lineItems.reduce((s, li) => s + (parseFloat(li.quantity) || 0) * (parseFloat(li.unit_price) || 0), 0)
  const discountAmount = form.discount_type === 'percent'
    ? subtotal * (parseFloat(form.discount_value) || 0) / 100
    : Math.min(parseFloat(form.discount_value) || 0, subtotal)
  const taxableBase = subtotal - discountAmount
  const taxAmount = taxableBase * (parseFloat(form.tax_percent) || 0) / 100
  const total = taxableBase + taxAmount

  const handleSave = async (statusOverride) => {
    if (!form.title.trim()) { toast.error('Quote title is required'); return }
    const validItems = lineItems.filter(li => li.name.trim())
    if (validItems.length === 0) { toast.error('Add at least one line item'); return }

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        contact_id: form.contact_id || null,
        deal_id: form.deal_id || null,
        client_name: form.client_name.trim() || null,
        client_email: form.client_email.trim() || null,
        client_company: form.client_company.trim() || null,
        notes: form.notes.trim() || null,
        currency: form.currency,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value) || 0,
        tax_percent: parseFloat(form.tax_percent) || 0,
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
        line_items: validItems.map(li => ({
          product_id: li.product_id || null,
          name: li.name.trim(),
          description: li.description?.trim() || null,
          quantity: parseFloat(li.quantity) || 1,
          unit_price: parseFloat(li.unit_price) || 0,
        })),
      }
      if (statusOverride) payload.status = statusOverride

      await onSave(payload)
      onClose()
    } catch (err) {
      const detail = err.response?.data?.detail  
      toast.error(Array.isArray(detail) ? detail.map(e => e.msg).join(', ') : detail || 'Failed to save quote')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-3xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-600/20 rounded-xl flex items-center justify-center">
              <FileSignature className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">{isEdit ? 'Edit Quote' : 'New Quote'}</h2>
              {quote?.quote_number && <p className="text-gray-500 text-xs">{quote.quote_number}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Quote Title</label>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Website Redesign Proposal" autoFocus
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
          </div>

          {/* Client info */}
          <div className="bg-gray-800/40 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white text-sm font-medium flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-gray-500" /> Client Details
              </p>
              <div className="relative">
                <button onClick={() => setShowContactPicker(o => !o)}
                  className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors">
                  <User className="w-3 h-3" /> Pick from contacts
                </button>
                <AnimatePresence>
                  {showContactPicker && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      className="absolute right-0 top-full mt-1 w-72 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-20 overflow-hidden">
                      <div className="p-2 border-b border-gray-700">
                        <input autoFocus type="text" value={contactSearch} onChange={e => setContactSearch(e.target.value)}
                          placeholder="Search contacts..."
                          className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-violet-500" />
                      </div>
                      <div className="max-h-44 overflow-y-auto">
                        {filteredContacts.map(c => (
                          <button key={c.id} onClick={() => selectContact(c)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700 transition-colors text-left">
                            <div className="w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                              {c.first_name?.[0]}{c.last_name?.[0] || ''}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white text-xs font-medium">{c.first_name} {c.last_name}</p>
                              {c.email && <p className="text-gray-500 text-[10px] truncate">{c.email}</p>}
                            </div>
                          </button>
                        ))}
                        {filteredContacts.length === 0 && <p className="text-gray-600 text-xs text-center py-3">No contacts found</p>}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })}
                placeholder="Client name"
                className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
              <input type="text" value={form.client_company} onChange={e => setForm({ ...form, client_company: e.target.value })}
                placeholder="Company"
                className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
              <input type="email" value={form.client_email} onChange={e => setForm({ ...form, client_email: e.target.value })}
                placeholder="Email" className="col-span-2 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
            {deals.length > 0 && (
              <div className="mt-3">
                <label className="text-xs text-gray-500 mb-1 block">Link to Deal (optional)</label>
                <select value={form.deal_id || ''} onChange={e => setForm({ ...form, deal_id: e.target.value || null })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500">
                  <option value="">None</option>
                  {deals.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Line items */}
          <div>
            <p className="text-white text-sm font-medium mb-3 flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-gray-500" /> Line Items
            </p>
            <div className="space-y-2">
              {lineItems.map((li, idx) => (
                <div key={li._key} className="bg-gray-800/40 border border-gray-800 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <GripVertical className="w-4 h-4 text-gray-700 mt-2.5 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input type="text" value={li.name} onChange={e => updateLineItem(idx, { name: e.target.value, product_id: null })}
                            placeholder="Item name"
                            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
                        </div>
                        <button onClick={() => setShowProductPicker(showProductPicker === idx ? null : idx)}
                          className="flex-shrink-0 flex items-center gap-1 px-2.5 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs transition-colors relative">
                          <Package className="w-3 h-3" /> Catalog
                          <AnimatePresence>
                            {showProductPicker === idx && (
                              <ProductPicker products={products} onSelect={(p) => insertProduct(idx, p)} onClose={() => setShowProductPicker(null)} />
                            )}
                          </AnimatePresence>
                        </button>
                        <button onClick={() => removeLineItem(idx)} disabled={lineItems.length === 1}
                          className="flex-shrink-0 p-2 text-gray-600 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input type="text" value={li.description || ''} onChange={e => updateLineItem(idx, { description: e.target.value })}
                        placeholder="Description (optional)"
                        className="w-full bg-gray-800 border border-gray-700 text-gray-400 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-violet-500 transition-colors" />
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-500 text-xs">Qty</span>
                          <input type="number" min="0" step="0.01" value={li.quantity}
                            onChange={e => updateLineItem(idx, { quantity: e.target.value })}
                            className="w-20 bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-violet-500 transition-colors" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-500 text-xs">Price</span>
                          <input type="number" min="0" step="0.01" value={li.unit_price}
                            onChange={e => updateLineItem(idx, { unit_price: e.target.value })}
                            className="w-24 bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-violet-500 transition-colors" />
                        </div>
                        <span className="ml-auto text-violet-400 text-sm font-semibold">
                          {fmtMoney((parseFloat(li.quantity) || 0) * (parseFloat(li.unit_price) || 0), form.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addLineItem}
              className="mt-2 flex items-center gap-1.5 text-violet-400 hover:text-violet-300 text-xs transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add line item
            </button>
          </div>

          {/* Discount / Tax / Currency / Valid until */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Discount</label>
              <div className="flex gap-2">
                <input type="number" min="0" step="0.01" value={form.discount_value}
                  onChange={e => setForm({ ...form, discount_value: e.target.value })}
                  className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
                <select value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value })}
                  className="bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-violet-500">
                  <option value="percent">%</option>
                  <option value="fixed">{CURRENCY_SYMBOLS[form.currency] || form.currency}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tax %</label>
              <input type="number" min="0" step="0.01" value={form.tax_percent}
                onChange={e => setForm({ ...form, tax_percent: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Currency</label>
              <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500">
                {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Valid Until</label>
              <input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Notes / Terms</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none" />
          </div>

          {/* Live totals preview */}
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Subtotal</span>
              <span className="text-white">{fmtMoney(subtotal, form.currency)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Discount</span>
                <span className="text-red-400">-{fmtMoney(discountAmount, form.currency)}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Tax</span>
                <span className="text-white">{fmtMoney(taxAmount, form.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-700">
              <span className="text-white">Total</span>
              <span className="text-violet-400">{fmtMoney(total, form.currency)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-800">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">
            Cancel
          </button>
          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            onClick={() => handleSave(null)} disabled={saving}
            className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Save as Draft
          </motion.button>
          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            onClick={() => handleSave('sent')} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Save & Mark Sent
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Quote Detail / Preview Modal ─────────────────────────────────────────────

function QuoteDetailModal({ quote, onClose, onStatusChange, onEdit }) {
  const navigate = useNavigate()
  const statusCfg = STATUS_CONFIG[quote.status] || STATUS_CONFIG.draft
  const StatusIcon = statusCfg.icon

  const handleDownload = () => {
    const token = localStorage.getItem('token')
    const url = `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/quotes/${quote.id}/pdf`
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const blobUrl = window.URL.createObjectURL(blob)
        window.open(blobUrl, '_blank')
      })
      .catch(() => toast.error('Failed to generate PDF'))
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-2xl max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-white font-semibold text-lg">{quote.title}</h2>
              <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                <StatusIcon className="w-3 h-3" /> {statusCfg.label}
              </span>
            </div>
            <p className="text-gray-500 text-xs">{quote.quote_number}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Client */}
          <div className="bg-gray-800/40 rounded-xl p-4">
            <p className="text-gray-500 text-xs mb-2">Client</p>
            <p className="text-white text-sm font-medium">{quote.client_name || '—'}</p>
            {quote.client_company && <p className="text-gray-400 text-xs">{quote.client_company}</p>}
            {quote.client_email && <p className="text-gray-500 text-xs">{quote.client_email}</p>}
            {quote.contact && (
              <button onClick={() => navigate(`/dashboard/contacts/${quote.contact.id}`)}
                className="mt-2 flex items-center gap-1 text-violet-400 hover:text-violet-300 text-xs transition-colors">
                <ExternalLink className="w-3 h-3" /> View contact
              </button>
            )}
          </div>

          {/* Line items */}
          <div className="space-y-2">
            {quote.line_items.map(li => (
              <div key={li.id} className="flex items-center justify-between bg-gray-800/30 rounded-lg px-3 py-2">
                <div>
                  <p className="text-white text-sm">{li.name}</p>
                  <p className="text-gray-500 text-xs">{li.quantity} × {fmtMoney(li.unit_price, quote.currency)}</p>
                </div>
                <span className="text-white text-sm font-medium">{fmtMoney(li.quantity * li.unit_price, quote.currency)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-1.5">
            <div className="flex justify-between text-sm"><span className="text-gray-400">Subtotal</span><span className="text-white">{fmtMoney(quote.subtotal, quote.currency)}</span></div>
            {quote.discount_amount > 0 && <div className="flex justify-between text-sm"><span className="text-gray-400">Discount</span><span className="text-red-400">-{fmtMoney(quote.discount_amount, quote.currency)}</span></div>}
            {quote.tax_amount > 0 && <div className="flex justify-between text-sm"><span className="text-gray-400">Tax</span><span className="text-white">{fmtMoney(quote.tax_amount, quote.currency)}</span></div>}
            <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-700"><span className="text-white">Total</span><span className="text-violet-400">{fmtMoney(quote.total, quote.currency)}</span></div>
          </div>

          {/* Status actions */}
          <div className="flex flex-wrap gap-2">
            {quote.status === 'draft' && (
              <button onClick={() => onStatusChange(quote.id, 'sent')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs transition-colors">
                <Send className="w-3.5 h-3.5" /> Mark as Sent
              </button>
            )}
            {quote.status === 'sent' && (
              <>
                <button onClick={() => onStatusChange(quote.id, 'accepted')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs transition-colors">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark Accepted
                </button>
                <button onClick={() => onStatusChange(quote.id, 'declined')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs transition-colors">
                  <XCircle className="w-3.5 h-3.5" /> Mark Declined
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-800">
          <button onClick={() => onEdit(quote)}
            className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 hover:text-white text-sm transition-colors flex items-center justify-center gap-2">
            <Edit2 className="w-4 h-4" /> Edit
          </button>
          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={handleDownload}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
            <Download className="w-4 h-4" /> Download PDF
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main Quotes Page ──────────────────────────────────────────────────────────

export default function Quotes() {
  const [quotes, setQuotes] = useState([])
  const [contacts, setContacts] = useState([])
  const [deals, setDeals] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editQuote, setEditQuote] = useState(null)
  const [viewQuote, setViewQuote] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      const [quotesRes, contactsRes, dealsRes, productsRes] = await Promise.all([
        api.get('/quotes/'),
        api.get('/contacts/'),
        api.get('/deals/'),
        api.get('/products/?active_only=true'),
      ])
      setQuotes(quotesRes.data)
      setContacts(contactsRes.data)
      setDeals(dealsRes.data)
      setProducts(productsRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (data) => {
    const res = await api.post('/quotes/', data)
    setQuotes(prev => [res.data, ...prev])
    toast.success('Quote created!')
  }

  const handleUpdate = async (data) => {
    const res = await api.patch(`/quotes/${editQuote.id}`, data)
    setQuotes(prev => prev.map(q => q.id === editQuote.id ? res.data : q))
    setEditQuote(null)
    if (viewQuote?.id === res.data.id) setViewQuote(res.data)
    toast.success('Quote updated!')
  }

  const handleStatusChange = async (id, status) => {
    try {
      const res = await api.patch(`/quotes/${id}`, { status })
      setQuotes(prev => prev.map(q => q.id === id ? res.data : q))
      setViewQuote(res.data)
      toast.success(`Marked as ${status}`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this quote? This cannot be undone.')) return
    try {
      await api.delete(`/quotes/${id}`)
      setQuotes(prev => prev.filter(q => q.id !== id))
      toast.success('Quote deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const openEdit = (q) => {
    setEditQuote(q)
    setViewQuote(null)
    setShowBuilder(true)
  }

  const filtered = quotes.filter(q => {
    const matchStatus = statusFilter === 'all' || q.status === statusFilter
    const matchSearch = !search ||
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.quote_number.toLowerCase().includes(search.toLowerCase()) ||
      (q.client_name || '').toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const totalValue = quotes.reduce((s, q) => s + (q.total || 0), 0)
  const acceptedValue = quotes.filter(q => q.status === 'accepted').reduce((s, q) => s + (q.total || 0), 0)
  const pendingCount = quotes.filter(q => q.status === 'sent').length

  const statCards = [
    { label: 'Total Quotes', value: quotes.length, icon: FileSignature, color: 'bg-violet-500' },
    { label: 'Awaiting Response', value: pendingCount, icon: Clock, color: 'bg-blue-500' },
    { label: 'Accepted Value', value: `$${acceptedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: CheckCircle2, color: 'bg-green-500' },
    { label: 'Total Quoted', value: `$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: DollarSign, color: 'bg-orange-500' },
  ]

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Quotes</h1>
            <p className="text-gray-400 mt-1">Build, send, and track client proposals</p>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => { setEditQuote(null); setShowBuilder(true) }}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Quote
          </motion.button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }} className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
              <div className={`w-9 h-9 ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
                <stat.icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-gray-400 text-xs">{stat.label}</p>
              <p className="text-white text-xl font-bold mt-0.5">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search quotes, clients..."
              className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setStatusFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                statusFilter === 'all' ? 'bg-violet-600 text-white border-violet-500' : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
              }`}>
              All ({quotes.length})
            </button>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const count = quotes.filter(q => q.status === key).length
              if (count === 0) return null
              return (
                <button key={key} onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                    statusFilter === key ? `${cfg.bg} ${cfg.color} ${cfg.border} ring-1 ring-offset-1 ring-offset-gray-950 ring-violet-500` : 'bg-gray-900 text-gray-500 border-gray-800 hover:text-gray-300'
                  }`}>
                  {cfg.label} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-violet-500 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-violet-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileSignature className="w-8 h-8 text-violet-400" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">{quotes.length === 0 ? 'No quotes yet' : 'No quotes match'}</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
              {quotes.length === 0 ? 'Create your first quote to send a professional proposal to a client.' : 'Try adjusting your search or filters.'}
            </p>
            {quotes.length === 0 && (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setShowBuilder(true)}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors mx-auto">
                <Plus className="w-4 h-4" /> Create your first quote
              </motion.button>
            )}
          </div>
        ) : (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="divide-y divide-gray-800">
              {filtered.map((q, i) => {
                const cfg = STATUS_CONFIG[q.status] || STATUS_CONFIG.draft
                const Icon = cfg.icon
                return (
                  <motion.div key={q.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    onClick={() => setViewQuote(q)}
                    className="flex items-center justify-between p-5 hover:bg-gray-800/40 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-violet-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <FileSignature className="w-5 h-5 text-violet-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="text-white font-medium truncate">{q.title}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 flex-shrink-0 ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                            <Icon className="w-3 h-3" /> {cfg.label}
                          </span>
                        </div>
                        <p className="text-gray-500 text-sm truncate">
                          {q.quote_number} {q.client_name && `· ${q.client_name}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-white font-semibold">{fmtMoney(q.total, q.currency)}</p>
                        <p className="text-gray-600 text-xs"><TimeAgo dateString={q.created_at} /></p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); handleDelete(q.id) }}
                        className="p-1.5 text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showBuilder && (
          <QuoteBuilderModal
            quote={editQuote}
            contacts={contacts}
            deals={deals}
            products={products}
            onSave={editQuote ? handleUpdate : handleCreate}
            onClose={() => { setShowBuilder(false); setEditQuote(null) }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewQuote && !showBuilder && (
          <QuoteDetailModal
            quote={viewQuote}
            onClose={() => setViewQuote(null)}
            onStatusChange={handleStatusChange}
            onEdit={openEdit}
          />
        )}
      </AnimatePresence>
    </div>
  )
}