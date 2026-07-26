// frontend/src/pages/Dashboard.jsx  — REPLACE ENTIRE FILE
import { useState, useEffect } from 'react'
import useAuthStore from '../store/authStore'
import { useNavigate, Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import api from '../services/api'

export default function Dashboard() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    api.get('/auth/me').then(r => setUserRole(r.data.role)).catch(() => {})
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Sidebar userRole={userRole} onLogout={handleLogout} />

      <div style={{ marginLeft: '256px', flex: 1, minWidth: 0 }}>
        <Outlet />
      </div>
    </div>
  )
}