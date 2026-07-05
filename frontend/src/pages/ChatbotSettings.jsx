import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot, Power, MessageSquare, Save, Loader2, Plus, X, Edit2,
  Trash2, Check, Tag, ToggleLeft, ToggleRight, BookOpen, Search
} from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

function EntryModal({ entry, onSave, onClose }) {
  const [form, setForm] = useState({
    title: entry?.title || '',
    content: entry?.content || '',
    category: entry?.category || '',
    is_active: entry?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    if (!form.content.trim()) { toast.error('Content is required'); return }
    setSaving(true)
    try {
      await onSave({ ...form, category: form.category.trim() || null })
      onClose()
    } catch {
      toast.error('Failed to save entry')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">{entry ? 'Edit Entry' : 'New Knowledge Base Entry'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Title</label>
            <input
              type="text" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Pricing — Company Formation Package"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">
              Category <span className="text-gray-500 font-normal">(optional — for organizing entries)</span>
            </label>
            <input
              type="text" value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              placeholder="e.g. pricing, faq, process"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Content</label>
            <textarea
              value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })}
              placeholder="Write the information the bot should know and use when answering customers..."
              rows={8}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input
              type="checkbox" checked={form.is_active}
              onChange={e => setForm({ ...form, is_active: e.target.checked })}
              className="accent-violet-500 w-4 h-4"
            />
            <span className="text-sm text-gray-300">Active (included in bot's knowledge)</span>
          </label>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">
            Cancel
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'Saving...' : entry ? 'Save Changes' : 'Add Entry'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function ChatbotSettings() {
  const [config, setConfig] = useState(null)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [savingConfig, setSavingConfig] = useState(false)
  const [promptDraft, setPromptDraft] = useState('')
  const [fallbackDraft, setFallbackDraft] = useState('')

  const [entries, setEntries] = useState([])
  const [loadingEntries, setLoadingEntries] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editEntry, setEditEntry] = useState(null)

  useEffect(() => {
    fetchConfig()
    fetchEntries()
  }, [])

  const fetchConfig = async () => {
    try {
      const res = await api.get('/chatbot/config')
      setConfig(res.data)
      setPromptDraft(res.data.system_prompt)
      setFallbackDraft(res.data.fallback_message)
    } catch {
      toast.error('Failed to load chatbot settings')
    } finally {
      setLoadingConfig(false)
    }
  }

  const fetchEntries = async () => {
    try {
      const res = await api.get('/knowledge-base/')
      setEntries(res.data)
    } catch {
      toast.error('Failed to load knowledge base')
    } finally {
      setLoadingEntries(false)
    }
  }

  const handleToggleEnabled = async () => {
    try {
      const res = await api.patch('/chatbot/config', { enabled: !config.enabled })
      setConfig(res.data)
      toast.success(res.data.enabled ? 'Chatbot enabled' : 'Chatbot disabled')
    } catch {
      toast.error('Failed to update')
    }
  }

  const handleSavePrompts = async () => {
    setSavingConfig(true)
    try {
      const res = await api.patch('/chatbot/config', {
        system_prompt: promptDraft,
        fallback_message: fallbackDraft,
      })
      setConfig(res.data)
      toast.success('Chatbot settings saved!')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSavingConfig(false)
    }
  }

  const handleCreateEntry = async (data) => {
    const res = await api.post('/knowledge-base/', data)
    setEntries(prev => [res.data, ...prev])
    toast.success('Entry added!')
  }

  const handleUpdateEntry = async (data) => {
    const res = await api.patch(`/knowledge-base/${editEntry.id}`, data)
    setEntries(prev => prev.map(e => e.id === editEntry.id ? res.data : e))
    setEditEntry(null)
    toast.success('Entry updated!')
  }

  const handleDeleteEntry = async (id) => {
    if (!confirm('Delete this knowledge base entry?')) return
    try {
      await api.delete(`/knowledge-base/${id}`)
      setEntries(prev => prev.filter(e => e.id !== id))
      toast.success('Entry deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleToggleActive = async (entry) => {
    try {
      const res = await api.patch(`/knowledge-base/${entry.id}`, { is_active: !entry.is_active })
      setEntries(prev => prev.map(e => e.id === entry.id ? res.data : e))
    } catch {
      toast.error('Failed to update')
    }
  }

  const filtered = entries.filter(e =>
    `${e.title} ${e.category || ''} ${e.content}`.toLowerCase().includes(search.toLowerCase())
  )

  if (loadingConfig) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-1">
          <Bot className="w-6 h-6 text-violet-400" />
          <h1 className="text-2xl font-bold text-white">WhatsApp Chatbot</h1>
        </div>
        <p className="text-gray-400 mb-8">Control your automated assistant and what it knows about your business</p>

        {/* On/Off switch */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                config.enabled ? 'bg-green-500/20' : 'bg-gray-700/50'
              }`}>
                <Power className={`w-5 h-5 ${config.enabled ? 'text-green-400' : 'text-gray-500'}`} />
              </div>
              <div>
                <p className="text-white font-medium">
                  Chatbot is {config.enabled ? 'Active' : 'Disabled'}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {config.enabled
                    ? 'Automatically replying to incoming WhatsApp messages'
                    : 'No automatic replies will be sent'}
                </p>
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleToggleEnabled}>
              {config.enabled
                ? <ToggleRight className="w-10 h-10 text-green-400" />
                : <ToggleLeft className="w-10 h-10 text-gray-600" />}
            </motion.button>
          </div>
        </div>

        {/* Prompt + fallback editor */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
          <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-violet-400" /> Personality & Instructions
          </h2>
          <p className="text-gray-500 text-xs mb-4">Controls how the bot talks and behaves</p>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">System Prompt</label>
              <textarea
                value={promptDraft}
                onChange={e => setPromptDraft(e.target.value)}
                rows={6}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">
                Fallback Message <span className="text-gray-500 font-normal">(sent when the bot can't generate a reply)</span>
              </label>
              <textarea
                value={fallbackDraft}
                onChange={e => setFallbackDraft(e.target.value)}
                rows={2}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors resize-none"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleSavePrompts} disabled={savingConfig}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {savingConfig ? 'Saving...' : 'Save Changes'}
            </motion.button>
          </div>
        </div>

        {/* Knowledge base */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-gray-800 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-white font-semibold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-violet-400" /> Knowledge Base
              </h2>
              <p className="text-gray-500 text-xs mt-1">
                What the bot knows about your business — add pricing, FAQs, processes, anything customers ask about
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setEditEntry(null); setShowModal(true) }}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Entry
            </motion.button>
          </div>

          <div className="p-4 border-b border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search entries..."
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
          </div>

          {loadingEntries ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-6">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-700" />
              <p className="text-gray-500">
                {entries.length === 0 ? 'No knowledge base entries yet' : 'No entries match your search'}
              </p>
              {entries.length === 0 && (
                <p className="text-gray-600 text-sm mt-1">Add your first entry so the bot can answer accurately</p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              <AnimatePresence>
                {filtered.map(entry => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="p-5 hover:bg-gray-800/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-white font-medium text-sm">{entry.title}</p>
                          {entry.category && (
                            <span className="text-[10px] px-2 py-0.5 bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-full flex items-center gap-1">
                              <Tag className="w-2.5 h-2.5" />{entry.category}
                            </span>
                          )}
                          {!entry.is_active && (
                            <span className="text-[10px] px-2 py-0.5 bg-gray-700/50 text-gray-500 border border-gray-700 rounded-full">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 text-xs line-clamp-2">{entry.content}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleToggleActive(entry)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            entry.is_active ? 'text-gray-500 hover:text-yellow-400' : 'text-gray-500 hover:text-green-400'
                          }`}
                          title={entry.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {entry.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => { setEditEntry(entry); setShowModal(true) }}
                          className="p-1.5 text-gray-500 hover:text-violet-400 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <EntryModal
            entry={editEntry}
            onSave={editEntry ? handleUpdateEntry : handleCreateEntry}
            onClose={() => { setShowModal(false); setEditEntry(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}