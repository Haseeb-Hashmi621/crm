import { motion } from 'framer-motion'
import { Users, TrendingUp, DollarSign, Activity, LogOut } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { useNavigate } from 'react-router-dom'

const stats = [
  { label: 'Total Contacts', value: '0', icon: Users, color: 'bg-violet-500' },
  { label: 'Active Deals', value: '0', icon: TrendingUp, color: 'bg-blue-500' },
  { label: 'Revenue', value: '$0', icon: DollarSign, color: 'bg-green-500' },
  { label: 'Activities', value: '0', icon: Activity, color: 'bg-orange-500' },
]

export default function Dashboard() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.4 }}
        className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col"
      >
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="text-white font-semibold text-lg">CRM</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {[
            { label: 'Dashboard', icon: Activity, active: true },
            { label: 'Contacts', icon: Users },
            { label: 'Deals', icon: TrendingUp },
            { label: 'Revenue', icon: DollarSign },
          ].map((item) => (
            <motion.button
              key={item.label}
              whileHover={{ x: 4 }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                item.active
                  ? 'bg-violet-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </motion.button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <motion.button
            whileHover={{ x: 4 }}
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </motion.button>
        </div>
      </motion.div>

      {/* Main content */}
      <div className="flex-1 p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400 mb-8">Welcome to your CRM</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, i) => (
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
    </div>
  )
}