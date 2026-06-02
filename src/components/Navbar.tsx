import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogOut, BookOpen, LayoutDashboard, Folder, Award, History, Sun, Moon } from 'lucide-react'

const navLinks = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/subjects', label: 'Subjects', icon: Folder },
  { to: '/exams', label: 'Exams', icon: Award },
  { to: '/history', label: 'History', icon: History },
]

export const Navbar: React.FC = () => {
  const { user, signOut } = useAuth()
  const location = useLocation()

  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'dark'
  )

  useEffect(() => {
    const root = window.document.documentElement
    if (theme === 'light') {
      root.classList.add('light')
      root.classList.remove('dark')
    } else {
      root.classList.add('dark')
      root.classList.remove('light')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  if (!user) return null

  return (
    <nav className="sticky top-0 z-50 w-full px-4 sm:px-6">
      <div className="mx-auto max-w-5xl mt-6 rounded-full border border-white/10 bg-black/60 backdrop-blur-xl px-4 sm:px-6 py-3 flex items-center justify-between shadow-[0_10px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
        {/* Brand/Logo */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 border border-white/10 group-hover:border-purple-500/50 transition-all duration-300">
              <BookOpen className="h-4 w-4 text-purple-400 group-hover:text-purple-300 transition-colors" strokeWidth={1.5} />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-white group-hover:text-purple-300 transition-all duration-300">
              StudyForge
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden sm:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to
              const Icon = link.icon
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-300 relative
                    ${isActive
                      ? 'text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                    }
                  `}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-400" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Logged in as</span>
            <span className="text-xs text-zinc-300 font-bold">{user.email}</span>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-zinc-900 border border-white/5 text-zinc-400 hover:text-purple-400 hover:bg-zinc-800 transition-all duration-300 cursor-pointer active:scale-[0.98]"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <Moon className="h-4 w-4" strokeWidth={1.5} />
            )}
          </button>
          
          <button
            onClick={signOut}
            className="flex items-center gap-2 rounded-full bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-zinc-400 border border-white/5 hover:text-red-400 hover:border-red-500/25 transition-all duration-300 cursor-pointer hover:bg-red-500/5 active:scale-[0.98]"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span className="hidden xs:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
