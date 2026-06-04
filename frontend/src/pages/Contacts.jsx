import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Search, Trash2, Edit2, X, Loader2, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function Contacts() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editContact, setEditContact] = useState(null)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', company: '' })
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchContacts()
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
      console.error(err)
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

  const filtered = contacts.filter(c =>
    `${c.first_name} ${c.last_name} ${c.email} ${c.company}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex-1 p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-8">
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
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-4">Company</th>
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
                      transition={{ delay: i * 0.05 }}
                      onClick={() => navigate(`/dashboard/contacts/${contact.id}`)}
                      className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {contact.first_name?.[0]}{contact.last_name?.[0] || ''}
                          </div>
                          <span className="text-white text-sm">{contact.first_name} {contact.last_name}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity -ml-1" />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">{contact.email || '-'}</td>
                      <td className="px-6 py-4 text-gray-400 text-sm">{contact.phone || '-'}</td>
                      <td className="px-6 py-4 text-gray-400 text-sm">{contact.company || '-'}</td>
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

      {/* Modal */}
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
