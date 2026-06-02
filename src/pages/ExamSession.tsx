import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import {
  Loader2,
  AlertCircle,
  Award,
  ChevronLeft,
  Send,
  HelpCircle,
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

export const ExamSession: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [exam, setExam] = useState<Exam | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // User answers state: questionId -> answer string or array of strings
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({})

  // Fetch exam questions
  const fetchExam = useCallback(async () => {
    if (!id || !user) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('tbl_exams')
        .select('id, title, questions')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (fetchError) throw fetchError

      if (data) {
        setExam(data)
        
        // Initialize default empty answers for each question
        const initialAnswers: Record<number, string | string[]> = {}
        const questionsList = (data.questions || []) as Question[]
        questionsList.forEach((q) => {
          if (q.type === 'enumeration') {
            const expectedCount = Array.isArray(q.answer) ? q.answer.length : 1
            initialAnswers[q.id] = Array(expectedCount).fill('')
          } else {
            initialAnswers[q.id] = ''
          }
        })
        setAnswers(initialAnswers)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load practice exam.')
    } finally {
      setLoading(false)
    }
  }, [id, user])

  useEffect(() => {
    fetchExam()
  }, [fetchExam])

  // Handle single value change (radio/text)
  const handleSingleValueChange = (qId: number, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: value,
    }))
  }

  // Handle enumeration value change
  const handleEnumValueChange = (qId: number, index: number, value: string) => {
    setAnswers((prev) => {
      const currentEnum = Array.isArray(prev[qId]) ? [...(prev[qId] as string[])] : []
      currentEnum[index] = value
      return {
        ...prev,
        [qId]: currentEnum,
      }
    })
  }

  // Check if all questions are fully answered
  const isComplete = () => {
    if (!exam || !exam.questions) return false
    return exam.questions.every((q) => {
      const ans = answers[q.id]
      if (ans === undefined || ans === null) return false
      if (q.type === 'enumeration') {
        const arr = ans as string[]
        const expectedCount = Array.isArray(q.answer) ? q.answer.length : 1
        return arr.length === expectedCount && arr.every((val) => val.trim() !== '')
      }
      return typeof ans === 'string' && ans.trim() !== ''
    })
  }

  // Perform scoring locally and submit session
  const handleSubmitExam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!exam || !user || !isComplete() || submitting) return

    setSubmitting(true)
    setError(null)

    try {
      let score = 0
      const total = exam.questions.length

      exam.questions.forEach((q) => {
        const userAns = answers[q.id]
        let correct = false

        if (q.type === 'identification') {
          const userStr = typeof userAns === 'string' ? userAns.trim().toLowerCase() : ''
          const correctStr = typeof q.answer === 'string' ? q.answer.trim().toLowerCase() : ''
          correct = userStr === correctStr
        } else if (q.type === 'enumeration') {
          const userArr = Array.isArray(userAns) ? userAns.map((s) => s.trim().toLowerCase()) : []
          const correctArr = Array.isArray(q.answer) ? q.answer.map((s: string) => s.trim().toLowerCase()) : []

          const userSet = new Set(userArr)
          const correctSet = new Set(correctArr)

          if (userSet.size === correctSet.size) {
            correct = [...userSet].every((val) => correctSet.has(val))
          }
        } else {
          // multiple_choice, true_or_false, modified_true_or_false
          const userStr = typeof userAns === 'string' ? userAns.trim() : ''
          const correctStr = typeof q.answer === 'string' ? q.answer.trim() : ''
          correct = userStr.toLowerCase() === correctStr.toLowerCase()
        }

        if (correct) {
          score++
        }
      })

      // Write session into database
      const { data: sessionData, error: dbError } = await supabase
        .from('tbl_exam_sessions')
        .insert({
          user_id: user.id,
          exam_id: exam.id,
          answers: answers,
          score: score,
          total: total,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (dbError) throw dbError

      // Redirect to Results Page
      navigate(`/exams/session/${sessionData.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to submit exam session.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 text-purple-400 animate-spin" />
      </div>
    )
  }

  if (error || !exam) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Link
          to={`/exams/${id}`}
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group mb-6"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Lobby
        </Link>
        <div className="flex items-start gap-3 rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error || 'Exam session could not be initialized.'}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <Link
          to={`/exams/${exam.id}`}
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Cancel Exam
        </Link>
        <div className="flex items-center gap-2 text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full px-3 py-1">
          <Award className="h-3.5 w-3.5" />
          <span>Practice Session</span>
        </div>
      </div>

      <form onSubmit={handleSubmitExam} className="space-y-8">
        {/* Title Card */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 border-white/10 shadow-2xl relative overflow-hidden">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white leading-tight">
            {exam.title}
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Please answer all questions below. When finished, click the submit button at the bottom of the page.
          </p>
        </div>

        {/* Questions list */}
        <div className="space-y-6">
          {exam.questions.map((q, idx) => {
            const currentAnswer = answers[q.id]
            return (
              <div
                key={q.id}
                className="glass-card rounded-2xl p-6 sm:p-8 border-white/5 bg-white/[0.01] hover:border-white/10 transition-all duration-200"
              >
                {/* Question Label */}
                <div className="flex items-start gap-3.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs font-bold text-purple-400 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="space-y-4 flex-1">
                    <p className="text-base font-semibold text-gray-100 leading-relaxed">
                      {q.question}
                    </p>

                    {/* Inputs based on type */}

                    {/* MULTIPLE CHOICE / MODIFIED TRUE OR FALSE */}
                    {(q.type === 'multiple_choice' || q.type === 'modified_true_or_false') && (
                      <div className="grid grid-cols-1 gap-2.5 mt-2">
                        {q.choices.map((choice) => {
                          // Extract option key (e.g. "A" from "A. Choice" or "A: Choice")
                          const choiceKey = choice.trim().charAt(0).toUpperCase()
                          const isSelected = currentAnswer === choiceKey
                          return (
                            <label
                              key={choice}
                              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-150 select-none
                                ${isSelected
                                  ? 'bg-purple-500/10 border-purple-500/30 text-white'
                                  : 'bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/[0.05] hover:text-gray-200'
                                }
                              `}
                            >
                              <input
                                type="radio"
                                name={`q-${q.id}`}
                                checked={isSelected}
                                onChange={() => handleSingleValueChange(q.id, choiceKey)}
                                className="sr-only"
                              />
                              <div
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-extrabold mt-0.5 transition-all
                                  ${isSelected
                                    ? 'border-purple-400 bg-purple-500 text-white'
                                    : 'border-gray-600 bg-white/5 text-gray-500'
                                  }
                                `}
                              >
                                {choiceKey}
                              </div>
                              <span className="text-sm font-medium leading-relaxed">{choice}</span>
                            </label>
                          )
                        })}
                      </div>
                    )}

                    {/* TRUE OR FALSE */}
                    {q.type === 'true_or_false' && (
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        {['True', 'False'].map((option) => {
                          const isSelected = currentAnswer === option
                          return (
                            <label
                              key={option}
                              className={`flex items-center justify-center gap-2.5 p-3.5 rounded-xl border cursor-pointer transition-all duration-150 select-none text-center font-bold text-sm
                                ${isSelected
                                  ? 'bg-purple-500/10 border-purple-500/30 text-white shadow-[0_0_15px_rgba(147,51,234,0.05)]'
                                  : 'bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/[0.05] hover:text-gray-200'
                                }
                              `}
                            >
                              <input
                                type="radio"
                                name={`q-${q.id}`}
                                checked={isSelected}
                                onChange={() => handleSingleValueChange(q.id, option)}
                                className="sr-only"
                              />
                              {option}
                            </label>
                          )
                        })}
                      </div>
                    )}

                    {/* IDENTIFICATION */}
                    {q.type === 'identification' && (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={(currentAnswer as string) || ''}
                          onChange={(e) => handleSingleValueChange(q.id, e.target.value)}
                          placeholder="Type your answer here..."
                          className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-white/[0.05] border border-white/5 focus:border-purple-500/40 rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-0 transition-all"
                        />
                      </div>
                    )}

                    {/* ENUMERATION */}
                    {q.type === 'enumeration' && (
                      <div className="grid grid-cols-1 gap-3 mt-2">
                        {Array.isArray(currentAnswer) &&
                          currentAnswer.map((val, eIdx) => (
                            <div key={eIdx} className="flex items-center gap-3">
                              <span className="text-xs text-gray-500 font-bold w-4 shrink-0">
                                {eIdx + 1}.
                              </span>
                              <input
                                type="text"
                                value={val || ''}
                                onChange={(e) =>
                                  handleEnumValueChange(q.id, eIdx, e.target.value)
                                }
                                placeholder={`Answer item ${eIdx + 1}...`}
                                className="w-full bg-white/[0.02] hover:bg-white/[0.04] focus:bg-white/[0.05] border border-white/5 focus:border-purple-500/40 rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-0 transition-all"
                              />
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col items-center justify-center p-6 bg-white/[0.01] border border-white/5 rounded-3xl space-y-4">
          <button
            type="submit"
            disabled={!isComplete() || submitting}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 px-10 py-4 text-base font-bold text-white transition-all duration-200 cursor-pointer shadow-[0_4px_25px_rgba(147,51,234,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none hover:shadow-[0_4px_30px_rgba(147,51,234,0.4)]"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Submit and Grade Exam
              </>
            )}
          </button>
          {!isComplete() && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5 text-purple-400" />
              Answer all questions to enable grading.
            </p>
          )}
        </div>
      </form>
    </div>
  )
}
