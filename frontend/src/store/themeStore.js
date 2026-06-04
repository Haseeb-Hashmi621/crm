import { create } from 'zustand'

function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else if (theme === 'light') {
    root.classList.remove('dark')
  } else {
    // system
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (systemDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }
}

// Apply on load
const savedTheme = localStorage.getItem('theme') || 'dark'
applyTheme(savedTheme)

const useThemeStore = create((set) => ({
  theme: savedTheme,
  setTheme: (theme) => {
    localStorage.setItem('theme', theme)
    applyTheme(theme)
    set({ theme })
  },
}))

export default useThemeStore