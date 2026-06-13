// frontend/src/hooks/useInboundNotifications.jsx
// Global background poller — mounted in App.jsx, runs on every page
// Fires a simple toast when a new inbound message arrives on any channel

import { useEffect, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'

// Simple icons as text — no JSX icon components needed
const CHANNEL_TOAST = {
  sms:      { icon: '📱', label: 'SMS' },
  whatsapp: { icon: '💬', label: 'WhatsApp' },
  email:    { icon: '✉️',  label: 'Email' },
  note:     { icon: '📝', label: 'Note' },
  call:     { icon: '📞', label: 'Call' },
  meeting:  { icon: '🤝', label: 'Meeting' },
}

export default function useInboundNotifications() {
  // Tracks the last seen activity ID per contact
  const seenRef = useRef({})
  // First run: seed without toasting (avoids spamming old messages on refresh)
  const initializedRef = useRef(false)

  const poll = useCallback(async () => {
    try {
      const res = await api.get('/conversations/')
      const conversations = res.data

      if (!initializedRef.current) {
        conversations.forEach(item => {
          if (item.last_activity) {
            seenRef.current[item.contact.id] = item.last_activity.id
          }
        })
        initializedRef.current = true
        return
      }

      conversations.forEach(item => {
        const { contact, last_activity } = item
        if (!last_activity) return

        const lastSeenId = seenRef.current[contact.id]
        if (last_activity.id === lastSeenId) return

        // New activity — update seen map
        seenRef.current[contact.id] = last_activity.id

        // Only notify for inbound messages
        if (!last_activity.content?.startsWith('[Inbound]')) return

        const ch = CHANNEL_TOAST[last_activity.type] || { icon: '💬', label: 'Message' }

        toast(`${ch.icon} New ${ch.label} message received`, {
          duration: 6000,
          style: {
            background:   '#1f2937',
            color:        '#f9fafb',
            border:       '1px solid #374151',
            borderRadius: 12,
            padding:      '12px 16px',
            fontSize:     14,
            fontWeight:   500,
          },
        })
      })
    } catch {
      // Silent — no console spam on network errors
    }
  }, [])

  useEffect(() => {
    poll()
    const interval = setInterval(poll, 8000)
    return () => clearInterval(interval)
  }, [poll])
}