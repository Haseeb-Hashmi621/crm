import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Plus, X, Loader2, Edit2, Trash2,
  Copy, Search, Tag, Eye, Check, ChevronDown
} from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'general',     label: 'General',     color: 'bg-gray-500/20 text-gray-300 border-gray-500/40' },
  { id: 'welcome',     label: 'Welcome',     color: 'bg-violet-500/20 text-violet-300 border-violet-500/40' },
  { id: 'follow-up',  label: 'Follow-up',   color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'promotional', label: 'Promotional', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  { id: 'newsletter',  label: 'Newsletter',  color: 'bg-green-500/20 text-green-300 border-green-500/40' },
  { id: 'reengagement',label: 'Re-engagement',color: 'bg-pink-500/20 text-pink-300 border-pink-500/40' },
]

const PLACEHOLDER_TAGS = ['{{name}}', '{{email}}', '{{company}}']

const STARTER_TEMPLATES = [
  {
    name: 'Welcome Email',
    category: 'welcome',
    subject: 'Welcome to {{company}} — glad to have you!',
    body: `Hi {{name}},

Welcome aboard! We're really glad to have you with us.

Here's what you can expect from us:
- Timely updates on your account
- Dedicated support whenever you need it
- Exclusive insights tailored just for you

If you have any questions, simply reply to this email — we're always happy to help.

Looking forward to working with you.

Best regards,
The Team`,
  },
  {
    name: 'Follow-up Email',
    category: 'follow-up',
    subject: 'Following up — {{name}}',
    body: `Hi {{name}},

I wanted to follow up on our recent conversation and see if you had any questions or needed any additional information.

We'd love to continue the discussion and explore how we can help {{company}} achieve its goals.

Would you be available for a quick call this week?

Best regards,
The Team`,
  },
  {
    name: 'Promotional Offer',
    category: 'promotional',
    subject: 'Exclusive offer just for you, {{name}}!',
    body: `Hi {{name}},

We have an exclusive offer that we think you'll love.

For a limited time, we're offering special pricing for customers like you at {{company}}.

Here's what's included:
- [Feature 1]
- [Feature 2]
- [Feature 3]

This offer expires soon, so don't miss out!

Click the link below to claim your offer.

Best regards,
The Team`,
  },
]

function getCategoryConfig(categoryId) {
  return CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[0]
}

// ── Preview Modal ─────────────────────────────────────────────────────────────

