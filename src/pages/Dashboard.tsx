import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import {
  Sparkles,
  Award,
  Loader2,
  ArrowRight,
  Plus,
  Trash2,
  Folder,
  Calendar,
  AlertCircle,
  TrendingUp,
  Edit2,
  Layers,
  FileText,
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
    if (!window.confirm('Are you sure you want to delete this subject? Linked items will be set to unassigned.')) {
      return
    }

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
    if (sessions.length === 0) return 0
    let totalScore = 0
    let totalQuestions = 0
    sessions.forEach((s) => {
      totalScore += s.score
      totalQuestions += s.total
    })
    return totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0
  })()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="glass-card rounded-3xl p-8 sm:p-10 relative overflow-hidden bg-white/[0.01] border-white/5">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-500/10 blur-2xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-300 border border-brand-500/20">
              <Sparkles className="h-3 w-3 animate-pulse" />
              <span>Personalized Learning Command Center</span>
            </div>
            <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
              Welcome back to StudyForge
            </h1>
            <p className="text-gray-400 max-w-xl text-sm">
              Organize your materials by subjects, generate rich text notes, and test yourself with customizable exams.
            </p>
          </div>
          <div className="text-xs text-gray-500 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
            Account: <span className="text-gray-200 font-semibold">{user?.email}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400 animate-fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* 5-Column Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Subjects Stats */}
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-violet-500/30 transition-all duration-300 bg-white/[0.01]">
          <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-violet-500/5 group-hover:bg-violet-500/10 blur-xl transition-all"></div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Subjects</p>
            <Folder className="h-4 w-4 text-violet-400" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-black text-white">{loading ? '...' : totalSubjects}</span>
          </div>
          <span className="text-[10px] text-gray-400">Organized categories</span>
        </div>

        {/* Materials Stats */}
        <Link to="/subjects?tab=files" className="glass-card rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300 bg-white/[0.01]">
          <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-blue-500/5 group-hover:bg-blue-500/10 blur-xl transition-all"></div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Materials</p>
            <Layers className="h-4 w-4 text-blue-400" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-black text-white">{loading ? '...' : totalMaterials}</span>
          </div>
          <span className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5">
            Manage library <ArrowRight className="h-2.5 w-2.5" />
          </span>
        </Link>

        {/* Notes Stats */}
        <Link to="/subjects?tab=guides" className="glass-card rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300 bg-white/[0.01]">
          <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-amber-500/5 group-hover:bg-amber-500/10 blur-xl transition-all"></div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Study Guides</p>
            <FileText className="h-4 w-4 text-amber-400" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-black text-white">{loading ? '...' : totalNotes}</span>
          </div>
          <span className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5">
            View notes <ArrowRight className="h-2.5 w-2.5" />
          </span>
        </Link>

        {/* Exams Stats */}
        <Link to="/exams" className="glass-card rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300 bg-white/[0.01]">
          <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-purple-500/5 group-hover:bg-purple-500/10 blur-xl transition-all"></div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Exams</p>
            <Award className="h-4 w-4 text-purple-400" />
          </div>
          <div className="my-2">
            <span className="text-3xl font-black text-white">{loading ? '...' : totalExams}</span>
          </div>
          <span className="text-[10px] text-purple-400 hover:underline flex items-center gap-0.5">
            Take tests <ArrowRight className="h-2.5 w-2.5" />
          </span>
        </Link>

        {/* Avg Exam Score */}
        <Link to="/history" className="glass-card rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300 bg-white/[0.01] col-span-2 md:col-span-1">
          <div className="absolute -right-4 -bottom-4 h-16 w-16 rounded-full bg-emerald-500/5 group-hover:bg-emerald-500/10 blur-xl transition-all"></div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Avg Score</p>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="my-2 flex items-baseline gap-1">
            <span className="text-3xl font-black text-white">{loading ? '...' : `${avgExamScore}%`}</span>
          </div>
          <span className="text-[10px] text-emerald-400 hover:underline flex items-center gap-0.5">
            View history <ArrowRight className="h-2.5 w-2.5" />
          </span>
        </Link>
      </div>

      {/* Main Grid: Left Subjects & Charts, Right Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Subjects Manager & Analytics */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Subjects Manager Panel */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-white">Your Subjects</h2>
                <p className="text-xs text-gray-400">Click on File, Guide, or Exam stats to filter items by subject.</p>
              </div>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white hover:bg-brand-600 transition-colors shadow-[0_4px_12px_rgba(139,92,246,0.2)] cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Subject
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-6 w-6 text-brand-400 animate-spin" />
              </div>
            ) : subjects.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center border-dashed border-white/10">
                <Folder className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-gray-300">No subjects created yet</h3>
                <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1 mb-4">
                  Create subjects like "Math", "History", or "Chemistry" to group your documents and notes.
                </p>
                <button
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500/10 border border-brand-500/20 px-4 py-2 text-xs font-bold text-brand-400 hover:bg-brand-500/20 transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create your first subject
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subjects.map((subject) => {
                  const stats = getSubjectStats(subject.id)
                  const styles = getSubjectColorStyles(subject.color)

                  return (
                    <div
                      key={subject.id}
                      className="glass-card rounded-2xl p-5 hover:border-white/20 transition-all flex flex-col justify-between gap-4 group relative overflow-hidden bg-white/[0.01]"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className={`h-3 w-3 rounded-full ${styles.dot} shadow-sm`} />
                          <h3 className="font-bold text-white text-base truncate max-w-[150px]" title={subject.name}>
                            {subject.name}
                          </h3>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex items-center gap-1">
                          {/* Edit Button */}
                          <button
                            onClick={(e) => openEditModal(subject, e)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-500 hover:text-brand-400 hover:bg-brand-500/10 transition-all duration-150 cursor-pointer"
                            title="Edit Subject"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          
                          {/* Delete Action */}
                          <button
                            onClick={(e) => handleDeleteSubject(subject.id, e)}
                            disabled={deletingSubjectId === subject.id}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150 cursor-pointer disabled:opacity-50"
                            title="Delete Subject"
                          >
                            {deletingSubjectId === subject.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Stats details */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-center text-xs">
                        <Link
                          to={`/subjects?id=${subject.id}&tab=files`}
                          className="rounded-xl py-1 px-0.5 hover:bg-white/5 transition-all text-gray-400 hover:text-white"
                        >
                          <p className="text-[10px] text-gray-500 font-semibold">Files</p>
                          <p className="text-sm font-bold">{stats.materials}</p>
                        </Link>
                        <Link
                          to={`/subjects?id=${subject.id}&tab=guides`}
                          className="rounded-xl py-1 px-0.5 hover:bg-white/5 transition-all text-gray-400 hover:text-white"
                        >
                          <p className="text-[10px] text-gray-500 font-semibold">Guides</p>
                          <p className="text-sm font-bold">{stats.notes}</p>
                        </Link>
                        <Link
                          to={`/subjects?id=${subject.id}&tab=exams`}
                          className="rounded-xl py-1 px-0.5 hover:bg-white/5 transition-all text-gray-400 hover:text-white"
                        >
                          <p className="text-[10px] text-gray-500 font-semibold">Exams</p>
                          <p className="text-sm font-bold">{stats.exams}</p>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Analytics / Dynamic Chart Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Donut Chart Card */}
            <div className="glass-card rounded-3xl p-6 bg-white/[0.01] border-white/5 space-y-4">
              <div>
                <h3 className="font-bold text-white text-base">Workspace Distribution</h3>
                <p className="text-[11px] text-gray-500">Breakdown of study items in your command center.</p>
              </div>
              
              <div className="flex items-center justify-around gap-4 py-2">
                {/* SVG Donut */}
                <div className="relative h-32 w-32 shrink-0">
                  {totalItems > 0 ? (
                    <svg className="w-full h-full" viewBox="0 0 160 160">
                      {/* Background circle */}
                      <circle
                        cx="80"
                        cy="80"
                        r="50"
                        className="stroke-white/5 fill-transparent"
                        strokeWidth="12"
                      />
                      {/* Materials slice */}
                      {materialsPct > 0 && (
                        <circle
                          cx="80"
                          cy="80"
                          r="50"
                          className="stroke-blue-500 fill-transparent transition-all duration-500"
                          strokeWidth="12"
                          strokeDasharray={`${314.159 * materialsPct} ${314.159 * (1 - materialsPct)}`}
                          strokeDashoffset="0"
                          transform="rotate(-90 80 80)"
                          strokeLinecap="round"
                        />
                      )}
                      {/* Notes slice */}
                      {notesPct > 0 && (
                        <circle
                          cx="80"
                          cy="80"
                          r="50"
                          className="stroke-amber-500 fill-transparent transition-all duration-500"
                          strokeWidth="12"
                          strokeDasharray={`${314.159 * notesPct} ${314.159 * (1 - notesPct)}`}
                          strokeDashoffset={-(314.159 * materialsPct)}
                          transform="rotate(-90 80 80)"
                          strokeLinecap="round"
                        />
                      )}
                      {/* Exams slice */}
                      {examsPct > 0 && (
                        <circle
                          cx="80"
                          cy="80"
                          r="50"
                          className="stroke-purple-500 fill-transparent transition-all duration-500"
                          strokeWidth="12"
                          strokeDasharray={`${314.159 * examsPct} ${314.159 * (1 - examsPct)}`}
                          strokeDashoffset={-(314.159 * (materialsPct + notesPct))}
                          transform="rotate(-90 80 80)"
                          strokeLinecap="round"
                        />
                      )}
                      <text x="80" y="78" textAnchor="middle" className="text-2xl font-black text-white fill-current font-display">
                        {totalItems}
                      </text>
                      <text x="80" y="96" textAnchor="middle" className="text-[9px] text-gray-500 fill-current font-bold uppercase tracking-wider">
                        Items
                      </text>
                    </svg>
                  ) : (
                    <svg className="w-full h-full" viewBox="0 0 160 160">
                      <circle
                        cx="80"
                        cy="80"
                        r="50"
                        className="stroke-white/5 fill-transparent"
                        strokeWidth="12"
                      />
                      <text x="80" y="78" textAnchor="middle" className="text-2xl font-black text-gray-600 fill-current font-display">
                        0
                      </text>
                      <text x="80" y="96" textAnchor="middle" className="text-[9px] text-gray-600 fill-current font-bold uppercase tracking-wider">
                        Empty
                      </text>
                    </svg>
                  )}
                </div>
                
                {/* Legend */}
                <div className="space-y-2 text-xs shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
                    <div>
                      <p className="text-gray-400 font-semibold text-[10px]">Files</p>
                      <p className="font-bold text-white text-[11px]">{totalMaterials} ({Math.round(materialsPct * 100)}%)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                    <div>
                      <p className="text-gray-400 font-semibold text-[10px]">Guides</p>
                      <p className="font-bold text-white text-[11px]">{totalNotes} ({Math.round(notesPct * 100)}%)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-purple-500 shrink-0" />
                    <div>
                      <p className="text-gray-400 font-semibold text-[10px]">Exams</p>
                      <p className="font-bold text-white text-[11px]">{totalExams} ({Math.round(examsPct * 100)}%)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action / Suggestion Card */}
            <div className="glass-card rounded-3xl p-6 bg-white/[0.01] border-white/5 flex flex-col justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20 mb-2">
                  <TrendingUp className="h-3 w-3 animate-pulse" />
                  <span>Forge Tips</span>
                </div>
                <h3 className="font-bold text-white text-base">Next Steps</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  {totalMaterials === 0
                    ? "Start by uploading your course materials, slides, or documents in the Materials tab."
                    : totalNotes === 0
                    ? "Synthesize your lecture materials into an interactive Study Guide for better recall."
                    : "Challenge yourself! Generate a practice exam from your documents to measure retention."}
                </p>
              </div>
              
              <Link
                to={totalMaterials === 0 ? "/subjects?tab=files" : totalNotes === 0 ? "/subjects?tab=guides" : "/exams"}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition-all cursor-pointer"
              >
                <span>{totalMaterials === 0 ? "Upload Material" : totalNotes === 0 ? "Generate Study Guide" : "Start Practice Exam"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-extrabold text-white">Recent Attempts</h2>
            <p className="text-xs text-gray-400">Quick link to your recent performance reports.</p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-6 w-6 text-brand-400 animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="glass-card rounded-2xl p-10 text-center text-gray-500 text-xs">
              <Award className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              No exam attempts recorded.
              <Link to="/exams" className="text-brand-400 hover:underline block mt-2 font-bold">
                Start an exam &rarr;
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 4).map((session) => {
                const percentage = Math.round((session.score / session.total) * 100)
                const examTitle = session.tbl_exams?.title || 'Deleted Exam'
                
                // Color badges
                let gradeColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                if (percentage >= 85) gradeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                else if (percentage >= 70) gradeColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                else if (percentage >= 50) gradeColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20'

                return (
                  <div
                    key={session.id}
                    onClick={() => navigate(`/exams/session/${session.id}?history=true`)}
                    className="glass-card rounded-xl p-4 flex items-center justify-between gap-3 cursor-pointer hover:border-white/10 hover:bg-white/[0.02] transition-all duration-200 group"
                  >
                    <div className="min-w-0 space-y-1">
                      <h4 className="text-sm font-bold text-white group-hover:text-brand-300 transition-colors truncate">
                        {examTitle}
                      </h4>
                      <p className="text-[10px] text-gray-500 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {formatDate(session.completed_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right text-xs">
                        <span className="text-[10px] text-gray-500 block">Score</span>
                        <span className="font-bold text-gray-200">{session.score}/{session.total}</span>
                      </div>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full border ${gradeColor}`}>
                        {percentage}%
                      </span>
                    </div>
                  </div>
                )
              })}

              {sessions.length > 4 && (
                <Link
                  to="/history"
                  className="inline-flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 font-bold hover:underline"
                >
                  View all {sessions.length} attempts <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Subject Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={closeModal}
          ></div>

          {/* Modal Content */}
          <div className="glass-card rounded-2xl p-6 max-w-md w-full relative z-10 border-white/10 shadow-2xl animate-fade-in space-y-6 bg-[#0c101c]">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-lg font-extrabold text-white">
                {editingSubject ? 'Edit Subject' : 'Create New Subject'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="space-y-5">
              {/* Name field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400">Subject Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Biology, World History, Calculus"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-500/50"
                  maxLength={50}
                />
              </div>

              {/* Color presets selection */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400">Subject Theme Color</label>
                <div className="flex items-center gap-3">
                  {COLOR_PRESETS.map((preset) => {
                    const isSelected = selectedColor === preset.name
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setSelectedColor(preset.name)}
                        className={`h-8 w-8 rounded-full ${preset.dot} flex items-center justify-center relative cursor-pointer hover:scale-105 transition-all
                          ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0c101c]' : ''}
                        `}
                      >
                        {isSelected && <span className="h-1.5 w-1.5 bg-white rounded-full" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Submit & Cancel */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating && <Loader2 className="h-3 w-3 animate-spin" />}
                  {editingSubject ? 'Save Changes' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
