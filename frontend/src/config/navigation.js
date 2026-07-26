// frontend/src/config/navigation.js
// Single source of truth for sidebar navigation. Add/remove pages here —
// the Sidebar component renders purely from this config.
import {
  Activity, Users, TrendingUp, CheckSquare, CalendarDays, FileText,
  MessageCircle, Inbox, Mail, Filter, Repeat, Bot, Zap, CalendarClock,
  Package, Receipt, DollarSign, BarChart3, Shield, Settings as SettingsIcon,
} from 'lucide-react'

// Standalone items — never grouped, never collapsible.
export const dashboardItem = { label: 'Dashboard', icon: Activity, path: '/dashboard' }
export const settingsItem = { label: 'Settings', icon: SettingsIcon, path: '/dashboard/settings' }

// Grouped items. `adminOnly` on a group hides the whole group for
// non-admins; `adminOnly` on an item hides just that item.
export const navigationGroups = [
  {
    title: 'CRM',
    items: [
      { label: 'Contacts', icon: Users, path: '/dashboard/contacts' },
      { label: 'Deals', icon: TrendingUp, path: '/dashboard/deals' },
      { label: 'Tasks', icon: CheckSquare, path: '/dashboard/tasks' },
      { label: 'Calendar', icon: CalendarDays, path: '/dashboard/calendar' },
      { label: 'Forms', icon: FileText, path: '/dashboard/forms' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { label: 'Conversations', icon: MessageCircle, path: '/dashboard/conversations' },
      { label: 'Inbox', icon: Inbox, path: '/dashboard/inbox' },
      { label: 'Mail', icon: Mail, path: '/dashboard/mail' },
      { label: 'Campaigns', icon: Mail, path: '/dashboard/campaigns' },
      { label: 'Sequences', icon: Repeat, path: '/dashboard/sequences' },
      { label: 'Templates', icon: FileText, path: '/dashboard/templates' },
      { label: 'Chatbot', icon: Bot, path: '/dashboard/chatbot', adminOnly: true },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { label: 'Segments', icon: Filter, path: '/dashboard/segments' },
      { label: 'Automation', icon: Zap, path: '/dashboard/workflows' },
      { label: 'Scheduler', icon: CalendarClock, path: '/dashboard/scheduler' },
    ],
  },
  {
    title: 'Sales',
    items: [
      { label: 'Products', icon: Package, path: '/dashboard/products' },
      { label: 'Quotes', icon: FileText, path: '/dashboard/quotes' },
      { label: 'Invoices', icon: Receipt, path: '/dashboard/invoices' },
    ],
  },
  {
    title: 'Insights',
    items: [
      { label: 'Revenue', icon: DollarSign, path: '/dashboard/revenue' },
      { label: 'Analytics', icon: BarChart3, path: '/dashboard/analytics' },
    ],
  },
  {
    title: 'Administration',
    adminOnly: true,
    items: [
      { label: 'Admin', icon: Shield, path: '/dashboard/admin' },
    ],
  },
]