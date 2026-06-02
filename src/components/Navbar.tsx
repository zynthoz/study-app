import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogOut, BookOpen, LayoutDashboard, Folder, Award, History } from 'lucide-react'

const navLinks = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/subjects', label: 'Subjects', icon: Folder },
  { to: '/exams', label: 'Exams', icon: Award },
  { to: '/history', label: 'History', icon: History },
]

export const Navbar: React.FC = () => {
  const { user, signOut } = useAuth()
  const location = useLocation()

  if (!user) return null

  return (
    <nav className="glass-nav sticky top-0 z-50 w-full px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Brand/Logo */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-purple-500 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-white bg-gradient-to-r from-white via-brand-200 to-brand-400 bg-clip-text text-transparent">
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
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-brand-500/15 text-brand-300 border border-brand-500/20'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              )
            })}
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs text-gray-400 font-medium">Logged in as</span>
            <span className="text-sm text-gray-200 font-semibold">{user.email}</span>
          </div>
          
          <button
            onClick={signOut}
            className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 transition-all duration-200 cursor-pointer shadow-[0_2px_10px_rgba(239,68,68,0.05)] hover:shadow-[0_2px_15px_rgba(239,68,68,0.15)]"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden xs:inline">Sign Out</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
