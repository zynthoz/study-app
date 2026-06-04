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
  
  const [scrollProgress, setScrollProgress] = useState(0) // 0 to 1
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)

  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'dark'
  )

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScroll = window.scrollY
          const maxScroll = 120 // interpolate over 120px of scroll
          const progress = Math.min(Math.max(currentScroll / maxScroll, 0), 1)
          setScrollProgress(progress)
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

  const isNoteDetail = location.pathname.startsWith('/notes/')

  // Interpolated Styles for the Scroll-Linked Transition
  const currentPx = isNoteDetail ? 0 : (1 - scrollProgress) * (windowWidth < 640 ? 16 : 24)
  const isDark = theme === 'dark'

  const navStyle: React.CSSProperties = isNoteDetail
    ? {}
    : {
        paddingTop: `${24 - 12 * scrollProgress}px`,
        paddingBottom: `${8 - 2 * scrollProgress}px`,
        paddingLeft: `${currentPx}px`,
        paddingRight: `${currentPx}px`,
        backgroundColor: `rgba(${isDark ? '8, 12, 20' : '244, 244, 245'}, ${scrollProgress * (isDark ? 0.85 : 0.95)})`,
        borderBottom: `1px solid rgba(${isDark ? '255, 255, 255' : '0, 0, 0'}, ${scrollProgress * (isDark ? 0.05 : 0.08)})`,
        backdropFilter: scrollProgress > 0 ? `blur(${scrollProgress * 20}px)` : 'none',
        WebkitBackdropFilter: scrollProgress > 0 ? `blur(${scrollProgress * 20}px)` : 'none',
      }

  const innerStyle: React.CSSProperties = isNoteDetail
    ? {}
    : {
        borderRadius: `${(1 - scrollProgress) * 28}px`,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: `rgba(${isDark ? '255, 255, 255' : '0, 0, 0'}, ${(1 - scrollProgress) * (isDark ? 0.1 : 0.08)})`,
        backgroundColor: `rgba(${isDark ? '0, 0, 0' : '255, 255, 255'}, ${(1 - scrollProgress) * (isDark ? 0.6 : 0.75)})`,
        boxShadow: isDark
          ? `0 10px 30px rgba(0, 0, 0, ${(1 - scrollProgress) * 0.5})`
          : `0 10px 20px rgba(0, 0, 0, ${(1 - scrollProgress) * 0.04})`,
      }

  return (
    <nav
      className={`${isNoteDetail ? 'relative' : 'sticky top-0'} z-50 w-full`}
      style={navStyle}
    >
      <div
        className="mx-auto max-w-7xl flex items-center justify-between px-4 sm:px-6 py-3"
        style={innerStyle}
      >
        {/* Brand/Logo */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 border border-white/10 group-hover:border-purple-500/50 transition-all duration-300">
              <BookOpen className="h-4 w-4 text-purple-400 group-hover:text-purple-300 transition-colors" strokeWidth={1.5} />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-white group-hover:text-purple-300 transition-all duration-300">
              IndexAI
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
            className="flex items-center gap-2 rounded-full bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-zinc-400 border border-white/5 hover:text-red-400 hover:border-white/10 transition-all duration-300 cursor-pointer hover:bg-white/5 active:scale-[0.98]"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span className="hidden xs:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
