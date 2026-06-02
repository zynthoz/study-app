import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import {
  Loader2,
  AlertCircle,
  ChevronLeft,
  RotateCcw,
  CheckCircle,
  XCircle,
  BookOpen,
} from 'lucide-react'

interface Question {
  id: number
  type: 'multiple_choice' | 'identification' | 'true_or_false' | 'modified_true_or_false' | 'enumeration'
  question: string
  choices: string[]
  answer: string | string[]
  explanation: string
}

interface Exam {
  id: string
  title: string
  questions: Question[]
}

interface ExamSession {
  id: string
  exam_id: string
  score: number
  total: number
  answers: Record<number, string | string[]>
  completed_at: string
}

export const ExamResults: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const isHistoryView = searchParams.get('history') === 'true'

  const [session, setSession] = useState<ExamSession | null>(null)
  const [exam, setExam] = useState<Exam | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch session & associated exam
  const fetchSessionAndExam = useCallback(async () => {
    if (!sessionId || !user) return
    setLoading(true)
    setError(null)
    try {
      // 1. Fetch exam session
      const { data: sessionData, error: sessionError } = await supabase
        .from('tbl_exam_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single()

      if (sessionError) throw sessionError
      setSession(sessionData)

      // 2. Fetch exam
      if (sessionData) {
        const { data: examData, error: examError } = await supabase
          .from('tbl_exams')
          .select('id, title, questions')
          .eq('id', sessionData.exam_id)
          .eq('user_id', user.id)
          .single()

        if (examError) throw examError
        setExam(examData)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load exam results.')
    } finally {
      setLoading(false)
    }
  }, [sessionId, user])

  useEffect(() => {
    fetchSessionAndExam()
  }, [fetchSessionAndExam])

  // Grade helper (similar to ExamSession logic)
  const isQuestionCorrect = (q: Question, userAns: string | string[] | undefined) => {
    if (userAns === undefined || userAns === null) return false

    if (q.type === 'identification') {
      const userStr = typeof userAns === 'string' ? userAns.trim().toLowerCase() : ''
      const correctStr = typeof q.answer === 'string' ? q.answer.trim().toLowerCase() : ''
      return userStr === correctStr
    } else if (q.type === 'enumeration') {
      const userArr = Array.isArray(userAns) ? userAns.map((s) => s.trim().toLowerCase()) : []
      const correctArr = Array.isArray(q.answer) ? q.answer.map((s: string) => s.trim().toLowerCase()) : []

      const userSet = new Set(userArr)
      const correctSet = new Set(correctArr)

      if (userSet.size === correctSet.size) {
        return [...userSet].every((val) => correctSet.has(val))
      }
      return false
    } else {
      const userStr = typeof userAns === 'string' ? userAns.trim() : ''
      const correctStr = typeof q.answer === 'string' ? q.answer.trim() : ''
      return userStr.toLowerCase() === correctStr.toLowerCase()
    }
  }

  // Get Qualitative Feedback
  const getFeedbackDetails = (score: number, total: number) => {
    if (total === 0) return { title: 'No score available', message: '', color: 'text-gray-400' }
    const percentage = (score / total) * 100

    if (percentage >= 90) {
      return {
        title: 'Outstanding!',
        message: "You've mastered this material. Exceptional score!",
        color: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
        ringColor: 'stroke-amber-400',
      }
    } else if (percentage >= 75) {
      return {
        title: 'Great Job!',
        message: 'Very solid understanding of the material. Keep it up!',
        color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
        ringColor: 'stroke-emerald-400',
      }
    } else if (percentage >= 50) {
      return {
        title: 'Good Effort!',
        message: 'Decent performance. A bit more review will get you to the top.',
        color: 'text-blue-400 border-blue-500/20 bg-blue-500/5',
        ringColor: 'stroke-blue-400',
      }
    } else {
      return {
        title: 'Keep Studying!',
        message: 'Review your source materials and notes, then try taking this exam again.',
        color: 'text-rose-400 border-rose-500/20 bg-rose-500/5',
        ringColor: 'stroke-rose-400',
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
      </div>
    )
  }

  if (error || !session || !exam) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Link
          to={isHistoryView ? "/history" : "/exams"}
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group mb-6"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to {isHistoryView ? "Attempt History" : "Practice Exams"}
        </Link>
        <div className="flex items-start gap-3 rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error || 'Exam session results not found.'}</span>
        </div>
      </div>
    )
  }

  const scorePercentage = Math.round((session.score / session.total) * 100)
  const feedback = getFeedbackDetails(session.score, session.total)

  // SVG configurations for Circle Gauge
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (scorePercentage / 100) * circumference

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      {/* Back link */}
      <Link
        to={isHistoryView ? "/history" : "/exams"}
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group mb-8"
      >
        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Back to {isHistoryView ? "Attempt History" : "Practice Exams"}
      </Link>

      <div className="space-y-8">
        {/* Results Overview Card */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border-white/10 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl pointer-events-none"></div>

          {/* Left: Score Text & Feedback */}
          <div className="space-y-3 flex-1 text-center md:text-left">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Results for: {exam.title}
            </span>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <h1 className={`text-2xl sm:text-3xl font-extrabold ${feedback.color.split(' ')[0]}`}>
                {feedback.title}
              </h1>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${feedback.color}`}>
                Score: {session.score} / {session.total} ({scorePercentage}%)
              </span>
            </div>
            <p className="text-sm text-gray-400 max-w-md">
              {feedback.message}
            </p>
          </div>

          {/* Right: SVG Circle Gauge */}
          <div className="relative shrink-0 flex items-center justify-center">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-white/5"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="48"
                cy="48"
                r={radius}
                className={`${feedback.ringColor || 'stroke-purple-500'} transition-all duration-1000 ease-out`}
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-xl font-extrabold text-white">{scorePercentage}%</span>
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {!isHistoryView && (
            <Link
              to={`/exams/${exam.id}/take`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 px-6 py-3.5 text-sm font-semibold text-white transition-all cursor-pointer shadow-[0_4px_15px_rgba(147,51,234,0.2)]"
            >
              <RotateCcw className="h-4.5 w-4.5" />
              Retake practice exam
            </Link>
          )}
          <Link
            to={isHistoryView ? "/history" : `/exams/${exam.id}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-6 py-3.5 text-sm font-semibold text-gray-300 hover:bg-white/10 transition cursor-pointer"
          >
            <BookOpen className="h-4.5 w-4.5" />
            {isHistoryView ? "Back to history" : "Back to lobby"}
          </Link>
        </div>

        {/* Detailed Question Review */}
        <div className="space-y-6">
          <h2 className="font-display text-xl font-bold text-white">
            Detailed Review
          </h2>

          <div className="space-y-4">
            {exam.questions.map((q, idx) => {
              const userAns = session.answers[q.id]
              const correct = isQuestionCorrect(q, userAns)

              return (
                <div
                  key={q.id}
                  className={`glass-card rounded-2xl border p-6 transition-all duration-200
                    ${correct
                      ? 'border-emerald-500/20 bg-emerald-500/[0.01] hover:border-emerald-500/30'
                      : 'border-rose-500/20 bg-rose-500/[0.01] hover:border-rose-500/30'
                    }
                  `}
                >
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div className="shrink-0 mt-0.5">
                      {correct ? (
                        <CheckCircle className="h-6 w-6 text-emerald-400" />
                      ) : (
                        <XCircle className="h-6 w-6 text-rose-400" />
                      )}
                    </div>

                    <div className="flex-1 space-y-4">
                      {/* Question Content */}
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-500">
                          Question {idx + 1} • {q.type.replace(/_/g, ' ')}
                        </span>
                        <p className="text-base font-semibold text-gray-100 mt-1 leading-relaxed">
                          {q.question}
                        </p>
                      </div>

                      {/* Display user answer vs correct answer */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-white/[0.01] border border-white/5 rounded-xl p-3.5">
                        <div className="space-y-1">
                          <span className="text-xs text-gray-500 font-semibold uppercase">Your Answer</span>
                          <p className={`font-medium ${correct ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {Array.isArray(userAns)
                              ? userAns.map((val, eIdx) => `${eIdx + 1}. ${val || '(empty)'}`).join(', ')
                              : userAns || '(No Answer)'}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-xs text-gray-500 font-semibold uppercase">Correct Answer</span>
                          <p className="font-medium text-emerald-400">
                            {Array.isArray(q.answer)
                              ? q.answer.map((val, eIdx) => `${eIdx + 1}. ${val}`).join(', ')
                              : String(q.answer)}
                          </p>
                        </div>
                      </div>

                      {/* Explanation */}
                      {q.explanation && (
                        <div className="bg-purple-500/[0.02] border border-purple-500/10 rounded-xl p-4 text-xs leading-relaxed">
                          <span className="text-purple-400 font-bold uppercase block mb-1">Explanation</span>
                          <span className="text-gray-400">{q.explanation}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
