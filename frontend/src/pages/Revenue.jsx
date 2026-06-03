import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, TrendingUp, Target, Award } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import api from '../services/api'

const STAGE_COLORS = {
  new: '#3B82F6',
  contacted: '#EAB308',
  proposal: '#F97316',
  negotiation: '#8B5CF6',
  won: '#22C55E',
  lost: '#EF4444',
}

const STAGE_LABELS = {
  new: 'New Lead',
  contacted: 'Contacted',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
}

export default function Revenue() {
  const [deals, setDeals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/deals/')
        setDeals(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const totalValue = deals.reduce((sum, d) => sum + d.value, 0)
  const wonValue = deals.filter(d => d.stage === 'won').reduce((sum, d) => sum + d.value, 0)
  const lostValue = deals.filter(d => d.stage === 'lost').reduce((sum, d) => sum + d.value, 0)
  const winRate = deals.length > 0 ? Math.round((deals.filter(d => d.stage === 'won').length / deals.length) * 100) : 0

  const stageData = Object.keys(STAGE_LABELS).map(stage => ({
    name: STAGE_LABELS[stage],
    value: deals.filter(d => d.stage === stage).reduce((sum, d) => sum + d.value, 0),
    count: deals.filter(d => d.stage === stage).length,
    color: STAGE_COLORS[stage],
  })).filter(s => s.count > 0)

  const pieData = stageData.map(s => ({ name: s.name, value: s.value, color: s.color }))

  const statCards = [
    { label: 'Total Pipeline', value: `$${totalValue.toLocaleString()}`, icon: DollarSign, color: 'bg-violet-500', sub: `${deals.length} deals` },
    { label: 'Revenue Won', value: `$${wonValue.toLocaleString()}`, icon: Award, color: 'bg-green-500', sub: `${deals.filter(d => d.stage === 'won').length} deals closed` },
    { label: 'Lost Value', value: `$${lostValue.toLocaleString()}`, icon: Target, color: 'bg-red-500', sub: `${deals.filter(d => d.stage === 'lost').length} deals lost` },
    { label: 'Win Rate', value: `${winRate}%`, icon: TrendingUp, color: 'bg-blue-500', sub: 'of all deals' },
  ]

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-3">
          <p className="text-white text-sm font-medium">{label}</p>
          <p className="text-violet-400 text-sm">${payload[0].value.toLocaleString()}</p>
          <p className="text-gray-400 text-xs">{payload[0].payload.count} deals</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white mb-2">Revenue</h1>
        <p className="text-gray-400 mb-8">Pipeline value and performance overview</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-gray-900 rounded-2xl p-6 border border-gray-800"
            >
              <div className={`w-10 h-10 ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-gray-400 text-sm">{stat.label}</p>
              <p className="text-white text-2xl font-bold mt-1">{stat.value}</p>
              <p className="text-gray-500 text-xs mt-1">{stat.sub}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-900 rounded-2xl p-6 border border-gray-800"
          >
            <h2 className="text-white font-semibold mb-6">Value by Stage</h2>
            {stageData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-500">
                <p>No deal data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stageData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toLocaleString()}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {stageData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-900 rounded-2xl p-6 border border-gray-800"
          >
            <h2 className="text-white font-semibold mb-6">Pipeline Breakdown</h2>
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-500">
                <p>No deal data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: '12px', color: '#fff' }} />
                  <Legend formatter={(value) => <span style={{ color: '#9CA3AF', fontSize: '12px' }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mt-6"
        >
          <h2 className="text-white font-semibold mb-4">All Deals</h2>
          {deals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No deals yet</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Deal</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Contact</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Stage</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Value</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => (
                  <tr key={deal.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-white text-sm">{deal.title}</td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{deal.contact_name || '-'}</td>
                    <td className="px-4 py-3">
                      <span style={{ background: STAGE_COLORS[deal.stage] + '20', color: STAGE_COLORS[deal.stage], fontSize: '11px', padding: '2px 10px', borderRadius: '20px', fontWeight: 500 }}>
                        {STAGE_LABELS[deal.stage]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-white text-sm font-medium">${deal.value.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}