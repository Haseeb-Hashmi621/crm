import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, TrendingUp, DollarSign, Activity, MessageSquare, PhoneCall, Send, Calendar, Phone, MessageCircle, CheckSquare, AlertCircle, Clock, Package } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const ACTIVITY_TYPE_CONFIG = {
  note:     { icon: MessageSquare, color: 'text-violet-400',  bg: 'bg-violet-500/10',  label: 'Note' },
  call:     { icon: PhoneCall,     color: 'text-green-400',   bg: 'bg-green-500/10',   label: 'Call' },
  email:    { icon: Send,          color: 'text-blue-400',    bg: 'bg-blue-500/10',    label: 'Email' },
  meeting:  { icon: Calendar,      color: 'text-orange-400',  bg: 'bg-orange-500/10',  label: 'Meeting' },
  sms:      { icon: Phone,         color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    label: 'SMS' },
  whatsapp: { icon: MessageCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'WhatsApp' },
}

const FILTER_OPTIONS = [
  { id: 'all',      label: 'All' },
  { id: 'note',     label: 'Notes',    color: 'text-violet-400' },
  { id: 'call',     label: 'Calls',    color: 'text-green-400' },
  { id: 'email',    label: 'Emails',   color: 'text-blue-400' },
  { id: 'meeting',  label: 'Meetings', color: 'text-orange-400' },
  { id: 'sms',      label: 'SMS',      color: 'text-cyan-400' },
  { id: 'whatsapp', label: 'WhatsApp', color: 'text-emerald-400' },
]

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

