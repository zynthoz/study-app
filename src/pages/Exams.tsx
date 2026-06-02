import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import {
  Award,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Calendar,
  X,
  Sparkles,
  BookOpen,
  CheckSquare,
  Square,
  Sliders,
  Filter,
} from 'lucide-react'

interface Subject {
  id: string
  name: string
  color: string
}

interface Exam {
  id: string
  user_id: string
  title: string
  questions: any[]
  material_ids: string[]
  created_at: string
  subject_id: string | null
}

const COLOR_PRESETS = [
  { name: 'violet', bg: 'bg-violet-500/10 text-violet-400 border-violet-500/20', dot: 'bg-violet-500' },
  { name: 'blue', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20', dot: 'bg-blue-500' },
  { name: 'emerald', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' },
  { name: 'amber', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-500' },
  { name: 'rose', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20', dot: 'bg-rose-500' },
  { name: 'indigo', bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', dot: 'bg-indigo-500' },
]

function getSubjectColorStyles(colorName: string) {
  return COLOR_PRESETS.find((p) => p.name === colorName) || COLOR_PRESETS[0]
}

interface Material {
  id: string
  file_name: string
  file_type: string
}

export const Exams: React.FC = () => {
  const { user, session } = useAuth()
  const navigate = useNavigate()

  const [exams, setExams] = useState<Exam[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
  
  const [searchParams, setSearchParams] = useSearchParams()
  const filterSubjectId = searchParams.get('subject') || 'all'
  const setFilterSubjectId = (val: string) => {
    setSearchParams((prev) => {
      if (val === 'all') {
        prev.delete('subject')
      } else {
        prev.set('subject', val)
      }
      return prev
    }, { replace: true })
  }
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Reusable custom confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void | Promise<void>
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  })

  const openConfirmModal = (title: string, message: string, onConfirm: () => void | Promise<void>) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm,
    })
  }

  // Modal & Generation States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([])
  const [numQuestions, setNumQuestions] = useState(10)
  
  // Percentage states (defaulting to 20% each)
  const [mcPercent, setMcPercent] = useState(20)
  const [idPercent, setIdPercent] = useState(20)
  const [tofPercent, setTofPercent] = useState(20)
  const [mtofPercent, setMtofPercent] = useState(20)
  const [enumPercent, setEnumPercent] = useState(20)

  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalPercentage = mcPercent + idPercent + tofPercent + mtofPercent + enumPercent
  const isPercentageValid = totalPercentage === 100

  // Fetch all exams
  const fetchExams = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('tbl_exams')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setExams(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch exams')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Fetch materials for selection
  const fetchMaterials = useCallback(async () => {
    if (!user) return
    try {
      const { data, error: fetchError } = await supabase
        .from('tbl_materials')
        .select('id, file_name, file_type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setMaterials(data || [])
    } catch (err: any) {
      console.error('Failed to fetch materials:', err.message)
    }
  }, [user])

  // Fetch subjects
  const fetchSubjects = useCallback(async () => {
    if (!user) return
    try {
      const { data, error: fetchError } = await supabase
        .from('tbl_subjects')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      if (fetchError) throw fetchError
      setSubjects(data || [])
    } catch (err: any) {
      console.error('Error fetching subjects:', err)
    }
  }, [user])

  useEffect(() => {
    fetchExams()
    fetchMaterials()
    fetchSubjects()
  }, [fetchExams, fetchMaterials, fetchSubjects])

  // Delete exam
  const handleDeleteExam = async (e: React.MouseEvent, examId: string, title: string) => {
    e.preventDefault()
    e.stopPropagation()

    openConfirmModal(
      'Delete Practice Exam',
      `Are you sure you want to delete "${title}"? This action will also delete all associated attempts.`,
      async () => {
        setDeletingId(examId)
        setError(null)
        try {
          // Note: We might also want to delete any tbl_exam_sessions associated with this exam first.
          // But let's delete them. If cascading delete is enabled, it works automatically.
          // Let's delete sessions first in case there is no Cascade.
          await supabase
            .from('tbl_exam_sessions')
            .delete()
            .eq('exam_id', examId)

          const { error: deleteError } = await supabase
            .from('tbl_exams')
            .delete()
            .eq('id', examId)

          if (deleteError) throw deleteError
          setExams((prev) => prev.filter((ex) => ex.id !== examId))
        } catch (err: any) {
          setError(err.message || 'Failed to delete exam')
        } finally {
          setDeletingId(null)
        }
      }
    )
  }
  


  // Toggle material selection
  const toggleMaterial = (id: string) => {
    setSelectedMaterials((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    )
  }

  // Reset percentages to 20% each
  const handleDistributeEvenly = () => {
    setMcPercent(20)
    setIdPercent(20)
    setTofPercent(20)
    setMtofPercent(20)
    setEnumPercent(20)
  }

  // Handle generation
  const handleGenerateExam = async () => {
    if (selectedMaterials.length === 0) {
      setError('Please select at least one material to generate an exam.')
      return
    }

    if (!isPercentageValid) {
      setError('The total percentage of all question types must equal exactly 100%.')
      return
    }

    setError(null)
    setGenerating(true)

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(
        `${supabaseUrl}/functions/v1/generate-exam`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            material_ids: selectedMaterials,
            num_questions: numQuestions,
            percentages: {
              mc: mcPercent,
              id: idPercent,
              tof: tofPercent,
              mtof: mtofPercent,
              enum: enumPercent,
            },
            subject_id: selectedSubjectId || null,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate exam')
      }

      setIsModalOpen(false)
      setSelectedMaterials([])
      // Redirect to the newly created exam lobby page
      navigate(`/exams/${result.id}`)
    } catch (err: any) {
      setError(err.message || 'Exam generation failed')
      setGenerating(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const filteredExams = exams.filter((e) => {
    if (filterSubjectId === 'all') return true
    if (filterSubjectId === 'unassigned') return !e.subject_id
    return e.subject_id === filterSubjectId
  })

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">

      {/* Error Alert */}
      {error && !generating && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-xs text-red-400 animate-fade-in">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" strokeWidth={1.5} />
          <span>{error}</span>
        </div>
      )}
      {/* Exams List Header with Subject Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-2 border-b border-white/5">
        <h2 className="font-display text-xl font-bold text-white">
          Your Practice Exams
        </h2>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
            <span className="text-xs font-semibold text-zinc-400">Filter:</span>
            <select
              value={filterSubjectId}
              onChange={(e) => setFilterSubjectId(e.target.value)}
              className="rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500/50 cursor-pointer"
            >
              <option value="all">All Subjects</option>
              <option value="unassigned">Unassigned</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
            <span className="text-xs text-zinc-500 ml-2">
              {filteredExams.length} exam{filteredExams.length !== 1 ? 's' : ''}
            </span>
          </div>

          <button
            onClick={() => {
              setError(null)
              setIsModalOpen(true)
            }}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white transition-all duration-300 cursor-pointer shadow-[0_4px_12px_rgba(168,85,247,0.15)] hover:shadow-[0_4px_18px_rgba(168,85,247,0.25)] active:scale-[0.98] hover:-translate-y-[1px]"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            Generate Exam
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 text-purple-400 animate-spin" strokeWidth={1.5} />
        </div>
      ) : exams.length === 0 ? (
        <div className="double-bezel-outer bg-white/[0.005]">
          <div className="double-bezel-inner p-16 text-center space-y-4">
            <div className="mb-4 flex h-14 w-14 mx-auto items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20">
              <Award className="h-6 w-6 text-purple-400" strokeWidth={1.5} />
            </div>
            <p className="font-display text-lg font-semibold text-zinc-300">
              No exams generated yet
            </p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Click "Generate Exam" above to configure and create your first practice exam.
            </p>
          </div>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="double-bezel-outer bg-white/[0.005]">
          <div className="double-bezel-inner p-16 text-center space-y-4">
            <div className="mb-4 flex h-14 w-14 mx-auto items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20">
              <Filter className="h-6 w-6 text-purple-400" strokeWidth={1.5} />
            </div>
            <p className="font-display text-lg font-semibold text-zinc-300">
              No exams found
            </p>
            <p className="text-xs text-zinc-500">
              There are no exams associated with this subject.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredExams.map((exam) => {
            const subject = subjects.find((s) => s.id === exam.subject_id)
            const colorStyles = subject ? getSubjectColorStyles(subject.color) : null

            return (
              <div
                key={exam.id}
                className="double-bezel-outer group hover:border-purple-500/20 active:scale-[0.99]"
              >
                <div className="double-bezel-inner p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <Link
                    to={`/exams/${exam.id}`}
                    className="flex-1 min-w-0"
                  >
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {subject ? (
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${colorStyles?.bg}`}>
                          {subject.name}
                        </span>
                      ) : (
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-white/5 bg-white/5 text-zinc-400">
                          Unassigned
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
                        <Calendar className="h-3 w-3" strokeWidth={1.5} />
                        {formatDate(exam.created_at)}
                      </span>
                    </div>

                    <h3 className="font-display text-base sm:text-lg font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                      {exam.title || 'Untitled Exam'}
                    </h3>
                  </Link>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <span className="inline-flex items-center gap-1.5 text-xs text-purple-300 font-medium bg-purple-500/10 border border-purple-500/20 rounded-full px-2.5 py-1">
                      {exam.questions?.length || 0} Questions
                    </span>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => handleDeleteExam(e, exam.id, exam.title)}
                      disabled={deletingId === exam.id}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/0 border border-transparent text-zinc-500 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Delete Exam"
                    >
                      {deletingId === exam.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Generation Modal & Loading Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => !generating && setIsModalOpen(false)}
          ></div>

          {/* Modal Content */}
          <div className="double-bezel-outer w-full max-w-xl relative z-10">
            <div className="double-bezel-inner p-6 sm:p-8">
              {generating ? (
                /* Generating Loading State */
                <div className="flex flex-col items-center justify-center text-center py-12 space-y-6">
                  <div className="relative">
                    {/* Rotating outer ring */}
                    <div className="h-20 w-20 rounded-full border-4 border-t-purple-500 border-r-transparent border-b-indigo-500 border-l-transparent animate-spin"></div>
                    {/* Inner logo/glow */}
                    <div className="absolute inset-2 rounded-full bg-purple-500/10 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.3)] animate-pulse">
                      <Sparkles className="h-7 w-7 text-purple-300" strokeWidth={1.5} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-display text-2xl font-bold text-white">Generating Exam...</h3>
                    <p className="text-zinc-400 text-sm max-w-xs mx-auto leading-relaxed">
                      Gemini is processing your materials to create customized questions with automated scoring criteria.
                    </p>
                  </div>

                  {/* Simulated progress indicator */}
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden max-w-[240px]">
                    <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full w-2/3 rounded-full animate-pulse"></div>
                  </div>
                </div>
              ) : (
                /* Configuration Form State */
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-display text-2xl font-bold text-white flex items-center gap-2">
                      <Sliders className="h-5 w-5 text-purple-400" strokeWidth={1.5} />
                      Configure Practice Exam
                    </h3>
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                    >
                      <X className="h-5 w-5" strokeWidth={1.5} />
                    </button>
                  </div>

                  <p className="text-sm text-zinc-400 mb-5">
                    Select materials and define your preferred question count and type distribution.
                  </p>

                  {/* Error inside modal */}
                  {error && (
                    <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
                      <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" strokeWidth={1.5} />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Scrollable Form Body */}
                  <div className="max-h-[380px] overflow-y-auto pr-1 space-y-5 mb-6">
                    {/* Subject Selector inside Modal */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-300">
                        Link Exam to Subject (Optional)
                      </label>
                      <select
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                        className="w-full rounded-xl bg-[#050507] border border-white/5 px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50 cursor-pointer"
                      >
                        <option value="" className="bg-[#050507]">Unassigned / None</option>
                        {subjects.map((sub) => (
                          <option key={sub.id} value={sub.id} className="bg-[#050507]">
                            {sub.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Material Selector */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-300 flex items-center gap-1.5">
                        <BookOpen className="h-4 w-4 text-purple-400" strokeWidth={1.5} />
                        Select Materials
                      </label>
                      <div className="max-h-[140px] overflow-y-auto space-y-2 bg-[#050507] border border-white/5 rounded-xl p-2">
                        {materials.length === 0 ? (
                          <div className="text-center py-6 bg-white/5 rounded-lg border border-white/5">
                            <p className="text-xs text-zinc-400">No materials available.</p>
                            <Link
                              to="/subjects?tab=files"
                              className="text-[10px] text-purple-400 font-semibold mt-1 inline-block hover:underline"
                            >
                              Upload materials first
                            </Link>
                          </div>
                        ) : (
                          materials.map((m) => {
                            const isSelected = selectedMaterials.includes(m.id)
                            return (
                              <div
                                key={m.id}
                                onClick={() => toggleMaterial(m.id)}
                                className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all duration-200 select-none
                                  ${isSelected
                                    ? 'bg-purple-500/10 border-purple-500/30'
                                    : 'bg-transparent border-transparent hover:bg-white/5'
                                  }
                                `}
                              >
                                <div className="text-purple-400 shrink-0">
                                  {isSelected ? (
                                    <CheckSquare className="h-4 w-4 text-purple-400" strokeWidth={1.5} />
                                  ) : (
                                    <Square className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                                  )}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-zinc-200 truncate">
                                    {m.file_name}
                                  </p>
                                </div>
                                <span className="text-[9px] text-zinc-500 uppercase font-bold border border-white/10 px-1.5 py-0.5 rounded bg-white/5 shrink-0">
                                  {m.file_type}
                                </span>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>

                    {/* Question Count */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-zinc-300 flex items-center justify-between">
                        <span>Number of Questions</span>
                        <span className="text-xs text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded">
                          {numQuestions} questions
                        </span>
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="30"
                        step="1"
                        value={numQuestions}
                        onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-white/10 accent-purple-500"
                      />
                    </div>

                    {/* Question Type Sliders */}
                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-zinc-300">
                          Question Distribution
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleDistributeEvenly}
                            type="button"
                            className="text-[10px] bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1 transition-all font-bold cursor-pointer"
                          >
                            Distribute Evenly
                          </button>
                          <span
                            className={`text-xs font-bold rounded px-2.5 py-0.5 border ${
                              isPercentageValid
                                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                                : 'bg-red-500/10 border-red-500/25 text-red-400'
                            }`}
                          >
                            Total: {totalPercentage}%
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2.5 bg-[#050507] border border-white/5 rounded-xl p-3">
                        {/* MC */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-zinc-400 font-medium">Multiple Choice</span>
                            <span className="text-zinc-300 font-bold">{mcPercent}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={mcPercent}
                            onChange={(e) => setMcPercent(parseInt(e.target.value))}
                            className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-purple-500"
                          />
                        </div>

                        {/* ID */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-zinc-400 font-medium">Identification</span>
                            <span className="text-zinc-300 font-bold">{idPercent}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={idPercent}
                            onChange={(e) => setIdPercent(parseInt(e.target.value))}
                            className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-purple-500"
                          />
                        </div>

                        {/* TOF */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-zinc-400 font-medium">True or False</span>
                            <span className="text-zinc-300 font-bold">{tofPercent}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={tofPercent}
                            onChange={(e) => setTofPercent(parseInt(e.target.value))}
                            className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-purple-500"
                          />
                        </div>

                        {/* MTOF */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs flex-wrap">
                            <span className="text-zinc-400 font-medium flex items-center gap-1">
                              Modified True or False
                            </span>
                            <span className="text-zinc-300 font-bold">{mtofPercent}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={mtofPercent}
                            onChange={(e) => setMtofPercent(parseInt(e.target.value))}
                            className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-purple-500"
                          />
                        </div>

                        {/* ENUM */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-zinc-400 font-medium">Enumeration</span>
                            <span className="text-zinc-300 font-bold">{enumPercent}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={enumPercent}
                            onChange={(e) => setEnumPercent(parseInt(e.target.value))}
                            className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-purple-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:bg-white/10 transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleGenerateExam}
                      disabled={selectedMaterials.length === 0 || !isPercentageValid}
                      className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2.5 text-xs font-bold text-white transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Generate
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}></div>
          <div className="double-bezel-outer max-w-sm w-full relative z-10">
            <div className="double-bezel-inner p-6 space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">{confirmModal.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{confirmModal.message}</p>
              </div>
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const onConfirm = confirmModal.onConfirm
                    setConfirmModal(prev => ({ ...prev, isOpen: false }))
                    await onConfirm()
                  }}
                  className="rounded-xl px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

