import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, TrendingUp, DollarSign, Activity, MessageSquare, PhoneCall, Send, Calendar } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const ACTIVITY_TYPE_CONFIG = {
  note: { icon: MessageSquare, color: 'text-violet-400', bg: 'bg-violet-500/10', label: 'Note' },
  call: { icon: PhoneCall, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Call' },
  email: { icon: Send, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Email' },
  meeting: { icon: Calendar, color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'Meeting' },
}

function TimeAgo({ dateString }) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return <span>{diff}s ago</span>
  if (diff < 3600) return <span>{Math.floor(diff / 60)}m ago</span>
  if (diff < 86400) return <span>{Math.floor(diff / 3600)}h ago</span>
  if (diff < 604800) return <span>{Math.floor(diff / 86400)}d ago</span>
  return <span>{date.toLocaleDateString()}</span>
}

export default function DashboardHome() {
  const [stats, setStats] = useState({ contacts: 0, deals: 0, won: 0, activities: 0 })
  const [recentActivities, setRecentActivities] = useState([])
  const [loadingActivities, setLoadingActivities] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [contactsRes, dealsRes] = await Promise.all([
          api.get('/contacts/'),
          api.get('/deals/')
        ])

        const contacts = contactsRes.data
        const deals = dealsRes.data
        const wonValue = deals
          .filter(d => d.stage === 'won')
          .reduce((sum, d) => sum + d.value, 0)

        // Fetch activities for all contacts in parallel
        const activityPromises = contacts.map(c =>
          api.get(`/activities/${c.id}`)
            .then(res => res.data.map(a => ({ ...a, contact: c })))
            .catch(() => [])
        )
        const activityResults = await Promise.all(activityPromises)
        const allActivities = activityResults
          .flat()
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 10)

        setStats({
          contacts: contacts.length,
          deals: deals.length,
          won: wonValue,
          activities: allActivities.length > 0 ? activityResults.flat().length : 0
        })
        setRecentActivities(allActivities)
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingActivities(false)
      }
    }
    fetchAll()
  }, [])

  const statCards = [
    { label: 'Total Contacts', value: stats.contacts, icon: Users, color: 'bg-violet-500' },
    { label: 'Active Deals', value: stats.deals, icon: TrendingUp, color: 'bg-blue-500' },
    { label: 'Revenue Won', value: `$${stats.won.toLocaleString()}`, icon: DollarSign, color: 'bg-green-500' },
    { label: 'Activities', value: stats.activities, icon: Activity, color: 'bg-orange-500' },
  ]

  return (
    <div className="p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-gray-400 mb-8">Welcome to your CRM</p>

        {/* Stat Cards */}
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

        {/* Recent Activity Feed */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white font-semibold">Recent Activity</h2>
            {recentActivities.length > 0 && (
              <span className="text-gray-500 text-xs">{recentActivities.length} recent</span>
            )}
          </div>

          {loadingActivities ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-800 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-gray-800 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivities.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No activity yet</p>
              <p className="text-sm mt-1">Start by adding contacts and logging activities</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentActivities.map((activity, i) => {
                const config = ACTIVITY_TYPE_CONFIG[activity.type] || ACTIVITY_TYPE_CONFIG.note
                const Icon = config.icon
                const contactName = `${activity.contact?.first_name || ''} ${activity.contact?.last_name || ''}`.trim()

                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => navigate(`/dashboard/contacts/${activity.contact_id}`)}
                    className="flex gap-3 py-3 border-b border-gray-800 last:border-0 hover:bg-gray-800/40 rounded-xl px-2 cursor-pointer transition-colors group"
                  >
                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-xs font-semibold uppercase tracking-wide ${config.color}`}>
                          {config.label}
                        </span>
                        {contactName && (
                          <>
                            <span className="text-gray-600 text-xs">·</span>
                            <span className="text-gray-400 text-xs font-medium group-hover:text-violet-400 transition-colors">
                              {contactName}
                            </span>
                          </>
                        )}
                        <span className="text-gray-600 text-xs ml-auto">
                          <TimeAgo dateString={activity.created_at} />
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm truncate">{activity.content}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}