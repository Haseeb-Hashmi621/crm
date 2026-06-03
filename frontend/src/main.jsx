import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#1F2937',
          color: '#fff',
          border: '1px solid #374151',
          borderRadius: '12px',
          fontSize: '14px',
        },
        success: {
          iconTheme: {
            primary: '#8B5CF6',
            secondary: '#fff',
          },
        },
      }}
    />
  </StrictMode>,
)