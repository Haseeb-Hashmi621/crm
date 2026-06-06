import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Search, Trash2, Edit2, X, Loader2, Tag, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'

const TAG_COLORS = [
  'bg-violet-500/20 text-violet-400 border-violet-500/30',
  'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'bg-green-500/20 text-green-400 border-green-500/30',
  'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'bg-pink-500/20 text-pink-400 border-pink-500/30',
  'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
]

function getTagColor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [allTags, setAllTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editContact, setEditContact] = useState(null)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', company: '' })
  const [saving, setSaving] = useState(false)
  const [showTagModal, setShowTagModal] = useState(null)
  const [newTagName, setNewTagName] = useState('')
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
      company: contact.company || ''
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editContact) {
        await api.put(`/contacts/${editContact.id}`, form)
        toast.success('Contact updated!')
      } else {
        await api.post('/contacts/', form)
        toast.success('Contact added!')
      }
      fetchContacts()
      setShowModal(false)
    } catch (err) {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this contact?')) return
    await api.delete(`/contacts/${id}`)
    toast.success('Contact deleted!')
    fetchContacts()
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return
    try {
      await api.post('/tags/', { name: newTagName.trim() })
      setNewTagName('')
      fetchTags()
      toast.success('Tag created!')
    } catch (err) {
      toast.error('Could not create tag')
    }
  }

  const handleAddTagToContact = async (contactId, tagId) => {
    try {
      await api.post(`/tags/contacts/${contactId}/add/${tagId}`)
      fetchContacts()
      toast.success('Tag added!')
    } catch (err) {
      toast.error('Could not add tag')
    }
  }

  const handleRemoveTagFromContact = async (e, contactId, tagId) => {
    e.stopPropagation()
    try {
      await api.delete(`/tags/contacts/${contactId}/remove/${tagId}`)
      fetchContacts()
      toast.success('Tag removed!')
    } catch (err) {
      toast.error('Could not remove tag')
    }
  }

  const handleDeleteTag = async (tagId) => {
    if (!confirm('Delete this tag from all contacts?')) return
    try {
      await api.delete(`/tags/${tagId}`)
      if (selectedTag === tagId) setSelectedTag(null)
      fetchTags()
      fetchContacts()
      toast.success('Tag deleted!')
    } catch (err) {
      toast.error('Could not delete tag')
    }
  }

  const filtered = contacts.filter(c => {
    const matchesSearch = `${c.first_name} ${c.last_name} ${c.email} ${c.company}`
      .toLowerCase().includes(search.toLowerCase())
    const matchesTag = !selectedTag || c.tags?.some(t => t.id === selectedTag)
    return matchesSearch && matchesTag
  })

  return (
    <div className="flex-1 p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Contacts</h1>
            <p className="text-gray-400 mt-1">{contacts.length} total contacts</p>
          </div>
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

        {/* Tag filter bar */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Tag className="w-4 h-4 text-gray-500" />
          <button
            onClick={() => setSelectedTag(null)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              !selectedTag
                ? 'bg-violet-600 text-white border-violet-600'
                : 'border-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            All
          </button>
          {allTags.map(tag => (
            <div key={tag.id} className="flex items-center gap-1">
              <button
                onClick={() => setSelectedTag(selectedTag === tag.id ? null : tag.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  selectedTag === tag.id
                    ? 'bg-violet-600 text-white border-violet-600'
                    : `${getTagColor(tag.name)} hover:opacity-80`
                }`}
              >
                {tag.name}
              </button>
              <button
                onClick={() => handleDeleteTag(tag.id)}
                className="text-gray-600 hover:text-red-400 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* Create new tag inline */}
          <div className="flex items-center gap-1 ml-2">
            <input
              type="text"
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateTag()}
              placeholder="New tag..."
              className="bg-gray-800 border border-gray-700 text-white rounded-full px-3 py-1 text-xs focus:outline-none focus:border-violet-500 w-24 transition-colors"
            />
            <button
              onClick={handleCreateTag}
              className="text-xs px-2 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-700" />
            <p className="text-gray-500">No contacts found</p>
            <p className="text-gray-600 text-sm mt-1">Add your first contact to get started</p>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-4">Name</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-4">Email</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-4">Phone</th>
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
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {contact.first_name?.[0]}{contact.last_name?.[0] || ''}
                          </div>
                          <span className="text-white text-sm">{contact.first_name} {contact.last_name}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">{contact.email || '-'}</td>
                      <td className="px-6 py-4 text-gray-400 text-sm">{contact.phone || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          {contact.tags?.map(tag => (
                            <span
                              key={tag.id}
                              className={`text-xs px-2 py-0.5 rounded-full border ${getTagColor(tag.name)} cursor-pointer`}
                              onClick={(e) => handleRemoveTagFromContact(e, contact.id, tag.id)}
                              title="Click to remove"
                            >
                              {tag.name}
                            </span>
                          ))}
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowTagModal(contact.id) }}
                            className="text-xs px-2 py-0.5 rounded-full border border-dashed border-gray-600 text-gray-500 hover:text-violet-400 hover:border-violet-500 transition-colors"
                          >
                            + tag
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            onClick={(e) => openEdit(e, contact)}
                            className="p-1.5 text-gray-500 hover:text-violet-400 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            onClick={(e) => handleDelete(e, contact.id)}
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

      {/* Add Tag to Contact Modal */}
      <AnimatePresence>
        {showTagModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowTagModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-sm p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold">Add Tag</h2>
                <button onClick={() => setShowTagModal(null)} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {allTags.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No tags yet. Create one above.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => {
                    const contact = contacts.find(c => c.id === showTagModal)
                    const alreadyAdded = contact?.tags?.some(t => t.id === tag.id)
                    return (
                      <button
                        key={tag.id}
                        disabled={alreadyAdded}
                        onClick={() => {
                          handleAddTagToContact(showTagModal, tag.id)
                          setShowTagModal(null)
                        }}
                        className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                          alreadyAdded
                            ? 'opacity-40 cursor-not-allowed border-gray-700 text-gray-500'
                            : `${getTagColor(tag.name)} border hover:opacity-80`
                        }`}
                      >
                        {tag.name} {alreadyAdded && '✓'}
                      </button>
                    )
                  })}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Contact Modal */}
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
                  { key: 'first_name', label: 'First Name' },
                  { key: 'last_name', label: 'Last Name' },
                  { key: 'email', label: 'Email' },
                  { key: 'phone', label: 'Phone' },
                  { key: 'company', label: 'Company' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="text-sm font-medium text-gray-300 mb-1.5 block">{field.label}</label>
                    <input
                      type="text"
                      value={form[field.key]}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
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