function PreviewModal({ template, onClose }) {
  const previewBody = template.body
    .replace(/{{name}}/g, 'John Doe')
    .replace(/{{email}}/g, 'john@example.com')
    .replace(/{{company}}/g, 'Acme Corp')

  const previewSubject = template.subject
    .replace(/{{name}}/g, 'John Doe')
    .replace(/{{email}}/g, 'john@example.com')
    .replace(/{{company}}/g, 'Acme Corp')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Email client header */}
        <div className="bg-gray-950 border-b border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400 text-xs font-medium uppercase tracking-wider">Email Preview</span>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="text-gray-600 text-xs w-12 text-right">From:</span>
              <span className="text-gray-400 text-xs">your-email@domain.com</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-600 text-xs w-12 text-right">To:</span>
              <span className="text-gray-400 text-xs">john@example.com</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-600 text-xs w-12 text-right">Subject:</span>
              <span className="text-white text-sm font-medium">{previewSubject}</span>
            </div>
          </div>
        </div>

        {/* Email body */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white rounded-xl p-8 max-w-lg mx-auto">
            <pre className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {previewBody}
            </pre>
          </div>
        </div>

        <div className="border-t border-gray-800 px-6 py-3 flex items-center justify-between">
          <p className="text-gray-600 text-xs">
            Preview shown with sample data — real emails use actual contact info
          </p>
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Template Form Modal ───────────────────────────────────────────────────────

function TemplateFormModal({ template, onSave, onClose }) {
  const [form, setForm] = useState({
    name: template?.name || '',
    subject: template?.subject || '',
    body: template?.body || '',
    category: template?.category || 'general',
  })
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)

  const insertTag = (tag) => {
    const textarea = document.getElementById('template-body')
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newBody = form.body.substring(0, start) + tag + form.body.substring(end)
    setForm({ ...form, body: newBody })
    setTimeout(() => {
      textarea.selectionStart = start + tag.length
      textarea.selectionEnd = start + tag.length
      textarea.focus()
    }, 0)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Template name is required'); return }
    if (!form.subject.trim()) { toast.error('Subject is required'); return }
    if (!form.body.trim()) { toast.error('Body is required'); return }
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } catch {
      toast.error('Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const selectedCategory = getCategoryConfig(form.category)

  return (
    <>
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
            <div>
              <h2 className="text-white font-semibold text-lg">
                {template ? 'Edit Template' : 'New Email Template'}
              </h2>
              <p className="text-gray-500 text-xs mt-0.5">
                Use {'{{'}'name{'}}'},  {'{{'}'email{'}}'},  {'{{'}'company{'}}'}  for personalization
              </p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Name + Category row */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-300 mb-1.5 block">Template Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Welcome Email, Follow-up #1"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                  autoFocus
                />
              </div>

              {/* Category picker */}
              <div className="w-44">
                <label className="text-sm font-medium text-gray-300 mb-1.5 block">Category</label>
                <div className="relative">
                  <button
                    onClick={() => setShowCategoryDropdown(o => !o)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-3 text-sm flex items-center justify-between hover:border-violet-500 transition-colors"
                  >
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${selectedCategory.color}`}>
                      {selectedCategory.label}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                  <AnimatePresence>
                    {showCategoryDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.1 }}
                        className="absolute left-0 right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-10 overflow-hidden"
                      >
                        {CATEGORIES.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => { setForm({ ...form, category: cat.id }); setShowCategoryDropdown(false) }}
                            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-700 transition-colors"
                          >
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${cat.color}`}>
                              {cat.label}
                            </span>
                            {form.category === cat.id && <Check className="w-3.5 h-3.5 text-violet-400" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">Email Subject</label>
              <input
                type="text"
                value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g. Welcome to {{company}}, {{name}}!"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>

            {/* Body */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-300">Email Body</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 text-xs">Insert:</span>
                  {PLACEHOLDER_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => insertTag(tag)}
                      className="text-[10px] px-2 py-0.5 bg-violet-500/20 text-violet-300 border border-violet-500/40 rounded-full hover:bg-violet-500/30 transition-colors font-mono"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                id="template-body"
                value={form.body}
                onChange={e => setForm({ ...form, body: e.target.value })}
                placeholder={`Hi {{name}},\n\nWrite your email here...\n\nBest regards,\nYour Team`}
                rows={14}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none font-mono leading-relaxed"
              />
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-gray-600 text-xs">{form.body.length} characters</span>
                <button
                  onClick={() => setShowPreview(true)}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-violet-400 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview with sample data
                </button>
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
              {saving ? 'Saving...' : template ? 'Save Changes' : 'Create Template'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>

      {/* Inline preview */}
      <AnimatePresence>
        {showPreview && (
          <PreviewModal
            template={{ ...form }}
            onClose={() => setShowPreview(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
// ── Starter Templates Modal ───────────────────────────────────────────────────

function StarterModal({ onSelect, onClose }) {
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
          className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-white font-semibold text-lg">Start from a template</h2>
              <p className="text-gray-500 text-xs mt-0.5">Pick a starter or create from scratch</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
  
          <div className="grid grid-cols-1 gap-3 mb-4">
            {STARTER_TEMPLATES.map((t, i) => {
              const cat = getCategoryConfig(t.category)
              return (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => onSelect(t)}
                  className="text-left bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-violet-500/50 rounded-xl p-4 transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white text-sm font-medium">{t.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cat.color}`}>
                          {cat.label}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs truncate">{t.subject}</p>
                      <p className="text-gray-600 text-xs mt-1 line-clamp-2">
                        {t.body.split('\n').filter(l => l.trim()).slice(1, 3).join(' ')}
                      </p>
                    </div>
                    <div className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <span className="text-xs text-violet-400 font-medium">Use this →</span>
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
  
          <button
            onClick={() => onSelect(null)}
            className="w-full py-3 rounded-xl border border-dashed border-gray-700 text-gray-500 hover:text-white hover:border-gray-600 text-sm transition-colors"
          >
            Start from scratch
          </button>
        </motion.div>
      </motion.div>
    )
  }
  
  // ── Main Page ─────────────────────────────────────────────────────────────────
  
  export default function Templates() {
    const [templates, setTemplates] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterCategory, setFilterCategory] = useState('all')
    const [showStarterModal, setShowStarterModal] = useState(false)
    const [showFormModal, setShowFormModal] = useState(false)
    const [editTemplate, setEditTemplate] = useState(null)
    const [previewTemplate, setPreviewTemplate] = useState(null)
    const [starterSeed, setStarterSeed] = useState(null)
  
    useEffect(() => { fetchTemplates() }, [])
  
    const fetchTemplates = async () => {
      try {
        const res = await api.get('/email-templates/')
        setTemplates(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
  
    const handleCreate = async (data) => {
      const res = await api.post('/email-templates/', data)
      setTemplates(prev => [res.data, ...prev])
      toast.success('Template created!')
    }
  
    const handleUpdate = async (data) => {
      const res = await api.put(`/email-templates/${editTemplate.id}`, data)
      setTemplates(prev => prev.map(t => t.id === editTemplate.id ? res.data : t))
      toast.success('Template updated!')
      setEditTemplate(null)
    }
  
    const handleDelete = async (id) => {
      if (!confirm('Delete this template?')) return
      try {
        await api.delete(`/email-templates/${id}`)
        setTemplates(prev => prev.filter(t => t.id !== id))
        toast.success('Template deleted')
      } catch {
        toast.error('Failed to delete')
      }
    }
  
    const handleDuplicate = async (id) => {
      try {
        const res = await api.post(`/email-templates/${id}/duplicate`)
        setTemplates(prev => [res.data, ...prev])
        toast.success('Template duplicated!')
      } catch {
        toast.error('Failed to duplicate')
      }
    }
  
    const openEdit = (template) => {
      setEditTemplate(template)
      setStarterSeed(null)
      setShowFormModal(true)
    }
  
    const handleStarterSelect = (starter) => {
      setShowStarterModal(false)
      setEditTemplate(null)
      setStarterSeed(starter)
      setShowFormModal(true)
    }
  
    // merge starterSeed into form
    const formInitial = editTemplate || starterSeed || null
  
    const filtered = templates.filter(t => {
      const matchSearch = `${t.name} ${t.subject}`.toLowerCase().includes(search.toLowerCase())
      const matchCat = filterCategory === 'all' || t.category === filterCategory
      return matchSearch && matchCat
    })
  
    const categoryCounts = templates.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1
      return acc
    }, {})
  
    return (
      <div className="p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
  
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Email Templates</h1>
              <p className="text-gray-400 mt-1">
                Reusable email templates for your campaigns
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowStarterModal(true)}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Template
            </motion.button>
          </div>
  
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Templates', value: templates.length, color: 'bg-violet-500' },
              { label: 'Welcome', value: categoryCounts['welcome'] || 0, color: 'bg-violet-400' },
              { label: 'Follow-up', value: categoryCounts['follow-up'] || 0, color: 'bg-blue-500' },
              { label: 'Promotional', value: categoryCounts['promotional'] || 0, color: 'bg-orange-500' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-gray-900 rounded-2xl p-5 border border-gray-800"
              >
                <div className={`w-8 h-8 ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <p className="text-gray-400 text-xs">{stat.label}</p>
                <p className="text-white text-2xl font-bold mt-0.5">{stat.value}</p>
              </motion.div>
            ))}
          </div>
  
          {/* Search + filter */}
          <div className="flex items-center gap-4 mb-6 flex-wrap">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
  
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setFilterCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  filterCategory === 'all'
                    ? 'bg-violet-600 text-white border-violet-500'
                    : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
                }`}
              >
                All ({templates.length})
              </button>
              {CATEGORIES.map(cat => {
                const count = categoryCounts[cat.id] || 0
                if (count === 0 && filterCategory !== cat.id) return null
                return (
                  <button
                    key={cat.id}
                    onClick={() => setFilterCategory(filterCategory === cat.id ? 'all' : cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      filterCategory === cat.id
                        ? `${cat.color} ring-1 ring-offset-1 ring-offset-gray-950 ring-violet-500`
                        : 'bg-gray-800 text-gray-500 border-gray-700 hover:text-gray-300'
                    }`}
                  >
                    {cat.label} ({count})
                  </button>
                )
              })}
            </div>
          </div>
  
          {/* Templates grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-violet-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-violet-400" />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">
                {templates.length === 0 ? 'No templates yet' : 'No templates match'}
              </h3>
              <p className="text-gray-500 max-w-sm mx-auto mb-6 text-sm">
                {templates.length === 0
                  ? 'Create reusable email templates to speed up your campaigns.'
                  : 'Try adjusting your search or category filter.'}
              </p>
              {templates.length === 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowStarterModal(true)}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  Create your first template
                </motion.button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence>
                {filtered.map((template, i) => {
                  const cat = getCategoryConfig(template.category)
                  return (
                    <motion.div
                      key={template.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.04 }}
                      className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all group flex flex-col"
                    >
                      {/* Card header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-white font-semibold text-sm truncate">{template.name}</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border flex-shrink-0 ${cat.color}`}>
                              {cat.label}
                            </span>
                          </div>
                          <p className="text-gray-400 text-xs truncate">{template.subject}</p>
                        </div>
                      </div>
  
                      {/* Body preview */}
                      <div className="flex-1 bg-gray-800/60 rounded-xl p-3 mb-4 min-h-[80px]">
                        <p className="text-gray-500 text-xs leading-relaxed line-clamp-4 font-mono whitespace-pre-wrap">
                          {template.body}
                        </p>
                      </div>
  
                      {/* Personalization tags used */}
                      <div className="flex items-center gap-1 flex-wrap mb-4">
                        {PLACEHOLDER_TAGS.filter(tag => template.body.includes(tag) || template.subject.includes(tag)).map(tag => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded font-mono">
                            {tag}
                          </span>
                        ))}
                      </div>
  
                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          onClick={() => setPreviewTemplate(template)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white rounded-lg text-xs transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Preview
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          onClick={() => openEdit(template)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white rounded-lg text-xs transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          onClick={() => handleDuplicate(template.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white rounded-lg text-xs transition-colors"
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          onClick={() => handleDelete(template.id)}
                          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg text-xs transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
  
        {/* Starter Modal */}
        <AnimatePresence>
          {showStarterModal && (
            <StarterModal
              onSelect={handleStarterSelect}
              onClose={() => setShowStarterModal(false)}
            />
          )}
        </AnimatePresence>
  
        {/* Form Modal */}
        <AnimatePresence>
          {showFormModal && (
            <TemplateFormModal
              template={formInitial}
              onSave={editTemplate ? handleUpdate : handleCreate}
              onClose={() => { setShowFormModal(false); setEditTemplate(null); setStarterSeed(null) }}
            />
          )}
        </AnimatePresence>
  
        {/* Preview Modal */}
        <AnimatePresence>
          {previewTemplate && (
            <PreviewModal
              template={previewTemplate}
              onClose={() => setPreviewTemplate(null)}
            />
          )}
        </AnimatePresence>
      </div>
    )
  }