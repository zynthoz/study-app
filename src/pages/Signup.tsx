import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Mail, Lock, BookOpen, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react'

export const Signup: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) throw signUpError

      // Check if email verification is required or if it signed up directly
      if (data.session) {
        // Direct sign in
        navigate('/')
      } else {
        // Email confirmation is sent
        setSuccess(true)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#080c14] px-4 py-12 sm:px-6 lg:px-8 overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-1/6 left-1/5 h-80 w-80 rounded-full bg-brand-500/10 blur-3xl animate-float-slow"></div>
      <div className="absolute bottom-1/6 right-1/5 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl animate-float-medium"></div>

      <div className="z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center text-center mb-8 animate-fade-in">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-purple-500 shadow-[0_0_25px_rgba(139,92,246,0.3)] mb-4">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            IndexAI
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Create an account to start generating and scoring study guides
          </p>
        </div>

        {/* Card wrapper */}
        <div className="glass-card rounded-xl p-8 sm:p-10">
          {success ? (
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.15)] text-green-400">
                <CheckCircle className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-xl font-bold text-white">Check your email</h3>
                <p className="text-sm text-gray-400">
                  We've sent a verification link to <span className="text-brand-300 font-semibold">{email}</span>. Please click the link to confirm your account and log in.
                </p>
              </div>
              <Link
                to="/login"
                className="flex items-center gap-2 rounded-lg bg-[#111827] border border-gray-800 px-6 py-3 text-sm font-semibold text-gray-200 hover:bg-gray-800 hover:text-white transition-colors"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSignup}>
              {error && (
                <div className="flex items-start gap-3 rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Email field */}
                <div>
                  <label htmlFor="signup-email" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                      <Mail className="h-5 w-5" />
                    </div>
                    <input
                      id="signup-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="glass-input block w-full pl-12 pr-4 py-3 text-sm focus:ring-2"
                      placeholder="name@domain.com"
                    />
                  </div>
                </div>

                {/* Password field */}
                <div>
                  <label htmlFor="signup-password" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      id="signup-password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="glass-input block w-full pl-12 pr-4 py-3 text-sm focus:ring-2"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {/* Confirm Password field */}
                <div>
                  <label htmlFor="signup-confirm-password" className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      id="signup-confirm-password"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="glass-input block w-full pl-12 pr-4 py-3 text-sm focus:ring-2"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="signup-submit-btn"
                type="submit"
                disabled={loading}
                className="group relative flex w-full justify-center rounded-lg bg-gradient-to-r from-brand-600 to-purple-600 px-4 py-3.5 text-sm font-semibold text-white hover:from-brand-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-[0_0_20px_rgba(139,92,246,0.2)] hover:shadow-[0_0_25px_rgba(139,92,246,0.4)] cursor-pointer"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign Up
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                )}
              </button>
            </form>
          )}

          {!success && (
            /* Footer Link */
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-400">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-medium text-brand-400 hover:text-brand-300 transition-colors"
                >
                  Sign in instead
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
