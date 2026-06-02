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
        <Loader2 className="h-6 w-6 text-purple-400 animate-spin" strokeWidth={1.5} />
      </div>
    )
  }

  if (error || !session || !exam) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <Link
          to={isHistoryView ? "/history" : "/exams"}
          className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors group mb-6"
        >
          <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" strokeWidth={1.5} />
          Back to {isHistoryView ? "Attempt History" : "Practice Exams"}
        </Link>
        <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs text-red-400">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" strokeWidth={1.5} />
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
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Back link */}
      <Link
        to={isHistoryView ? "/history" : "/exams"}
        className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors group mb-8"
      >
        <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" strokeWidth={1.5} />
        Back to {isHistoryView ? "Attempt History" : "Practice Exams"}
      </Link>

      <div className="space-y-8">
        {/* Results Overview Card */}
        <div className="double-bezel-outer bg-white/[0.005]">
          <div className="double-bezel-inner p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left: Score Text & Feedback */}
            <div className="space-y-3 flex-1 text-center md:text-left">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block font-mono">
                Results for: {exam.title}
              </span>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <h1 className={`text-2xl sm:text-3xl font-extrabold ${feedback.color.split(' ')[0]}`}>
                  {feedback.title}
                </h1>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${feedback.color}`}>
                  Score: {session.score} / {session.total} ({scorePercentage}%)
                </span>
              </div>
              <p className="text-sm text-zinc-400 max-w-md leading-relaxed">
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
                  strokeWidth="5"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  className={`${feedback.ringColor || 'stroke-purple-500'} transition-all duration-1000 ease-out`}
                  strokeWidth="5"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-lg font-extrabold text-white font-display">{scorePercentage}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {!isHistoryView && (
            <Link
              to={`/exams/${exam.id}/take`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 px-6 py-2.5 text-xs font-bold text-white transition-all duration-300 shadow-[0_4px_12px_rgba(168,85,247,0.15)] active:scale-[0.98]"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
              Retake Exam
            </Link>
          )}
          <Link
            to={isHistoryView ? "/history" : `/exams/${exam.id}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-6 py-2.5 text-xs font-bold text-zinc-300 hover:bg-white/10 transition active:scale-[0.98]"
          >
            <BookOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
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
                  className={`double-bezel-outer
                    ${correct
                      ? 'border-emerald-500/20 bg-emerald-500/[0.005] hover:border-emerald-500/30'
                      : 'border-rose-500/20 bg-rose-500/[0.005] hover:border-rose-500/30'
                    }
                  `}
                >
                  <div className="double-bezel-inner p-6">
                    <div className="flex items-start gap-4">
                      {/* Status Icon */}
                      <div className="shrink-0 mt-0.5">
                        {correct ? (
                          <CheckCircle className="h-5 w-5 text-emerald-400" strokeWidth={1.5} />
                        ) : (
                          <XCircle className="h-5 w-5 text-rose-400" strokeWidth={1.5} />
                        )}
                      </div>

                      <div className="flex-1 space-y-4">
                        {/* Question Content */}
                        <div>
                          <span className="text-[9px] uppercase font-bold text-zinc-500 font-mono block">
                            Question {idx + 1} • {q.type.replace(/_/g, ' ')}
                          </span>
                          <p className="text-base font-semibold text-zinc-100 mt-1 leading-relaxed">
                            {q.question}
                          </p>
                        </div>

                        {/* Display user answer vs correct answer */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-black/40 border border-white/5 rounded-xl p-3.5">
                          <div className="space-y-1">
                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Your Answer</span>
                            <p className={`font-semibold ${correct ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {Array.isArray(userAns)
                                ? userAns.map((val, eIdx) => `${eIdx + 1}. ${val || '(empty)'}`).join(', ')
                                : userAns || '(No Answer)'}
                            </p>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Correct Answer</span>
                            <p className="font-semibold text-emerald-400 font-mono">
                              {Array.isArray(q.answer)
                                ? q.answer.map((val, eIdx) => `${eIdx + 1}. ${val}`).join(', ')
                                : String(q.answer)}
                            </p>
                          </div>
                        </div>

                        {/* Explanation */}
                        {q.explanation && (
                          <div className="bg-purple-500/[0.02] border border-purple-500/10 rounded-xl p-4 text-xs leading-relaxed">
                            <span className="text-purple-300 font-bold uppercase tracking-wider block mb-1">Explanation</span>
                            <span className="text-zinc-400">{q.explanation}</span>
                          </div>
                        )}
                      </div>
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

