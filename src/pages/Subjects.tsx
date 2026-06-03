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
  ExternalLink,
  FolderPlus,
  Tag,
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
  folder_id: string | null
  tags: string[]
}

interface Folder {
  id: string
  name: string
  created_at: string
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
  const [folders, setFolders] = useState<Folder[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)

  // Folder & Tag Filter/Modal States
  const [activeFolderId, setActiveFolderId] = useState<string>('all')
  const [activeTagFilter, setActiveTagFilter] = useState<string>('all')
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [savingFolder, setSavingFolder] = useState(false)
  const [editingTagsMaterialId, setEditingTagsMaterialId] = useState<string | null>(null)
  const [editingTagsValue, setEditingTagsValue] = useState('')

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
  const [creatingBlankNote, setCreatingBlankNote] = useState(false)
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

  // Bulk selection states
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([])
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([])
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([])

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

  // Open confirmation helper
  const openConfirmModal = (title: string, message: string, onConfirm: () => void | Promise<void>) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm,
    })
  }

  // Clear selections on active subject or tab change
  useEffect(() => {
    setSelectedMaterialIds([])
    setSelectedNoteIds([])
    setSelectedExamIds([])
  }, [activeSubjectId, activeTab])

  // Keyboard Shortcuts (Alt+N / Alt+S to add subject, 1/2/3 to switch tabs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'SELECT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return
      }

      // Alt + N or Alt + S: Create New Subject modal
      if (e.altKey && (e.key === 'n' || e.key === 'N' || e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        openCreateSubjectModal()
        return
      }

      // 1: Switch to Files tab
      if (e.key === '1') {
        e.preventDefault()
        selectTab('files')
        return
      }

      // 2: Switch to Study Guides tab
      if (e.key === '2') {
        e.preventDefault()
        selectTab('guides')
        return
      }

      // 3: Switch to Exams tab
      if (e.key === '3') {
        e.preventDefault()
        selectTab('exams')
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [subjects, activeSubjectId])

  const totalPercentage = mcPercent + idPercent + tofPercent + mtofPercent + enumPercent
  const isPercentageValid = totalPercentage === 100

  // Fetch Data
  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      const [subjectsRes, materialsRes, notesRes, examsRes, foldersRes] = await Promise.all([
        supabase.from('tbl_subjects').select('*').eq('user_id', user.id).order('name', { ascending: true }),
        supabase.from('tbl_materials').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('tbl_notes').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }),
        supabase.from('tbl_exams').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('tbl_folders').select('*').eq('user_id', user.id).order('name', { ascending: true }),
      ])

      if (subjectsRes.error) throw subjectsRes.error
      if (materialsRes.error) throw materialsRes.error
      if (notesRes.error) throw notesRes.error
      if (examsRes.error) throw examsRes.error
      if (foldersRes.error) throw foldersRes.error

      setSubjects(subjectsRes.data || [])
      setMaterials(materialsRes.data || [])
      setFolders(foldersRes.data || [])
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
    openConfirmModal(
      'Delete Subject',
      'Are you sure you want to delete this subject? Linked items will be set to unassigned.',
      async () => {
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
          // If deleted active subject, select unassigned
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
    )
  }

  // Reassign Material Subject Handler
  const handleUpdateMaterialSubject = async (materialId: string, subjectId: string) => {
    try {
      const dbSubjectId = subjectId === '' ? null : subjectId
      const { data, error: updateError } = await supabase
        .from('tbl_materials')
        .update({ subject_id: dbSubjectId })
        .eq('id', materialId)
        .select()

      if (updateError) throw updateError
      if (!data || data.length === 0) {
        throw new Error('No rows updated. Make sure database RLS update policies are configured.')
      }

      setMaterials((prev) => prev.map((m) => (m.id === materialId ? { ...m, subject_id: dbSubjectId } : m)))
      setSuccess('File reassigned successfully.')
    } catch (err: any) {
      console.error('Error updating material subject:', err)
      setError(err.message || 'Failed to reassign file.')
    }
  }

  // Folders & Tags Helpers
  const handleCreateFolder = async () => {
    if (!user || !newFolderName.trim()) return
    setSavingFolder(true)
    try {
      const { data, error: dbError } = await supabase
        .from('tbl_folders')
        .insert({ name: newFolderName.trim(), user_id: user.id })
        .select()
        .single()

      if (dbError) throw dbError
      setFolders((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setSuccess(`Folder "${newFolderName}" created.`)
      setNewFolderName('')
      setIsFolderModalOpen(false)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to create folder.')
    } finally {
      setSavingFolder(false)
    }
  }

  const handleUpdateMaterialFolder = async (materialId: string, folderId: string | null) => {
    try {
      const dbFolderId = folderId === '' ? null : folderId
      const { error: dbError } = await supabase
        .from('tbl_materials')
        .update({ folder_id: dbFolderId })
        .eq('id', materialId)

      if (dbError) throw dbError
      setMaterials((prev) =>
        prev.map((m) => (m.id === materialId ? { ...m, folder_id: dbFolderId } : m))
      )
      setSuccess('Material folder updated.')
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to update folder.')
    }
  }

  const handleUpdateMaterialTags = async (materialId: string, tagsString: string) => {
    const tagsArray = tagsString
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t !== '')

    try {
      const { error: dbError } = await supabase
        .from('tbl_materials')
        .update({ tags: tagsArray })
        .eq('id', materialId)

      if (dbError) throw dbError
      setMaterials((prev) =>
        prev.map((m) => (m.id === materialId ? { ...m, tags: tagsArray } : m))
      )
      setSuccess('Material tags updated.')
      setEditingTagsMaterialId(null)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to update tags.')
    }
  }

  // Reassign Note Subject Handler
  const handleUpdateNoteSubject = async (noteId: string, subjectId: string) => {
    try {
      const dbSubjectId = subjectId === '' ? null : subjectId
      const { data, error: updateError } = await supabase
        .from('tbl_notes')
        .update({ subject_id: dbSubjectId, updated_at: new Date().toISOString() })
        .eq('id', noteId)
        .select()

      if (updateError) throw updateError
      if (!data || data.length === 0) {
        throw new Error('No rows updated. Make sure database RLS update policies are configured.')
      }

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
      const { data, error: updateError } = await supabase
        .from('tbl_exams')
        .update({ subject_id: dbSubjectId })
        .eq('id', examId)
        .select()

      if (updateError) throw updateError
      if (!data || data.length === 0) {
        throw new Error('No rows updated. Make sure database RLS update policies are configured.')
      }

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
    openConfirmModal(
      'Delete File',
      `Are you sure you want to delete "${material.file_name}"? This action is permanent.`,
      async () => {
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
    )
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

  // Bulk Actions
  const handleBatchUpdateMaterialSubject = async (subjectId: string) => {
    const targetSubjectId = subjectId === 'unassigned' ? null : subjectId
    setError(null)
    try {
      const { data, error: updateError } = await supabase
        .from('tbl_materials')
        .update({ subject_id: targetSubjectId })
        .in('id', selectedMaterialIds)
        .select()

      if (updateError) throw updateError
      if (!data || data.length === 0) {
        throw new Error('No rows updated. Make sure database RLS update policies are configured.')
      }

      setMaterials((prev) =>
        prev.map((m) =>
          selectedMaterialIds.includes(m.id) ? { ...m, subject_id: targetSubjectId } : m
        )
      )
      setSuccess(`Updated subject for ${selectedMaterialIds.length} files.`)
      setSelectedMaterialIds([])
    } catch (err: any) {
      setError(err.message || 'Failed to update files.')
    }
  }

  const handleBatchDeleteMaterials = async () => {
    if (selectedMaterialIds.length === 0) return
    openConfirmModal(
      'Delete Selected Files',
      `Are you sure you want to delete these ${selectedMaterialIds.length} files? This action is permanent.`,
      async () => {
        setError(null)
        try {
          const toDelete = materials.filter((m) => selectedMaterialIds.includes(m.id))
          const paths = toDelete.map((m) => m.storage_path)
          
          if (paths.length > 0) {
            await supabase.storage.from('materials').remove(paths)
          }

          const { error: dbError } = await supabase
            .from('tbl_materials')
            .delete()
            .in('id', selectedMaterialIds)

          if (dbError) throw dbError

          setMaterials((prev) => prev.filter((m) => !selectedMaterialIds.includes(m.id)))
          setSuccess(`Successfully deleted ${selectedMaterialIds.length} files.`)
          setSelectedMaterialIds([])
        } catch (err: any) {
          setError(err.message || 'Failed to delete files.')
        }
      }
    )
  }

  const handleBatchUpdateNoteSubject = async (subjectId: string) => {
    const targetSubjectId = subjectId === 'unassigned' ? null : subjectId
    setError(null)
    try {
      const { data, error: updateError } = await supabase
        .from('tbl_notes')
        .update({ subject_id: targetSubjectId })
        .in('id', selectedNoteIds)
        .select()

      if (updateError) throw updateError
      if (!data || data.length === 0) {
        throw new Error('No rows updated. Make sure database RLS update policies are configured.')
      }

      setNotes((prev) =>
        prev.map((n) =>
          selectedNoteIds.includes(n.id) ? { ...n, subject_id: targetSubjectId } : n
        )
      )
      setSuccess(`Updated subject for ${selectedNoteIds.length} study guides.`)
      setSelectedNoteIds([])
    } catch (err: any) {
      setError(err.message || 'Failed to update study guides.')
    }
  }

  const handleBatchDeleteNotes = async () => {
    if (selectedNoteIds.length === 0) return
    openConfirmModal(
      'Delete Selected Study Guides',
      `Are you sure you want to delete these ${selectedNoteIds.length} study guides? This action is permanent.`,
      async () => {
        setError(null)
        try {
          const { error: dbError } = await supabase
            .from('tbl_notes')
            .delete()
            .in('id', selectedNoteIds)

          if (dbError) throw dbError

          setNotes((prev) => prev.filter((n) => !selectedNoteIds.includes(n.id)))
          setSuccess(`Successfully deleted ${selectedNoteIds.length} study guides.`)
          setSelectedNoteIds([])
        } catch (err: any) {
          setError(err.message || 'Failed to delete study guides.')
        }
      }
    )
  }

  const handleBatchUpdateExamSubject = async (subjectId: string) => {
    const targetSubjectId = subjectId === 'unassigned' ? null : subjectId
    setError(null)
    try {
      const { data, error: updateError } = await supabase
        .from('tbl_exams')
        .update({ subject_id: targetSubjectId })
        .in('id', selectedExamIds)
        .select()

      if (updateError) throw updateError
      if (!data || data.length === 0) {
        throw new Error('No rows updated. Make sure database RLS update policies are configured.')
      }

      setExams((prev) =>
        prev.map((ex) =>
          selectedExamIds.includes(ex.id) ? { ...ex, subject_id: targetSubjectId } : ex
        )
      )
      setSuccess(`Updated subject for ${selectedExamIds.length} exams.`)
      setSelectedExamIds([])
    } catch (err: any) {
      setError(err.message || 'Failed to update exams.')
    }
  }

  const handleBatchDeleteExams = async () => {
    if (selectedExamIds.length === 0) return
    openConfirmModal(
      'Delete Selected Exams',
      `Are you sure you want to delete these ${selectedExamIds.length} exams? This action will also delete all associated attempts.`,
      async () => {
        setError(null)
        try {
          await supabase
            .from('tbl_exam_sessions')
            .delete()
            .in('exam_id', selectedExamIds)

          const { error: dbError } = await supabase
            .from('tbl_exams')
            .delete()
            .in('id', selectedExamIds)

          if (dbError) throw dbError

          setExams((prev) => prev.filter((ex) => !selectedExamIds.includes(ex.id)))
          setSuccess(`Successfully deleted ${selectedExamIds.length} exams.`)
          setSelectedExamIds([])
        } catch (err: any) {
          setError(err.message || 'Failed to delete exams.')
        }
      }
    )
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

  const handleCreateBlankNote = async () => {
    if (!user) return
    setCreatingBlankNote(true)
    setError(null)
    try {
      const subjectParamId = activeSubjectId === 'unassigned' ? null : activeSubjectId
      const { data, error: createError } = await supabase
        .from('tbl_notes')
        .insert({
          user_id: user.id,
          title: 'Untitled Note',
          content: '<p>Start writing your note here...</p>',
          material_ids: [],
          subject_id: subjectParamId,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) throw createError

      if (data) {
        navigate(`/notes/${data.id}`)
      }
    } catch (err: any) {
      console.error('Error creating blank note:', err)
      setError(err.message || 'Failed to create blank note.')
    } finally {
      setCreatingBlankNote(false)
    }
  }

  const handleDeleteNote = async (noteId: string, title: string) => {
    openConfirmModal(
      'Delete Study Guide',
      `Are you sure you want to delete "${title}"? This action is permanent.`,
      async () => {
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
    )
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
    openConfirmModal(
      'Delete Practice Exam',
      `Are you sure you want to delete "${title}"? This action will also delete all associated attempts.`,
      async () => {
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
    )
  }

  // Get active subject metadata
  const activeSubject = subjects.find((s) => s.id === activeSubjectId)
  const activeSubjectColorStyles = activeSubject ? getSubjectColorStyles(activeSubject.color) : null

  // Filtered lists for the active subject
  const currentSubjectMaterials = materials.filter((m) => {
    const matchSubject = activeSubjectId === 'unassigned' ? !m.subject_id : m.subject_id === activeSubjectId
    if (!matchSubject) return false
    
    const matchFolder = activeFolderId === 'all' 
      ? true 
      : activeFolderId === 'unassigned' 
        ? !m.folder_id 
        : m.folder_id === activeFolderId
        
    const matchTag = activeTagFilter === 'all'
      ? true
      : m.tags && m.tags.includes(activeTagFilter)
      
    return matchFolder && matchTag
  })

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
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 space-y-10 animate-fade-in">

      {/* Floating Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full px-4 sm:px-0">
        {error && (
          <div className="double-bezel-outer !border-red-500/20 shadow-2xl animate-fade-in bg-zinc-950">
            <div className="double-bezel-inner p-4 flex items-start gap-3 bg-red-500/5">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-red-400" strokeWidth={1.5} />
              <span className="text-xs text-red-300">{error}</span>
            </div>
          </div>
        )}
        {success && (
          <div className="double-bezel-outer !border-emerald-500/20 shadow-2xl animate-fade-in bg-zinc-950">
            <div className="double-bezel-inner p-4 flex items-start gap-3 bg-emerald-500/5">
              <CheckCircle className="h-4.5 w-4.5 shrink-0 mt-0.5 text-emerald-400" strokeWidth={1.5} />
              <span className="text-xs text-emerald-300">{success}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Left Drawer, Right Content Panel */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Left Sidebar: Subjects vertical index */}
        <div className="lg:w-72 shrink-0 w-full space-y-4">
          <div className="double-bezel-outer">
            <div className="double-bezel-inner p-4 space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Course Subjects
                </h2>
                <button
                  onClick={openCreateSubjectModal}
                  className="flex items-center gap-1 rounded-lg bg-purple-600 hover:bg-purple-500 px-2 py-1 text-[10px] font-bold text-white transition-all cursor-pointer hover:-translate-y-[1px] active:scale-[0.98]"
                >
                  <Plus className="h-3 w-3" strokeWidth={1.5} />
                  New
                </button>
              </div>
              
              <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                {/* Unassigned Items Row */}
                <div
                  onClick={() => selectSubject('unassigned')}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all duration-200 select-none
                    ${activeSubjectId === 'unassigned'
                      ? 'bg-white/10 border-white/15 text-white'
                      : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                    }
                  `}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Folder className="h-4 w-4 shrink-0 text-zinc-500" strokeWidth={1.5} />
                    <span className="text-xs font-bold truncate">General / Unassigned</span>
                  </div>
                  <span className="text-[9px] font-mono font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-zinc-400 shrink-0">
                    {getCountsForSubject(null)}
                  </span>
                </div>

                {loading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-4 w-4 text-purple-400 animate-spin" strokeWidth={1.5} />
                  </div>
                ) : subjects.length === 0 ? (
                  <p className="text-[10px] text-zinc-500 text-center py-4 font-semibold">No custom subjects.</p>
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
                            ? `${styles.bg} border-white/10 text-white`
                            : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`h-2 w-2 rounded-full ${styles.dot} shrink-0`} />
                          <span className="text-xs font-bold truncate">{sub.name}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Hover Actions */}
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                            <button
                              onClick={(e) => openEditSubjectModal(sub, e)}
                              className="p-1 text-zinc-500 hover:text-white rounded hover:bg-white/10 cursor-pointer"
                              title="Edit Subject"
                            >
                              <Edit2 className="h-3 w-3" strokeWidth={1.5} />
                            </button>
                            <button
                              onClick={(e) => handleDeleteSubject(sub.id, e)}
                              disabled={deletingSubjectId === sub.id}
                              className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-red-500/10 cursor-pointer disabled:opacity-50"
                              title="Delete Subject"
                            >
                              {deletingSubjectId === sub.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
                              ) : (
                                <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                              )}
                            </button>
                          </div>

                          <span className="text-[9px] font-mono font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-zinc-400">
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
        </div>

        {/* Right Pane: Files, Notes, and Exams Workspace */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          <div className="double-bezel-outer">
            <div className="double-bezel-inner p-5 space-y-6">
              
              {/* Workspace Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
                <div className="flex items-center gap-2.5 min-w-0">
                  {activeSubjectId === 'unassigned' ? (
                    <>
                      <Folder className="h-5 w-5 text-zinc-500 shrink-0" strokeWidth={1.5} />
                      <h2 className="text-lg font-bold text-white truncate">General Library</h2>
                    </>
                  ) : activeSubject ? (
                    <>
                      <span className={`h-3 w-3 rounded-full ${activeSubjectColorStyles?.dot} shrink-0`} />
                      <h2 className="text-lg font-bold text-white truncate">{activeSubject.name}</h2>
                    </>
                  ) : (
                    <h2 className="text-sm font-bold text-zinc-500 truncate">Loading...</h2>
                  )}
                </div>

                {/* Sub-Tabs Console Selector */}
                <div className="flex items-center bg-[#050505] border border-white/5 rounded-full p-1 shrink-0 select-none">
                  <button
                    onClick={() => selectTab('files')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-300 cursor-pointer
                      ${activeTab === 'files'
                        ? 'bg-purple-600 text-white shadow-[0_2px_8px_rgba(168,85,247,0.15)]'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }
                    `}
                  >
                    <Upload className="h-3 w-3" strokeWidth={1.5} />
                    Files ({currentSubjectMaterials.length})
                  </button>
                  <button
                    onClick={() => selectTab('guides')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-300 cursor-pointer
                      ${activeTab === 'guides'
                        ? 'bg-purple-600 text-white shadow-[0_2px_8px_rgba(168,85,247,0.15)]'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }
                    `}
                  >
                    <FileText className="h-3 w-3" strokeWidth={1.5} />
                    Guides ({currentSubjectNotes.length})
                  </button>
                  <button
                    onClick={() => selectTab('exams')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all duration-300 cursor-pointer
                      ${activeTab === 'exams'
                        ? 'bg-purple-600 text-white shadow-[0_2px_8px_rgba(168,85,247,0.15)]'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }
                    `}
                  >
                    <Award className="h-3 w-3" strokeWidth={1.5} />
                    Exams ({currentSubjectExams.length})
                  </button>
                </div>
              </div>

              {/* TAB CONTENT: FILES */}
              {activeTab === 'files' && (
                <div className="space-y-6">
                  {/* Dashed Drag Upload Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={`border border-dashed text-center cursor-pointer transition-all duration-300 rounded-2xl p-6 relative overflow-hidden group
                      ${dragOver
                        ? 'border-purple-500 bg-purple-500/5 shadow-[0_0_15px_rgba(168,85,247,0.1)]'
                        : 'border-zinc-800 bg-[#060608]/40 hover:bg-[#060608]/90 hover:border-zinc-700'
                      }
                      ${uploading ? 'pointer-events-none opacity-50' : ''}
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
                      <div className="flex flex-col items-center py-2 space-y-2">
                        <Loader2 className="h-6 w-6 text-purple-400 animate-spin" strokeWidth={1.5} />
                        <p className="text-xs font-bold text-white">Uploading "{uploadFileName}"...</p>
                        <p className="text-[10px] text-zinc-500">Extracting content layers...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center py-2">
                        <CloudUpload className="h-6 w-6 text-purple-400 group-hover:text-purple-300 transition-colors mb-2" strokeWidth={1.5} />
                        <p className="font-semibold text-white text-xs">
                          {dragOver ? 'Drop document to import' : 'Drag & drop file to import'}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-1">
                          or <span className="text-purple-400 font-bold group-hover:underline">browse disk</span>
                        </p>
                        <p className="text-[9px] text-zinc-600 mt-3 uppercase tracking-widest font-bold">
                          PDF, DOCX, PPTX, TXT, Images (Max 10MB)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Folder and Tag Filter Console */}
                  <div className="flex flex-col gap-4 p-4 rounded-2xl bg-[#060608]/40 border border-zinc-800">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      {/* Folder filters & Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Folder className="h-4 w-4 text-purple-400" />
                        <span className="text-xs font-bold text-zinc-400">Folders:</span>
                        <button
                          onClick={() => setActiveFolderId('all')}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            activeFolderId === 'all'
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              : 'bg-white/5 text-zinc-400 hover:text-white border border-transparent'
                          }`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => setActiveFolderId('unassigned')}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            activeFolderId === 'unassigned'
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              : 'bg-white/5 text-zinc-400 hover:text-white border border-transparent'
                          }`}
                        >
                          Unassigned
                        </button>
                        {folders.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => setActiveFolderId(f.id)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                              activeFolderId === f.id
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                : 'bg-white/5 text-zinc-400 hover:text-white border border-transparent'
                            }`}
                          >
                            {f.name}
                          </button>
                        ))}
                        <button
                          onClick={() => setIsFolderModalOpen(true)}
                          className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 transition-all cursor-pointer"
                        >
                          <FolderPlus className="h-3 w-3" />
                          <span>New Folder</span>
                        </button>
                      </div>
                    </div>

                    {/* Tag Filter */}
                    <div className="flex items-center gap-2 flex-wrap border-t border-zinc-800/60 pt-3">
                      <Tag className="h-3.5 w-3.5 text-zinc-500" />
                      <span className="text-xs font-bold text-zinc-500">Tags:</span>
                      <button
                        onClick={() => setActiveTagFilter('all')}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                          activeTagFilter === 'all'
                            ? 'bg-zinc-800 text-white'
                            : 'bg-zinc-900/60 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        All
                      </button>
                      {Array.from(
                        new Set(
                          materials
                            .filter((m) =>
                              activeSubjectId === 'unassigned' ? !m.subject_id : m.subject_id === activeSubjectId
                            )
                            .flatMap((m) => m.tags || [])
                        )
                      ).map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setActiveTagFilter(tag)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                            activeTagFilter === tag
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20'
                              : 'bg-zinc-900/60 text-zinc-500 hover:text-zinc-300 border border-transparent'
                          }`}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Files List Layout */}
                  <div className="space-y-2">
                    {/* Bulk Selection Console */}
                    {selectedMaterialIds.length > 0 && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-white animate-fade-in text-xs mb-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedMaterialIds.length === currentSubjectMaterials.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMaterialIds(currentSubjectMaterials.map(m => m.id))
                              } else {
                                setSelectedMaterialIds([])
                              }
                            }}
                            className="rounded border-zinc-700 bg-black text-purple-600 focus:ring-0 cursor-pointer h-3.5 w-3.5"
                          />
                          <span className="font-bold">{selectedMaterialIds.length} files selected</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-400">Reassign:</span>
                            <select
                              onChange={(e) => handleBatchUpdateMaterialSubject(e.target.value)}
                              value=""
                              className="bg-[#050505] border border-white/10 rounded-lg text-[10px] px-2 py-1 text-gray-300 focus:outline-none cursor-pointer"
                            >
                              <option value="" disabled>Select subject...</option>
                              <option value="unassigned">Unassigned</option>
                              {subjects.map((sub) => (
                                <option key={sub.id} value={sub.id}>
                                  {sub.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            onClick={handleBatchDeleteMaterials}
                            className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold px-3 py-1 rounded-lg transition-all cursor-pointer text-[10px] active:scale-[0.98]"
                          >
                            <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                            <span>Delete Selected</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {currentSubjectMaterials.length === 0 ? (
                      <div className="text-center py-10 bg-white/[0.005] border border-white/5 rounded-xl space-y-2">
                        <Folder className="h-6 w-6 text-zinc-700 mx-auto" strokeWidth={1.5} />
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-zinc-400">No documents catalogued</p>
                          <p className="text-[10px] text-zinc-600">Import a lecture transcript or outline sheet to begin.</p>
                        </div>
                      </div>
                    ) : (
                      currentSubjectMaterials.map((material) => (
                        <div
                          key={material.id}
                          className="flex items-center gap-4 bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 rounded-xl p-3.5 group transition-all duration-300"
                        >
                          <input
                            type="checkbox"
                            checked={selectedMaterialIds.includes(material.id)}
                            onChange={(e) => {
                              setSelectedMaterialIds((prev) =>
                                e.target.checked
                                  ? [...prev, material.id]
                                  : prev.filter((id) => id !== material.id)
                              )
                            }}
                            className="rounded border-zinc-700 bg-black text-purple-600 focus:ring-0 cursor-pointer h-3.5 w-3.5 shrink-0"
                          />
                          <button
                            onClick={() => handleOpenFile(material)}
                            className="flex flex-1 items-center gap-4 text-left min-w-0 cursor-pointer group/title focus:outline-none"
                            title="Open file"
                          >
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all ${getFileTypeColor(material.file_type)} group-hover/title:border-purple-500/30 group-hover/title:bg-purple-500/10`}>
                              {getFileIcon(material.file_type)}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-white truncate group-hover/title:text-purple-400 flex items-center gap-1 transition-all">
                                <span>{material.file_name}</span>
                                <ExternalLink className="h-3 w-3 opacity-0 group-hover/title:opacity-100 transition-opacity text-purple-400 shrink-0" strokeWidth={1.5} />
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-500 font-semibold">
                                <span className="uppercase text-[9px] font-bold">{material.file_type}</span>
                                <span>•</span>
                                <span>{formatFileSize(material.extracted_text)}</span>
                                <span>•</span>
                                <span>{formatDate(material.created_at)}</span>
                              </div>
                              
                              {/* Tags Display */}
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                {material.tags && material.tags.map((tag) => (
                                  <span key={tag} className="text-[9px] font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded-md">
                                    #{tag}
                                  </span>
                                ))}
                                {editingTagsMaterialId === material.id ? (
                                  <form
                                    onSubmit={(e) => {
                                      e.preventDefault()
                                      handleUpdateMaterialTags(material.id, editingTagsValue)
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-1"
                                  >
                                    <input
                                      type="text"
                                      value={editingTagsValue}
                                      onChange={(e) => setEditingTagsValue(e.target.value)}
                                      placeholder="tag1, tag2..."
                                      className="bg-black/60 border border-purple-500/40 text-[9px] px-1 py-0.5 rounded w-20 focus:outline-none focus:border-purple-500 text-white"
                                      autoFocus
                                    />
                                    <button
                                      type="submit"
                                      className="text-[9px] font-bold bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded cursor-pointer"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingTagsMaterialId(null)}
                                      className="text-[9px] text-zinc-500 hover:text-white px-1 py-0.5 cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </form>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setEditingTagsMaterialId(material.id)
                                      setEditingTagsValue(material.tags ? material.tags.join(', ') : '')
                                    }}
                                    className="text-[9px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  >
                                    <Plus className="h-2.5 w-2.5" />
                                    <span>Tags</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </button>

                          {/* Reassign dropdowns */}
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Subject Dropdown */}
                            <select
                              value={material.subject_id || ''}
                              onChange={(e) => handleUpdateMaterialSubject(material.id, e.target.value)}
                              className="bg-transparent border border-white/5 hover:border-white/10 rounded-lg text-[10px] px-2 py-1 text-zinc-400 hover:text-white focus:outline-none cursor-pointer transition-colors"
                              title="Assign to Subject"
                            >
                              <option value="" className="bg-[#050507]">No Subject</option>
                              {subjects.map((sub) => (
                                <option key={sub.id} value={sub.id} className="bg-[#050507]">
                                  {sub.name}
                                </option>
                              ))}
                            </select>

                            {/* Folder Dropdown */}
                            <select
                              value={material.folder_id || ''}
                              onChange={(e) => handleUpdateMaterialFolder(material.id, e.target.value)}
                              className="bg-transparent border border-white/5 hover:border-white/10 rounded-lg text-[10px] px-2 py-1 text-zinc-400 hover:text-white focus:outline-none cursor-pointer transition-colors"
                              title="Assign to Folder"
                            >
                              <option value="" className="bg-[#050507]">No Folder</option>
                              {folders.map((fold) => (
                                <option key={fold.id} value={fold.id} className="bg-[#050507]">
                                  {fold.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            onClick={() => handleDeleteFile(material)}
                            disabled={deletingFileId === material.id}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                          >
                            {deletingFileId === material.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                            )}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB CONTENT: GUIDES */}
              {activeTab === 'guides' && (
                <div className="space-y-6">
                  {/* Header Action */}
                  <div className="flex items-center justify-between pb-1">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Study Guides & Notes</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCreateBlankNote}
                        disabled={creatingBlankNote}
                        className="flex items-center gap-1.5 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-xs font-bold text-white transition-all duration-300 cursor-pointer hover:-translate-y-[1px] active:scale-[0.98]"
                      >
                        {creatingBlankNote ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                        ) : (
                          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                        )}
                        Write Blank Note
                      </button>
                      <button
                        onClick={() => {
                          setError(null)
                          setIsNotesModalOpen(true)
                        }}
                        className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white transition-all duration-300 shadow-[0_2px_10px_rgba(168,85,247,0.15)] cursor-pointer hover:-translate-y-[1px] active:scale-[0.98]"
                      >
                        <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
                        Generate with AI
                      </button>
                    </div>
                  </div>

                  {/* Guides Table List */}
                  <div className="space-y-2">
                    {/* Bulk Selection Console */}
                    {selectedNoteIds.length > 0 && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-white animate-fade-in text-xs mb-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedNoteIds.length === currentSubjectNotes.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedNoteIds(currentSubjectNotes.map(n => n.id))
                              } else {
                                setSelectedNoteIds([])
                              }
                            }}
                            className="rounded border-zinc-700 bg-black text-purple-600 focus:ring-0 cursor-pointer h-3.5 w-3.5"
                          />
                          <span className="font-bold">{selectedNoteIds.length} guides selected</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-400">Reassign:</span>
                            <select
                              onChange={(e) => handleBatchUpdateNoteSubject(e.target.value)}
                              value=""
                              className="bg-[#050505] border border-white/10 rounded-lg text-[10px] px-2 py-1 text-gray-300 focus:outline-none cursor-pointer"
                            >
                              <option value="" disabled>Select subject...</option>
                              <option value="unassigned">Unassigned</option>
                              {subjects.map((sub) => (
                                <option key={sub.id} value={sub.id}>
                                  {sub.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            onClick={handleBatchDeleteNotes}
                            className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold px-3 py-1 rounded-lg transition-all cursor-pointer text-[10px] active:scale-[0.98]"
                          >
                            <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                            <span>Delete Selected</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {currentSubjectNotes.length === 0 ? (
                      <div className="text-center py-10 bg-white/[0.005] border border-white/5 rounded-xl space-y-2">
                        <FileText className="h-6 w-6 text-zinc-700 mx-auto" strokeWidth={1.5} />
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-zinc-400">No study guides created</p>
                          <p className="text-[10px] text-zinc-600">Select files to generate an interactive study guide.</p>
                        </div>
                      </div>
                    ) : (
                      currentSubjectNotes.map((note) => (
                        <div
                          key={note.id}
                          onClick={() => navigate(`/notes/${note.id}`)}
                          className="flex items-center gap-4 bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 rounded-xl p-3.5 group cursor-pointer transition-all duration-300"
                        >
                          <input
                            type="checkbox"
                            checked={selectedNoteIds.includes(note.id)}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              setSelectedNoteIds((prev) =>
                                e.target.checked
                                  ? [...prev, note.id]
                                  : prev.filter((id) => id !== note.id)
                              )
                            }}
                            className="rounded border-zinc-700 bg-black text-purple-600 focus:ring-0 cursor-pointer h-3.5 w-3.5 shrink-0"
                          />
                          
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                            <FileText className="h-4.5 w-4.5" strokeWidth={1.5} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                              {note.title || 'Untitled Notes'}
                            </p>
                            <p className="text-[10px] text-zinc-500 line-clamp-1 leading-relaxed mt-0.5">
                              {note.content?.replace(/[#*`_]/g, '') || 'No content.'}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <BookOpen className="h-3 w-3" strokeWidth={1.5} />
                              {note.material_ids?.length || 0} Sources
                            </span>
                            
                            <select
                              onClick={(e) => e.stopPropagation()}
                              value={note.subject_id || ''}
                              onChange={(e) => {
                                e.stopPropagation()
                                handleUpdateNoteSubject(note.id, e.target.value)
                              }}
                              className="bg-transparent border border-white/5 hover:border-white/10 rounded-lg text-[10px] px-2 py-1 text-zinc-400 hover:text-white focus:outline-none cursor-pointer transition-colors"
                            >
                              <option value="" className="bg-[#050507]">Unassigned</option>
                              {subjects.map((sub) => (
                                <option key={sub.id} value={sub.id} className="bg-[#050507]">
                                  {sub.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleDeleteNote(note.id, note.title)
                            }}
                            disabled={deletingNoteId === note.id}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                          >
                            {deletingNoteId === note.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                            )}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB CONTENT: EXAMS */}
              {activeTab === 'exams' && (
                <div className="space-y-6">
                  {/* Header Action */}
                  <div className="flex items-center justify-between pb-1">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Evaluations</h3>
                    <button
                      onClick={() => {
                        setError(null)
                        setIsExamModalOpen(true)
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white transition-all duration-300 shadow-[0_2px_10px_rgba(168,85,247,0.15)] cursor-pointer hover:-translate-y-[1px] active:scale-[0.98]"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Configure Exam
                    </button>
                  </div>

                  {/* Exams Table List */}
                  <div className="space-y-2">
                    {/* Bulk Selection Console */}
                    {selectedExamIds.length > 0 && (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-white animate-fade-in text-xs mb-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedExamIds.length === currentSubjectExams.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedExamIds(currentSubjectExams.map(ex => ex.id))
                              } else {
                                setSelectedExamIds([])
                              }
                            }}
                            className="rounded border-zinc-700 bg-black text-purple-600 focus:ring-0 cursor-pointer h-3.5 w-3.5"
                          />
                          <span className="font-bold">{selectedExamIds.length} exams selected</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-400">Reassign:</span>
                            <select
                              onChange={(e) => handleBatchUpdateExamSubject(e.target.value)}
                              value=""
                              className="bg-[#050505] border border-white/10 rounded-lg text-[10px] px-2 py-1 text-gray-300 focus:outline-none cursor-pointer"
                            >
                              <option value="" disabled>Select subject...</option>
                              <option value="unassigned">Unassigned</option>
                              {subjects.map((sub) => (
                                <option key={sub.id} value={sub.id}>
                                  {sub.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            onClick={handleBatchDeleteExams}
                            className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold px-3 py-1 rounded-lg transition-all cursor-pointer text-[10px] active:scale-[0.98]"
                          >
                            <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                            <span>Delete Selected</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {currentSubjectExams.length === 0 ? (
                      <div className="text-center py-10 bg-white/[0.005] border border-white/5 rounded-xl space-y-2">
                        <Award className="h-6 w-6 text-zinc-700 mx-auto" strokeWidth={1.5} />
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-zinc-400">No exams generated</p>
                          <p className="text-[10px] text-zinc-600">Select files to generate a custom practice exam.</p>
                        </div>
                      </div>
                    ) : (
                      currentSubjectExams.map((exam) => (
                        <div
                          key={exam.id}
                          onClick={() => navigate(`/exams/${exam.id}`)}
                          className="flex items-center gap-4 bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 rounded-xl p-3.5 group cursor-pointer transition-all duration-300"
                        >
                          <input
                            type="checkbox"
                            checked={selectedExamIds.includes(exam.id)}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              setSelectedExamIds((prev) =>
                                e.target.checked
                                  ? [...prev, exam.id]
                                  : prev.filter((id) => id !== exam.id)
                              )
                            }}
                            className="rounded border-zinc-700 bg-black text-purple-600 focus:ring-0 cursor-pointer h-3.5 w-3.5 shrink-0"
                          />
                          
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                            <Award className="h-4.5 w-4.5" strokeWidth={1.5} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                              {exam.title || 'Untitled Exam'}
                            </p>
                            <p className="text-[10px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                              <Calendar className="h-3 w-3" strokeWidth={1.5} />
                              <span>Generated {formatDate(exam.created_at)}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
                              {exam.questions?.length || 0} Questions
                            </span>
                            
                            <select
                              onClick={(e) => e.stopPropagation()}
                              value={exam.subject_id || ''}
                              onChange={(e) => {
                                e.stopPropagation()
                                handleUpdateExamSubject(exam.id, e.target.value)
                              }}
                              className="bg-transparent border border-white/5 hover:border-white/10 rounded-lg text-[10px] px-2 py-1 text-zinc-400 hover:text-white focus:outline-none cursor-pointer transition-colors"
                            >
                              <option value="" className="bg-[#050507]">Unassigned</option>
                              {subjects.map((sub) => (
                                <option key={sub.id} value={sub.id} className="bg-[#050507]">
                                  {sub.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleDeleteExam(exam.id, exam.title)
                            }}
                            disabled={deletingExamId === exam.id}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 cursor-pointer shrink-0"
                          >
                            {deletingExamId === exam.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                            )}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CREATE FOLDER MODAL */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsFolderModalOpen(false)}></div>
          <div className="double-bezel-outer max-w-sm w-full relative z-10">
            <div className="double-bezel-inner p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <h3 className="text-base font-bold text-white tracking-tight">Create Folder</h3>
                <button onClick={() => setIsFolderModalOpen(false)} className="text-zinc-500 hover:text-white cursor-pointer text-sm font-semibold">✕</button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleCreateFolder()
                }}
                className="space-y-5"
              >
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Folder Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Week 1 Lectures, References"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-purple-500/50"
                    maxLength={50}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsFolderModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-white/10 text-xs font-semibold text-zinc-400 hover:text-white transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingFolder || !newFolderName.trim()}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-[0_4px_12px_rgba(139,92,246,0.2)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {savingFolder ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <span>Create Folder</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT SUBJECT MODAL */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={closeSubjectModal}></div>
          <div className="double-bezel-outer max-w-sm w-full relative z-10">
            <div className="double-bezel-inner p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <h3 className="text-base font-bold text-white tracking-tight">
                  {editingSubject ? 'Modify Subject' : 'Initialize Subject'}
                </h3>
                <button onClick={closeSubjectModal} className="text-zinc-500 hover:text-white cursor-pointer text-sm font-semibold">✕</button>
              </div>

              <form onSubmit={handleSaveSubject} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Subject Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Biology, Organic Chemistry"
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
                    onClick={closeSubjectModal}
                    className="rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-500 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingSubject}
                    className="flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {savingSubject && <Loader2 className="h-3 w-3 animate-spin" />}
                    {editingSubject ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* GENERATE NOTES MODAL */}
      {isNotesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !generatingNotes && setIsNotesModalOpen(false)}></div>
          <div className="double-bezel-outer w-full max-w-md relative z-10">
            <div className="double-bezel-inner p-6">
              {generatingNotes ? (
                <div className="flex flex-col items-center justify-center text-center py-12 space-y-6">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-t-purple-500 border-r-transparent border-b-purple-400 border-l-transparent animate-spin"></div>
                    <div className="absolute inset-2 rounded-full bg-purple-500/10 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.3)] animate-pulse">
                      <Sparkles className="h-5 w-5 text-purple-300" strokeWidth={1.5} />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-display text-xl font-bold text-white tracking-tight">Synthesizing Notes...</h3>
                    <p className="text-zinc-400 text-xs max-w-xs mx-auto leading-relaxed font-medium">
                      Gemini is compiling your materials to generate a structured, comprehensive study guide.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <h3 className="font-display text-base font-bold text-white flex items-center gap-2 tracking-tight">
                      <Sparkles className="h-4.5 w-4.5 text-purple-400" strokeWidth={1.5} />
                      Select Materials
                    </h3>
                    <button onClick={() => setIsNotesModalOpen(false)} className="p-1 rounded hover:bg-white/5 text-zinc-500 hover:text-white cursor-pointer"><X className="h-4.5 w-4.5" /></button>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                    Choose the documents you want the AI to synthesize into comprehensive study notes.
                  </p>

                  <div className="max-h-[200px] overflow-y-auto space-y-2 mb-2 pr-1">
                    {currentSubjectMaterials.length === 0 ? (
                      <p className="text-xs text-zinc-600 text-center py-6">No materials uploaded under this subject.</p>
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
                              ${isSelected ? 'bg-purple-500/10 border-purple-500/30' : 'bg-[#050507] border-white/5 hover:bg-white/5'}
                            `}
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-purple-400 shrink-0" strokeWidth={1.5} />
                            ) : (
                              <Square className="h-4 w-4 text-zinc-600 shrink-0" strokeWidth={1.5} />
                            )}
                            <span className="text-xs font-semibold text-zinc-200 truncate">{m.file_name}</span>
                          </div>
                        )
                      })
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                    <button
                      onClick={() => setIsNotesModalOpen(false)}
                      className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-500 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleGenerateNotes}
                      disabled={selectedMaterialsForNotes.length === 0}
                      className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50 cursor-pointer"
                    >
                      Generate Notes
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GENERATE EXAMS MODAL */}
      {isExamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !generatingExam && setIsExamModalOpen(false)}></div>
          <div className="double-bezel-outer w-full max-w-lg relative z-10">
            <div className="double-bezel-inner p-6">
              {generatingExam ? (
                <div className="flex flex-col items-center justify-center text-center py-12 space-y-6">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-t-purple-500 border-r-transparent border-b-purple-400 border-l-transparent animate-spin"></div>
                    <div className="absolute inset-2 rounded-full bg-purple-500/10 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.3)] animate-pulse">
                      <Sparkles className="h-5 w-5 text-purple-300" strokeWidth={1.5} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-display text-xl font-bold text-white tracking-tight">Generating Exam...</h3>
                    <p className="text-zinc-400 text-xs max-w-xs mx-auto leading-relaxed font-medium">
                      Gemini is compiling customized questions and grading matrices from your documents.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <h3 className="font-display text-base font-bold text-white flex items-center gap-2 tracking-tight">
                      <Sliders className="h-4.5 w-4.5 text-purple-400" strokeWidth={1.5} />
                      Configure Practice Exam
                    </h3>
                    <button onClick={() => setIsExamModalOpen(false)} className="p-1 rounded hover:bg-white/5 text-zinc-500 hover:text-white cursor-pointer"><X className="h-4.5 w-4.5" /></button>
                  </div>

                  <div className="max-h-[380px] overflow-y-auto space-y-5 mb-2 pr-1">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Select materials from subject</label>
                      <div className="max-h-[110px] overflow-y-auto space-y-2 bg-[#050507] border border-white/5 rounded-xl p-2">
                        {currentSubjectMaterials.length === 0 ? (
                          <p className="text-xs text-zinc-600 text-center py-4">No materials uploaded under this subject.</p>
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
                                  ${isSelected ? 'bg-purple-500/10 border-purple-500/30' : 'bg-transparent border-transparent hover:bg-white/5'}
                                `}
                              >
                                {isSelected ? (
                                  <CheckSquare className="h-4 w-4 text-purple-400 shrink-0" strokeWidth={1.5} />
                                ) : (
                                  <Square className="h-4 w-4 text-zinc-600 shrink-0" strokeWidth={1.5} />
                                )}
                                <span className="text-xs font-semibold text-zinc-200 truncate">{m.file_name}</span>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-zinc-300 flex justify-between">
                        <span>Number of Questions</span>
                        <span className="text-[10px] text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded font-mono">
                          {numQuestions} Questions
                        </span>
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="30"
                        step="1"
                        value={numQuestions}
                        onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>

                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-zinc-300">Question Type Distribution</label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleDistributeExamsEvenly}
                            type="button"
                            className="text-[9px] bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-2 py-0.5 rounded font-bold cursor-pointer transition-colors"
                          >
                            Even
                          </button>
                          <span className={`text-[10px] font-bold rounded px-2 py-0.5 border font-mono ${isPercentageValid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                            Total: {totalPercentage}%
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 bg-[#050507] border border-white/5 rounded-xl p-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-zinc-500 font-semibold text-[10px] uppercase">Multiple Choice</span>
                            <span className="text-zinc-300 font-bold font-mono text-[10px]">{mcPercent}%</span>
                          </div>
                          <input type="range" min="0" max="100" step="5" value={mcPercent} onChange={(e) => setMcPercent(parseInt(e.target.value))} className="w-full h-1 bg-zinc-800 appearance-none cursor-pointer accent-purple-500" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-zinc-500 font-semibold text-[10px] uppercase">Identification</span>
                            <span className="text-zinc-300 font-bold font-mono text-[10px]">{idPercent}%</span>
                          </div>
                          <input type="range" min="0" max="100" step="5" value={idPercent} onChange={(e) => setIdPercent(parseInt(e.target.value))} className="w-full h-1 bg-zinc-800 appearance-none cursor-pointer accent-purple-500" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-zinc-500 font-semibold text-[10px] uppercase">True or False</span>
                            <span className="text-zinc-300 font-bold font-mono text-[10px]">{tofPercent}%</span>
                          </div>
                          <input type="range" min="0" max="100" step="5" value={tofPercent} onChange={(e) => setTofPercent(parseInt(e.target.value))} className="w-full h-1 bg-zinc-800 appearance-none cursor-pointer accent-purple-500" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-zinc-500 font-semibold text-[10px] uppercase">Modified True/False</span>
                            <span className="text-zinc-300 font-bold font-mono text-[10px]">{mtofPercent}%</span>
                          </div>
                          <input type="range" min="0" max="100" step="5" value={mtofPercent} onChange={(e) => setMtofPercent(parseInt(e.target.value))} className="w-full h-1 bg-zinc-800 appearance-none cursor-pointer accent-purple-500" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-zinc-500 font-semibold text-[10px] uppercase">Enumeration</span>
                            <span className="text-zinc-300 font-bold font-mono text-[10px]">{enumPercent}%</span>
                          </div>
                          <input type="range" min="0" max="100" step="5" value={enumPercent} onChange={(e) => setEnumPercent(parseInt(e.target.value))} className="w-full h-1 bg-zinc-800 appearance-none cursor-pointer accent-purple-500" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                    <button
                      onClick={() => setIsExamModalOpen(false)}
                      className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-500 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleGenerateExam}
                      disabled={selectedMaterialsForExam.length === 0 || !isPercentageValid}
                      className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50 cursor-pointer"
                    >
                      Generate Exam
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}></div>
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
