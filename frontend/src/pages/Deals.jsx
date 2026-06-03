import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Loader2, DollarSign } from 'lucide-react'
import api from '../services/api'

const STAGES = [
  { id: 'new', label: 'New Lead', color: 'border-blue-500', dot: 'bg-blue-500' },
  { id: 'contacted', label: 'Contacted', color: 'border-yellow-500', dot: 'bg-yellow-500' },
  { id: 'proposal', label: 'Proposal', color: 'border-orange-500', dot: 'bg-orange-500' },
  { id: 'negotiation', label: 'Negotiation', color: 'border-violet-500', dot: 'bg-violet-500' },
  { id: 'won', label: 'Won', color: 'border-green-500', dot: 'bg-green-500' },
  { id: 'lost', label: 'Lost', color: 'border-red-500', dot: 'bg-red-500' },
]

export default function Deals() {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', value: '', stage: 'new', contact_name: '', company: '' })
  const [dragging, setDragging] = useState(null)

  useEffect(() => { fetchDeals() }, [])

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

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.post('/deals/', { ...form, value: parseFloat(form.value) || 0 })
      fetchDeals()
      setShowModal(false)
      setForm({ title: '', value: '', stage: 'new', contact_name: '', company: '' })
    } catch (err) {
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

  const totalValue = deals.filter(d => d.stage === 'won').reduce((sum, d) => sum + d.value, 0)

  return (
    <div style={{ padding: '2rem', boxSizing: 'border-box', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
      >
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
                          className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-grab active:cursor-grabbing hover:border-gray-700 transition-colors"
                        >
                          <p className="text-white text-sm font-medium mb-2">{deal.title}</p>
                          {deal.contact_name && (
                            <p className="text-gray-500 text-xs mb-1">{deal.contact_name}</p>
                          )}
                          {deal.company && (
                            <p className="text-gray-500 text-xs mb-2">{deal.company}</p>
                          )}
                          {deal.value > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                              <DollarSign className="w-3 h-3 text-green-400" />
                              <span className="text-green-400 text-xs font-medium">
                                {deal.value.toLocaleString()}
                              </span>
                            </div>
                          )}
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
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {[
                  { key: 'title', label: 'Deal Title' },
                  { key: 'value', label: 'Value ($)' },
                  { key: 'contact_name', label: 'Contact Name' },
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