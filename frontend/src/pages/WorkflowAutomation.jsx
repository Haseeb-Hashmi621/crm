import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap, Plus, X, Loader2, Trash2, Edit2, Check, ToggleLeft, ToggleRight,
  Clock, AlertCircle, CheckCircle2, XCircle, ListChecks, ChevronDown, Play
} from 'lucide-react'
import api from '../services/api'
import toast from 'react-hot-toast'

function fieldDefault(type) {
  if (type === 'number') return 1
  return ''
}

function ActionRow({ action, index, actionTypes, onChange, onRemove }) {
  const typeInfo = actionTypes.find(a => a.id === action.type)

  const handleTypeChange = (type) => {
    const info = actionTypes.find(a => a.id === type)
    const config = {}
    ;(info?.config_fields || []).forEach(f => { config[f.key] = fieldDefault(f.type) })
    onChange(index, { type, config })
  }

  const updateConfig = (key, value) => {
    onChange(index, { ...action, config: { ...action.config, [key]: value } })
  }

  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <select
          value={action.type}
          onChange={e => handleTypeChange(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
        >
          <option value="">Choose an action...</option>
          {actionTypes.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
        <button onClick={() => onRemove(index)} className="p-2 text-gray-500 hover:text-red-400 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {typeInfo?.description && (
        <p className="text-gray-500 text-xs">{typeInfo.description}</p>
      )}

      {typeInfo?.config_fields?.map(f => (
        <div key={f.key}>
          <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
          {f.type === 'select' ? (
            <select
              value={action.config?.[f.key] || ''}
              onChange={e => updateConfig(f.key, e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
            >
              <option value="">Select...</option>
              {f.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : f.type === 'textarea' ? (
            <textarea
              value={action.config?.[f.key] || ''}
              onChange={e => updateConfig(f.key, e.target.value)}
              rows={3}
              placeholder="Use {{name}}, {{email}}, {{company}} for personalization"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 resize-none"
            />
          ) : (
            <input
              type={f.type === 'number' ? 'number' : 'text'}
              value={action.config?.[f.key] ?? ''}
              onChange={e => updateConfig(f.key, f.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
            />
          )}
        </div>
      ))}
    </div>
  )
}

function RuleModal({ rule, meta, onSave, onClose }) {
  const isEdit = !!rule
  const [form, setForm] = useState({
    name: rule?.name || '',
    description: rule?.description || '',
    trigger_type: rule?.trigger_type || meta.triggers[0]?.id || '',
    trigger_config: rule?.trigger_config || {},
    actions: rule?.actions?.length ? rule.actions : [],
    is_active: rule?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)

  const triggerInfo = meta.triggers.find(t => t.id === form.trigger_type)

  const handleTriggerChange = (trigger_type) => {
    const info = meta.triggers.find(t => t.id === trigger_type)
    const trigger_config = {}
    ;(info?.config_fields || []).forEach(f => { trigger_config[f.key] = '' })
    setForm({ ...form, trigger_type, trigger_config })
  }

  const updateTriggerConfig = (key, value) => {
    setForm({ ...form, trigger_config: { ...form.trigger_config, [key]: value } })
  }

  const addAction = () => {
    setForm(prev => ({ ...prev, actions: [...prev.actions, { type: '', config: {} }] }))
  }
  const updateAction = (idx, updated) => {
    setForm(prev => ({ ...prev, actions: prev.actions.map((a, i) => i === idx ? updated : a) }))
  }
  const removeAction = (idx) => {
    setForm(prev => ({ ...prev, actions: prev.actions.filter((_, i) => i !== idx) }))
  }

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Rule name is required'); return }
    if (!form.trigger_type) { toast.error('Choose a trigger'); return }
    const validActions = form.actions.filter(a => a.type)
    if (validActions.length === 0) { toast.error('Add at least one action'); return }

    setSaving(true)
    try {
      await onSave({ ...form, actions: validActions })
      onClose()
    } catch {
      toast.error('Failed to save rule')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-2xl max-h-[92vh] flex flex-col">

        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-600/20 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-violet-400" />
            </div>
            <h2 className="text-white font-semibold text-lg">{isEdit ? 'Edit Automation' : 'New Automation'}</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Rule Name</label>
            <input
              type="text" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Tag hot leads on won deals"
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">Description (optional)</label>
            <input
              type="text" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="What does this automation do?"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {/* Trigger */}
          <div className="bg-gray-800/40 border border-gray-800 rounded-xl p-4">
            <p className="text-white text-sm font-medium mb-3 flex items-center gap-2">
              <Play className="w-3.5 h-3.5 text-violet-400" /> When this happens
            </p>
            <select
              value={form.trigger_type}
              onChange={e => handleTriggerChange(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 mb-2"
            >
              {meta.triggers.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            {triggerInfo?.description && <p className="text-gray-500 text-xs mb-3">{triggerInfo.description}</p>}
            {triggerInfo?.config_fields?.map(f => (
              <div key={f.key} className="mt-2">
                <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
                {f.type === 'select' ? (
                  <select
                    value={form.trigger_config?.[f.key] || ''}
                    onChange={e => updateTriggerConfig(f.key, e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
                  >
                    <option value="">Any</option>
                    {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={form.trigger_config?.[f.key] || ''}
                    onChange={e => updateTriggerConfig(f.key, e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div>
            <p className="text-white text-sm font-medium mb-3 flex items-center gap-2">
              <ListChecks className="w-3.5 h-3.5 text-violet-400" /> Do these actions
            </p>
            <div className="space-y-3">
              {form.actions.map((action, idx) => (
                <ActionRow key={idx} action={action} index={idx} actionTypes={meta.actions}
                  onChange={updateAction} onRemove={removeAction} />
              ))}
            </div>
            <button onClick={addAction}
              className="mt-3 flex items-center gap-1.5 text-violet-400 hover:text-violet-300 text-sm transition-colors">
              <Plus className="w-4 h-4" /> Add action
            </button>
          </div>

          <label className="flex items-center gap-2 cursor-pointer w-fit">
            <input type="checkbox" checked={form.is_active}
              onChange={e => setForm({ ...form, is_active: e.target.checked })}
              className="accent-violet-500 w-4 h-4" />
            <span className="text-sm text-gray-300">Active immediately</span>
          </label>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-800">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">
            Cancel
          </button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Automation'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function LogsModal({ rule, onClose }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/workflows/${rule.id}/logs`)
      .then(res => setLogs(res.data))
      .catch(() => toast.error('Failed to load run history'))
      .finally(() => setLoading(false))
  }, [rule.id])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-white font-semibold">Run History — {rule.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-violet-500 animate-spin" /></div>
          ) : logs.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-10">This automation hasn't run yet.</p>
          ) : (
            logs.map(log => (
              <div key={log.id} className={`p-3 rounded-xl border ${log.success ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {log.success ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                  <span className="text-white text-xs font-medium">{log.context_summary || log.trigger_type}</span>
                  <span className="text-gray-600 text-[10px] ml-auto">{new Date(log.created_at).toLocaleString()}</span>
                </div>
                {log.actions_executed?.map((a, i) => (
                  <p key={i} className={`text-xs ml-5 ${a.success ? 'text-gray-400' : 'text-red-400'}`}>
                    {a.success ? '✓' : '✗'} {a.detail}
                  </p>
                ))}
                {log.error && <p className="text-red-400 text-xs ml-5 mt-1">{log.error}</p>}
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function WorkflowAutomation() {
  const [rules, setRules] = useState([])
  const [meta, setMeta] = useState({ triggers: [], actions: [] })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editRule, setEditRule] = useState(null)
  const [logsRule, setLogsRule] = useState(null)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    try {
      const [rulesRes, metaRes] = await Promise.all([
        api.get('/workflows/'),
        api.get('/workflows/meta'),
      ])
      setRules(rulesRes.data)
      setMeta(metaRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (data) => {
    const res = await api.post('/workflows/', data)
    setRules(prev => [res.data, ...prev])
    toast.success('Automation created!')
  }

  const handleUpdate = async (data) => {
    const res = await api.patch(`/workflows/${editRule.id}`, data)
    setRules(prev => prev.map(r => r.id === editRule.id ? res.data : r))
    setEditRule(null)
    toast.success('Automation updated!')
  }

  const handleToggle = async (rule) => {
    try {
      const res = await api.patch(`/workflows/${rule.id}`, { is_active: !rule.is_active })
      setRules(prev => prev.map(r => r.id === rule.id ? res.data : r))
    } catch {
      toast.error('Failed to update')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this automation?')) return
    try {
      await api.delete(`/workflows/${id}`)
      setRules(prev => prev.filter(r => r.id !== id))
      toast.success('Automation deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  const triggerLabel = (id) => meta.triggers.find(t => t.id === id)?.label || id

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Zap className="w-6 h-6 text-violet-400" />
              <h1 className="text-2xl font-bold text-white">Workflow Automation</h1>
            </div>
            <p className="text-gray-400">Automatically create tasks, tag contacts, notify yourself, or send emails when things happen in your CRM</p>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => { setEditRule(null); setShowModal(true) }}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Automation
          </motion.button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-violet-500 animate-spin" /></div>
        ) : rules.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-violet-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-violet-400" />
            </div>
            <h3 className="text-white font-semibold text-lg mb-2">No automations yet</h3>
            <p className="text-gray-500 max-w-sm mx-auto mb-6 text-sm">
              Build your first rule — e.g. "When a deal moves to Won, create a follow-up task and send a welcome email."
            </p>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors mx-auto">
              <Plus className="w-4 h-4" /> Create your first automation
            </motion.button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AnimatePresence>
              {rules.map((rule, i) => (
                <motion.div key={rule.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-semibold text-sm truncate">{rule.name}</h3>
                        {!rule.is_active && (
                          <span className="text-[10px] px-2 py-0.5 bg-gray-700/50 text-gray-500 border border-gray-700 rounded-full">Paused</span>
                        )}
                        {rule.last_error && (
                          <span title={rule.last_error} className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-full flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5" /> Error
                          </span>
                        )}
                      </div>
                      {rule.description && <p className="text-gray-500 text-xs mb-2">{rule.description}</p>}
                      <span className="text-[10px] px-2 py-0.5 bg-violet-500/10 text-violet-300 border border-violet-500/30 rounded-full">
                        {triggerLabel(rule.trigger_type)}
                      </span>
                    </div>
                    <button onClick={() => handleToggle(rule)} className="flex-shrink-0">
                      {rule.is_active
                        ? <ToggleRight className="w-8 h-8 text-green-400" />
                        : <ToggleLeft className="w-8 h-8 text-gray-600" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap mb-4">
                    {rule.actions.map((a, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 bg-gray-800 text-gray-400 border border-gray-700 rounded-full">
                        {meta.actions.find(m => m.id === a.type)?.label || a.type}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                    <span className="text-gray-600 text-xs flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {rule.run_count} run{rule.run_count !== 1 ? 's' : ''}
                      {rule.last_run_at && ` · last ${new Date(rule.last_run_at).toLocaleDateString()}`}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setLogsRule(rule)}
                        className="p-1.5 text-gray-500 hover:text-violet-400 transition-colors" title="Run history">
                        <ListChecks className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setEditRule(rule); setShowModal(true) }}
                        className="p-1.5 text-gray-500 hover:text-violet-400 transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(rule.id)}
                        className="p-1.5 text-gray-500 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <RuleModal
            rule={editRule}
            meta={meta}
            onSave={editRule ? handleUpdate : handleCreate}
            onClose={() => { setShowModal(false); setEditRule(null) }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {logsRule && <LogsModal rule={logsRule} onClose={() => setLogsRule(null)} />}
      </AnimatePresence>
    </div>
  )
}