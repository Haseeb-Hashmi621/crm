// frontend/src/hooks/useInboundNotifications.jsx
// Global background poller — mounted in App.jsx, runs on every page
// Fires a toast when a new inbound message arrives on any channel

import { useEffect, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../services/api'

const CHANNEL_TOAST = {
  sms:      { icon: '📱', label: 'SMS' },
  whatsapp: { icon: '💬', label: 'WhatsApp' },
  email:    { icon: '✉️',  label: 'Email' },
  note:     { icon: '📝', label: 'Note' },
  call:     { icon: '📞', label: 'Call' },
  meeting:  { icon: '🤝', label: 'Meeting' },
}

export default function useInboundNotifications() {
  // Tracks the last seen preview string per contact
  // (API returns last_message_preview, NOT last_activity.id)
  const seenRef = useRef({})
  // First run: seed without toasting (avoids spamming old messages on refresh)
  const initializedRef = useRef(false)

  const poll = useCallback(async () => {
    try {
      const res = await api.get('/conversations/')
      const conversations = res.data

      if (!initializedRef.current) {
        // Seed with current previews — no toasts on first load
        conversations.forEach(item => {
          const contactId = item.contact?.id
          if (contactId) {
            seenRef.current[contactId] = item.last_message_preview ?? null
          }
        })
        initializedRef.current = true
        return
      }

      conversations.forEach(item => {
        const contactId = item.contact?.id
        if (!contactId) return

        const preview = item.last_message_preview ?? null
        const lastSeen = seenRef.current[contactId]

        // No change
        if (preview === lastSeen) return

        // Update seen map
        seenRef.current[contactId] = preview

        // Only notify for inbound messages
        if (!preview?.startsWith('[Inbound]')) return

        const msgType = item.last_message_type
        const ch = CHANNEL_TOAST[msgType] || { icon: '💬', label: 'Message' }
        const contactName = `${item.contact.first_name} ${item.contact.last_name}`.trim()

        toast(`${ch.icon} New ${ch.label} from ${contactName}`, {
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