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
  AlertCircle,
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
    <div className="mx-auto max-w-7xl px-6 py-12">

      {/* Error Alert */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs text-red-400">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" strokeWidth={1.5} />
          <span>{error}</span>
        </div>
      )}

      {/* History List */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 text-purple-400 animate-spin" strokeWidth={1.5} />
        </div>
      ) : sessions.length === 0 ? (
        <div className="double-bezel-outer bg-white/[0.005]">
          <div className="double-bezel-inner p-16 text-center space-y-4">
            <div className="mb-4 flex h-14 w-14 mx-auto items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20">
              <HistoryIcon className="h-6 w-6 text-purple-400" strokeWidth={1.5} />
            </div>
            <p className="font-display text-lg font-semibold text-zinc-300">
              No exam sessions logged yet
            </p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Take a practice exam first in the{' '}
              <Link to="/exams" className="text-purple-400 font-semibold hover:underline">
                Practice Exams
              </Link>{' '}
              tab to see your history logged here.
            </p>
          </div>
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
                className="double-bezel-outer cursor-pointer hover:border-purple-500/20 active:scale-[0.99] group"
              >
                <div className="double-bezel-inner p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Left side: Icon, title, date */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:bg-purple-500/20 transition-all">
                      <Award className="h-4.5 w-4.5" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                        {examTitle}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-mono">
                        <Calendar className="h-3 w-3" strokeWidth={1.5} />
                        <span>Completed {formatDate(session.completed_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Score & Chevron */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-white/5 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Score</p>
                        <p className="text-xs font-bold text-zinc-300 font-mono">
                          {session.score} / {session.total}
                        </p>
                      </div>
                      
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border shrink-0 ${getPercentageColor(
                          percentage
                        )}`}
                      >
                        {percentage}%
                      </span>
                    </div>

                    <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-white transition-transform group-hover:translate-x-1 hidden sm:block" strokeWidth={1.5} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
