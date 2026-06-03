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
  ExternalLink,
  Share2,
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
  storage_path: string
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
  const [isSharedExam, setIsSharedExam] = useState(false)

  // Share States
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [existingShares, setExistingShares] = useState<any[]>([])
  const [loadingShares, setLoadingShares] = useState(false)

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
        .single()

      if (examError) throw examError
      setExam(examData)
      const isShared = examData.user_id !== user.id
      setIsSharedExam(isShared)
      if (!isShared) {
        fetchShares()
      }
      setSelectedSubjectId(examData.subject_id || '')

      // 2. Fetch associated materials
      if (examData && examData.material_ids && examData.material_ids.length > 0) {
        const { data: materialsData, error: materialsError } = await supabase
          .from('tbl_materials')
          .select('id, file_name, file_type, storage_path')
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

  const fetchShares = async () => {
    if (!id) return
    setLoadingShares(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('tbl_shares')
        .select('*')
        .eq('exam_id', id)

      if (fetchError) throw fetchError
      setExistingShares(data || [])
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoadingShares(false)
    }
  }

  const handleAddShare = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !shareEmail.trim()) return
    try {
      const { data, error: shareError } = await supabase
        .from('tbl_shares')
        .insert({
          exam_id: id,
          sender_id: user?.id,
          receiver_email: shareEmail.trim().toLowerCase(),
        })
        .select()
        .single()

      if (shareError) throw shareError
      setExistingShares((prev) => [...prev, data])
      setShareEmail('')
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Failed to share exam.')
    }
  }

  const handleRevokeShare = async (shareId: string) => {
    try {
      const { error: revokeError } = await supabase
        .from('tbl_shares')
        .delete()
        .eq('id', shareId)

      if (revokeError) throw revokeError
      setExistingShares((prev) => prev.filter((s) => s.id !== shareId))
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Failed to revoke share.')
    }
  }

  // Open Material File
  const handleOpenFile = async (material: Material) => {
    try {
      const { data, error: urlError } = await supabase.storage
        .from('materials')
        .createSignedUrl(material.storage_path, 3600)

      if (urlError) throw urlError
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (err: any) {
      console.error('Failed to open file:', err)
      setError(err.message || 'Failed to open file.')
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
                      <button
                        key={m.id}
                        onClick={() => handleOpenFile(m)}
                        className="flex items-center justify-between w-full p-2.5 rounded-lg border border-white/5 hover:border-purple-500/25 bg-black/20 hover:bg-purple-500/5 group text-left cursor-pointer transition-all duration-200 focus:outline-none"
                        title="Open file"
                      >
                        <span className="text-xs text-zinc-300 group-hover:text-purple-400 font-semibold truncate max-w-[160px] flex items-center gap-1 transition-all" title={m.file_name}>
                          <span>{m.file_name}</span>
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-purple-400 shrink-0" strokeWidth={1.5} />
                        </span>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase border border-white/10 group-hover:border-purple-500/20 px-1.5 py-0.5 rounded bg-white/5 shrink-0 transition-all">
                          {m.file_type}
                        </span>
                      </button>
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
                    disabled={isSharedExam}
                    className="bg-transparent border-0 text-xs text-zinc-300 font-bold focus:outline-none focus:ring-0 cursor-pointer w-full disabled:opacity-50 disabled:cursor-not-allowed"
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
              {!isSharedExam && (
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 px-5 py-3 text-xs font-bold text-zinc-300 transition-all duration-300 cursor-pointer active:scale-[0.98]"
                >
                  <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Share Exam
                </button>
              )}
              <p className="text-[10px] text-zinc-500 leading-relaxed text-center">
                Automated scoring rules apply. Your attempts will be saved to history.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* SHARING MODAL */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsShareModalOpen(false)}></div>
          <div className="double-bezel-outer max-w-md w-full relative z-10">
            <div className="double-bezel-inner p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <h3 className="text-base font-bold text-white tracking-tight">Share Exam</h3>
                <button onClick={() => setIsShareModalOpen(false)} className="text-zinc-500 hover:text-white cursor-pointer text-sm font-semibold">✕</button>
              </div>

              {/* Add Share Form */}
              <form onSubmit={handleAddShare} className="space-y-3">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Share with user email</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    placeholder="e.g., student@university.edu"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-purple-500/50"
                  />
                  <button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    Share
                  </button>
                </div>
              </form>

              {/* List of current shares */}
              <div className="space-y-3 pt-3 border-t border-white/5">
                <h4 className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Shared Access</h4>
                {loadingShares ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />
                  </div>
                ) : existingShares.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">This exam is private. Add emails to share access.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {existingShares.map((share) => (
                      <div key={share.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5 text-xs">
                        <span className="text-zinc-300 font-semibold">{share.receiver_email}</span>
                        <button
                          onClick={() => handleRevokeShare(share.id)}
                          className="text-[10px] text-red-400 hover:text-red-300 font-bold cursor-pointer"
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

