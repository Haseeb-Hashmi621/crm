// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import DashboardHome from './pages/DashboardHome'
import Contacts from './pages/Contacts'
import ContactDetail from './pages/ContactDetail'
import Deals from './pages/Deals'
import Revenue from './pages/Revenue'
import Settings from './pages/Settings'
import useAuthStore from './store/authStore'
import Campaigns from './pages/Campaigns'
import DealDetail from './pages/DealDetail'
import Segments from './pages/Segments'
import Templates from './pages/Templates'
import InboxPage from './pages/InboxPage'
import Conversations from './pages/Conversations'
import useInboundNotifications from './hooks/useInboundNotifications'
import Tasks from './pages/Tasks'
import Mails from './pages/Mails'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? children : <Navigate to="/login" />
}

// Mounted inside BrowserRouter + only when authenticated.
// Polls /conversations/ every 8s and fires a toast on new inbound messages.
function GlobalNotificationPoller() {
  useInboundNotifications()
  return null
}

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <BrowserRouter>
      {/* Global poller — runs on every page as long as the user is logged in */}
      {isAuthenticated && <GlobalNotificationPoller />}

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>}>
          <Route index element={<DashboardHome />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="contacts/:id" element={<ContactDetail />} />
          <Route path="deals" element={<Deals />} />
          <Route path="deals/:id" element={<DealDetail />} />
          <Route path="revenue" element={<Revenue />} />
          <Route path="settings" element={<Settings />} />
          <Route path="campaigns" element={<Campaigns />} />
          <Route path="segments" element={<Segments />} />
          <Route path="templates" element={<Templates />} />
          <Route path="inbox" element={<InboxPage />} />
          <Route path="conversations" element={<Conversations />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="mail" element={<Mails/>} />
        </Route>
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App