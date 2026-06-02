import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import {
  Folder,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle,
  Upload,
  CloudUpload,
  FileText,
  Image,
  FileSpreadsheet,
  File,
  Award,
  Calendar,
  X,
  Sparkles,
  BookOpen,
  CheckSquare,
  Square,
  Sliders,
} from 'lucide-react'

interface Subject {
  id: string
  name: string
  color: string
  created_at: string
}

interface Material {
  id: string
  user_id: string
  file_name: string
  file_type: string
  storage_path: string
  extracted_text: string | null
  created_at: string
  subject_id: string | null
}

interface Note {
  id: string
  user_id: string
  title: string
  content: string
  material_ids: string[]
  created_at: string
  updated_at: string
  subject_id: string | null
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

const ACCEPTED_EXTENSIONS = [
  '.pdf', '.docx', '.pptx', '.txt',
  '.jpg', '.jpeg', '.png', '.webp',
]

const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp',
]

function getSubjectColorStyles(colorName: string) {
  return COLOR_PRESETS.find((p) => p.name === colorName) || COLOR_PRESETS[0]
}

function getFileIcon(fileType: string) {
  switch (fileType) {
    case 'image':
      return <Image className="h-5 w-5" />
    case 'pdf':
      return <FileText className="h-5 w-5" />
    case 'pptx':
      return <FileSpreadsheet className="h-5 w-5" />
    case 'docx':
      return <FileText className="h-5 w-5" />
    case 'txt':
      return <File className="h-5 w-5" />
    default:
      return <File className="h-5 w-5" />
  }
}

