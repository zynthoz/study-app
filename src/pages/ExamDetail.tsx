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
      const { data, error: updateError } = await supabase
        .from('tbl_exams')
        .update({ subject_id: dbSubjectId })
        .eq('id', id)
        .select()

      if (updateError) throw updateError
      if (!data || data.length === 0) {
        throw new Error('No rows updated. Make sure database RLS update policies are configured.')
      }
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
        <Loader2 className="h-6 w-6 text-purple-400 animate-spin" strokeWidth={1.5} />
      </div>
    )
  }

  if (error || !exam) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <Link
          to="/exams"
          className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors group mb-6"
        >
          <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" strokeWidth={1.5} />
          Back to Exams
        </Link>
        <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs text-red-400">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" strokeWidth={1.5} />
          <span>{error || 'Exam not found.'}</span>
        </div>
      </div>
    )
  }

  const typeCounts = getTypeCounts()

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 space-y-6">
      {/* Back Link */}
      <Link
        to="/exams"
        className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors group"
      >
        <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" strokeWidth={1.5} />
        Back to Exams
      </Link>

      <div className="double-bezel-outer bg-white/[0.005]">
        <div className="double-bezel-inner overflow-hidden flex flex-col md:flex-row md:divide-x divide-y md:divide-y-0 divide-white/5">
          
          {/* Left Panel: Summary, Breakdown, Materials */}
          <div className="flex-1 p-6 sm:p-8 space-y-8">
            <div className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Award className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                {exam.title || 'Practice Exam'}
              </h1>
              <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
                <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
                <span>Created on {formatDate(exam.created_at)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6 border-t border-white/5">
              {/* Question Distribution */}
              <div className="space-y-4">
                <h3 className="font-display text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-purple-400" strokeWidth={1.5} />
                  Distribution
                </h3>
                <div className="space-y-2">
                  {Object.entries(typeCounts).map(([type, count]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between p-2 rounded-lg border border-white/5 bg-black/20"
                    >
                      <span className="text-xs text-zinc-300 font-medium">
                        {getQuestionTypeLabel(type)}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${getQuestionTypeColor(
                          type
                        )}`}
                      >
                        {count} Q
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Source Materials */}
              <div className="space-y-4">
                <h3 className="font-display text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-purple-400" strokeWidth={1.5} />
                  Materials
                </h3>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {materials.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic">No source materials listed.</p>
                  ) : (
                    materials.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2 rounded-lg border border-white/5 bg-black/20"
                      >
                        <span className="text-xs text-zinc-300 font-semibold truncate max-w-[140px]" title={m.file_name}>
                          {m.file_name}
                        </span>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase border border-white/10 px-1.5 py-0.5 rounded bg-white/5 shrink-0">
                          {m.file_type}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Primary Actions & Subject configuration */}
          <div className="w-full md:w-80 p-6 sm:p-8 bg-black/25 flex flex-col justify-between gap-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">
                  Subject Enclosure
                </label>
                <div className="flex items-center gap-2 bg-[#050507] border border-white/5 rounded-xl px-3 py-2 w-full">
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    className="bg-transparent border-0 text-xs text-zinc-300 font-bold focus:outline-none focus:ring-0 cursor-pointer w-full"
                  >
                    <option value="" className="bg-[#050507]">Unassigned</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id} className="bg-[#050507]">
                        {sub.name}
                      </option>
                    ))}
                  </select>
                  {updatingSubject && <Loader2 className="h-3.5 w-3.5 text-purple-400 animate-spin" strokeWidth={1.5} />}
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-black/20 p-4 space-y-2">
                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Exam Stats</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-white font-display">
                    {exam.questions?.length || 0}
                  </span>
                  <span className="text-xs text-zinc-400 font-semibold">questions</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Link
                to={`/exams/${exam.id}/take`}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-5 py-3.5 text-sm font-bold text-white transition-all duration-300 cursor-pointer shadow-[0_4px_12px_rgba(168,85,247,0.15)] hover:shadow-[0_4px_18px_rgba(168,85,247,0.25)] active:scale-[0.98] hover:-translate-y-[1px]"
              >
                <Play className="h-4 w-4 fill-current" strokeWidth={1.5} />
                Start Exam
              </Link>
              <p className="text-[10px] text-zinc-500 leading-relaxed text-center">
                Automated scoring rules apply. Your attempts will be saved to history.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

