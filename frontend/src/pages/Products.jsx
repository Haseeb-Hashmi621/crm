// frontend/src/pages/Products.jsx
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, Plus, X, Loader2, Search, Edit2,
  Trash2, Check, Tag, DollarSign, ToggleLeft,
  ToggleRight, Hash, Archive, TrendingUp, Filter,
  ChevronDown, Layers
} from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

// ── Constants ─────────────────────────────────────────────────────────────────

const UNIT_OPTIONS = [
  'unit', 'hour', 'day', 'week', 'month', 'year',
  'kg', 'g', 'lb', 'oz', 'l', 'ml', 'piece', 'set', 'license',
]

const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'PKR', 'AED', 'SAR', 'INR', 'CAD', 'AUD']

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(price, currency = 'USD') {
  if (currency === 'USD') return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (currency === 'EUR') return `€${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (currency === 'GBP') return `£${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return `${currency} ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function calcMargin(price, cost) {
  if (!cost || cost <= 0 || !price || price <= 0) return null
  return Math.round(((price - cost) / price) * 100)
}

// ── Category Badge ────────────────────────────────────────────────────────────

const CAT_COLORS = [
  'bg-violet-500/20 text-violet-300 border-violet-500/40',
  'bg-blue-500/20 text-blue-300 border-blue-500/40',
  'bg-green-500/20 text-green-300 border-green-500/40',
  'bg-orange-500/20 text-orange-300 border-orange-500/40',
  'bg-pink-500/20 text-pink-300 border-pink-500/40',
  'bg-teal-500/20 text-teal-300 border-teal-500/40',
  'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  'bg-red-500/20 text-red-300 border-red-500/40',
]

function catColor(name) {
  if (!name) return CAT_COLORS[0]
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return CAT_COLORS[Math.abs(h) % CAT_COLORS.length]
}

// ── Product Form Modal ────────────────────────────────────────────────────────

function ProductModal({ product, categories, onSave, onClose }) {
  const isEdit = !!product
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    sku: product?.sku || '',
    category: product?.category || '',
    unit: product?.unit || 'unit',
    price: product?.price ?? '',
    cost: product?.cost ?? '',
    currency: product?.currency || 'USD',
    is_active: product?.is_active ?? true,
    stock_qty: product?.stock_qty ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [showCatDropdown, setShowCatDropdown] = useState(false)

  const margin = calcMargin(parseFloat(form.price), parseFloat(form.cost))

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Product name is required'); return }
    if (form.price === '' || isNaN(parseFloat(form.price))) {
      toast.error('Price is required'); return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        sku: form.sku.trim() || null,
        category: form.category.trim() || null,
        unit: form.unit || null,
        price: parseFloat(form.price) || 0,
        cost: form.cost !== '' ? parseFloat(form.cost) : null,
        currency: form.currency,
        is_active: form.is_active,
        stock_qty: form.stock_qty !== '' ? parseInt(form.stock_qty) : null,
      }
      await onSave(payload)
      onClose()
    } catch {
      toast.error('Failed to save product')
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
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-600/20 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-violet-400" />
            </div>
            <h2 className="text-white font-semibold text-lg">
              {isEdit ? 'Edit Product' : 'New Product'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Name + Active toggle */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">
                Product / Service Name <span className="text-violet-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Web Design Package"
                autoFocus
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <div className="flex-shrink-0">
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Status</label>
              <button
                onClick={() => setForm({ ...form, is_active: !form.is_active })}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  form.is_active
                    ? 'bg-green-500/10 text-green-400 border-green-500/40'
                    : 'bg-gray-800 text-gray-500 border-gray-700'
                }`}
              >
                {form.is_active
                  ? <><ToggleRight className="w-4 h-4" /> Active</>
                  : <><ToggleLeft className="w-4 h-4" /> Inactive</>
                }
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description of what this product or service includes..."
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none"
            />
          </div>

          {/* SKU + Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">SKU / Code</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  value={form.sku}
                  onChange={e => setForm({ ...form, sku: e.target.value })}
                  placeholder="e.g. WD-001"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </div>
            <div className="relative">
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Category</label>
              <input
                type="text"
                value={form.category}
                onChange={e => { setForm({ ...form, category: e.target.value }); setShowCatDropdown(true) }}
                onFocus={() => setShowCatDropdown(true)}
                onBlur={() => setTimeout(() => setShowCatDropdown(false), 150)}
                placeholder="e.g. Services, Software..."
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              />
              <AnimatePresence>
                {showCatDropdown && categories.filter(c => c.toLowerCase().includes((form.category || '').toLowerCase()) && c !== form.category).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute left-0 right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-10 overflow-hidden"
                  >
                    {categories
                      .filter(c => c.toLowerCase().includes((form.category || '').toLowerCase()) && c !== form.category)
                      .slice(0, 5)
                      .map(cat => (
                        <button
                          key={cat}
                          onMouseDown={() => setForm({ ...form, category: cat })}
                          className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                        >
                          {cat}
                        </button>
                      ))
                    }
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Price + Cost + Currency */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">
                Price <span className="text-violet-400">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={e => setForm({ ...form, price: e.target.value })}
                  placeholder="0.00"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">
                Cost <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost}
                  onChange={e => setForm({ ...form, cost: e.target.value })}
                  placeholder="0.00"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Currency</label>
              <select
                value={form.currency}
                onChange={e => setForm({ ...form, currency: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              >
                {CURRENCY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Margin indicator */}
          {margin !== null && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm ${
                margin >= 50
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : margin >= 25
                  ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span className="font-medium">{margin}% margin</span>
              <span className="text-gray-500 text-xs ml-1">
                (profit: {formatPrice(parseFloat(form.price) - parseFloat(form.cost), form.currency)})
              </span>
            </motion.div>
          )}

          {/* Unit + Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Unit</label>
              <select
                value={form.unit}
                onChange={e => setForm({ ...form, unit: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              >
                {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">
                Stock Qty <span className="text-gray-500 font-normal">(blank = unlimited)</span>
              </label>
              <div className="relative">
                <Archive className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="number"
                  min="0"
                  value={form.stock_qty}
                  onChange={e => setForm({ ...form, stock_qty: e.target.value })}
                  placeholder="Unlimited"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </div>
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
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Product'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({ product, onEdit, onDelete, onToggleActive }) {
  const margin = calcMargin(product.price, product.cost)
  const cc = catColor(product.category)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-gray-900 border rounded-2xl p-5 flex flex-col gap-3 transition-all group ${
        product.is_active ? 'border-gray-800 hover:border-gray-700' : 'border-gray-800 opacity-60'
      }`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-white font-semibold text-sm truncate">{product.name}</h3>
            {!product.is_active && (
              <span className="text-[10px] px-1.5 py-0.5 bg-gray-700/60 text-gray-500 border border-gray-700 rounded-full">
                Inactive
              </span>
            )}
          </div>
          {product.category && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cc}`}>
              {product.category}
            </span>
          )}
        </div>

        {/* Actions — visible on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => onToggleActive(product)}
            className={`p-1.5 rounded-lg transition-colors ${
              product.is_active
                ? 'text-gray-500 hover:text-yellow-400'
                : 'text-gray-500 hover:text-green-400'
            }`}
            title={product.is_active ? 'Deactivate' : 'Activate'}
          >
            {product.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onEdit(product)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-violet-400 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">{product.description}</p>
      )}

      {/* Price row */}
      <div className="flex items-end justify-between mt-auto pt-2 border-t border-gray-800">
        <div>
          <p className="text-white text-xl font-bold">
            {formatPrice(product.price, product.currency)}
          </p>
          {product.unit && (
            <p className="text-gray-500 text-xs">per {product.unit}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {margin !== null && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              margin >= 50 ? 'bg-green-500/10 text-green-400' :
              margin >= 25 ? 'bg-yellow-500/10 text-yellow-400' :
              'bg-red-500/10 text-red-400'
            }`}>
              {margin}% margin
            </span>
          )}
          {product.sku && (
            <span className="text-[10px] text-gray-600 font-mono">#{product.sku}</span>
          )}
          {product.stock_qty !== null && product.stock_qty !== undefined && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
              product.stock_qty <= 5
                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                : 'bg-gray-800 text-gray-500 border-gray-700'
            }`}>
              {product.stock_qty} in stock
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ── Main Products Page ────────────────────────────────────────────────────────

export default function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [activeOnly, setActiveOnly] = useState(false)

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products/')
      setProducts(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await api.get('/products/categories')
      setCategories(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreate = async (data) => {
    const res = await api.post('/products/', data)
    setProducts(prev => [res.data, ...prev])
    if (res.data.category && !categories.includes(res.data.category)) {
      setCategories(prev => [...prev, res.data.category])
    }
    toast.success('Product created!')
  }

  const handleUpdate = async (data) => {
    const res = await api.patch(`/products/${editProduct.id}`, data)
    setProducts(prev => prev.map(p => p.id === editProduct.id ? res.data : p))
    setEditProduct(null)
    toast.success('Product updated!')
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return
    try {
      await api.delete(`/products/${id}`)
      setProducts(prev => prev.filter(p => p.id !== id))
      toast.success('Product deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleToggleActive = async (product) => {
    try {
      const res = await api.patch(`/products/${product.id}`, { is_active: !product.is_active })
      setProducts(prev => prev.map(p => p.id === product.id ? res.data : p))
      toast.success(res.data.is_active ? 'Product activated' : 'Product deactivated')
    } catch {
      toast.error('Failed to update')
    }
  }

  const openEdit = (product) => {
    setEditProduct(product)
    setShowModal(true)
  }

  // Client-side filter (on top of any search)
  const filtered = products.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCategory === 'all' || p.category === filterCategory
    const matchActive = !activeOnly || p.is_active
    return matchSearch && matchCat && matchActive
  })

  // Stats
  const activeCount = products.filter(p => p.is_active).length
  const avgPrice = products.length > 0
    ? products.reduce((s, p) => s + p.price, 0) / products.length
    : 0
  const catCount = new Set(products.map(p => p.category).filter(Boolean)).size

  const statCards = [
    { label: 'Total Products', value: products.length, icon: Package, color: 'bg-violet-500' },
    { label: 'Active', value: activeCount, icon: ToggleRight, color: 'bg-green-500' },
    { label: 'Categories', value: catCount, icon: Layers, color: 'bg-blue-500' },
    { label: 'Avg Price', value: `$${avgPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: DollarSign, color: 'bg-orange-500' },
  ]

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Products & Services</h1>
            <p className="text-gray-400 mt-1">Your catalog of billable items</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setEditProduct(null); setShowModal(true) }}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Product
          </motion.button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-gray-900 rounded-2xl p-5 border border-gray-800"
            >
              <div className={`w-9 h-9 ${stat.color} rounded-xl flex items-center justify-center mb-3`}>
                <stat.icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-gray-400 text-xs">{stat.label}</p>
              <p className="text-white text-2xl font-bold mt-0.5">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search products, SKU..."
              className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                filterCategory === 'all'
                  ? 'bg-violet-600 text-white border-violet-500'
                  : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'
              }`}
            >
              All ({products.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(filterCategory === cat ? 'all' : cat)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                  filterCategory === cat
                    ? `${catColor(cat)} ring-1 ring-offset-1 ring-offset-gray-950 ring-violet-500`
                    : 'bg-gray-900 text-gray-500 border-gray-800 hover:text-gray-300 hover:border-gray-700'
                }`}
              >
                {cat} ({products.filter(p => p.category === cat).length})
              </button>
            ))}
          </div>

          {/* Active toggle */}
          <button
            onClick={() => setActiveOnly(!activeOnly)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
              activeOnly
                ? 'bg-green-500/10 text-green-400 border-green-500/30'
                : 'bg-gray-900 text-gray-500 border-gray-800 hover:text-gray-300'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Active only
          </button>
        </div>

        {/* Product grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 bg-violet-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-violet-400" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">
              {products.length === 0 ? 'No products yet' : 'No products match'}
            </h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
              {products.length === 0
                ? 'Add your products and services to build your catalog and use them in quotes and invoices.'
                : 'Try adjusting your search or filters.'}
            </p>
            {products.length === 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors mx-auto"
              >
                <Plus className="w-4 h-4" />
                Add your first product
              </motion.button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <ProductModal
            product={editProduct}
            categories={categories}
            onSave={editProduct ? handleUpdate : handleCreate}
            onClose={() => { setShowModal(false); setEditProduct(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}