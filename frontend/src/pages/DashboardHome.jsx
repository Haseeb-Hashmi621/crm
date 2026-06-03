import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, TrendingUp, DollarSign, Activity } from 'lucide-react'
import api from '../services/api'

export default function DashboardHome() {
  const [stats, setStats] = useState({ contacts: 0, deals: 0, won: 0 })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [contacts, deals] = await Promise.all([
          api.get('/contacts/'),
          api.get('/deals/')
        ])
        const wonValue = deals.data
          .filter(d => d.stage === 'won')
          .reduce((sum, d) => sum + d.value, 0)
        setStats({
          contacts: contacts.data.length,
          deals: deals.data.length,
          won: wonValue
        })
      } catch (err) {
        console.error(err)
      }
    }
    fetchStats()
  }, [])

  const statCards = [
    { label: 'Total Contacts', value: stats.contacts, icon: Users, color: 'bg-violet-500' },
    { label: 'Active Deals', value: stats.deals, icon: TrendingUp, color: 'bg-blue-500' },
    { label: 'Revenue Won', value: `$${stats.won.toLocaleString()}`, icon: DollarSign, color: 'bg-green-500' },
    { label: 'Activities', value: 0, icon: Activity, color: 'bg-orange-500' },
  ]

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400 mb-8">Welcome to your CRM</p>

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
            </motion.div>
          ))}
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <h2 className="text-white font-semibold mb-4">Recent Activity</h2>
          <div className="text-center py-12 text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No activity yet</p>
            <p className="text-sm mt-1">Start by adding contacts</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}