function TaskSummaryWidget() {
  const [taskStats, setTaskStats] = useState(null)
  const [overdueList, setOverdueList] = useState([])
  const [todayList, setTodayList] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    const fetch = async () => {
      try {
        const [statsRes, overdueRes, todayRes] = await Promise.all([
          api.get('/tasks/stats'),
          api.get('/tasks/overdue'),
          api.get('/tasks/today'),
        ])
        setTaskStats(statsRes.data)
        setOverdueList(overdueRes.data.slice(0, 3))
        setTodayList(todayRes.data.slice(0, 3))
      } catch (err) {
        console.error(err)
      }
    }
    fetch()
  }, [])

  if (!taskStats) return null

  const hasItems = overdueList.length > 0 || todayList.length > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mt-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-violet-400" />
          <h2 className="text-white font-semibold">Tasks</h2>
        </div>
        <button
          onClick={() => navigate('/dashboard/tasks')}
          className="text-violet-400 hover:text-violet-300 text-xs font-medium transition-colors"
        >
          View all →
        </button>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Pending',   value: taskStats.total_pending, color: 'text-violet-400', bg: 'bg-violet-500/10' },
          { label: 'Due Today', value: taskStats.due_today,     color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { label: 'Overdue',   value: taskStats.overdue,       color: 'text-red-400',    bg: 'bg-red-500/10'    },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {!hasItems ? (
        <p className="text-gray-600 text-sm text-center py-4">No urgent tasks — you're all caught up!</p>
      ) : (
        <div className="space-y-2">
          {overdueList.map(task => (
            <div key={task.id} onClick={() => navigate('/dashboard/tasks')}
              className="flex items-center gap-3 p-3 bg-red-500/5 border border-red-500/20 rounded-xl cursor-pointer hover:bg-red-500/10 transition-colors">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              <p className="text-white text-xs font-medium flex-1 truncate">{task.title}</p>
              <span className="text-red-400 text-[10px] font-medium flex-shrink-0">Overdue</span>
            </div>
          ))}
          {todayList.map(task => (
            <div key={task.id} onClick={() => navigate('/dashboard/tasks')}
              className="flex items-center gap-3 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl cursor-pointer hover:bg-yellow-500/10 transition-colors">
              <Clock className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
              <p className="text-white text-xs font-medium flex-1 truncate">{task.title}</p>
              <span className="text-yellow-400 text-[10px] font-medium flex-shrink-0">Today</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

export default function DashboardHome() {
  const [stats, setStats] = useState({ contacts: 0, deals: 0, won: 0, activities: 0 })
  const [recentActivities, setRecentActivities] = useState([])
  const [loadingActivities, setLoadingActivities] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const navigate = useNavigate()

  useEffect(() => {
    const fetchAll = async () => {
      try {
        // Fetch true counts via dedicated count endpoints (no caps/pagination issues)
        // Fetch recent activities feed + deals separately for won value calculation
        const [
          contactsCountRes,
          dealsRes,
          activitiesCountRes,
          activitiesRes,
        ] = await Promise.all([
          api.get('/contacts/count'),
          api.get('/deals/'),
          api.get('/activities/count'),
          api.get('/activities/recent?limit=50'),
        ])

        const deals = dealsRes.data
        const wonValue = deals
          .filter(d => d.stage === 'won')
          .reduce((sum, d) => sum + d.value, 0)

        setStats({
          contacts:   contactsCountRes.data.total,
          deals:      deals.length,
          won:        wonValue,
          activities: activitiesCountRes.data.total,
        })

        setRecentActivities(activitiesRes.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingActivities(false)
      }
    }

    fetchAll()
    const interval = setInterval(fetchAll, 15000)
    return () => clearInterval(interval)
  }, [])

  const filteredActivities = activeFilter === 'all'
    ? recentActivities
    : recentActivities.filter(a => a.type === activeFilter)

  const statCards = [
    { label: 'Total Contacts', value: stats.contacts,                  icon: Users,      color: 'bg-violet-500' },
    { label: 'Active Deals',   value: stats.deals,                     icon: TrendingUp, color: 'bg-blue-500' },
    { label: 'Revenue Won',    value: `$${stats.won.toLocaleString()}`, icon: DollarSign, color: 'bg-green-500' },
    { label: 'Activities',     value: stats.activities,                 icon: Activity,   color: 'bg-orange-500' },
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Recent Activity</h2>
            {recentActivities.length > 0 && (
              <span className="text-gray-500 text-xs">{filteredActivities.length} shown</span>
            )}
          </div>

          {/* Filter Tabs */}
          {!loadingActivities && recentActivities.length > 0 && (
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              {FILTER_OPTIONS.map(filter => {
                const count = filter.id === 'all'
                  ? recentActivities.length
                  : recentActivities.filter(a => a.type === filter.id).length
                const isActive = activeFilter === filter.id
                return (
                  <motion.button
                    key={filter.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveFilter(filter.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      isActive
                        ? 'bg-violet-600 text-white border-violet-500'
                        : 'bg-gray-800 text-gray-500 border-gray-700 hover:text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    {filter.label}
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {count}
                    </span>
                  </motion.button>
                )
              })}
            </div>
          )}

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
          ) : filteredActivities.length === 0 ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFilter}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="text-center py-12 text-gray-500"
              >
                {(() => {
                  const config = ACTIVITY_TYPE_CONFIG[activeFilter]
                  const Icon = config?.icon || Activity
                  return (
                    <>
                      <Icon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>No {activeFilter}s logged yet</p>
                    </>
                  )
                })()}
              </motion.div>
            </AnimatePresence>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFilter}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="space-y-1"
              >
                {filteredActivities.map((activity, i) => {
                  const config = ACTIVITY_TYPE_CONFIG[activity.type] || ACTIVITY_TYPE_CONFIG.note
                  const Icon = config.icon
                  const contactName = `${activity.contact?.first_name || ''} ${activity.contact?.last_name || ''}`.trim()
                  const displayContent = activity.content?.replace(/^\[Inbound\]\s*/i, '') || ''

                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => navigate(`/dashboard/contacts/${activity.contact_id}`)}
                      className="flex gap-3 py-3 border-b border-gray-800 last:border-0 hover:bg-gray-800/40 rounded-xl px-2 cursor-pointer transition-colors group"
                    >
                      <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                      </div>

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
                        <p className="text-gray-400 text-sm truncate">{displayContent}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Task Summary Widget */}
        <TaskSummaryWidget />

      </motion.div>
    </div>
  )
}