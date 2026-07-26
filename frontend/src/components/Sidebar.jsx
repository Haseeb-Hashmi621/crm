// frontend/src/components/Sidebar.jsx
import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronsLeft, ChevronsRight, LogOut } from 'lucide-react'
import GlobalSearch from './GlobalSearch'
import NotificationBell from './NotificationBell'
import { dashboardItem, settingsItem, navigationGroups } from '../config/navigation'

const COLLAPSED_KEY = 'crm_sidebar_collapsed'
const OPEN_GROUPS_KEY = 'crm_sidebar_open_groups'

function isPathActive(pathname, itemPath) {
  if (itemPath === '/dashboard') return pathname === '/dashboard'
  return pathname === itemPath || pathname.startsWith(itemPath + '/')
}

// A single nav row — used for standalone items (Dashboard, Settings) and
// for items inside a group. Handles its own active state, hover state,
// and the icon-only + tooltip treatment when the sidebar is collapsed.
function SidebarItem({ item, collapsed, active, onClick }) {
  const Icon = item.icon
  return (
    <motion.button
      whileHover={{ x: collapsed ? 0 : 3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group/item relative w-full flex items-center gap-3 rounded-lg text-sm transition-colors ${
        collapsed ? 'justify-center py-2.5 px-0' : 'px-3 py-2.5'
      } ${
        active
          ? 'bg-violet-600 text-white'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}

      {collapsed && (
        <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-gray-700 bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover/item:opacity-100">
          {item.label}
        </span>
      )}
    </motion.button>
  )
}

// A collapsible group — title row toggles an animated-height list of
// SidebarItems. Renders as a flat icon stack (no header) when collapsed,
// since an accordion title is meaningless in icon-only mode.
function SidebarGroup({ group, collapsed, isOpen, hasActiveChild, onToggle, isActive, onNavigate }) {
  if (collapsed) {
    return (
      <div className="space-y-0.5 border-t border-gray-800/60 pt-2 mt-2 first:border-t-0 first:mt-0 first:pt-0">
        {group.items.map((item) => (
          <SidebarItem
            key={item.path}
            item={item}
            collapsed
            active={isActive(item.path)}
            onClick={() => onNavigate(item.path)}
          />
        ))}
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
          hasActiveChild ? 'text-violet-300' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <span>{group.title}</span>
        <motion.span
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-1 pb-1.5 space-y-0.5">
              {group.items.map((item) => (
                <SidebarItem
                  key={item.path}
                  item={item}
                  collapsed={false}
                  active={isActive(item.path)}
                  onClick={() => onNavigate(item.path)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Sidebar({ userRole, onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isAdmin = userRole === 'admin'

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === 'true' } catch { return false }
  })

  const [openGroups, setOpenGroups] = useState(() => {
    try {
      const saved = localStorage.getItem(OPEN_GROUPS_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  // Role-filtered groups — computed once per role change, never mutates config.
  const visibleGroups = useMemo(() => {
    return navigationGroups
      .filter((g) => !g.adminOnly || isAdmin)
      .map((g) => ({ ...g, items: g.items.filter((i) => !i.adminOnly || isAdmin) }))
      .filter((g) => g.items.length > 0)
  }, [isAdmin])

  const isActive = (path) => isPathActive(location.pathname, path)

  // Auto-expand whichever group contains the active route, without
  // collapsing any group the person already had open.
  useEffect(() => {
    const activeGroup = visibleGroups.find((g) => g.items.some((i) => isActive(i.path)))
    if (activeGroup && !openGroups[activeGroup.title]) {
      setOpenGroups((prev) => ({ ...prev, [activeGroup.title]: true }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, visibleGroups])

  useEffect(() => {
    try { localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(openGroups)) } catch { /* noop */ }
  }, [openGroups])

  useEffect(() => {
    try { localStorage.setItem(COLLAPSED_KEY, String(collapsed)) } catch { /* noop */ }
  }, [collapsed])

  const toggleGroup = (title) => setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }))
  const goTo = (path) => navigate(path)

  return (
    <motion.div
      animate={{ width: collapsed ? 76 : 256 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="bg-gray-900 border-r border-gray-800 flex flex-col fixed h-full z-10 overflow-hidden"
    >
      {/* Brand + collapse toggle */}
      <div className={`flex items-center border-b border-gray-800 ${collapsed ? 'justify-center px-3 py-5' : 'justify-between px-6 py-5'}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          {!collapsed && <span className="text-white font-semibold text-lg truncate">CRM</span>}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            title="Collapse sidebar"
            className="text-gray-500 hover:text-white transition-colors flex-shrink-0"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <div className="flex justify-center py-2 border-b border-gray-800">
          <button
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
            className="text-gray-500 hover:text-white transition-colors"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search + notifications — shown only when expanded; both rely on
          room for text/dropdowns that icon-only mode can't accommodate. */}
      {!collapsed && (
        <div className="pt-4">
          <GlobalSearch />
          <NotificationBell />
        </div>
      )}

      {/* Scrollable nav body */}
      <nav className={`flex-1 overflow-y-auto overflow-x-hidden min-h-0 ${collapsed ? 'px-3' : 'px-4'} ${collapsed ? '' : 'pt-1'} space-y-1 pb-4`}>
        <SidebarItem
          item={dashboardItem}
          collapsed={collapsed}
          active={isActive(dashboardItem.path)}
          onClick={() => goTo(dashboardItem.path)}
        />

        <div className={collapsed ? 'pt-1' : 'pt-3 space-y-3'}>
          {visibleGroups.map((group) => (
            <SidebarGroup
              key={group.title}
              group={group}
              collapsed={collapsed}
              isOpen={!!openGroups[group.title]}
              hasActiveChild={group.items.some((i) => isActive(i.path))}
              onToggle={() => toggleGroup(group.title)}
              isActive={isActive}
              onNavigate={goTo}
            />
          ))}
        </div>

        <div className={collapsed ? 'pt-1' : 'pt-3 border-t border-gray-800/60 mt-3'}>
          <SidebarItem
            item={settingsItem}
            collapsed={collapsed}
            active={isActive(settingsItem.path)}
            onClick={() => goTo(settingsItem.path)}
          />
        </div>
      </nav>

      {/* Logout — pinned to the bottom regardless of nav content height */}
      <div className={`border-t border-gray-800 ${collapsed ? 'px-3' : 'px-4'} py-4 flex-shrink-0`}>
        <motion.button
          whileHover={{ x: collapsed ? 0 : 3 }}
          whileTap={{ scale: 0.98 }}
          onClick={onLogout}
          title={collapsed ? 'Logout' : undefined}
          className={`group/item relative w-full flex items-center gap-3 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors ${
            collapsed ? 'justify-center py-2.5 px-0' : 'px-3 py-2.5'
          }`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
          {collapsed && (
            <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md border border-gray-700 bg-gray-800 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover/item:opacity-100">
              Logout
            </span>
          )}
        </motion.button>
      </div>
    </motion.div>
  )
}