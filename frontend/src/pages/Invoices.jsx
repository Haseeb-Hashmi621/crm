// frontend/src/pages/Invoices.jsx
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Plus, X, Loader2, Search, Edit2,
  Trash2, Check, DollarSign, Clock, AlertCircle,
  CheckCircle2, XCircle, Download, ChevronDown,
  User, Building2, Calendar, CreditCard, Package,
  RefreshCw, Filter, TrendingUp, ReceiptText
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  unpaid: {
    label: 'Unpaid', color: 'text-yellow-400',
    bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: Clock,
  },
  partially_paid: {
    label: 'Partial', color: 'text-orange-400',
    bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: CreditCard,
  },
  paid: {
    label: 'Paid', color: 'text-green-400',
    bg: 'bg-green-500/10', border: 'border-green-500/30', icon: CheckCircle2,
  },
  overdue: {
    label: 'Overdue', color: 'text-red-400',
    bg: 'bg-red-500/10', border: 'border-red-500/30', icon: AlertCircle,
  },
  cancelled: {
    label: 'Cancelled', color: 'text-gray-400',
    bg: 'bg-gray-500/10', border: 'border-gray-500/30', icon: XCircle,
  },
  void: {
    label: 'Void', color: 'text-gray-500',
    bg: 'bg-gray-500/10', border: 'border-gray-500/30', icon: XCircle,
  },
}

