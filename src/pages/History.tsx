import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import {
  History as HistoryIcon,
  Loader2,
  Calendar,
  Award,
  ChevronRight,
} from 'lucide-react'

interface ExamSession {
  id: string
  exam_id: string
  score: number
  total: number
  completed_at: string
  tbl_exams: {
    title: string
  } | null
}

export const HistoryPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [sessions, setSessions] = useState<ExamSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch all completed exam sessions
  const fetchSessions = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('tbl_exam_sessions')
        .select(`
          id,
          exam_id,
          score,
          total,
          completed_at,
          tbl_exams (
            title
          )
        `)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })

      if (fetchError) throw fetchError
      setSessions((data as any) || [])
    } catch (err: any) {
      console.error('Error fetching history:', err)
      setError('Failed to load practice exam history.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    if (percentage >= 75) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    if (percentage >= 50) return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20'
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
            Attempt History
          </h1>
          <p className="mt-2 text-gray-400">
            Review your past exam scores, correct/incorrect selections, and question explanation cards.
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
          <HistoryIcon className="h-6 w-6" />
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* History List */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center">
          <div className="mb-4 flex h-14 w-14 mx-auto items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20">
            <HistoryIcon className="h-6 w-6 text-purple-400" />
          </div>
          <p className="font-display text-lg font-semibold text-gray-300">
            No exam sessions logged yet
          </p>
          <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
            Take a practice exam first in the{' '}
            <Link to="/exams" className="text-purple-400 font-semibold hover:underline">
              Practice Exams
            </Link>{' '}
            tab to see your history logged here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const percentage = Math.round((session.score / session.total) * 100)
            const examTitle = session.tbl_exams?.title || 'Deleted Exam'
            return (
              <div
                key={session.id}
                onClick={() => navigate(`/exams/session/${session.id}?history=true`)}
                className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:border-purple-500/30 transition-all duration-200 group relative overflow-hidden bg-white/[0.01]"
              >
                {/* Left side: Icon, title, date */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:bg-purple-500/20 transition-all">
                    <Award className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                      {examTitle}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Completed {formatDate(session.completed_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Right side: Score & Chevron */}
                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-white/5 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-gray-400 font-medium">Score</p>
                      <p className="text-sm font-bold text-white">
                        {session.score} / {session.total}
                      </p>
                    </div>
                    
                    <span
                      className={`text-xs font-extrabold px-3 py-1 rounded-full border shrink-0 ${getPercentageColor(
                        percentage
                      )}`}
                    >
                      {percentage}%
                    </span>
                  </div>

                  <ChevronRight className="h-5 w-5 text-gray-500 group-hover:text-white transition-transform group-hover:translate-x-1 hidden sm:block" />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface AlertCircleProps {
  className?: string
}

const AlertCircle: React.FC<AlertCircleProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
    />
  </svg>
)
