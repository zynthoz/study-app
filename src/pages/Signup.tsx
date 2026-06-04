import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Mail, Lock, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react'

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
      <div className="absolute top-1/6 left-1/5 h-80 w-80 rounded-full bg-brand-500/5 blur-3xl animate-float-slow pointer-events-none"></div>
      <div className="absolute bottom-1/6 right-1/5 h-96 w-96 rounded-full bg-purple-500/5 blur-3xl animate-float-medium pointer-events-none"></div>

      <div className="z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center text-center mb-8 animate-fade-in">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/[0.08] text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.08)] mb-4 p-1.5">
            <svg viewBox="0 0 100 100" className="h-full w-full" fill="none" stroke="currentColor">
              <g strokeWidth="2.5">
                <rect x="15" y="15" width="70" height="70" rx="6" />
                <rect x="15" y="15" width="70" height="70" rx="6" transform="rotate(45, 50, 50)" opacity="0.5" strokeWidth="1.5" />
                <line x1="2" y1="50" x2="98" y2="50" strokeDasharray="4 4" strokeWidth="1" opacity="0.3" />
                <line x1="50" y1="2" x2="50" y2="98" strokeDasharray="4 4" strokeWidth="1" opacity="0.3" />
                <circle cx="50" cy="50" r="4.5" fill="currentColor" stroke="none" />
              </g>
            </svg>
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white">
            IndexAI
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Create an account to start generating and scoring study guides
          </p>
        </div>

        {/* Double-Bezel nested wrapper */}
        <div className="double-bezel-outer w-full">
          <div className="double-bezel-inner p-8 sm:p-10">
            {success ? (
              <div className="flex flex-col items-center text-center space-y-6 animate-fade-in">
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
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        id="signup-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="glass-input block w-full pl-11 pr-4 py-3 text-sm focus:ring-2"
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
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        id="signup-password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="glass-input block w-full pl-11 pr-4 py-3 text-sm focus:ring-2"
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
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        id="signup-confirm-password"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="glass-input block w-full pl-11 pr-4 py-3 text-sm focus:ring-2"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button - Button-in-Button Trailing Icon pattern */}
                <button
                  id="signup-submit-btn"
                  type="submit"
                  disabled={loading}
                  className="group w-full flex items-center justify-between rounded-xl bg-purple-600 hover:bg-purple-500 pl-6 pr-2.5 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-[0_4px_15px_rgba(139,92,246,0.25)] hover:shadow-[0_6px_20px_rgba(139,92,246,0.4)] active:scale-[0.98] cursor-pointer"
                >
                  {loading ? (
                    <div className="flex-1 flex justify-center py-1">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    </div>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center transition-all duration-300 group-hover:translate-x-0.5">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </>
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
                    className="font-medium text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Sign in instead
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