function getFileTypeColor(fileType: string) {
  switch (fileType) {
    case 'image':
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    case 'pdf':
      return 'text-red-400 bg-red-500/10 border-red-500/20'
    case 'pptx':
      return 'text-orange-400 bg-orange-500/10 border-orange-500/20'
    case 'docx':
      return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
    case 'txt':
      return 'text-gray-400 bg-gray-500/10 border-gray-500/20'
    default:
      return 'text-gray-400 bg-gray-500/10 border-gray-500/20'
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatFileSize(text: string | null): string {
  if (!text) return 'No text extracted'
  const chars = text.length
  if (chars < 1000) return `${chars} characters`
  return `${(chars / 1000).toFixed(1)}k characters`
}

export const Subjects: React.FC = () => {
  const { user, session } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeSubjectId = searchParams.get('id') || 'unassigned'
  const activeTab = (searchParams.get('tab') as 'files' | 'guides' | 'exams') || 'files'

  // Data States
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)

  // Subject Edit/Create Modal States
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [selectedColor, setSelectedColor] = useState('violet')
  const [savingSubject, setSavingSubject] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [deletingSubjectId, setDeletingSubjectId] = useState<string | null>(null)

  // File Upload States
  const [uploading, setUploading] = useState(false)
  const [uploadFileName, setUploadFileName] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Notes Generation Modal States
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false)
  const [selectedMaterialsForNotes, setSelectedMaterialsForNotes] = useState<string[]>([])
  const [generatingNotes, setGeneratingNotes] = useState(false)
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)

  // Exam Generation Modal States
  const [isExamModalOpen, setIsExamModalOpen] = useState(false)
  const [selectedMaterialsForExam, setSelectedMaterialsForExam] = useState<string[]>([])
  const [numQuestions, setNumQuestions] = useState(10)
  const [mcPercent, setMcPercent] = useState(20)
  const [idPercent, setIdPercent] = useState(20)
  const [tofPercent, setTofPercent] = useState(20)
  const [mtofPercent, setMtofPercent] = useState(20)
  const [enumPercent, setEnumPercent] = useState(20)
  const [generatingExam, setGeneratingExam] = useState(false)
  const [deletingExamId, setDeletingExamId] = useState<string | null>(null)

  // Messages States
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const totalPercentage = mcPercent + idPercent + tofPercent + mtofPercent + enumPercent
  const isPercentageValid = totalPercentage === 100

  // Fetch Data
  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const [subjectsRes, materialsRes, notesRes, examsRes] = await Promise.all([
        supabase.from('tbl_subjects').select('*').eq('user_id', user.id).order('name', { ascending: true }),
        supabase.from('tbl_materials').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('tbl_notes').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
        supabase.from('tbl_exams').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])

      if (subjectsRes.error) throw subjectsRes.error
      if (materialsRes.error) throw materialsRes.error
      if (notesRes.error) throw notesRes.error
      if (examsRes.error) throw examsRes.error

      setSubjects(subjectsRes.data || [])
      setMaterials(materialsRes.data || [])
      setNotes(notesRes.data || [])
      setExams(examsRes.data || [])
    } catch (err: any) {
      console.error('Error fetching data:', err)
      setError('Failed to load subject workspace data.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Clear notifications
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [success])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Navigation helpers
  const selectSubject = (id: string) => {
    setSearchParams((prev) => {
      prev.set('id', id)
      return prev
    }, { replace: true })
  }

  const selectTab = (tab: 'files' | 'guides' | 'exams') => {
    setSearchParams((prev) => {
      prev.set('tab', tab)
      return prev
    }, { replace: true })
  }

  // Subject Edit/Create Modal controls
  const openCreateSubjectModal = () => {
    setEditingSubject(null)
    setNewSubjectName('')
    setSelectedColor('violet')
    setIsSubjectModalOpen(true)
  }

  const openEditSubjectModal = (subject: Subject, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingSubject(subject)
    setNewSubjectName(subject.name)
    setSelectedColor(subject.color)
    setIsSubjectModalOpen(true)
  }

  const closeSubjectModal = () => {
    setIsSubjectModalOpen(false)
    setEditingSubject(null)
    setNewSubjectName('')
    setSelectedColor('violet')
  }

  // Save Subject
  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newSubjectName.trim()) return

    setSavingSubject(true)
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
        setSuccess(`Subject "${newSubjectName.trim()}" updated successfully!`)
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

        setSubjects((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
        setSuccess(`Subject "${newSubjectName.trim()}" created successfully!`)
        // Auto select the new subject
        selectSubject(data.id)
      }
      closeSubjectModal()
    } catch (err: any) {
      console.error('Error saving subject:', err)
      setError(err.message || 'Failed to save subject.')
    } finally {
      setSavingSubject(false)
    }
  }

  // Delete Subject
  const handleDeleteSubject = async (subjectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to delete this subject? Linked items will be set to unassigned.')) {
      return
    }

    setDeletingSubjectId(subjectId)
    setError(null)
    try {
      const { error: deleteError } = await supabase.from('tbl_subjects').delete().eq('id', subjectId)

      if (deleteError) throw deleteError

      setSubjects((prev) => prev.filter((s) => s.id !== subjectId))
      
      // Update local state relations to be null
      setMaterials((prev) => prev.map((m) => (m.subject_id === subjectId ? { ...m, subject_id: null } : m)))
      setNotes((prev) => prev.map((n) => (n.subject_id === subjectId ? { ...n, subject_id: null } : n)))
      setExams((prev) => prev.map((ex) => (ex.subject_id === subjectId ? { ...ex, subject_id: null } : ex)))

      setSuccess('Subject deleted successfully.')
      if (activeSubjectId === subjectId) {
        selectSubject('unassigned')
      }
    } catch (err: any) {
      console.error('Error deleting subject:', err)
      setError(err.message || 'Failed to delete subject.')
    } finally {
      setDeletingSubjectId(null)
    }
  }

  // Reassign Material Subject Handler
  const handleUpdateMaterialSubject = async (materialId: string, subjectId: string) => {
    try {
      const dbSubjectId = subjectId === '' ? null : subjectId
      const { error: updateError } = await supabase
        .from('tbl_materials')
        .update({ subject_id: dbSubjectId })
        .eq('id', materialId)

      if (updateError) throw updateError

      setMaterials((prev) => prev.map((m) => (m.id === materialId ? { ...m, subject_id: dbSubjectId } : m)))
      setSuccess('File reassigned successfully.')
    } catch (err: any) {
      console.error('Error updating material subject:', err)
      setError(err.message || 'Failed to reassign file.')
    }
  }

  // Reassign Note Subject Handler
  const handleUpdateNoteSubject = async (noteId: string, subjectId: string) => {
    try {
      const dbSubjectId = subjectId === '' ? null : subjectId
      const { error: updateError } = await supabase
        .from('tbl_notes')
        .update({ subject_id: dbSubjectId, updated_at: new Date().toISOString() })
        .eq('id', noteId)

      if (updateError) throw updateError

      setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, subject_id: dbSubjectId } : n)))
      setSuccess('Study guide reassigned successfully.')
    } catch (err: any) {
      console.error('Error updating note subject:', err)
      setError(err.message || 'Failed to reassign study guide.')
    }
  }

  // Reassign Exam Subject Handler
  const handleUpdateExamSubject = async (examId: string, subjectId: string) => {
    try {
      const dbSubjectId = subjectId === '' ? null : subjectId
      const { error: updateError } = await supabase
        .from('tbl_exams')
        .update({ subject_id: dbSubjectId })
        .eq('id', examId)

      if (updateError) throw updateError

      setExams((prev) => prev.map((ex) => (ex.id === examId ? { ...ex, subject_id: dbSubjectId } : ex)))
      setSuccess('Exam reassigned successfully.')
    } catch (err: any) {
      console.error('Error updating exam subject:', err)
      setError(err.message || 'Failed to reassign exam.')
    }
  }

  // File Upload
  const handleUploadFile = async (file: File) => {
    if (!session) {
      setError('You must be logged in to upload.')
      return
    }

    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError(`Unsupported file type: ${ext}. Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}`)
      return
    }

    setError(null)
    setSuccess(null)
    setUploading(true)
    setUploadFileName(file.name)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (activeSubjectId && activeSubjectId !== 'unassigned') {
        formData.append('subject_id', activeSubjectId)
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/parse-material`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      setSuccess(`"${file.name}" uploaded and parsed successfully!`)
      
      // Fetch latest materials
      const { data: updatedMaterials, error: fetchError } = await supabase
        .from('tbl_materials')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })

      if (!fetchError && updatedMaterials) {
        setMaterials(updatedMaterials)
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      setUploadFileName(null)
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleUploadFile(files[0])
    }
  }, [activeSubjectId])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleUploadFile(files[0])
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Delete Material File
  const handleDeleteFile = async (material: Material) => {
    if (!user) return
    setDeletingFileId(material.id)
    setError(null)

    try {
      await supabase.storage.from('materials').remove([material.storage_path])
      const { error: dbError } = await supabase.from('tbl_materials').delete().eq('id', material.id)

      if (dbError) throw dbError

      setMaterials((prev) => prev.filter((m) => m.id !== material.id))
      setSuccess(`"${material.file_name}" deleted.`)
    } catch (err: any) {
      setError(err.message || 'Failed to delete material')
    } finally {
      setDeletingFileId(null)
    }
  }

  // Notes Generation
  const handleGenerateNotes = async () => {
    if (selectedMaterialsForNotes.length === 0) {
      setError('Please select at least one material to generate notes.')
      return
    }

    setError(null)
    setGeneratingNotes(true)

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          material_ids: selectedMaterialsForNotes,
          subject_id: activeSubjectId === 'unassigned' ? null : activeSubjectId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate notes')
      }

      setIsNotesModalOpen(false)
      setSelectedMaterialsForNotes([])
      navigate(`/notes/${result.id}`)
    } catch (err: any) {
      setError(err.message || 'Notes generation failed')
      setGeneratingNotes(false)
    }
  }

  const handleDeleteNote = async (noteId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return
    
    setDeletingNoteId(noteId)
    setError(null)
    try {
      const { error: deleteError } = await supabase.from('tbl_notes').delete().eq('id', noteId)
      if (deleteError) throw deleteError
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
      setSuccess(`"${title}" deleted successfully.`)
    } catch (err: any) {
      setError(err.message || 'Failed to delete note')
    } finally {
      setDeletingNoteId(null)
    }
  }

  // Exam Generation
  const handleDistributeExamsEvenly = () => {
    setMcPercent(20)
    setIdPercent(20)
    setTofPercent(20)
    setMtofPercent(20)
    setEnumPercent(20)
  }

  const handleGenerateExam = async () => {
    if (selectedMaterialsForExam.length === 0) {
      setError('Please select at least one material to generate an exam.')
      return
    }

    if (!isPercentageValid) {
      setError('The total percentage of all question types must equal exactly 100%.')
      return
    }

    setError(null)
    setGeneratingExam(true)

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-exam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          material_ids: selectedMaterialsForExam,
          num_questions: numQuestions,
          percentages: {
            mc: mcPercent,
            id: idPercent,
            tof: tofPercent,
            mtof: mtofPercent,
            enum: enumPercent,
          },
          subject_id: activeSubjectId === 'unassigned' ? null : activeSubjectId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate exam')
      }

      setIsExamModalOpen(false)
      setSelectedMaterialsForExam([])
      navigate(`/exams/${result.id}`)
    } catch (err: any) {
      setError(err.message || 'Exam generation failed')
      setGeneratingExam(false)
    }
  }

  const handleDeleteExam = async (examId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return

    setDeletingExamId(examId)
    setError(null)
    try {
      await supabase.from('tbl_exam_sessions').delete().eq('exam_id', examId)
      const { error: deleteError } = await supabase.from('tbl_exams').delete().eq('id', examId)

      if (deleteError) throw deleteError
      setExams((prev) => prev.filter((ex) => ex.id !== examId))
      setSuccess(`"${title}" deleted successfully.`)
    } catch (err: any) {
      setError(err.message || 'Failed to delete exam')
    } finally {
      setDeletingExamId(null)
    }
  }

  // Get active subject metadata
  const activeSubject = subjects.find((s) => s.id === activeSubjectId)
  const activeSubjectColorStyles = activeSubject ? getSubjectColorStyles(activeSubject.color) : null

  // Filtered lists for the active subject
  const currentSubjectMaterials = materials.filter((m) =>
    activeSubjectId === 'unassigned' ? !m.subject_id : m.subject_id === activeSubjectId
  )

  const currentSubjectNotes = notes.filter((n) =>
    activeSubjectId === 'unassigned' ? !n.subject_id : n.subject_id === activeSubjectId
  )

  const currentSubjectExams = exams.filter((e) =>
    activeSubjectId === 'unassigned' ? !e.subject_id : e.subject_id === activeSubjectId
  )

  // Subject Stats counts for the sidebar listing
  const getCountsForSubject = (id: string | null) => {
    const fileCount = materials.filter((m) => m.subject_id === id).length
    const guideCount = notes.filter((n) => n.subject_id === id).length
    const examCount = exams.filter((e) => e.subject_id === id).length
    return fileCount + guideCount + examCount
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="glass-card rounded-3xl p-8 sm:p-10 relative overflow-hidden bg-white/[0.01] border-white/5">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-500/10 blur-2xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
              Subject Center
            </h1>
            <p className="text-gray-400 max-w-xl text-sm">
              Consolidated command-center. Create subjects to organize your study guides, practice exams, and upload files.
            </p>
          </div>
          <button
            onClick={openCreateSubjectModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-tr from-brand-600 to-purple-500 hover:from-brand-500 hover:to-purple-400 px-5 py-3 text-sm font-semibold text-white transition-all cursor-pointer shadow-[0_4px_20px_rgba(139,92,246,0.25)] hover:shadow-[0_4px_25px_rgba(139,92,246,0.35)]"
          >
            <Plus className="h-5 w-5" />
            New Subject
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400 animate-fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-400 animate-fade-in">
          <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Grid: Sidebar (Left), Content Area (Right) */}
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Sidebar: Subjects List */}
        <div className="lg:w-80 shrink-0 w-full space-y-4">
          <div className="glass-card rounded-2xl p-5 bg-white/[0.01] border-white/5 space-y-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">
              Course Subjects
            </h2>
            
            <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-1">
              {/* Virtual Subject: Unassigned */}
              <div
                onClick={() => selectSubject('unassigned')}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all duration-200 select-none
                  ${activeSubjectId === 'unassigned'
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'bg-transparent border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }
                `}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Folder className="h-4.5 w-4.5 shrink-0 text-gray-500" />
                  <span className="text-sm font-semibold truncate">Unassigned Items</span>
                </div>
                <span className="text-[10px] font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-gray-400 shrink-0">
                  {getCountsForSubject(null)}
                </span>
              </div>

              {loading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 text-brand-400 animate-spin" />
                </div>
              ) : subjects.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No custom subjects added.</p>
              ) : (
                subjects.map((sub) => {
                  const styles = getSubjectColorStyles(sub.color)
                  const isSelected = activeSubjectId === sub.id
                  const totalCount = getCountsForSubject(sub.id)

                  return (
                    <div
                      key={sub.id}
                      onClick={() => selectSubject(sub.id)}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all duration-200 select-none group
                        ${isSelected
                          ? `${styles.bg} border-white/15 text-white`
                          : 'bg-transparent border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`h-2.5 w-2.5 rounded-full ${styles.dot} shrink-0`} />
                        <span className="text-sm font-semibold truncate">{sub.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Hover Actions */}
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                          <button
                            onClick={(e) => openEditSubjectModal(sub, e)}
                            className="p-1 text-gray-500 hover:text-white rounded hover:bg-white/10"
                            title="Edit Subject"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteSubject(sub.id, e)}
                            disabled={deletingSubjectId === sub.id}
                            className="p-1 text-gray-500 hover:text-rose-400 rounded hover:bg-rose-500/10"
                            title="Delete Subject"
                          >
                            {deletingSubjectId === sub.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </button>
                        </div>

                        <span className="text-[10px] font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-gray-400">
                          {totalCount}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Pane: Files, Notes, and Exams Tabs */}
        <div className="flex-1 space-y-6">
          <div className="glass-card rounded-2xl p-6 bg-white/[0.01] border-white/5 space-y-6">
            
            {/* Header section of selected subject */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
              <div className="flex items-center gap-3 min-w-0">
                {activeSubjectId === 'unassigned' ? (
                  <>
                    <Folder className="h-6 w-6 text-gray-500 shrink-0" />
                    <h2 className="text-2xl font-black text-white truncate">General / Unassigned</h2>
                  </>
                ) : activeSubject ? (
                  <>
                    <span className={`h-4.5 w-4.5 rounded-full ${activeSubjectColorStyles?.dot} shrink-0`} />
                    <h2 className="text-2xl font-black text-white truncate">{activeSubject.name}</h2>
                  </>
                ) : (
                  <h2 className="text-2xl font-black text-white truncate">Loading Subject...</h2>
                )}
              </div>

              {/* Sub-Tabs Selector */}
              <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 shrink-0 select-none">
                <button
                  onClick={() => selectTab('files')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer
                    ${activeTab === 'files'
                      ? 'bg-brand-500 text-white shadow'
                      : 'text-gray-400 hover:text-white'
                    }
                  `}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Files ({currentSubjectMaterials.length})
                </button>
                <button
                  onClick={() => selectTab('guides')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer
                    ${activeTab === 'guides'
                      ? 'bg-brand-500 text-white shadow'
                      : 'text-gray-400 hover:text-white'
                    }
                  `}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Study Guides ({currentSubjectNotes.length})
                </button>
                <button
                  onClick={() => selectTab('exams')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer
                    ${activeTab === 'exams'
                      ? 'bg-brand-500 text-white shadow'
                      : 'text-gray-400 hover:text-white'
                    }
                  `}
                >
                  <Award className="h-3.5 w-3.5" />
                  Exams ({currentSubjectExams.length})
                </button>
              </div>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'files' && (
              <div className="space-y-6">
                {/* Upload Dropzone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className={`glass-card rounded-2xl p-8 border border-dashed text-center cursor-pointer transition-all duration-300 relative overflow-hidden group
                    ${dragOver
                      ? 'border-brand-400 bg-brand-500/10 shadow-[0_0_20px_rgba(139,92,246,0.15)]'
                      : 'border-white/10 hover:border-white/20'
                    }
                    ${uploading ? 'pointer-events-none opacity-70' : ''}
                  `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_MIME_TYPES.join(',')}
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {uploading ? (
                    <div className="flex flex-col items-center py-2">
                      <Loader2 className="h-8 w-8 text-brand-400 animate-spin mb-3" />
                      <p className="font-bold text-white">Uploading "{uploadFileName}"...</p>
                      <p className="text-xs text-gray-500 mt-1">Extracting contents with Gemini Parser...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <CloudUpload className="h-8 w-8 text-brand-400 group-hover:text-brand-300 transition-colors mb-3" />
                      <p className="font-semibold text-white text-sm">
                        {dragOver ? 'Drop file to upload' : 'Drag & drop file here'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        or <span className="text-brand-400 font-bold group-hover:underline">browse files</span>
                      </p>
                      <p className="text-[10px] text-gray-600 mt-3 uppercase tracking-wider">
                        PDF, DOCX, PPTX, TXT, Images (Max 10MB)
                      </p>
                    </div>
                  )}
                </div>

                {/* Files List */}
                <div className="space-y-2">
                  {currentSubjectMaterials.length === 0 ? (
                    <div className="text-center py-10 bg-white/[0.01] border border-white/5 rounded-2xl">
                      <Folder className="h-8 w-8 text-gray-700 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-gray-400">No files uploaded under this subject</p>
                      <p className="text-xs text-gray-600 mt-0.5">Drag-and-drop a lecture deck or document above to begin.</p>
                    </div>
                  ) : (
                    currentSubjectMaterials.map((material) => (
                      <div
                        key={material.id}
                        className="glass-card rounded-xl p-4 flex items-center gap-4 bg-white/[0.01] border-white/5 hover:border-white/10 group transition-all"
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${getFileTypeColor(material.file_type)}`}>
                          {getFileIcon(material.file_type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{material.file_name}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                            <span className="uppercase text-[10px] font-semibold">{material.file_type}</span>
                            <span>•</span>
                            <span>{formatFileSize(material.extracted_text)}</span>
                            <span>•</span>
                            <span>Uploaded {formatDate(material.created_at)}</span>
                          </div>
                        </div>

                        {/* Subject Re-assignment Dropdown */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-gray-500 font-semibold">Subject:</span>
                          <select
                            value={material.subject_id || ''}
                            onChange={(e) => handleUpdateMaterialSubject(material.id, e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg text-xs px-2.5 py-1 text-gray-300 focus:outline-none cursor-pointer"
                          >
                            <option value="" className="bg-[#0c101c]">Unassigned</option>
                            {subjects.map((sub) => (
                              <option key={sub.id} value={sub.id} className="bg-[#0c101c]">
                                {sub.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={() => handleDeleteFile(material)}
                          disabled={deletingFileId === material.id}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-rose-500/10 hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                        >
                          {deletingFileId === material.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'guides' && (
              <div className="space-y-6">
                {/* Header Action */}
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-400">AI Study Guides</h3>
                  <button
                    onClick={() => {
                      setError(null)
                      setIsNotesModalOpen(true)
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white hover:bg-brand-600 transition-colors shadow-[0_2px_10px_rgba(139,92,246,0.15)] cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Generate Study Guide
                  </button>
                </div>

                {/* Guides Grid */}
                {currentSubjectNotes.length === 0 ? (
                  <div className="text-center py-12 bg-white/[0.01] border border-white/5 rounded-2xl">
                    <FileText className="h-8 w-8 text-gray-700 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-gray-400">No study guides created yet</p>
                    <p className="text-xs text-gray-600 mt-0.5">Click "Generate Study Guide" to synthesize your materials.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentSubjectNotes.map((note) => (
                      <div
                        key={note.id}
                        onClick={() => navigate(`/notes/${note.id}`)}
                        className="glass-card rounded-2xl p-5 flex flex-col justify-between hover:border-brand-500/30 transition-all duration-200 group bg-white/[0.01] border-white/5 relative cursor-pointer"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400">
                              <FileText className="h-4.5 w-4.5" />
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleDeleteNote(note.id, note.title)
                              }}
                              disabled={deletingNoteId === note.id}
                              className="p-1 rounded text-gray-500 hover:bg-rose-500/10 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                            >
                              {deletingNoteId === note.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                          
                          <h3 className="font-bold text-white text-base group-hover:text-brand-300 transition-colors line-clamp-1">
                            {note.title || 'Untitled Notes'}
                          </h3>
                          <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed">
                            {note.content?.replace(/[#*`_]/g, '') || 'No content.'}
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 pt-4 mt-4 border-t border-white/5">
                          <div className="flex items-center justify-between text-[11px] text-gray-500">
                            <span className="flex items-center gap-1 font-semibold text-brand-400">
                              <BookOpen className="h-3.5 w-3.5" />
                              {note.material_ids?.length || 0} File{(note.material_ids?.length || 0) !== 1 ? 's' : ''}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(note.updated_at || note.created_at)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-1">
                            <span className="text-[10px] text-gray-500 font-semibold">Subject:</span>
                            <select
                              onClick={(e) => e.stopPropagation()}
                              value={note.subject_id || ''}
                              onChange={(e) => {
                                e.stopPropagation()
                                handleUpdateNoteSubject(note.id, e.target.value)
                              }}
                              className="bg-white/5 border border-white/10 rounded-lg text-[10px] px-2 py-0.5 text-gray-300 focus:outline-none cursor-pointer w-full max-w-[140px]"
                            >
                              <option value="" className="bg-[#0c101c]">Unassigned</option>
                              {subjects.map((sub) => (
                                <option key={sub.id} value={sub.id} className="bg-[#0c101c]">
                                  {sub.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'exams' && (
              <div className="space-y-6">
                {/* Header Action */}
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-400">Practice Exams</h3>
                  <button
                    onClick={() => {
                      setError(null)
                      setIsExamModalOpen(true)
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white hover:bg-brand-600 transition-colors shadow-[0_2px_10px_rgba(139,92,246,0.15)] cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Configure Exam
                  </button>
                </div>

                {/* Exams List */}
                {currentSubjectExams.length === 0 ? (
                  <div className="text-center py-12 bg-white/[0.01] border border-white/5 rounded-2xl">
                    <Award className="h-8 w-8 text-gray-700 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-gray-400">No exams generated yet</p>
                    <p className="text-xs text-gray-600 mt-0.5">Click "Configure Exam" to create customized study assessments.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentSubjectExams.map((exam) => (
                      <div
                        key={exam.id}
                        onClick={() => navigate(`/exams/${exam.id}`)}
                        className="glass-card rounded-2xl p-5 flex flex-col justify-between hover:border-purple-500/30 transition-all duration-200 group bg-white/[0.01] border-white/5 relative cursor-pointer"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                              <Award className="h-4.5 w-4.5" />
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleDeleteExam(exam.id, exam.title)
                              }}
                              disabled={deletingExamId === exam.id}
                              className="p-1 rounded text-gray-500 hover:bg-rose-500/10 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                            >
                              {deletingExamId === exam.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>

                          <h3 className="font-bold text-white text-base group-hover:text-purple-300 transition-colors line-clamp-1">
                            {exam.title || 'Untitled Exam'}
                          </h3>
                        </div>

                        <div className="flex flex-col gap-2 pt-4 mt-6 border-t border-white/5">
                          <div className="flex items-center justify-between text-[11px] text-gray-500">
                            <span className="bg-purple-500/10 border border-purple-500/20 rounded-full px-2.5 py-0.5 font-bold text-purple-400">
                              {exam.questions?.length || 0} Questions
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatDate(exam.created_at)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2 mt-1">
                            <span className="text-[10px] text-gray-500 font-semibold">Subject:</span>
                            <select
                              onClick={(e) => e.stopPropagation()}
                              value={exam.subject_id || ''}
                              onChange={(e) => {
                                e.stopPropagation()
                                handleUpdateExamSubject(exam.id, e.target.value)
                              }}
                              className="bg-white/5 border border-white/10 rounded-lg text-[10px] px-2 py-0.5 text-gray-300 focus:outline-none cursor-pointer w-full max-w-[140px]"
                            >
                              <option value="" className="bg-[#0c101c]">Unassigned</option>
                              {subjects.map((sub) => (
                                <option key={sub.id} value={sub.id} className="bg-[#0c101c]">
                                  {sub.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE / EDIT SUBJECT MODAL */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={closeSubjectModal}></div>
          <div className="glass-card rounded-2xl p-6 max-w-md w-full relative z-10 border-white/10 shadow-2xl animate-fade-in space-y-6 bg-[#0c101c]">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-lg font-extrabold text-white">
                {editingSubject ? 'Edit Subject' : 'Create New Subject'}
              </h3>
              <button onClick={closeSubjectModal} className="text-gray-500 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveSubject} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400">Subject Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Biology, Organic Chemistry, World History"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500/50"
                  maxLength={50}
                />
              </div>

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

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={closeSubjectModal}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSubject}
                  className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingSubject && <Loader2 className="h-3 w-3 animate-spin" />}
                  {editingSubject ? 'Save Changes' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GENERATE NOTES MODAL */}
      {isNotesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => !generatingNotes && setIsNotesModalOpen(false)}></div>
          <div className="glass-card w-full max-w-lg rounded-3xl p-6 sm:p-8 relative z-10 overflow-hidden shadow-2xl border-white/10 bg-[#0c101c]">
            {generatingNotes ? (
              <div className="flex flex-col items-center justify-center text-center py-12 space-y-6">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full border-4 border-t-brand-500 border-r-transparent border-b-purple-500 border-l-transparent animate-spin"></div>
                  <div className="absolute inset-2 rounded-full bg-brand-500/10 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)] animate-pulse">
                    <Sparkles className="h-7 w-7 text-brand-300" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-display text-2xl font-bold text-white">Synthesizing Notes...</h3>
                  <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
                    Gemini is processing your materials to generate a structured, comprehensive study guide.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-display text-2xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-brand-400" />
                    Select Materials
                  </h3>
                  <button onClick={() => setIsNotesModalOpen(false)} className="p-1 rounded hover:bg-white/5 text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
                </div>

                <p className="text-xs text-gray-400 mb-5">
                  Choose files from this subject to synthesize.
                </p>

                <div className="max-h-[250px] overflow-y-auto space-y-2 mb-6">
                  {currentSubjectMaterials.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-6">No materials uploaded under this subject.</p>
                  ) : (
                    currentSubjectMaterials.map((m) => {
                      const isSelected = selectedMaterialsForNotes.includes(m.id)
                      return (
                        <div
                          key={m.id}
                          onClick={() => {
                            setSelectedMaterialsForNotes(prev =>
                              prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                            )
                          }}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none
                            ${isSelected ? 'bg-brand-500/10 border-brand-500/30' : 'bg-white/5 border-transparent hover:bg-white/10'}
                          `}
                        >
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-brand-400 shrink-0" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-500 shrink-0" />
                          )}
                          <span className="text-xs font-semibold text-gray-200 truncate">{m.file_name}</span>
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsNotesModalOpen(false)}
                    className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-xs font-bold text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateNotes}
                    disabled={selectedMaterialsForNotes.length === 0}
                    className="flex-1 rounded-xl bg-gradient-to-tr from-brand-600 to-purple-500 px-4 py-3 text-xs font-bold text-white disabled:opacity-50"
                  >
                    Generate
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* GENERATE EXAMS MODAL */}
      {isExamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => !generatingExam && setIsExamModalOpen(false)}></div>
          <div className="glass-card w-full max-w-xl rounded-3xl p-6 sm:p-8 relative z-10 overflow-hidden shadow-2xl border-white/10 bg-[#0c101c]">
            {generatingExam ? (
              <div className="flex flex-col items-center justify-center text-center py-12 space-y-6">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full border-4 border-t-purple-500 border-r-transparent border-b-indigo-500 border-l-transparent animate-spin"></div>
                  <div className="absolute inset-2 rounded-full bg-purple-500/10 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.3)] animate-pulse">
                    <Sparkles className="h-7 w-7 text-purple-300" />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-display text-2xl font-bold text-white">Generating Exam...</h3>
                  <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
                    Gemini is processing your materials to create customized questions with automated scoring criteria.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-display text-2xl font-bold text-white flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-purple-400" />
                    Configure Practice Exam
                  </h3>
                  <button onClick={() => setIsExamModalOpen(false)} className="p-1 rounded hover:bg-white/5 text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
                </div>

                <div className="max-h-[380px] overflow-y-auto space-y-5 mb-6 pr-1">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-300">Select materials from this subject</label>
                    <div className="max-h-[120px] overflow-y-auto space-y-2 bg-white/[0.02] border border-white/5 rounded-xl p-2">
                      {currentSubjectMaterials.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-4">No materials uploaded under this subject.</p>
                      ) : (
                        currentSubjectMaterials.map((m) => {
                          const isSelected = selectedMaterialsForExam.includes(m.id)
                          return (
                            <div
                              key={m.id}
                              onClick={() => {
                                setSelectedMaterialsForExam(prev =>
                                  prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                                )
                              }}
                              className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all select-none
                                ${isSelected ? 'bg-purple-500/10 border-purple-500/30' : 'bg-white/5 border-transparent hover:bg-white/10'}
                              `}
                            >
                              {isSelected ? (
                                <CheckSquare className="h-4 w-4 text-purple-400 shrink-0" />
                              ) : (
                                <Square className="h-4 w-4 text-gray-500 shrink-0" />
                              )}
                              <span className="text-xs font-semibold text-gray-200 truncate">{m.file_name}</span>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-300 flex justify-between">
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

                  <div className="space-y-3 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-gray-300">Question Distribution</label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleDistributeExamsEvenly}
                          type="button"
                          className="text-[9px] bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-2 py-0.5 rounded font-medium"
                        >
                          Even
                        </button>
                        <span className={`text-[10px] font-bold rounded px-2 py-0.5 border ${isPercentageValid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                          Total: {totalPercentage}%
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 bg-white/[0.01] border border-white/5 rounded-xl p-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Multiple Choice</span>
                          <span className="text-gray-300 font-bold">{mcPercent}%</span>
                        </div>
                        <input type="range" min="0" max="100" step="5" value={mcPercent} onChange={(e) => setMcPercent(parseInt(e.target.value))} className="w-full h-1 bg-white/5 appearance-none cursor-pointer accent-purple-500" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Identification</span>
                          <span className="text-gray-300 font-bold">{idPercent}%</span>
                        </div>
                        <input type="range" min="0" max="100" step="5" value={idPercent} onChange={(e) => setIdPercent(parseInt(e.target.value))} className="w-full h-1 bg-white/5 appearance-none cursor-pointer accent-purple-500" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">True or False</span>
                          <span className="text-gray-300 font-bold">{tofPercent}%</span>
                        </div>
                        <input type="range" min="0" max="100" step="5" value={tofPercent} onChange={(e) => setTofPercent(parseInt(e.target.value))} className="w-full h-1 bg-white/5 appearance-none cursor-pointer accent-purple-500" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Modified True or False</span>
                          <span className="text-gray-300 font-bold">{mtofPercent}%</span>
                        </div>
                        <input type="range" min="0" max="100" step="5" value={mtofPercent} onChange={(e) => setMtofPercent(parseInt(e.target.value))} className="w-full h-1 bg-white/5 appearance-none cursor-pointer accent-purple-500" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Enumeration</span>
                          <span className="text-gray-300 font-bold">{enumPercent}%</span>
                        </div>
                        <input type="range" min="0" max="100" step="5" value={enumPercent} onChange={(e) => setEnumPercent(parseInt(e.target.value))} className="w-full h-1 bg-white/5 appearance-none cursor-pointer accent-purple-500" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsExamModalOpen(false)}
                    className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-xs font-bold text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateExam}
                    disabled={selectedMaterialsForExam.length === 0 || !isPercentageValid}
                    className="flex-1 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 px-4 py-3 text-xs font-bold text-white disabled:opacity-50"
                  >
                    Generate
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