const CURRENCIES = ['BHD', 'USD', 'EUR']

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount, currency = 'USD') {
  const sym = { BHD: 'BHD ', USD: '$', EUR: '€' }[currency] || `${currency} `
  return `${sym}${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function calcLineTotal(qty, unitPrice, discountPct) {
  const base = qty * unitPrice
  return Math.round(base * (1 - discountPct / 100) * 100) / 100
}

function calcTotals(lines, discountPct, taxPct) {
  // VAT applies only to line items with the VAT checkbox on
  const subtotal = lines.reduce((s, l) => s + calcLineTotal(l.quantity, l.unit_price, l.discount_pct), 0)
  const vatableSubtotal = lines.reduce((s, l) => s + (l.vat_applicable !== false ? calcLineTotal(l.quantity, l.unit_price, l.discount_pct) : 0), 0)
  const discountAmount = Math.round(subtotal * discountPct / 100 * 100) / 100
  const taxable = vatableSubtotal * (1 - discountPct / 100)
  const taxAmount = Math.round(taxable * taxPct / 100 * 100) / 100
  const total = Math.round((subtotal - discountAmount + taxAmount) * 100) / 100
  return { subtotal, discountAmount, taxAmount, total }
}

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Line Item Row ─────────────────────────────────────────────────────────────

function LineItemRow({ item, index, products, onChange, onRemove }) {
  const [showProductPicker, setShowProductPicker] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowProductPicker(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const total = calcLineTotal(item.quantity, item.unit_price, item.discount_pct)

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="grid gap-2 items-center"
      style={{ gridTemplateColumns: '1fr 70px 95px 70px 44px 100px 32px' }}
    >
      {/* Description / Product picker */}
      <div ref={ref} className="relative">
        <input
          type="text"
          value={item.description}
          onChange={e => onChange(index, { ...item, description: e.target.value })}
          onFocus={() => setShowProductPicker(true)}
          placeholder="Description or pick a product..."
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-violet-500 transition-colors"
        />
        <AnimatePresence>
          {showProductPicker && products.filter(p =>
            p.name.toLowerCase().includes(item.description.toLowerCase()) && p.is_active
          ).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute left-0 right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden max-h-72 overflow-y-auto"
            >
              {products
                .filter(p => p.name.toLowerCase().includes(item.description.toLowerCase()) && p.is_active)
                .map(p => (
                  <button
                    key={p.id}
                    onMouseDown={() => {
                      onChange(index, {
                        ...item,
                        description: p.name,
                        unit_price: p.price,
                        product_id: p.id,
                        discount_pct: 0,
                      })
                      setShowProductPicker(false)
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-700 transition-colors text-left"
                  >
                    <span className="text-white text-xs">{p.name}</span>
                    <span className="text-violet-400 text-xs">{fmt(p.price, p.currency)}</span>
                  </button>
                ))
              }
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Qty */}
      <input
        type="number"
        min="0.01"
        step="0.01"
        value={item.quantity}
        onChange={e => onChange(index, { ...item, quantity: parseFloat(e.target.value) || 1 })}
        className="bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-2 text-xs text-center focus:outline-none focus:border-violet-500 transition-colors"
      />

      {/* Unit price */}
      <input
        type="number"
        min="0"
        step="0.01"
        value={item.unit_price}
        onChange={e => onChange(index, { ...item, unit_price: parseFloat(e.target.value) || 0 })}
        className="bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-2 text-xs text-right focus:outline-none focus:border-violet-500 transition-colors"
      />

      {/* Discount % */}
      <div className="relative">
        <input
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={item.discount_pct}
          onChange={e => onChange(index, { ...item, discount_pct: parseFloat(e.target.value) || 0 })}
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-2 text-xs text-center focus:outline-none focus:border-violet-500 transition-colors"
        />
      </div>

      {/* VAT applicable */}
      <div className="flex justify-end pr-1" title="Charge VAT on this item">
        <input
          type="checkbox"
          checked={item.vat_applicable !== false}
          onChange={e => onChange(index, { ...item, vat_applicable: e.target.checked })}
          className="accent-violet-500 w-3.5 h-3.5 cursor-pointer"
        />
      </div>

      {/* Total */}
      <div className="text-white text-xs text-right font-medium px-1">
        {fmt(total)}
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(index)}
        className="p-1 text-gray-600 hover:text-red-400 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  )
}

// ── Invoice Form Modal ────────────────────────────────────────────────────────

function InvoiceModal({ invoice, contacts, products, onSave, onClose }) {
  const isEdit = !!invoice

  const [form, setForm] = useState({
    contact_id: invoice?.contact_id || null,
    client_name: invoice?.client_name || '',
    client_email: invoice?.client_email || '',
    client_company: invoice?.client_company || '',
    client_address: invoice?.client_address || '',
    currency: invoice?.currency || 'BHD',
    discount_pct: invoice?.discount_pct ?? 0,
    tax_pct: invoice?.tax_pct ?? 0,
    due_date: invoice?.due_date ? invoice.due_date.slice(0, 10) : '',
    notes: invoice?.notes || '',
    terms: invoice?.terms || 'Payment due within 30 days.',
    line_items: invoice?.line_items?.length > 0
      ? invoice.line_items.map(li => ({
          description: li.description,
          quantity: li.quantity,
          unit_price: li.unit_price,
          discount_pct: li.discount_pct,
          vat_applicable: li.vat_applicable ?? true,
          product_id: li.product_id || null,
          sort_order: li.sort_order,
        }))
      : [{ description: '', quantity: 1, unit_price: 0, discount_pct: 0, vat_applicable: true, product_id: null, sort_order: 0 }],
  })

  const [saving, setSaving] = useState(false)
  const [showContactPicker, setShowContactPicker] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const contactRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (contactRef.current && !contactRef.current.contains(e.target)) setShowContactPicker(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectedContact = contacts.find(c => c.id === form.contact_id)

  const selectContact = (c) => {
    setForm(prev => ({
      ...prev,
      contact_id: c.id,
      client_name: prev.client_name || `${c.first_name || ''} ${c.last_name || ''}`.trim(),
      client_email: prev.client_email || c.email || '',
      client_company: prev.client_company || c.company || '',
    }))
    setShowContactPicker(false)
    setContactSearch('')
  }

  const updateLine = (idx, updated) => {
    setForm(prev => ({ ...prev, line_items: prev.line_items.map((l, i) => i === idx ? updated : l) }))
  }
  const removeLine = (idx) => {
    setForm(prev => ({ ...prev, line_items: prev.line_items.filter((_, i) => i !== idx) }))
  }
  const addLine = () => {
    setForm(prev => ({
      ...prev,
      line_items: [...prev.line_items, {
        description: '', quantity: 1, unit_price: 0, discount_pct: 0,
        vat_applicable: true, product_id: null, sort_order: prev.line_items.length
      }]
    }))
  }

  const totals = calcTotals(form.line_items, form.discount_pct, form.tax_pct)

  const handleSave = async () => {
    if (form.line_items.every(l => !l.description.trim())) {
      toast.error('Add at least one line item'); return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        discount_pct: parseFloat(form.discount_pct) || 0,
        tax_pct: parseFloat(form.tax_pct) || 0,
        line_items: form.line_items
          .filter(l => l.description.trim())
          .map((l, i) => ({ ...l, sort_order: i })),
      }
      await onSave(payload)
      onClose()
    } catch {
      toast.error('Failed to save invoice')
    } finally {
      setSaving(false)
    }
  }

  const filteredContacts = contacts.filter(c =>
    `${c.first_name} ${c.last_name} ${c.email || ''}`.toLowerCase().includes(contactSearch.toLowerCase())
  ).slice(0, 6)

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
        className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-3xl max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-600/20 rounded-xl flex items-center justify-center">
              <ReceiptText className="w-5 h-5 text-violet-400" />
            </div>
            <h2 className="text-white font-semibold text-lg">
              {isEdit ? `Edit ${invoice.invoice_number}` : 'New Invoice'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Contact + client info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Link Contact</label>
              <div ref={contactRef} className="relative">
                <div
                  onClick={() => setShowContactPicker(o => !o)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm cursor-pointer flex items-center gap-2 hover:border-violet-500 transition-colors"
                >
                  {selectedContact ? (
                    <>
                      <div className="w-5 h-5 bg-violet-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                        {selectedContact.first_name?.[0]}{selectedContact.last_name?.[0] || ''}
                      </div>
                      <span>{selectedContact.first_name} {selectedContact.last_name}</span>
                      <button onClick={e => { e.stopPropagation(); setForm(p => ({ ...p, contact_id: null })) }}
                        className="ml-auto text-gray-500 hover:text-red-400">
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <span className="text-gray-500 flex items-center gap-2">
                      <User className="w-3.5 h-3.5" /> Select contact (optional)
                    </span>
                  )}
                </div>
                <AnimatePresence>
                  {showContactPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute left-0 right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-2 border-b border-gray-700">
                        <input autoFocus type="text" value={contactSearch}
                          onChange={e => setContactSearch(e.target.value)}
                          placeholder="Search contacts..."
                          className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-violet-500 transition-colors" />
                      </div>
                      <div className="max-h-40 overflow-y-auto py-1">
                        {filteredContacts.map(c => (
                          <button key={c.id} onClick={() => selectContact(c)}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-700 transition-colors text-left">
                            <div className="w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                              {c.first_name?.[0]}{c.last_name?.[0] || ''}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white text-xs font-medium">{c.first_name} {c.last_name}</p>
                              {c.email && <p className="text-gray-500 text-[10px] truncate">{c.email}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Due Date</label>
              <input type="date" value={form.due_date}
                onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
          </div>

          {/* Client details */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: 'client_name', label: 'Client Name', placeholder: 'John Smith' },
              { key: 'client_email', label: 'Client Email', placeholder: 'john@company.com' },
              { key: 'client_company', label: 'Company', placeholder: 'Acme Corp' },
              { key: 'client_address', label: 'Address', placeholder: '123 Main St...' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-sm font-medium text-gray-300 mb-1.5 block">{f.label}</label>
                <input type="text" value={form[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
              </div>
            ))}
          </div>

          {/* Currency */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Currency</label>
              <select value={form.currency}
                onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors">
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Discount %</label>
              <input type="number" min="0" max="100" step="0.1"
                value={form.discount_pct}
                onChange={e => setForm(p => ({ ...p, discount_pct: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Tax %</label>
              <input type="number" min="0" max="100" step="0.1"
                value={form.tax_pct}
                onChange={e => setForm(p => ({ ...p, tax_pct: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-300">Line Items</label>
              <span className="text-gray-600 text-xs flex items-center gap-1">
                <Package className="w-3 h-3" /> Type to pick from Products catalog
              </span>
            </div>

            {/* Column headers */}
            <div className="grid gap-2 mb-2 px-0.5"
              style={{ gridTemplateColumns: '1fr 70px 95px 70px 44px 100px 32px' }}>
              {['Description', 'Qty', 'Unit Price', 'Disc %', 'VAT', 'Total', ''].map((h, i) => (
                <span key={i} className={`text-[10px] font-semibold text-gray-500 uppercase tracking-wide ${i >= 1 ? 'text-right' : ''} ${i === 5 ? 'text-center' : ''}`}>
                  {h}
                </span>
              ))}
            </div>

            <div className="space-y-2">
              <AnimatePresence>
                {form.line_items.map((item, idx) => (
                  <LineItemRow key={idx} item={item} index={idx}
                    products={products}
                    onChange={updateLine}
                    onRemove={removeLine} />
                ))}
              </AnimatePresence>
            </div>

            <button onClick={addLine}
              className="mt-3 flex items-center gap-2 text-violet-400 hover:text-violet-300 text-sm transition-colors">
              <Plus className="w-4 h-4" /> Add line item
            </button>
          </div>

          {/* Totals preview */}
          <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span><span>{fmt(totals.subtotal, form.currency)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-orange-400">
                  <span>Discount ({form.discount_pct}%)</span>
                  <span>− {fmt(totals.discountAmount, form.currency)}</span>
                </div>
              )}
              {totals.taxAmount > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Tax ({form.tax_pct}%)</span>
                  <span>{fmt(totals.taxAmount, form.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-bold text-base pt-2 border-t border-gray-700">
                <span>Total</span><span className="text-violet-400">{fmt(totals.total, form.currency)}</span>
              </div>
            </div>
          </div>

          {/* Notes + Terms */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Notes</label>
              <textarea value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Thank you for your business!"
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Payment Terms</label>
              <textarea value={form.terms}
                onChange={e => setForm(p => ({ ...p, terms: e.target.value }))}
                placeholder="Payment due within 30 days."
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none" />
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
            onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Invoice'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Record Payment Modal ───────────────────────────────────────────────────────

function PaymentModal({ invoice, onClose, onPaid }) {
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const balance = invoice.total - invoice.amount_paid

  const handleRecord = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return }
    if (amt > balance) { toast.error(`Amount exceeds balance of ${fmt(balance, invoice.currency)}`); return }
    setSaving(true)
    try {
      const res = await api.patch(`/invoices/${invoice.id}/record-payment?amount=${amt}`)
      toast.success(`Payment of ${fmt(amt, invoice.currency)} recorded!`)
      onPaid(res.data)
      onClose()
    } catch {
      toast.error('Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Record Payment</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          Invoice <span className="text-white font-medium">{invoice.invoice_number}</span> —
          Balance due: <span className="text-yellow-400 font-semibold">{fmt(balance, invoice.currency)}</span>
        </p>
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-300 mb-1.5 block">Payment Amount</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input type="number" min="0.01" step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
          </div>
          <button onClick={() => setAmount(balance.toFixed(2))}
            className="mt-2 text-xs text-violet-400 hover:text-violet-300 transition-colors">
            Pay full balance ({fmt(balance, invoice.currency)})
          </button>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">
            Cancel
          </button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleRecord} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            {saving ? 'Recording...' : 'Record Payment'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Invoice Card ──────────────────────────────────────────────────────────────

function InvoiceCard({ invoice, onEdit, onDelete, onDownloadPdf, onPayment, onStatusChange }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const cfg = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.unpaid
  const StatusIcon = cfg.icon
  const balance = invoice.total - invoice.amount_paid
  const paidPct = invoice.total > 0 ? Math.min((invoice.amount_paid / invoice.total) * 100, 100) : 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all group flex flex-col gap-3"
    >
      {/* Top */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-semibold text-sm">{invoice.invoice_number}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${cfg.bg} ${cfg.color} ${cfg.border}`}>
              <StatusIcon className="w-2.5 h-2.5" />
              {cfg.label}
            </span>
          </div>
          {(invoice.client_name || invoice.client_company) && (
            <p className="text-gray-400 text-xs truncate">
              {invoice.client_name}
              {invoice.client_company && ` · ${invoice.client_company}`}
            </p>
          )}
        </div>

        {/* Menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="p-1.5 text-gray-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-20 overflow-hidden w-44"
                onMouseLeave={() => setMenuOpen(false)}
              >
                {[
                  { label: 'Edit', icon: Edit2, action: () => { onEdit(invoice); setMenuOpen(false) } },
                  { label: 'Download PDF', icon: Download, action: () => { onDownloadPdf(invoice); setMenuOpen(false) } },
                  invoice.status !== 'paid' && { label: 'Record Payment', icon: CreditCard, action: () => { onPayment(invoice); setMenuOpen(false) } },
                  { label: 'Mark Paid', icon: CheckCircle2, action: () => { onStatusChange(invoice.id, 'paid'); setMenuOpen(false) } },
                  { label: 'Mark Overdue', icon: AlertCircle, action: () => { onStatusChange(invoice.id, 'overdue'); setMenuOpen(false) } },
                  { label: 'Void', icon: XCircle, action: () => { onStatusChange(invoice.id, 'void'); setMenuOpen(false) } },
                  { label: 'Delete', icon: Trash2, action: () => { onDelete(invoice.id); setMenuOpen(false) }, danger: true },
                ].filter(Boolean).map((item, i) => (
                  <button key={i} onClick={item.action}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-colors ${item.danger ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>
                    <item.icon className="w-3.5 h-3.5" />
                    {item.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Amount */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-white text-xl font-bold">{fmt(invoice.total, invoice.currency)}</p>
          {invoice.amount_paid > 0 && invoice.status !== 'paid' && (
            <p className="text-gray-500 text-xs">
              {fmt(invoice.amount_paid, invoice.currency)} paid · <span className="text-yellow-400">{fmt(balance, invoice.currency)} due</span>
            </p>
          )}
        </div>
        <div className="text-right">
          {invoice.due_date && (
            <p className="text-gray-500 text-xs flex items-center gap-1 justify-end">
              <Calendar className="w-3 h-3" />
              Due {formatDate(invoice.due_date)}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar (partial payment) */}
      {invoice.amount_paid > 0 && invoice.status !== 'paid' && (
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${paidPct}%` }}
            className="h-full bg-green-500 rounded-full"
          />
        </div>
      )}

      {/* Quick actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-800">
        <button
          onClick={() => onDownloadPdf(invoice)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg text-xs transition-colors"
        >
          <Download className="w-3 h-3" /> PDF
        </button>
        {invoice.status !== 'paid' && (
          <button
            onClick={() => onPayment(invoice)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-xs transition-colors border border-green-500/30"
          >
            <CreditCard className="w-3 h-3" /> Record Payment
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ── Main Invoices Page ────────────────────────────────────────────────────────

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [contacts, setContacts] = useState([])
  const [products, setProducts] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editInvoice, setEditInvoice] = useState(null)
  const [paymentInvoice, setPaymentInvoice] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    try {
      const [invRes, ctRes, prRes, stRes] = await Promise.all([
        api.get('/invoices/'),
        api.get('/contacts/'),
        api.get('/products/?active_only=true'),
        api.get('/invoices/stats'),
      ])
      setInvoices(invRes.data)
      setContacts(ctRes.data)
      setProducts(prRes.data)
      setStats(stRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (data) => {
    const res = await api.post('/invoices/', data)
    setInvoices(prev => [res.data, ...prev])
    toast.success(`Invoice ${res.data.invoice_number} created!`)
    fetchAll()  // refresh stats
  }

  const handleUpdate = async (data) => {
    const res = await api.patch(`/invoices/${editInvoice.id}`, data)
    setInvoices(prev => prev.map(i => i.id === editInvoice.id ? res.data : i))
    setEditInvoice(null)
    toast.success('Invoice updated!')
    fetchAll()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this invoice?')) return
    try {
      await api.delete(`/invoices/${id}`)
      setInvoices(prev => prev.filter(i => i.id !== id))
      toast.success('Invoice deleted')
      fetchAll()
    } catch { toast.error('Failed to delete') }
  }

  const handleStatusChange = async (id, status) => {
    try {
      const res = await api.patch(`/invoices/${id}/status?status=${status}`)
      setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: res.data.status } : i))
      toast.success(`Marked as ${STATUS_CONFIG[status]?.label || status}`)
      fetchAll()
    } catch { toast.error('Failed to update status') }
  }

  const handleDownloadPdf = async (invoice) => {
    try {
      toast('Generating PDF...', { icon: '📄' })
      const token = localStorage.getItem('token')
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/invoices/${invoice.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('PDF generation failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice.invoice_number}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch { toast.error('PDF generation failed') }
  }

  const handlePaymentRecorded = (data) => {
    setInvoices(prev => prev.map(i => i.id === data.id
      ? { ...i, amount_paid: data.amount_paid, status: data.status }
      : i
    ))
    fetchAll()
  }

  const filtered = invoices.filter(i => {
    const matchSearch = !search ||
      i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (i.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.client_company || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || i.status === filterStatus
    return matchSearch && matchStatus
  })

  const statCards = stats ? [
    { label: 'Total Invoiced', value: fmt(stats.total_invoiced), icon: ReceiptText, color: 'bg-violet-500' },
    { label: 'Total Paid', value: fmt(stats.total_paid), icon: CheckCircle2, color: 'bg-green-500' },
    { label: 'Outstanding', value: fmt(stats.total_outstanding), icon: Clock, color: 'bg-yellow-500' },
    { label: 'Overdue', value: stats.overdue_count, icon: AlertCircle, color: 'bg-red-500' },
  ] : []

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Invoices</h1>
            <p className="text-gray-400 mt-1">Track payments and billing</p>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => { setEditInvoice(null); setShowModal(true) }}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Invoice
          </motion.button>
        </div>

        {/* Stats */}
        {stats && (
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
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search invoices..."
              className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors" />
            {search && <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
              <X className="w-3.5 h-3.5" />
            </button>}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setFilterStatus('all')}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${filterStatus === 'all' ? 'bg-violet-600 text-white border-violet-500' : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'}`}>
              All ({invoices.length})
            </button>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const count = invoices.filter(i => i.status === key).length
              if (count === 0 && filterStatus !== key) return null
              return (
                <button key={key} onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${filterStatus === key ? `${cfg.bg} ${cfg.color} ${cfg.border}` : 'bg-gray-900 text-gray-500 border-gray-800 hover:text-gray-300'}`}>
                  <cfg.icon className="w-3 h-3" />
                  {cfg.label} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-violet-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ReceiptText className="w-8 h-8 text-violet-400" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">
              {invoices.length === 0 ? 'No invoices yet' : 'No invoices match'}
            </h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
              {invoices.length === 0
                ? 'Create your first invoice to start tracking payments.'
                : 'Try adjusting your search or filters.'}
            </p>
            {invoices.length === 0 && (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors mx-auto">
                <Plus className="w-4 h-4" /> Create first invoice
              </motion.button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map(invoice => (
                <InvoiceCard
                  key={invoice.id}
                  invoice={invoice}
                  onEdit={inv => { setEditInvoice(inv); setShowModal(true) }}
                  onDelete={handleDelete}
                  onDownloadPdf={handleDownloadPdf}
                  onPayment={inv => setPaymentInvoice(inv)}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {showModal && (
          <InvoiceModal
            invoice={editInvoice}
            contacts={contacts}
            products={products}
            onSave={editInvoice ? handleUpdate : handleCreate}
            onClose={() => { setShowModal(false); setEditInvoice(null) }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {paymentInvoice && (
          <PaymentModal
            invoice={paymentInvoice}
            onClose={() => setPaymentInvoice(null)}
            onPaid={handlePaymentRecorded}
          />
        )}
      </AnimatePresence>
    </div>
  )
}