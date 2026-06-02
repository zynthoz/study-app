import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080c14] relative overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl animate-float-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl animate-float-medium"></div>
        
        {/* Loading Spinner */}
        <div className="flex flex-col items-center gap-4 z-10">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-400 border-t-transparent shadow-[0_0_15px_rgba(167,139,250,0.5)]"></div>
          <p className="font-display text-sm tracking-wide text-brand-300 animate-pulse">
            Verifying session...
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
