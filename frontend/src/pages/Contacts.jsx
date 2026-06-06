import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Search, Trash2, Edit2, X, Loader2, Tag, ChevronRight, Check, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'

// Pastel color palette for tags
const TAG_COLORS = [
  { bg: 'bg-violet-500/20', text: 'text-violet-300', border: 'border-violet-500/40' },
  { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/40' },
  { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500/40' },
  { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500/40' },
  { bg: 'bg-pink-500/20', text: 'text-pink-300', border: 'border-pink-500/40' },
  { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/40' },
  { bg: 'bg-teal-500/20', text: 'text-teal-300', border: 'border-teal-500/40' },
  { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/40' },
]

function getTagColor(tagName) {
  let hash = 0
  for (let i = 0; i < tagName.length; i++) hash = tagName.charCodeAt(i) + ((hash << 5) - hash)
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

function TagBadge({ tag, onRemove }) {
  const color = getTagColor(tag.name)
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${color.bg} ${color.text} ${color.border}`}>
      {tag.name}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(tag) }}
          className="hover:opacity-70 transition-opacity ml-0.5"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  )
}

// Tag assignment dropdown for a contact row
function TagDropdown({ contact, allTags, onTagAdded, onTagRemoved, onClose }) {
  const [newTagName, setNewTagName] = useState('')
  const [creating, setCreating] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const contactTagIds = new Set(contact.tags?.map(t => t.id) || [])

  const handleToggleTag = async (tag) => {
    try {
      if (contactTagIds.has(tag.id)) {
        await api.delete(`/tags/contacts/${contact.id}/remove/${tag.id}`)
        onTagRemoved(contact.id, tag)
      } else {
        await api.post(`/tags/contacts/${contact.id}/add/${tag.id}`)
        onTagAdded(contact.id, tag)
      }
    } catch (err) {
      toast.error('Failed to update tag')
      console.error(err)
    }
  }

  const handleCreateAndAssign = async () => {
    const name = newTagName.trim()
    if (!name) return
    setCreating(true)
    try {
      const { data: tag } = await api.post('/tags/', { name })
      await api.post(`/tags/contacts/${contact.id}/add/${tag.id}`)
      onTagAdded(contact.id, tag, true) // true = newly created tag
      setNewTagName('')
    } catch (err) {
      toast.error('Failed to create tag')
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.1 }}
      className="absolute z-50 top-8 right-0 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      <div className="p-2">
        <p className="text-gray-500 text-xs px-2 py-1 uppercase tracking-wider">Assign Tags</p>

        {/* Existing tags list */}
        <div className="max-h-40 overflow-y-auto">
          {allTags.length === 0 && (
            <p className="text-gray-600 text-xs px-2 py-2">No tags yet. Create one below.</p>
          )}
          {allTags.map(tag => {
            const assigned = contactTagIds.has(tag.id)
            const color = getTagColor(tag.name)
            return (
              <button
                key={tag.id}
                onClick={() => handleToggleTag(tag)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-700 transition-colors text-left"
              >
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${color.bg} ${color.text} ${color.border}`}>
                  {tag.name}
                </span>
                {assigned && <Check className="w-3 h-3 text-violet-400" />}
              </button>
            )
          })}
        </div>

        {/* Create new tag */}
        <div className="border-t border-gray-700 mt-1 pt-2 px-1">
          <div className="flex gap-1">
            <input
              type="text"
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateAndAssign() }}
              placeholder="New tag..."
              className="flex-1 bg-gray-700 border border-gray-600 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-violet-500 transition-colors"
              autoFocus
            />
            <button
              onClick={handleCreateAndAssign}
              disabled={creating || !newTagName.trim()}
              className="px-2 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-lg text-xs transition-colors"
            >
              {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [allTags, setAllTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTag, setFilterTag] = useState(null) // tag id or null
  const [showModal, setShowModal] = useState(false)
  const [editContact, setEditContact] = useState(null)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', company: '' })
  const [saving, setSaving] = useState(false)
  const [openDropdown, setOpenDropdown] = useState(null) // contact id
  const navigate = useNavigate()

  useEffect(() => {
    fetchContacts()
    fetchTags()
  }, [])

  const fetchContacts = async () => {
    try {
      const res = await api.get('/contacts/')
      setContacts(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTags = async () => {
    try {
      const res = await api.get('/tags/')
      setAllTags(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  // Called when a tag is assigned to a contact
  const handleTagAdded = (contactId, tag, isNew = false) => {
    if (isNew) {
      setAllTags(prev => {
        const exists = prev.find(t => t.id === tag.id)
        return exists ? prev : [...prev, tag]
      })
    }
    setContacts(prev => prev.map(c => {
      if (c.id !== contactId) return c
      const alreadyHas = c.tags?.find(t => t.id === tag.id)
      if (alreadyHas) return c
      return { ...c, tags: [...(c.tags || []), tag] }
    }))
  }

  // Called when a tag is removed from a contact
  const handleTagRemoved = (contactId, tag) => {
    setContacts(prev => prev.map(c => {
      if (c.id !== contactId) return c
      return { ...c, tags: (c.tags || []).filter(t => t.id !== tag.id) }
    }))
  }

  const handleCSVImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await api.post('/contacts/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      toast.success(`Imported ${res.data.imported} contacts!${res.data.skipped > 0 ? ` (${res.data.skipped} skipped)` : ''}`)
      fetchContacts()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Import failed')
    }

    // Reset input so same file can be re-uploaded
    e.target.value = ''
  }

  const openAdd = () => {
    setEditContact(null)
    setForm({ first_name: '', last_name: '', email: '', phone: '', company: '' })
    setShowModal(true)
  }

  const openEdit = (e, contact) => {
    e.stopPropagation()
    setEditContact(contact)
    setForm({
      first_name: contact.first_name,
      last_name: contact.last_name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      company: contact.company || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editContact) {
        const { data } = await api.put(`/contacts/${editContact.id}`, form)
        setContacts(prev => prev.map(c => c.id === editContact.id ? { ...data, tags: c.tags } : c))
        toast.success('Contact updated!')
      } else {
        const { data } = await api.post('/contacts/', form)
        setContacts(prev => [...prev, data])
        toast.success('Contact added!')
      }
      setShowModal(false)
    } catch (err) {
      toast.error('Something went wrong')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this contact?')) return
    try {
      await api.delete(`/contacts/${id}`)
      setContacts(prev => prev.filter(c => c.id !== id))
      toast.success('Contact deleted!')
    } catch (err) {
      toast.error('Failed to delete')
    }
  }

  const filtered = contacts.filter(c => {
    const matchSearch = `${c.first_name} ${c.last_name} ${c.email} ${c.company}`
      .toLowerCase()
      .includes(search.toLowerCase())
    const matchTag = !filterTag || (c.tags || []).some(t => t.id === filterTag)
    return matchSearch && matchTag
  })

  return (
    <div className="flex-1 p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Contacts</h1>
            <p className="text-gray-400 mt-1">{contacts.length} total contacts</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              Import CSV
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleCSVImport}
              />
            </label>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={openAdd}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Contact
            </motion.button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        {/* Tag Filter Bar */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <span className="text-gray-500 text-xs flex items-center gap-1">
              <Tag className="w-3 h-3" /> Filter:
            </span>
            <button
              onClick={() => setFilterTag(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                !filterTag
                  ? 'bg-violet-600 text-white border-violet-500'
                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600 hover:text-gray-300'
              }`}
            >
              All
            </button>
            {allTags.map(tag => {
              const color = getTagColor(tag.name)
              const active = filterTag === tag.id
              return (
                <button
                  key={tag.id}
                  onClick={() => setFilterTag(active ? null : tag.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                    active
                      ? `${color.bg} ${color.text} ${color.border} ring-1 ring-offset-1 ring-offset-gray-950 ring-violet-500`
                      : `bg-gray-800/50 text-gray-500 border-gray-700 hover:${color.text} hover:${color.bg} hover:${color.border}`
                  }`}
                >
                  {tag.name}
                  {' '}
                  <span className="opacity-60">
                    ({contacts.filter(c => (c.tags || []).some(t => t.id === tag.id)).length})
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Contacts Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-700" />
            <p className="text-gray-500">No contacts found</p>
            <p className="text-gray-600 text-sm mt-1">
              {filterTag ? 'No contacts with this tag' : 'Add your first contact to get started'}
            </p>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-4">Name</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-4">Email</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-4">Company</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-4">Tags</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((contact, i) => (
                    <motion.tr
                      key={contact.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => navigate(`/dashboard/contacts/${contact.id}`)}
                      className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer group"
                    >
                      {/* Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {contact.first_name?.[0]}{contact.last_name?.[0] || ''}
                          </div>
                          <span className="text-white text-sm">{contact.first_name} {contact.last_name}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity -ml-1" />
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4 text-gray-400 text-sm">{contact.email || '-'}</td>

                      {/* Company */}
                      <td className="px-6 py-4 text-gray-400 text-sm">{contact.company || '-'}</td>

                      {/* Tags */}
                      <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 flex-wrap relative">
                          {(contact.tags || []).map(tag => (
                            <TagBadge
                              key={tag.id}
                              tag={tag}
                              onRemove={t => handleTagRemoved(contact.id, t)}
                            />
                          ))}

                          {/* Add tag button */}
                          <div className="relative">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              onClick={e => {
                                e.stopPropagation()
                                setOpenDropdown(openDropdown === contact.id ? null : contact.id)
                              }}
                              className="w-6 h-6 rounded-full border border-dashed border-gray-600 hover:border-violet-500 flex items-center justify-center text-gray-500 hover:text-violet-400 transition-colors opacity-0 group-hover:opacity-100"
                              title="Add tag"
                            >
                              <Tag className="w-3 h-3" />
                            </motion.button>

                            <AnimatePresence>
                              {openDropdown === contact.id && (
                                <TagDropdown
                                  contact={contact}
                                  allTags={allTags}
                                  onTagAdded={handleTagAdded}
                                  onTagRemoved={handleTagRemoved}
                                  onClose={() => setOpenDropdown(null)}
                                />
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            onClick={e => openEdit(e, contact)}
                            className="p-1.5 text-gray-500 hover:text-violet-400 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            onClick={e => handleDelete(e, contact.id)}
                            className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Add/Edit Modal */}
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
                <h2 className="text-white font-semibold">{editContact ? 'Edit Contact' : 'Add Contact'}</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {[
                  { key: 'first_name', label: 'First Name', required: true },
                  { key: 'last_name', label: 'Last Name' },
                  { key: 'email', label: 'Email' },
                  { key: 'phone', label: 'Phone' },
                  { key: 'company', label: 'Company' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="text-sm font-medium text-gray-300 mb-1.5 block">{field.label}</label>
                    <input
                      type="text"
                      value={form[field.key]}
                      onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
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
                  {saving ? 'Saving...' : 'Save'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}