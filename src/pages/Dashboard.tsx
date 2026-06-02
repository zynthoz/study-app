import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import {
  Award,
  Loader2,
  ArrowRight,
  Plus,
  Trash2,
  Folder,
  Calendar,
  AlertCircle,
  Edit2,
} from 'lucide-react'

interface Subject {
  id: string
  name: string
  color: string
  created_at: string
}

interface Material {
  id: string
  subject_id: string | null
}

interface Note {
  id: string
  subject_id: string | null
}

interface Exam {
  id: string
  subject_id: string | null
}

interface ExamSession {
  id: string
  score: number
  total: number
  completed_at: string
  tbl_exams: {
    title: string
  } | null
}

const COLOR_PRESETS = [
  { name: 'violet', bg: 'bg-violet-500/10 text-violet-400 border-violet-500/20', dot: 'bg-violet-500' },
  { name: 'blue', bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20', dot: 'bg-blue-500' },
  { name: 'emerald', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' },
  { name: 'amber', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-500' },
  { name: 'rose', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20', dot: 'bg-rose-500' },
  { name: 'indigo', bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', dot: 'bg-indigo-500' },
]

export const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Data States
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [sessions, setSessions] = useState<ExamSession[]>([])

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [selectedColor, setSelectedColor] = useState('violet')
  const [creating, setCreating] = useState(false)
  const [deletingSubjectId, setDeletingSubjectId] = useState<string | null>(null)
  
  // New Edit Subject State
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)

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

  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const [subjectsRes, materialsRes, notesRes, examsRes, sessionsRes] = await Promise.all([
        supabase.from('tbl_subjects').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('tbl_materials').select('id, subject_id').eq('user_id', user.id),
        supabase.from('tbl_notes').select('id, subject_id').eq('user_id', user.id),
        supabase.from('tbl_exams').select('id, subject_id').eq('user_id', user.id),
        supabase
          .from('tbl_exam_sessions')
          .select('id, score, total, completed_at, tbl_exams(title)')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false }),
      ])

      if (subjectsRes.error) throw subjectsRes.error
      if (materialsRes.error) throw materialsRes.error
      if (notesRes.error) throw notesRes.error
      if (examsRes.error) throw examsRes.error
      if (sessionsRes.error) throw sessionsRes.error

      setSubjects(subjectsRes.data || [])
      setMaterials(materialsRes.data || [])
      setNotes(notesRes.data || [])
      setExams(examsRes.data || [])
      setSessions((sessionsRes.data as any) || [])
    } catch (err: any) {
      console.error('Error loading dashboard data:', err)
      setError('Failed to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Open creation modal
  const openCreateModal = () => {
    setEditingSubject(null)
    setNewSubjectName('')
    setSelectedColor('violet')
    setIsModalOpen(true)
  }

  // Open edit modal
  const openEditModal = (subject: Subject, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card actions
    setEditingSubject(subject)
    setNewSubjectName(subject.name)
    setSelectedColor(subject.color)
    setIsModalOpen(true)
  }

  // Close Modal and reset
  const closeModal = () => {
    setIsModalOpen(false)
    setEditingSubject(null)
    setNewSubjectName('')
    setSelectedColor('violet')
  }

  // Save Subject (handles both Insert & Update)
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newSubjectName.trim()) return

    setCreating(true)
    setError(null)
    try {
      if (editingSubject) {
        // Edit Mode
        const { data, error: editError } = await supabase
          .from('tbl_subjects')
          .update({
            name: newSubjectName.trim(),
            color: selectedColor,
          })
          .eq('id', editingSubject.id)
          .select()
          .single()

        if (editError) throw editError

        setSubjects((prev) => prev.map((s) => (s.id === editingSubject.id ? data : s)))
      } else {
        // Create Mode
        const { data, error: createError } = await supabase
          .from('tbl_subjects')
          .insert({
            user_id: user.id,
            name: newSubjectName.trim(),
            color: selectedColor,
          })
          .select()
          .single()

        if (createError) throw createError

        setSubjects((prev) => [data, ...prev])
      }
      closeModal()
    } catch (err: any) {
      console.error('Error saving subject:', err)
      setError(err.message || 'Failed to save subject.')
    } finally {
      setCreating(false)
    }
  }

  // Delete Subject Handler
  const handleDeleteSubject = async (subjectId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent row click
    openConfirmModal(
      'Delete Subject',
      'Are you sure you want to delete this subject? Linked items will be set to unassigned.',
      async () => {
        setDeletingSubjectId(subjectId)
        try {
          const { error: deleteError } = await supabase.from('tbl_subjects').delete().eq('id', subjectId)

          if (deleteError) throw deleteError

          setSubjects((prev) => prev.filter((s) => s.id !== subjectId))
          
          // Update local state relations to be null
          setMaterials((prev) => prev.map((m) => (m.subject_id === subjectId ? { ...m, subject_id: null } : m)))
          setNotes((prev) => prev.map((n) => (n.subject_id === subjectId ? { ...n, subject_id: null } : n)))
          setExams((prev) => prev.map((ex) => (ex.subject_id === subjectId ? { ...ex, subject_id: null } : ex)))
        } catch (err: any) {
          console.error('Error deleting subject:', err)
          setError(err.message || 'Failed to delete subject.')
        } finally {
          setDeletingSubjectId(null)
        }
      }
    )
  }

  // Helpers to count items associated with each subject
  const getSubjectStats = (subjectId: string) => {
    const subjectMaterials = materials.filter((m) => m.subject_id === subjectId).length
    const subjectNotes = notes.filter((n) => n.subject_id === subjectId).length
    const subjectExams = exams.filter((e) => e.subject_id === subjectId).length
    return {
      materials: subjectMaterials,
      notes: subjectNotes,
      exams: subjectExams,
      total: subjectMaterials + subjectNotes + subjectExams,
    }
  }

  const getSubjectColorStyles = (colorName: string) => {
    return COLOR_PRESETS.find((p) => p.name === colorName) || COLOR_PRESETS[0]
  }

  // Calculate dynamic stats
  const totalSubjects = subjects.length
  const totalMaterials = materials.length
  const totalNotes = notes.length
  const totalExams = exams.length
  const totalItems = totalMaterials + totalNotes + totalExams

  const materialsPct = totalItems > 0 ? totalMaterials / totalItems : 0
  const notesPct = totalItems > 0 ? totalNotes / totalItems : 0
  const examsPct = totalItems > 0 ? totalExams / totalItems : 0

  const avgExamScore = (() => {
    if (sessions.length === 0) return null
    let totalScore = 0
    let totalQuestions = 0
    sessions.forEach((s) => {
      totalScore += s.score
      totalQuestions += s.total
    })
    return totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : null
  })()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 space-y-12 animate-fade-in">


      {error && (
        <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/25 p-4 text-xs text-red-400 animate-fade-in">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" strokeWidth={1.5} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid Layout: Left col-span-2 (Subjects & Analysis), Right col-span-1 (Console Sidebar) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-start">
        
        {/* Left Side: Subjects and Distribution Analysis */}
        <div className="lg:col-span-2 space-y-12">
          
          {/* SECTION 01: SUBJECTS CENTRE */}
          <section className="space-y-6">
            <div className="h-px w-full bg-white/5" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Academic Subjects</h2>
                <p className="text-xs text-zinc-400">Group your documents, guides, and practice sessions.</p>
              </div>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-1.5 rounded-xl bg-[#0d0d11] border border-purple-500/30 hover:border-purple-500/60 hover:bg-purple-500/10 px-4 py-2.5 text-xs font-bold text-purple-300 transition-all duration-300 cursor-pointer active:scale-[0.98] hover:-translate-y-[1px] self-start sm:self-auto"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                Add Subject
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-5 w-5 text-purple-400 animate-spin" strokeWidth={1.5} />
              </div>
            ) : subjects.length === 0 ? (
              <div className="double-bezel-outer bg-white/[0.005]">
                <div className="double-bezel-inner p-10 text-center space-y-4">
                  <Folder className="h-8 w-8 text-zinc-600 mx-auto" strokeWidth={1.2} />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-zinc-300">No subjects initialized</h3>
                    <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                      Create categories like "Physics" or "Biology" to organize your learning notes.
                    </p>
                  </div>
                  <button
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-2 text-xs font-bold text-white transition-all duration-300 cursor-pointer active:scale-[0.98]"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Create first subject
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {subjects.map((subject) => {
                  const stats = getSubjectStats(subject.id)
                  const styles = getSubjectColorStyles(subject.color)

                  return (
                    <div
                      key={subject.id}
                      className="double-bezel-outer group hover:border-purple-500/20"
                    >
                      <div className="double-bezel-inner p-4 flex flex-col justify-between gap-4 h-full">
                        {/* Subject Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`h-2 w-2 rounded-full ${styles.dot} shrink-0`} />
                            <h3 className="font-bold text-white text-sm truncate" title={subject.name}>
                              {subject.name}
                            </h3>
                          </div>
                          
                          {/* Subject Actions */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              onClick={(e) => openEditModal(subject, e)}
                              className="p-1 rounded-lg text-zinc-500 hover:text-purple-400 hover:bg-purple-500/10 transition-colors cursor-pointer"
                              title="Edit Subject"
                            >
                              <Edit2 className="h-3 w-3" strokeWidth={1.5} />
                            </button>
                            <button
                              onClick={(e) => handleDeleteSubject(subject.id, e)}
                              disabled={deletingSubjectId === subject.id}
                              className="p-1 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
                              title="Delete Subject"
                            >
                              {deletingSubjectId === subject.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Subject Counts */}
                        <div className="grid grid-cols-3 gap-1.5 pt-3 border-t border-white/5 text-center text-[10px]">
                          <Link
                            to={`/subjects?id=${subject.id}&tab=files`}
                            className="rounded-lg py-1.5 px-1 bg-white/[0.01] hover:bg-white/5 border border-white/[0.02] text-zinc-300 hover:text-white transition-all duration-200"
                          >
                            <p className="text-zinc-400 font-semibold uppercase tracking-wider text-[8px]">Files</p>
                            <p className="text-xs font-extrabold mt-0.5">{stats.materials}</p>
                          </Link>
                          <Link
                            to={`/subjects?id=${subject.id}&tab=guides`}
                            className="rounded-lg py-1.5 px-1 bg-white/[0.01] hover:bg-white/5 border border-white/[0.02] text-zinc-300 hover:text-white transition-all duration-200"
                          >
                            <p className="text-zinc-400 font-semibold uppercase tracking-wider text-[8px]">Guides</p>
                            <p className="text-xs font-extrabold mt-0.5">{stats.notes}</p>
                          </Link>
                          <Link
                            to={`/subjects?id=${subject.id}&tab=exams`}
                            className="rounded-lg py-1.5 px-1 bg-white/[0.01] hover:bg-white/5 border border-white/[0.02] text-zinc-300 hover:text-white transition-all duration-200"
                          >
                            <p className="text-zinc-400 font-semibold uppercase tracking-wider text-[8px]">Exams</p>
                            <p className="text-xs font-extrabold mt-0.5">{stats.exams}</p>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* SECTION 02: DIAGNOSTICS & ACTIONS */}
          <section className="space-y-6">
            <div className="h-px w-full bg-white/5" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Distribution Analysis */}
              <div className="double-bezel-outer">
                <div className="double-bezel-inner p-5 space-y-4">
                  <div>
                    <h3 className="font-bold text-white text-sm tracking-tight">Distribution Analysis</h3>
                    <p className="text-[10px] text-zinc-400">Overview of active learning components.</p>
                  </div>
                  
                  <div className="flex items-center justify-around gap-4 py-1">
                    {/* SVG Chart */}
                    <div className="relative h-28 w-28 shrink-0">
                      {totalItems > 0 ? (
                        <svg className="w-full h-full" viewBox="0 0 160 160">
                          <circle
                            cx="80"
                            cy="80"
                            r="52"
                            className="stroke-white/5 fill-transparent"
                            strokeWidth="10"
                          />
                          {/* Materials */}
                          {materialsPct > 0 && (
                            <circle
                              cx="80"
                              cy="80"
                              r="52"
                              className="stroke-purple-400 fill-transparent transition-all duration-500"
                              strokeWidth="10"
                              strokeDasharray={`${326.72 * materialsPct} ${326.72 * (1 - materialsPct)}`}
                              strokeDashoffset="0"
                              transform="rotate(-90 80 80)"
                              strokeLinecap="round"
                            />
                          )}
                          {/* Notes */}
                          {notesPct > 0 && (
                            <circle
                              cx="80"
                              cy="80"
                              r="52"
                              className="stroke-zinc-500 fill-transparent transition-all duration-500"
                              strokeWidth="10"
                              strokeDasharray={`${326.72 * notesPct} ${326.72 * (1 - notesPct)}`}
                              strokeDashoffset={-(326.72 * materialsPct)}
                              transform="rotate(-90 80 80)"
                              strokeLinecap="round"
                            />
                          )}
                          {/* Exams */}
                          {examsPct > 0 && (
                            <circle
                              cx="80"
                              cy="80"
                              r="52"
                              className="stroke-zinc-300 fill-transparent transition-all duration-500"
                              strokeWidth="10"
                              strokeDasharray={`${326.72 * examsPct} ${326.72 * (1 - examsPct)}`}
                              strokeDashoffset={-(326.72 * (materialsPct + notesPct))}
                              transform="rotate(-90 80 80)"
                              strokeLinecap="round"
                            />
                          )}
                          <text x="80" y="76" textAnchor="middle" className="text-xl font-extrabold text-white fill-current font-display tracking-tighter">
                            {totalItems}
                          </text>
                          <text x="80" y="94" textAnchor="middle" className="text-[8px] text-zinc-500 fill-current font-bold uppercase tracking-widest">
                            Items
                          </text>
                        </svg>
                      ) : (
                        <svg className="w-full h-full" viewBox="0 0 160 160">
                          <circle
                            cx="80"
                            cy="80"
                            r="52"
                            className="stroke-white/5 fill-transparent"
                            strokeWidth="10"
                          />
                          <text x="80" y="85" textAnchor="middle" className="text-xs font-bold text-zinc-600 fill-current font-mono uppercase tracking-widest">
                            Empty
                          </text>
                        </svg>
                      )}
                    </div>
                    
                    {/* Chart Legend */}
                    <div className="space-y-2 text-[10px] shrink-0 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-purple-400 shrink-0" />
                        <div>
                          <p className="text-zinc-400 font-semibold uppercase text-[8px] tracking-wider">Files</p>
                          <p className="font-extrabold text-zinc-100 mt-0.5">{totalMaterials} ({Math.round(materialsPct * 100)}%)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-zinc-500 shrink-0" />
                        <div>
                          <p className="text-zinc-400 font-semibold uppercase text-[8px] tracking-wider">Guides</p>
                          <p className="font-extrabold text-zinc-100 mt-0.5">{totalNotes} ({Math.round(notesPct * 100)}%)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-zinc-300 shrink-0" />
                        <div>
                          <p className="text-zinc-400 font-semibold uppercase text-[8px] tracking-wider">Exams</p>
                          <p className="font-extrabold text-zinc-100 mt-0.5">{totalExams} ({Math.round(examsPct * 100)}%)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Steps Tip */}
              <div className="double-bezel-outer">
                <div className="double-bezel-inner p-5 flex flex-col justify-between h-full gap-4">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/30 px-2 py-0.5 text-[8px] font-bold text-emerald-300 border border-emerald-900/30 uppercase tracking-widest animate-pulse">
                      <span>Active Suggestions</span>
                    </div>
                    <h3 className="font-bold text-white text-sm tracking-tight">Workspace Action</h3>
                    <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                      {totalMaterials === 0
                        ? "Start by uploading your learning documents or text materials in the Subjects manager."
                        : totalNotes === 0
                        ? "Synthesize your parsed sources into a structured Study Guide notes sheet."
                        : "Evaluate your retention rate by taking a custom generated practice exam."}
                    </p>
                  </div>
                  
                  <Link
                    to={totalMaterials === 0 ? "/subjects?tab=files" : totalNotes === 0 ? "/subjects?tab=guides" : "/exams"}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition-all duration-300 cursor-pointer active:scale-[0.98]"
                  >
                    <span className="text-[11px]">
                      {totalMaterials === 0 ? "Upload Documents" : totalNotes === 0 ? "Generate Study Guide" : "Start Practice Session"}
                    </span>
                    <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Side: Console Sidebar Panel */}
        <div className="space-y-12">
          
          {/* SECTION 03: SYSTEM TELEMETRY */}
          <section className="space-y-6">
            <div className="h-px w-full bg-white/5" />

            <div className="double-bezel-outer">
              <div className="double-bezel-inner p-5 space-y-4">
                <div>
                  <h3 className="font-bold text-white text-sm tracking-tight">Workspace Console</h3>
                  <p className="text-[10px] text-zinc-400">Live indicators of repository data.</p>
                </div>

                <div className="space-y-3 pt-2">
                  {/* Metric Items */}
                  <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/5">
                    <span className="text-zinc-400 font-semibold">Subjects Total</span>
                    <span className="font-bold text-white font-mono">{loading ? '—' : totalSubjects}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/5">
                    <span className="text-zinc-400 font-semibold">Source Materials</span>
                    <span className="font-bold text-white font-mono">{loading ? '—' : totalMaterials}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/5">
                    <span className="text-zinc-400 font-semibold">Study Guides</span>
                    <span className="font-bold text-white font-mono">{loading ? '—' : totalNotes}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1.5 border-b border-white/5">
                    <span className="text-zinc-400 font-semibold">Practice Exams</span>
                    <span className="font-bold text-white font-mono">{loading ? '—' : totalExams}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1.5">
                    <span className="text-zinc-400 font-semibold">Average Retention</span>
                    <span className="font-bold text-purple-300 font-mono">
                      {loading ? '—' : avgExamScore !== null ? `${avgExamScore}%` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 04: EVALUATION HISTORY */}
          <section className="space-y-6">
            <div className="h-px w-full bg-white/5" />

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Recent Sessions</h3>
                <p className="text-[10px] text-zinc-400">Performance ratings from recent evaluations.</p>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-5 w-5 text-purple-400 animate-spin" strokeWidth={1.5} />
                </div>
              ) : sessions.length === 0 ? (
                <div className="double-bezel-outer bg-white/[0.005]">
                  <div className="double-bezel-inner p-6 text-center text-xs text-zinc-500 space-y-2">
                    <Award className="h-6 w-6 text-zinc-600 mx-auto" strokeWidth={1.5} />
                    <p>No exams attempted yet.</p>
                    <Link to="/exams" className="text-purple-400 font-bold hover:underline block mt-1">
                      Take an exam &rarr;
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.slice(0, 4).map((session) => {
                    const percentage = Math.round((session.score / session.total) * 100)
                    const examTitle = session.tbl_exams?.title || 'Deleted Exam'
                    
                    let gradeColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                    if (percentage >= 85) gradeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    else if (percentage >= 70) gradeColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                    else if (percentage >= 50) gradeColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20'

                    return (
                      <div
                        key={session.id}
                        onClick={() => navigate(`/exams/session/${session.id}?history=true`)}
                        className="double-bezel-outer cursor-pointer hover:border-white/10 active:scale-[0.99]"
                      >
                        <div className="double-bezel-inner p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <h4 className="text-xs font-bold text-zinc-200 truncate">
                              {examTitle}
                            </h4>
                            <p className="text-[9px] text-zinc-400 flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" strokeWidth={1.5} />
                              {formatDate(session.completed_at)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right text-[10px]">
                              <span className="text-[8px] text-zinc-400 block uppercase font-semibold">Raw</span>
                              <span className="font-bold text-zinc-300 font-mono">{session.score}/{session.total}</span>
                            </div>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${gradeColor}`}>
                              {percentage}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {sessions.length > 4 && (
                    <Link
                      to="/history"
                      className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-bold hover:underline mt-1"
                    >
                      View all {sessions.length} sessions <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
                    </Link>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Create / Edit Subject Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
            onClick={closeModal}
          ></div>

          <div className="double-bezel-outer max-w-sm w-full relative z-10">
            <div className="double-bezel-inner p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {editingSubject ? 'Modify Subject' : 'Initialize Subject'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-zinc-500 hover:text-white transition-colors cursor-pointer text-sm font-semibold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveSubject} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Subject Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., world history, biology"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-purple-500/50"
                    maxLength={50}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Theme Identifier</label>
                  <div className="flex items-center gap-2.5">
                    {COLOR_PRESETS.map((preset) => {
                      const isSelected = selectedColor === preset.name
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setSelectedColor(preset.name)}
                          className={`h-7 w-7 rounded-full ${preset.dot} flex items-center justify-center relative cursor-pointer hover:scale-105 transition-all
                            ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#08080a]' : ''}
                          `}
                        >
                          {isSelected && <span className="h-1.5 w-1.5 bg-white rounded-full" />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-500 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating && <Loader2 className="h-3 w-3 animate-spin" />}
                    {editingSubject ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}></div>
          <div className="double-bezel-outer max-w-xs w-full relative z-10">
            <div className="double-bezel-inner p-6 space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-white tracking-tight">{confirmModal.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-medium">{confirmModal.message}</p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-500 hover:text-white hover:bg-white/5 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const onConfirm = confirmModal.onConfirm
                    setConfirmModal(prev => ({ ...prev, isOpen: false }))
                    await onConfirm()
                  }}
                  className="rounded-xl px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
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
