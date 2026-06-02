import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  Award,
  Calendar,
  Layers,
  Sparkles,
  Play,
} from 'lucide-react'

interface Exam {
  id: string
  user_id: string
  title: string
  questions: any[]
  material_ids: string[]
  created_at: string
}

interface Material {
  id: string
  file_name: string
  file_type: string
}

interface Subject {
  id: string
  name: string
  color: string
}

export const ExamDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()

  const [exam, setExam] = useState<Exam | null>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Subject States
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
  const [updatingSubject, setUpdatingSubject] = useState(false)

  // Fetch all subjects for selector
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!user) return
      try {
        const { data } = await supabase
          .from('tbl_subjects')
          .select('*')
          .eq('user_id', user.id)
          .order('name')
        setSubjects(data || [])
      } catch (err) {
        console.error('Failed to fetch subjects in ExamDetail:', err)
      }
    }
    fetchSubjects()
  }, [user])

  // Fetch exam & its source materials
  const fetchExamDetails = useCallback(async () => {
    if (!id || !user) return
    setLoading(true)
    setError(null)
    try {
      // 1. Fetch exam
      const { data: examData, error: examError } = await supabase
        .from('tbl_exams')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (examError) throw examError
      setExam(examData)
      setSelectedSubjectId(examData.subject_id || '')

      // 2. Fetch associated materials
      if (examData && examData.material_ids && examData.material_ids.length > 0) {
        const { data: materialsData, error: materialsError } = await supabase
          .from('tbl_materials')
          .select('id, file_name, file_type')
          .in('id', examData.material_ids)
          .eq('user_id', user.id)

        if (materialsError) throw materialsError
        setMaterials(materialsData || [])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load exam details.')
    } finally {
      setLoading(false)
    }
  }, [id, user])

  useEffect(() => {
    fetchExamDetails()
  }, [fetchExamDetails])

  const handleSubjectChange = async (newSubjectId: string) => {
    setSelectedSubjectId(newSubjectId)
    setUpdatingSubject(true)
    try {
      const dbSubjectId = newSubjectId === '' ? null : newSubjectId
      const { error: updateError } = await supabase
        .from('tbl_exams')
        .update({ subject_id: dbSubjectId })
        .eq('id', id)

      if (updateError) throw updateError
    } catch (err) {
      console.error('Error updating exam subject:', err)
    } finally {
      setUpdatingSubject(false)
    }
  }

  // Count question type occurrences
  const getTypeCounts = () => {
    if (!exam || !exam.questions) return {}
    const counts: Record<string, number> = {}
    exam.questions.forEach((q: any) => {
      const type = q.type || 'unknown'
      counts[type] = (counts[type] || 0) + 1
    })
    return counts
  }

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return 'Multiple Choice'
      case 'identification':
        return 'Identification'
      case 'true_or_false':
        return 'True or False'
      case 'modified_true_or_false':
        return 'Modified True or False'
      case 'enumeration':
        return 'Enumeration'
      default:
        return 'Other'
    }
  }

  const getQuestionTypeColor = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'identification':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'true_or_false':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
      case 'modified_true_or_false':
        return 'bg-pink-500/10 text-pink-400 border-pink-500/20'
      case 'enumeration':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
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
          to="/exams"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group mb-6"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Exams
        </Link>
        <div className="flex items-start gap-3 rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error || 'Exam not found.'}</span>
        </div>
      </div>
    )
  }

  const typeCounts = getTypeCounts()

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      {/* Back Link */}
      <Link
        to="/exams"
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors group mb-8"
      >
        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Back to Exams
      </Link>

      <div className="glass-card rounded-3xl p-6 sm:p-8 border-white/10 shadow-2xl relative overflow-hidden space-y-8">
        {/* Glow background decoration */}
        <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl pointer-events-none"></div>

        {/* Lobby Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-white/5">
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Award className="h-6 w-6" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              {exam.title || 'Practice Exam'}
            </h1>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Calendar className="h-3.5 w-3.5" />
              <span>Created on {formatDate(exam.created_at)}</span>
            </div>
          </div>

          {/* Subject Selector */}
          <div className="flex items-center gap-2 shrink-0 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 self-start">
            <span className="text-xs font-semibold text-gray-400">Subject:</span>
            <select
              value={selectedSubjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="bg-transparent border-0 text-xs text-white focus:outline-none focus:ring-0 cursor-pointer"
            >
              <option value="" className="bg-[#0c101c]">Unassigned</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id} className="bg-[#0c101c]">
                  {sub.name}
                </option>
              ))}
            </select>
            {updatingSubject && <Loader2 className="h-3.5 w-3.5 text-purple-400 animate-spin" />}
          </div>
        </div>

        {/* Exam stats & details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Question Breakdown */}
          <div className="space-y-4">
            <h3 className="font-display text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              Question Distribution
            </h3>
            <div className="space-y-2">
              {Object.entries(typeCounts).map(([type, count]) => (
                <div
                  key={type}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-white/5 bg-white/[0.01]"
                >
                  <span className="text-xs text-gray-300 font-medium">
                    {getQuestionTypeLabel(type)}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getQuestionTypeColor(
                      type
                    )}`}
                  >
                    {count} question{count !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Source Materials */}
          <div className="space-y-4">
            <h3 className="font-display text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-400" />
              Source Materials
            </h3>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {materials.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No source materials listed.</p>
              ) : (
                materials.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-white/5 bg-white/[0.01]"
                  >
                    <span className="text-xs text-gray-300 font-semibold truncate max-w-[200px]" title={m.file_name}>
                      {m.file_name}
                    </span>
                    <span className="text-[9px] text-gray-500 font-bold uppercase border border-white/10 px-1.5 py-0.5 rounded bg-white/5">
                      {m.file_type}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Start CTA Area */}
        <div className="pt-6 border-t border-white/5 text-center">
          <Link
            to={`/exams/${exam.id}/take`}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 px-8 py-4 text-base font-bold text-white transition-all duration-200 cursor-pointer shadow-[0_4px_25px_rgba(147,51,234,0.3)] hover:shadow-[0_4px_30px_rgba(147,51,234,0.4)]"
          >
            <Play className="h-5 w-5 fill-current" />
            Start Practice Exam
          </Link>
          <p className="mt-3 text-xs text-gray-500">
            Click to open the exam taker. Your progress will be graded automatically upon submission.
          </p>
        </div>
      </div>
    </div>
  )
}
