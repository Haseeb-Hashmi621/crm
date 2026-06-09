import { motion } from 'framer-motion'
import { Users, TrendingUp, DollarSign, Activity, LogOut, Settings, Mail } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import GlobalSearch from '../components/GlobalSearch'
import NotificationBell from '../components/NotificationBell'

const navItems = [
  { label: 'Dashboard', icon: Activity, path: '/dashboard' },
  { label: 'Contacts', icon: Users, path: '/dashboard/contacts' },
  { label: 'Deals', icon: TrendingUp, path: '/dashboard/deals' },
  { label: 'Revenue', icon: DollarSign, path: '/dashboard/revenue' },
  { label: 'Campaigns', icon: Mail, path: '/dashboard/campaigns' },
  { label: 'Settings', icon: Settings, path: '/dashboard/settings' },
]

export default function Dashboard() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Match active path — contacts/:id should still highlight Contacts
  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <motion.div
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.4 }}
        className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col fixed h-full z-10"
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
          <GlobalSearch />
          <NotificationBell />
          {navItems.map((item) => (
            <motion.button
              key={item.label}
              whileHover={{ x: 4 }}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive(item.path)
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

      <div style={{ marginLeft: '256px', flex: 1, minWidth: 0 }}>
        <Outlet />
      </div>
    </div>
  )
}
