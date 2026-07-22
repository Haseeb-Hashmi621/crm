import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import api from '../services/api'

export default function AdminRoute({ children }) {
  const [status, setStatus] = useState('checking') // checking | allowed | denied

  useEffect(() => {
    let cancelled = false
    api.get('/auth/me')
      .then(res => {
        if (cancelled) return
        setStatus(res.data.role === 'admin' ? 'allowed' : 'denied')
      })
      .catch(() => {
        if (!cancelled) setStatus('denied')
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (status === 'denied') {
      toast.error('Admin access required')
    }
  }, [status])

  if (status === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    )
  }

  if (status === 'denied') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}