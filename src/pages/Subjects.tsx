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
  Search,
  MoreVertical,
  ChevronRight,
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

interface Flashcard {
  id: number
  front: string
  back: string
}

interface FlashcardSet {
  id: string
  user_id: string
  title: string
  cards: Flashcard[]
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
  const activeTab = (searchParams.get('tab') as 'files' | 'guides' | 'exams' | 'flashcards') || 'files'

  // Data States
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([])
  const [loading, setLoading] = useState(true)

  // Folder & Tag Filter/Modal States
  const [activeFolderId, setActiveFolderId] = useState<string>('all')
  const [activeTagFilter, setActiveTagFilter] = useState<string>('all')
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [savingFolder, setSavingFolder] = useState(false)
  const [editingTagsMaterialId, setEditingTagsMaterialId] = useState<string | null>(null)
  const [editingTagsValue, setEditingTagsValue] = useState('')

  // New Search, Folder Management, and Organize States
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('')
  const [recentFolderIds, setRecentFolderIds] = useState<string[]>([])
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingFolderName, setEditingFolderName] = useState('')
  const [savingFolderRename, setSavingFolderRename] = useState(false)
  const [organizingItem, setOrganizingItem] = useState<{
    id: string
    type: 'file' | 'note' | 'exam' | 'flashcard'
    name: string
    subject_id: string | null
    folder_id: string | null
  } | null>(null)
  const [organizeSubjectId, setOrganizeSubjectId] = useState<string | null>(null)
  const [organizeFolderId, setOrganizeFolderId] = useState<string | null>(null)

  useEffect(() => {
    if (organizingItem) {
      setOrganizeSubjectId(organizingItem.subject_id)
      setOrganizeFolderId(organizingItem.folder_id)
    } else {
      setOrganizeSubjectId(null)
      setOrganizeFolderId(null)
    }
  }, [organizingItem])

  const [activeActionMenu, setActiveActionMenu] = useState<{ id: string; type: 'file' | 'note' | 'exam' | 'flashcard' } | null>(null)

  // Listen for clicks outside to close action menu
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveActionMenu(null)
    }
    window.addEventListener('click', handleOutsideClick)
    return () => window.removeEventListener('click', handleOutsideClick)
  }, [])

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Notes Generation Modal States
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false)
  const [selectedMaterialsForNotes, setSelectedMaterialsForNotes] = useState<string[]>([])
  const [generatingNotes, setGeneratingNotes] = useState(false)
  const [creatingBlankNote, setCreatingBlankNote] = useState(false)

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

  // Flashcard States
  const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false)
  const [selectedMaterialsForFlashcards, setSelectedMaterialsForFlashcards] = useState<string[]>([])
  const [numFlashcards, setNumFlashcards] = useState(10)
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false)
  const [deletingFlashcardId, setDeletingFlashcardId] = useState<string | null>(null)

  // Flashcard Study Player States
  const [activeStudySet, setActiveStudySet] = useState<FlashcardSet | null>(null)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [knownCardIds, setKnownCardIds] = useState<number[]>([])
  const [needsPracticeCardIds, setNeedsPracticeCardIds] = useState<number[]>([])
  const [studyFinished, setStudyFinished] = useState(false)

  // Messages States
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Bulk selection states
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([])

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

      try {
        const { data: fData, error: fError } = await supabase
          .from('tbl_flashcards')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        if (fError) {
          console.warn("[Subjects] tbl_flashcards query error:", fError.message)
          setFlashcardSets([])
        } else {
          setFlashcardSets(fData || [])
        }
      } catch (fErr) {
        console.warn("[Subjects] Failed to fetch flashcards:", fErr)
        setFlashcardSets([])
      }
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

  const selectTab = (tab: 'files' | 'guides' | 'exams' | 'flashcards') => {
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
      if (data) {
        setRecentFolderIds((prev) => [...prev, data.id])
      }
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

  const handleRenameFolder = async (folderId: string, newName: string) => {
    if (!newName.trim()) return
    setSavingFolderRename(true)
    try {
      const { error: dbError } = await supabase
        .from('tbl_folders')
        .update({ name: newName.trim() })
        .eq('id', folderId)

      if (dbError) throw dbError
      setFolders((prev) =>
        prev.map((f) => (f.id === folderId ? { ...f, name: newName.trim() } : f)).sort((a, b) => a.name.localeCompare(b.name))
      )
      setSuccess(`Folder renamed to "${newName.trim()}".`)
      setEditingFolderId(null)
      setEditingFolderName('')
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to rename folder.')
    } finally {
      setSavingFolderRename(false)
    }
  }

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    openConfirmModal(
      'Delete Folder',
      `Are you sure you want to delete the folder "${folderName}"? Files inside will be set to 'No Folder', but will not be deleted.`,
      async () => {
        try {
          const { error: updateError } = await supabase
            .from('tbl_materials')
            .update({ folder_id: null })
            .eq('folder_id', folderId)

          if (updateError) throw updateError

          const { error: deleteError } = await supabase
            .from('tbl_folders')
            .delete()
            .eq('id', folderId)

          if (deleteError) throw deleteError

          setFolders((prev) => prev.filter((f) => f.id !== folderId))
          setMaterials((prev) =>
            prev.map((m) => (m.folder_id === folderId ? { ...m, folder_id: null } : m))
          )
          
          if (activeFolderId === folderId) {
            setActiveFolderId('all')
          }
          setSuccess(`Folder "${folderName}" deleted.`)
        } catch (err: any) {
          console.error(err)
          setError(err.message || 'Failed to delete folder.')
        }
      }
    )
  }

  const handleOrganizeItem = async (
    itemId: string,
    itemType: 'file' | 'note' | 'exam' | 'flashcard',
    subjectId: string | null,
    folderId: string | null
  ) => {
    try {
      if (itemType === 'file') {
        const { error } = await supabase
          .from('tbl_materials')
          .update({ subject_id: subjectId, folder_id: folderId })
          .eq('id', itemId)
        if (error) throw error
        setMaterials((prev) =>
          prev.map((m) => (m.id === itemId ? { ...m, subject_id: subjectId, folder_id: folderId } : m))
        )
      } else if (itemType === 'note') {
        const { error } = await supabase
          .from('tbl_notes')
          .update({ subject_id: subjectId })
          .eq('id', itemId)
        if (error) throw error
        setNotes((prev) =>
          prev.map((n) => (n.id === itemId ? { ...n, subject_id: subjectId } : n))
        )
      } else if (itemType === 'exam') {
        const { error } = await supabase
          .from('tbl_exams')
          .update({ subject_id: subjectId })
          .eq('id', itemId)
        if (error) throw error
        setExams((prev) =>
          prev.map((e) => (e.id === itemId ? { ...e, subject_id: subjectId } : e))
        )
      } else if (itemType === 'flashcard') {
        const { error } = await supabase
          .from('tbl_flashcards')
          .update({ subject_id: subjectId })
          .eq('id', itemId)
        if (error) throw error
        setFlashcardSets((prev) =>
          prev.map((f) => (f.id === itemId ? { ...f, subject_id: subjectId } : f))
        )
      }
      setSuccess('Item successfully reorganized.')
      setOrganizingItem(null)
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to organize item.')
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
        setError(null)
        try {
          await supabase.storage.from('materials').remove([material.storage_path])
          const { error: dbError } = await supabase.from('tbl_materials').delete().eq('id', material.id)

          if (dbError) throw dbError

          setMaterials((prev) => prev.filter((m) => m.id !== material.id))
          setSuccess(`"${material.file_name}" deleted.`)
        } catch (err: any) {
          setError(err.message || 'Failed to delete material')
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
        setError(null)
        try {
          const { error: deleteError } = await supabase.from('tbl_notes').delete().eq('id', noteId)
          if (deleteError) throw deleteError
          setNotes((prev) => prev.filter((n) => n.id !== noteId))
          setSuccess(`"${title}" deleted successfully.`)
        } catch (err: any) {
          setError(err.message || 'Failed to delete note')
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
        setError(null)
        try {
          await supabase.from('tbl_exam_sessions').delete().eq('exam_id', examId)
          const { error: deleteError } = await supabase.from('tbl_exams').delete().eq('id', examId)

          if (deleteError) throw deleteError
          setExams((prev) => prev.filter((ex) => ex.id !== examId))
          setSuccess(`"${title}" deleted successfully.`)
        } catch (err: any) {
          setError(err.message || 'Failed to delete exam')
        }
      }
    )
  }

  // Flashcards Generation & Study Handlers
  const handleGenerateFlashcards = async () => {
    if (selectedMaterialsForFlashcards.length === 0) {
      setError('Please select at least one material to generate flashcards.')
      return
    }

    setError(null)
    setGeneratingFlashcards(true)

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/generate-flashcards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          material_ids: selectedMaterialsForFlashcards,
          num_cards: numFlashcards,
          subject_id: activeSubjectId === 'unassigned' ? null : activeSubjectId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate flashcards')
      }

      setIsFlashcardModalOpen(false)
      setSelectedMaterialsForFlashcards([])
      setFlashcardSets((prev) => [result, ...prev])
      setSuccess(`Flashcard deck "${result.title}" generated successfully!`)
      startStudySession(result)
    } catch (err: any) {
      setError(err.message || 'Flashcard generation failed')
    } finally {
      setGeneratingFlashcards(false)
    }
  }

  const handleDeleteFlashcardSet = async (deckId: string, title: string) => {
    openConfirmModal(
      'Delete Flashcard Deck',
      `Are you sure you want to delete "${title}"? This action is permanent.`,
      async () => {
        setError(null)
        setDeletingFlashcardId(deckId)
        try {
          const { error: deleteError } = await supabase.from('tbl_flashcards').delete().eq('id', deckId)

          if (deleteError) throw deleteError
          setFlashcardSets((prev) => prev.filter((d) => d.id !== deckId))
          setSuccess(`"${title}" deleted successfully.`)
        } catch (err: any) {
          setError(err.message || 'Failed to delete flashcards')
        } finally {
          setDeletingFlashcardId(null)
        }
      }
    )
  }

  const startStudySession = (set: FlashcardSet) => {
    setActiveStudySet(set)
    setCurrentCardIndex(0)
    setIsFlipped(false)
    setKnownCardIds([])
    setNeedsPracticeCardIds([])
    setStudyFinished(false)
  }

  const handleCardFlip = () => {
    setIsFlipped((prev) => !prev)
  }

  const markCardKnown = (cardId: number) => {
    setKnownCardIds((prev) => [...prev, cardId])
    advanceCard()
  }

  const markCardPractice = (cardId: number) => {
    setNeedsPracticeCardIds((prev) => [...prev, cardId])
    advanceCard()
  }

  const advanceCard = () => {
    if (!activeStudySet) return
    setIsFlipped(false)
    
    setTimeout(() => {
      if (currentCardIndex < activeStudySet.cards.length - 1) {
        setCurrentCardIndex((prev) => prev + 1)
      } else {
        setStudyFinished(true)
      }
    }, 200)
  }

  const restartStudySession = () => {
    setCurrentCardIndex(0)
    setIsFlipped(false)
    setKnownCardIds([])
    setNeedsPracticeCardIds([])
    setStudyFinished(false)
  }

  useEffect(() => {
    if (!activeStudySet || studyFinished) return

    const handleStudyKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'SELECT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return
      }

      const activeCard = activeStudySet.cards[currentCardIndex]
      if (!activeCard) return

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        handleCardFlip()
      } else if (e.key === 'ArrowRight' || e.key === 'k' || e.key === 'K') {
        e.preventDefault()
        markCardKnown(activeCard.id)
      } else if (e.key === 'ArrowLeft' || e.key === 'p' || e.key === 'P') {
        e.preventDefault()
        markCardPractice(activeCard.id)
      }
    }

    window.addEventListener('keydown', handleStudyKeyDown)
    return () => window.removeEventListener('keydown', handleStudyKeyDown)
  }, [activeStudySet, currentCardIndex, studyFinished])

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

  const currentSubjectFlashcards = flashcardSets.filter((f) =>
    activeSubjectId === 'unassigned' ? !f.subject_id : f.subject_id === activeSubjectId
  )

  // Subject Stats counts for the sidebar listing
  const getCountsForSubject = (id: string | null) => {
    const fileCount = materials.filter((m) => m.subject_id === id).length
    const guideCount = notes.filter((n) => n.subject_id === id).length
    const examCount = exams.filter((e) => e.subject_id === id).length
    const flashcardCount = flashcardSets.filter((f) => f.subject_id === id).length
    return fileCount + guideCount + examCount + flashcardCount
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

              {/* Subject Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" strokeWidth={1.5} />
                <input
                  type="text"
                  placeholder="Search subjects..."
                  value={subjectSearchQuery}
                  onChange={(e) => setSubjectSearchQuery(e.target.value)}
                  className="w-full bg-[#050507] border border-white/5 focus:border-purple-500/50 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none transition-colors"
                />
              </div>
              
              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                {/* Unassigned Items Row */}
                {('general / unassigned'.includes(subjectSearchQuery.toLowerCase())) && (
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
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">General Library</p>
                        <p className="text-[9px] text-zinc-500 font-semibold">Unassigned resources</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono font-bold bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-zinc-400 shrink-0">
                      {getCountsForSubject(null)}
                    </span>
                  </div>
                )}

                {loading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-4 w-4 text-purple-400 animate-spin" strokeWidth={1.5} />
                  </div>
                ) : subjects.filter(s => s.name.toLowerCase().includes(subjectSearchQuery.toLowerCase())).length === 0 && subjectSearchQuery ? (
                  <p className="text-[10px] text-zinc-500 text-center py-4 font-semibold">No matching subjects.</p>
                ) : subjects.length === 0 ? (
                  <p className="text-[10px] text-zinc-500 text-center py-4 font-semibold">No custom subjects.</p>
                ) : (
                  subjects
                    .filter(s => s.name.toLowerCase().includes(subjectSearchQuery.toLowerCase()))
                    .map((sub) => {
                      const styles = getSubjectColorStyles(sub.color)
                      const isSelected = activeSubjectId === sub.id
                      const totalCount = getCountsForSubject(sub.id)
                      const subMaterialsCount = materials.filter(m => m.subject_id === sub.id).length
                      const subNotesCount = notes.filter(n => n.subject_id === sub.id).length
                      const subExamsCount = exams.filter(e => e.subject_id === sub.id).length

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
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate">{sub.name}</p>
                              <p className="text-[9px] text-zinc-500 font-semibold group-hover:text-zinc-400 transition-colors">
                                {subMaterialsCount} files • {subNotesCount} guides • {subExamsCount} exams
                              </p>
                            </div>
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
                                className="p-1 text-zinc-500 hover:text-red-400 rounded hover:bg-white/10 cursor-pointer disabled:opacity-50"
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

                {/* Modern Linear Sub-Tabs Selector */}
                <div className="flex border-b border-white/5 w-full md:w-auto -mb-4 md:-mb-0 md:border-b-0 shrink-0 select-none overflow-x-auto">
                  <button
                    onClick={() => selectTab('files')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap
                      ${activeTab === 'files'
                        ? 'border-purple-500 text-white'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                      }
                    `}
                  >
                    <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>Files</span>
                    <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded-full bg-white/5 border border-white/10 text-zinc-400">
                      {currentSubjectMaterials.length}
                    </span>
                  </button>
                  <button
                    onClick={() => selectTab('guides')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap
                      ${activeTab === 'guides'
                        ? 'border-purple-500 text-white'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                      }
                    `}
                  >
                    <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>Guides</span>
                    <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded-full bg-white/5 border border-white/10 text-zinc-400">
                      {currentSubjectNotes.length}
                    </span>
                  </button>
                  <button
                    onClick={() => selectTab('exams')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap
                      ${activeTab === 'exams'
                        ? 'border-purple-500 text-white'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                      }
                    `}
                  >
                    <Award className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>Exams</span>
                    <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded-full bg-white/5 border border-white/10 text-zinc-400">
                      {currentSubjectExams.length}
                    </span>
                  </button>
                  <button
                    onClick={() => selectTab('flashcards')}
                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap
                      ${activeTab === 'flashcards'
                        ? 'border-purple-500 text-white'
                        : 'border-transparent text-zinc-400 hover:text-zinc-200'
                      }
                    `}
                  >
                    <BookOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>Flashcards</span>
                    <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold rounded-full bg-white/5 border border-white/10 text-zinc-400">
                      {currentSubjectFlashcards.length}
                    </span>
                  </button>
                </div>
              </div>

              {/* TAB CONTENT: FILES */}
              {activeTab === 'files' && (() => {
                const subjectFolders = folders.filter((f) => {
                  const hasMaterials = materials.some(
                    (m) => m.folder_id === f.id && (activeSubjectId === 'unassigned' ? !m.subject_id : m.subject_id === activeSubjectId)
                  )
                  const isRecent = recentFolderIds.includes(f.id)
                  return hasMaterials || isRecent
                })

                return (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className="space-y-6 relative min-h-[300px]"
                  >
                    {/* Premium Drag & Drop Blur Overlay */}
                    {dragOver && (
                      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md border-2 border-dashed border-purple-500/40 rounded-2xl animate-fade-in pointer-events-none">
                        <CloudUpload className="h-12 w-12 text-purple-400 mb-3" strokeWidth={1.5} />
                        <p className="text-sm font-bold text-white tracking-tight">Drop your files here</p>
                        <p className="text-xs text-zinc-400 mt-1 font-medium">Release to import into this subject</p>
                      </div>
                    )}

                    {/* Unified Space-Optimized Control Toolbar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.01] border border-white/5">
                      {/* Breadcrumbs or Folder Navigation Title */}
                      <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
                        <button
                          onClick={() => setActiveFolderId('all')}
                          className={`transition-colors hover:text-white ${activeFolderId === 'all' ? 'text-white' : ''}`}
                        >
                          All Files
                        </button>
                        {activeFolderId !== 'all' && (
                          <>
                            <ChevronRight className="h-3.5 w-3.5 text-zinc-600 animate-fade-in" />
                            <span className="text-white font-bold animate-fade-in">
                              {folders.find(f => f.id === activeFolderId)?.name || 'Folder'}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Right Action Bar */}
                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept={ACCEPTED_MIME_TYPES.join(',')}
                          onChange={handleFileSelect}
                          className="hidden"
                        />

                        {/* Sleek Upload Button */}
                        <button
                          onClick={() => !uploading && fileInputRef.current?.click()}
                          disabled={uploading}
                          className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-4 py-2 text-xs font-bold text-white transition-all duration-300 shadow-[0_2px_10px_rgba(168,85,247,0.15)] cursor-pointer hover:-translate-y-[1px] active:scale-[0.98]"
                        >
                          {uploading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                          ) : (
                            <CloudUpload className="h-3.5 w-3.5" strokeWidth={1.5} />
                          )}
                          <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
                        </button>

                        {/* New Folder or Folder Management Actions */}
                        {activeFolderId === 'all' ? (
                          <button
                            onClick={() => setIsFolderModalOpen(true)}
                            className="flex items-center gap-1.5 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 px-4 py-2 text-xs font-bold text-white transition-all duration-300 cursor-pointer hover:-translate-y-[1px] active:scale-[0.98]"
                          >
                            <FolderPlus className="h-3.5 w-3.5 text-purple-400" strokeWidth={1.5} />
                            <span>New Folder</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                const folder = folders.find(f => f.id === activeFolderId)
                                if (folder) {
                                  setEditingFolderId(folder.id)
                                  setEditingFolderName(folder.name)
                                }
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/5 bg-white/5 text-zinc-400 hover:text-white text-[10px] font-bold transition-all cursor-pointer hover:bg-white/10"
                            >
                              <Edit2 className="h-3 w-3" strokeWidth={1.5} />
                              Rename
                            </button>
                            <button
                              onClick={() => {
                                const folder = folders.find(f => f.id === activeFolderId)
                                if (folder) {
                                  handleDeleteFolder(folder.id, folder.name)
                                }
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 hover:text-red-300 text-[10px] font-bold transition-all cursor-pointer hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Inline Progress Bar Card (Displays during Upload) */}
                    {uploading && (
                      <div className="flex items-center justify-between p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/5 animate-pulse text-xs">
                        <div className="flex items-center gap-2.5">
                          <Loader2 className="h-4 w-4 text-purple-400 animate-spin" strokeWidth={1.5} />
                          <span className="font-bold text-white">Uploading "{uploadFileName}"...</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-mono">Extracting content layers...</span>
                      </div>
                    )}

                    {/* Google Drive-style Explorer Folders Section */}
                    {activeFolderId === 'all' && subjectFolders.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Folders</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {subjectFolders.map((fold) => {
                            const count = materials.filter(
                              (m) => m.folder_id === fold.id && 
                                     (activeSubjectId === 'unassigned' ? !m.subject_id : m.subject_id === activeSubjectId)
                            ).length

                            return (
                              <div
                                key={fold.id}
                                onClick={() => setActiveFolderId(fold.id)}
                                className="double-bezel-outer cursor-pointer group hover:border-purple-500/25 transition-all duration-300 relative bg-white/[0.005]"
                              >
                                <div className="double-bezel-inner p-4 flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <Folder className="h-4.5 w-4.5 text-purple-400 shrink-0" strokeWidth={1.5} />
                                    <span className="text-xs font-bold text-zinc-300 truncate" title={fold.name}>
                                      {fold.name}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] font-mono font-bold text-zinc-500 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                                      {count}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setEditingFolderId(fold.id)
                                        setEditingFolderName(fold.name)
                                      }}
                                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-white rounded hover:bg-white/10 transition-all cursor-pointer"
                                      title="Rename"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteFolder(fold.id, fold.name)
                                      }}
                                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-400 rounded hover:bg-white/10 transition-all cursor-pointer"
                                      title="Delete"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Tag Filter sub-toolbar */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.005] border border-white/5 text-xs text-zinc-400">
                      <div className="flex items-center gap-3">
                        <span className="font-bold flex items-center gap-1.5"><Tag className="h-3.5 w-3.5 text-purple-400" strokeWidth={1.5} /> Filter by Tag:</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => setActiveTagFilter('all')}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer border ${
                              activeTagFilter === 'all'
                                ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                                : 'bg-white/5 text-zinc-400 hover:text-white border-transparent'
                            }`}
                          >
                            All
                          </button>
                          {Array.from(
                            new Set(
                              materials
                                .filter((m) => activeSubjectId === 'unassigned' ? !m.subject_id : m.subject_id === activeSubjectId)
                                .flatMap((m) => m.tags || [])
                            )
                          ).map((tag) => (
                            <button
                              key={tag}
                              onClick={() => setActiveTagFilter(tag)}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer border ${
                                activeTagFilter === tag
                                  ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                                  : 'bg-white/5 text-zinc-400 hover:text-white border-transparent'
                              }`}
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Bulk Selection Actions Menu */}
                      {selectedMaterialIds.length > 0 && (
                        <div className="flex items-center gap-3 animate-fade-in self-end sm:self-auto">
                          <span className="font-bold text-purple-400">{selectedMaterialIds.length} files selected</span>
                          <div className="flex items-center gap-2">
                            <select
                              onChange={(e) => handleBatchUpdateMaterialSubject(e.target.value)}
                              value=""
                              className="bg-zinc-950 border border-white/10 rounded-lg text-[10px] px-2 py-1 text-gray-300 focus:outline-none cursor-pointer"
                            >
                              <option value="" disabled>Move subject...</option>
                              <option value="unassigned">General Library</option>
                              {subjects.map((sub) => (
                                <option key={sub.id} value={sub.id}>{sub.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={handleBatchDeleteMaterials}
                              className="flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold px-3 py-1 rounded-lg transition-all cursor-pointer text-[10px]"
                            >
                              <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Files List Layout */}
                    <div className="space-y-2">
                      {currentSubjectMaterials.length === 0 ? (
                        <div className="text-center py-12 bg-white/[0.005] border border-white/5 rounded-xl space-y-2">
                          <Folder className="h-8 w-8 text-zinc-700 mx-auto" strokeWidth={1.2} />
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-zinc-400">No documents catalogued</p>
                            <p className="text-[10px] text-zinc-600">Import a lecture transcript or outline sheet to begin.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-white/5">
                          <table className="min-w-full divide-y divide-white/5 text-left text-xs">
                            <thead className="bg-[#050507]">
                              <tr className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                                <th className="p-4 w-10">
                                  <input
                                    type="checkbox"
                                    checked={selectedMaterialIds.length === currentSubjectMaterials.length && currentSubjectMaterials.length > 0}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedMaterialIds(currentSubjectMaterials.map(m => m.id))
                                      } else {
                                        setSelectedMaterialIds([])
                                      }
                                    }}
                                    className="rounded border-zinc-700 bg-black text-purple-600 focus:ring-0 cursor-pointer h-3.5 w-3.5"
                                  />
                                </th>
                                <th className="p-4">Name</th>
                                {activeFolderId === 'all' && <th className="p-4">Folder</th>}
                                <th className="p-4">Tags</th>
                                <th className="p-4">Size</th>
                                <th className="p-4">Added</th>
                                <th className="p-4 w-12 text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 bg-white/[0.005]">
                              {currentSubjectMaterials.map((material) => {
                                const fileFolder = folders.find(f => f.id === material.folder_id)
                                
                                return (
                                  <tr
                                    key={material.id}
                                    className="hover:bg-white/[0.015] group transition-colors"
                                  >
                                    <td className="p-4">
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
                                        className="rounded border-zinc-700 bg-black text-purple-600 focus:ring-0 cursor-pointer h-3.5 w-3.5"
                                      />
                                    </td>
                                    <td className="p-4 min-w-[200px]">
                                      <button
                                        onClick={() => handleOpenFile(material)}
                                        className="flex items-center gap-3 text-left font-bold text-white hover:text-purple-400 transition-colors focus:outline-none w-full"
                                      >
                                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border shrink-0 ${getFileTypeColor(material.file_type)}`}>
                                          {getFileIcon(material.file_type)}
                                        </div>
                                        <span className="truncate max-w-[220px]" title={material.file_name}>
                                          {material.file_name}
                                        </span>
                                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-purple-400 shrink-0" strokeWidth={1.5} />
                                      </button>
                                    </td>
                                    {activeFolderId === 'all' && (
                                      <td className="p-4 text-zinc-400 font-semibold">
                                        {fileFolder ? (
                                          <span className="inline-flex items-center gap-1 text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded-md">
                                            <Folder className="h-3 w-3" strokeWidth={1.5} />
                                            {fileFolder.name}
                                          </span>
                                        ) : (
                                          <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-wider">Root</span>
                                        )}
                                      </td>
                                    )}
                                    <td className="p-4">
                                      <div className="flex items-center gap-1.5 flex-wrap">
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
                                    </td>
                                    <td className="p-4 text-zinc-500 font-mono font-semibold">{formatFileSize(material.extracted_text)}</td>
                                    <td className="p-4 text-zinc-500 font-semibold">{formatDate(material.created_at)}</td>
                                    <td className="p-4 text-center">
                                      <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setActiveActionMenu(
                                              activeActionMenu?.id === material.id && activeActionMenu?.type === 'file'
                                                ? null
                                                : { id: material.id, type: 'file' }
                                            )
                                          }}
                                          className="p-1 text-zinc-500 hover:text-white rounded hover:bg-white/10 transition-all cursor-pointer"
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                        </button>

                                        {activeActionMenu?.id === material.id && activeActionMenu?.type === 'file' && (
                                          <div className="absolute right-0 mt-1 w-44 rounded-xl border border-white/10 bg-zinc-950/95 backdrop-blur-md shadow-2xl p-1.5 z-40 animate-fade-in text-left">
                                            <button
                                              onClick={() => handleOpenFile(material)}
                                              className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-2"
                                            >
                                              <ExternalLink className="h-3.5 w-3.5" />
                                              Open File
                                            </button>
                                            <button
                                              onClick={() => {
                                                setOrganizingItem({
                                                  id: material.id,
                                                  type: 'file',
                                                  name: material.file_name,
                                                  subject_id: material.subject_id,
                                                  folder_id: material.folder_id
                                                })
                                                setActiveActionMenu(null)
                                              }}
                                              className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-2"
                                            >
                                              <Sliders className="h-3.5 w-3.5" />
                                              Move / Organize
                                            </button>
                                            <button
                                              onClick={() => {
                                                setEditingTagsMaterialId(material.id)
                                                setEditingTagsValue(material.tags ? material.tags.join(', ') : '')
                                                setActiveActionMenu(null)
                                              }}
                                              className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-2"
                                            >
                                              <Tag className="h-3.5 w-3.5" />
                                              Edit Tags
                                            </button>
                                            <div className="h-px bg-white/5 my-1" />
                                            <button
                                              onClick={() => handleDeleteFile(material)}
                                              className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer flex items-center gap-2"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                              Delete File
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

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

                  {/* Guides Cards List */}
                  <div className="space-y-2">
                    {currentSubjectNotes.length === 0 ? (
                      <div className="text-center py-12 bg-white/[0.005] border border-white/5 rounded-xl space-y-2">
                        <FileText className="h-8 w-8 text-zinc-700 mx-auto" strokeWidth={1.2} />
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-zinc-400">No study guides created</p>
                          <p className="text-[10px] text-zinc-600">Select files to generate an interactive study guide.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentSubjectNotes.map((note) => {
                          const plainText = note.content?.replace(/<[^>]*>/g, '').replace(/[#*`_]/g, '') || 'No content.'
                          
                          return (
                            <div
                              key={note.id}
                              onClick={() => navigate(`/notes/${note.id}`)}
                              className="double-bezel-outer cursor-pointer group hover:border-purple-500/20 active:scale-[0.99] transition-all duration-300 relative flex flex-col justify-between h-48 bg-white/[0.005]"
                            >
                              <div className="double-bezel-inner p-5 flex flex-col justify-between h-full space-y-4">
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                                        <FileText className="h-4.5 w-4.5" strokeWidth={1.5} />
                                      </div>
                                      <h4 className="font-bold text-white text-xs truncate group-hover:text-purple-300 transition-colors" title={note.title}>
                                        {note.title || 'Untitled Notes'}
                                      </h4>
                                    </div>

                                    {/* Action Menu trigger */}
                                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setActiveActionMenu(
                                            activeActionMenu?.id === note.id && activeActionMenu?.type === 'note'
                                              ? null
                                              : { id: note.id, type: 'note' }
                                          )
                                        }}
                                        className="p-1 text-zinc-500 hover:text-white rounded hover:bg-white/10 transition-all cursor-pointer"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </button>

                                      {activeActionMenu?.id === note.id && activeActionMenu?.type === 'note' && (
                                        <div className="absolute right-0 mt-1 w-44 rounded-xl border border-white/10 bg-zinc-950/95 backdrop-blur-md shadow-2xl p-1.5 z-40 animate-fade-in text-left">
                                          <button
                                            onClick={() => navigate(`/notes/${note.id}`)}
                                            className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-2"
                                          >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            View Note
                                          </button>
                                          <button
                                            onClick={() => {
                                              setOrganizingItem({
                                                id: note.id,
                                                type: 'note',
                                                name: note.title || 'Untitled Note',
                                                subject_id: note.subject_id,
                                                folder_id: null
                                              })
                                              setActiveActionMenu(null)
                                            }}
                                            className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-2"
                                          >
                                            <Sliders className="h-3.5 w-3.5" />
                                            Move / Organize
                                          </button>
                                          <div className="h-px bg-white/5 my-1" />
                                          <button
                                            onClick={() => handleDeleteNote(note.id, note.title || 'Untitled Note')}
                                            className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer flex items-center gap-2"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Delete Note
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <p className="text-[11px] text-zinc-500 leading-relaxed font-medium line-clamp-3">
                                    {plainText}
                                  </p>
                                </div>

                                <div className="flex items-center justify-between border-t border-white/5 pt-3 text-[10px] text-zinc-500 font-semibold">
                                  <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <BookOpen className="h-3 w-3" strokeWidth={1.5} />
                                    {note.material_ids?.length || 0} Sources
                                  </span>
                                  <span>{formatDate(note.updated_at)}</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
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

                  {/* Exams Card Grid */}
                  <div className="space-y-2">
                    {currentSubjectExams.length === 0 ? (
                      <div className="text-center py-12 bg-white/[0.005] border border-white/5 rounded-xl space-y-2">
                        <Award className="h-8 w-8 text-zinc-700 mx-auto" strokeWidth={1.2} />
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-zinc-400">No exams generated</p>
                          <p className="text-[10px] text-zinc-600">Select files to generate a custom practice exam.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentSubjectExams.map((exam) => (
                          <div
                            key={exam.id}
                            onClick={() => navigate(`/exams/${exam.id}`)}
                            className="double-bezel-outer cursor-pointer group hover:border-purple-500/20 active:scale-[0.99] transition-all duration-300 relative flex flex-col justify-between h-44 bg-white/[0.005]"
                          >
                            <div className="double-bezel-inner p-5 flex flex-col justify-between h-full space-y-4">
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                                      <Award className="h-4.5 w-4.5" strokeWidth={1.5} />
                                    </div>
                                    <h4 className="font-bold text-white text-xs truncate group-hover:text-purple-300 transition-colors" title={exam.title}>
                                      {exam.title || 'Untitled Exam'}
                                    </h4>
                                  </div>

                                  {/* Action Menu trigger */}
                                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setActiveActionMenu(
                                          activeActionMenu?.id === exam.id && activeActionMenu?.type === 'exam'
                                            ? null
                                            : { id: exam.id, type: 'exam' }
                                        )
                                      }}
                                      className="p-1 text-zinc-500 hover:text-white rounded hover:bg-white/10 transition-all cursor-pointer"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </button>

                                    {activeActionMenu?.id === exam.id && activeActionMenu?.type === 'exam' && (
                                      <div className="absolute right-0 mt-1 w-44 rounded-xl border border-white/10 bg-zinc-950/95 backdrop-blur-md shadow-2xl p-1.5 z-40 animate-fade-in text-left">
                                        <button
                                          onClick={() => navigate(`/exams/${exam.id}`)}
                                          className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-2"
                                        >
                                          <ExternalLink className="h-3.5 w-3.5" />
                                          Configure / Take
                                        </button>
                                        <button
                                          onClick={() => {
                                            setOrganizingItem({
                                              id: exam.id,
                                              type: 'exam',
                                              name: exam.title || 'Untitled Exam',
                                              subject_id: exam.subject_id,
                                              folder_id: null
                                            })
                                            setActiveActionMenu(null)
                                          }}
                                          className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-2"
                                        >
                                          <Sliders className="h-3.5 w-3.5" />
                                          Move / Organize
                                        </button>
                                        <div className="h-px bg-white/5 my-1" />
                                        <button
                                          onClick={() => handleDeleteExam(exam.id, exam.title || 'Untitled Exam')}
                                          className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer flex items-center gap-2"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                          Delete Exam
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <p className="text-[11px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                                  <Calendar className="h-3.5 w-3.5 text-zinc-600" strokeWidth={1.5} />
                                  <span>Generated {formatDate(exam.created_at)}</span>
                                </p>
                              </div>

                              <div className="flex items-center justify-between border-t border-white/5 pt-3 text-[10px] text-zinc-500 font-semibold font-sans">
                                <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                                  {exam.questions?.length || 0} Questions
                                </span>
                                <button
                                  onClick={() => navigate(`/exams/${exam.id}`)}
                                  className="text-[10px] font-extrabold text-purple-400 group-hover:text-purple-300 transition-colors flex items-center gap-1"
                                >
                                  <span>Take Session</span>
                                  <ChevronRight className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB CONTENT: FLASHCARDS */}
              {activeTab === 'flashcards' && (
                <div className="space-y-6">
                  {/* Header Action */}
                  <div className="flex items-center justify-between pb-1">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Study Decks</h3>
                    <button
                      onClick={() => {
                        setError(null)
                        setIsFlashcardModalOpen(true)
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-bold text-white transition-all duration-300 shadow-[0_2px_10px_rgba(168,85,247,0.15)] cursor-pointer hover:-translate-y-[1px] active:scale-[0.98]"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Configure Flashcards
                    </button>
                  </div>

                  {/* Flashcards Card Grid */}
                  <div className="space-y-2">
                    {currentSubjectFlashcards.length === 0 ? (
                      <div className="text-center py-12 bg-white/[0.005] border border-white/5 rounded-xl space-y-2">
                        <BookOpen className="h-8 w-8 text-zinc-700 mx-auto" strokeWidth={1.2} />
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-zinc-400">No flashcard decks generated</p>
                          <p className="text-[10px] text-zinc-600">Select files to generate a custom active recall study deck.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentSubjectFlashcards.map((deck) => (
                          <div
                            key={deck.id}
                            onClick={() => {
                              if (deletingFlashcardId !== deck.id) {
                                startStudySession(deck)
                              }
                            }}
                            className={`double-bezel-outer cursor-pointer group hover:border-purple-500/20 active:scale-[0.99] transition-all duration-300 relative flex flex-col justify-between h-44 bg-white/[0.005] ${
                              deletingFlashcardId === deck.id ? 'opacity-50 pointer-events-none' : ''
                            }`}
                          >
                            <div className="double-bezel-inner p-5 flex flex-col justify-between h-full space-y-4">
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                                      <BookOpen className="h-4.5 w-4.5" strokeWidth={1.5} />
                                    </div>
                                    <h4 className="font-bold text-white text-xs truncate group-hover:text-purple-300 transition-colors" title={deck.title}>
                                      {deck.title || 'Untitled Flashcards'}
                                    </h4>
                                  </div>

                                  {/* Action Menu trigger */}
                                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      disabled={deletingFlashcardId === deck.id}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setActiveActionMenu(
                                          activeActionMenu?.id === deck.id && activeActionMenu?.type === 'flashcard'
                                            ? null
                                            : { id: deck.id, type: 'flashcard' }
                                        )
                                      }}
                                      className="p-1 text-zinc-500 hover:text-white rounded hover:bg-white/10 transition-all cursor-pointer disabled:opacity-50"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </button>

                                    {activeActionMenu?.id === deck.id && activeActionMenu?.type === 'flashcard' && (
                                      <div className="absolute right-0 mt-1 w-44 rounded-xl border border-white/10 bg-zinc-950/95 backdrop-blur-md shadow-2xl p-1.5 z-40 animate-fade-in text-left">
                                        <button
                                          onClick={() => {
                                            startStudySession(deck)
                                            setActiveActionMenu(null)
                                          }}
                                          className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-2"
                                        >
                                          <ExternalLink className="h-3.5 w-3.5" />
                                          Start Studying
                                        </button>
                                        <button
                                          onClick={() => {
                                            setOrganizingItem({
                                              id: deck.id,
                                              type: 'flashcard',
                                              name: deck.title || 'Untitled Flashcards',
                                              subject_id: deck.subject_id,
                                              folder_id: null
                                            })
                                            setActiveActionMenu(null)
                                          }}
                                          className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-2"
                                        >
                                          <Sliders className="h-3.5 w-3.5" />
                                          Move / Organize
                                        </button>
                                        <div className="h-px bg-white/5 my-1" />
                                        <button
                                          onClick={() => {
                                            setActiveActionMenu(null)
                                            handleDeleteFlashcardSet(deck.id, deck.title || 'Untitled Flashcards')
                                          }}
                                          className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer flex items-center gap-2"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                          Delete Deck
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <p className="text-[11px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                                  <Calendar className="h-3.5 w-3.5 text-zinc-600" strokeWidth={1.5} />
                                  <span>Generated {formatDate(deck.created_at)}</span>
                                </p>
                              </div>

                              <div className="flex items-center justify-between border-t border-white/5 pt-3 text-[10px] text-zinc-500 font-semibold font-sans">
                                <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                                  {deck.cards?.length || 0} Cards
                                </span>
                                {deletingFlashcardId === deck.id ? (
                                  <span className="text-[10px] text-zinc-500 flex items-center gap-1.5 font-bold">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-500" strokeWidth={1.5} />
                                    <span>Deleting...</span>
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => startStudySession(deck)}
                                    className="text-[10px] font-extrabold text-purple-400 group-hover:text-purple-300 transition-colors flex items-center gap-1"
                                  >
                                    <span>Start Studying</span>
                                    <ChevronRight className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
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
                    className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-[0_4px_12px_rgba(139,92,246,0.15)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

      {/* GENERATE FLASHCARDS MODAL */}
      {isFlashcardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !generatingFlashcards && setIsFlashcardModalOpen(false)}></div>
          <div className="double-bezel-outer w-full max-w-lg relative z-10">
            <div className="double-bezel-inner p-6">
              {generatingFlashcards ? (
                <div className="flex flex-col items-center justify-center text-center py-12 space-y-6">
                  <div className="relative">
                    <div className="h-16 w-16 rounded-full border-4 border-t-purple-500 border-r-transparent border-b-purple-400 border-l-transparent animate-spin"></div>
                    <div className="absolute inset-2 rounded-full bg-purple-500/10 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.3)] animate-pulse">
                      <Sparkles className="h-5 w-5 text-purple-300" strokeWidth={1.5} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-display text-xl font-bold text-white tracking-tight">Generating Flashcards...</h3>
                    <p className="text-zinc-400 text-xs max-w-xs mx-auto leading-relaxed font-medium">
                      Gemini is extracting key concepts and definitions from your selected materials to create an active recall study deck.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <h3 className="font-display text-base font-bold text-white flex items-center gap-2 tracking-tight">
                      <Sliders className="h-4.5 w-4.5 text-purple-400" strokeWidth={1.5} />
                      Configure Flashcards
                    </h3>
                    <button onClick={() => setIsFlashcardModalOpen(false)} className="p-1 rounded hover:bg-white/5 text-zinc-500 hover:text-white cursor-pointer"><X className="h-4.5 w-4.5" /></button>
                  </div>

                  <div className="max-h-[380px] overflow-y-auto space-y-5 mb-2 pr-1">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Select materials from subject</label>
                      <div className="max-h-[150px] overflow-y-auto space-y-2 bg-[#050507] border border-white/5 rounded-xl p-2">
                        {currentSubjectMaterials.length === 0 ? (
                          <p className="text-xs text-zinc-600 text-center py-4">No materials uploaded under this subject.</p>
                        ) : (
                          currentSubjectMaterials.map((m) => {
                            const isSelected = selectedMaterialsForFlashcards.includes(m.id)
                            return (
                              <div
                                key={m.id}
                                onClick={() => {
                                  setSelectedMaterialsForFlashcards(prev => {
                                    if (prev.includes(m.id)) {
                                      return prev.filter(id => id !== m.id)
                                    } else {
                                      if (prev.length >= 5) {
                                        setError("You can select a maximum of 5 materials for flashcard generation.")
                                        setTimeout(() => setError(null), 3000)
                                        return prev
                                      }
                                      return [...prev, m.id]
                                    }
                                  })
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
                        <span>Number of Flashcards</span>
                        <span className="text-[10px] text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded font-mono">
                          {numFlashcards} Cards
                        </span>
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="30"
                        step="1"
                        value={numFlashcards}
                        onChange={(e) => setNumFlashcards(parseInt(e.target.value))}
                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                    <button
                      onClick={() => setIsFlashcardModalOpen(false)}
                      className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-500 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleGenerateFlashcards}
                      disabled={selectedMaterialsForFlashcards.length === 0}
                      className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50 cursor-pointer"
                    >
                      Generate Flashcards
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

      {/* RENAME FOLDER MODAL */}
      {editingFolderId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => { setEditingFolderId(null); setEditingFolderName(''); }}></div>
          <div className="double-bezel-outer max-w-sm w-full relative z-10">
            <div className="double-bezel-inner p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <h3 className="text-base font-bold text-white tracking-tight">Rename Folder</h3>
                <button onClick={() => { setEditingFolderId(null); setEditingFolderName(''); }} className="text-zinc-500 hover:text-white cursor-pointer text-sm font-semibold">✕</button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleRenameFolder(editingFolderId, editingFolderName)
                }}
                className="space-y-5"
              >
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Folder Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Week 1 Lectures, References"
                    value={editingFolderName}
                    onChange={(e) => setEditingFolderName(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-purple-500/50"
                    maxLength={50}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => { setEditingFolderId(null); setEditingFolderName(''); }}
                    className="px-4 py-2 rounded-xl border border-white/10 text-xs font-semibold text-zinc-400 hover:text-white transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingFolderRename || !editingFolderName.trim()}
                    className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-[0_4px_12px_rgba(139,92,246,0.15)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {savingFolderRename ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Renaming...</span>
                      </>
                    ) : (
                      <span>Rename Folder</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ORGANIZE ITEM MODAL */}
      {organizingItem !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setOrganizingItem(null)}></div>
          <div className="double-bezel-outer max-w-sm w-full relative z-10">
            <div className="double-bezel-inner p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Sliders className="h-4.5 w-4.5 text-purple-400" />
                  Organize Item
                </h3>
                <button onClick={() => setOrganizingItem(null)} className="text-zinc-500 hover:text-white cursor-pointer text-sm font-semibold">✕</button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1 bg-[#050507] border border-white/5 rounded-xl p-3">
                  <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Item Name</div>
                  <div className="text-xs font-bold text-white truncate">{organizingItem.name}</div>
                  <div className="text-[9px] text-zinc-500 font-mono capitalize">Type: {organizingItem.type}</div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Assign Subject</label>
                  <select
                    value={organizeSubjectId || 'unassigned'}
                    onChange={(e) => {
                      const val = e.target.value
                      setOrganizeSubjectId(val === 'unassigned' ? null : val)
                    }}
                    className="w-full rounded-xl bg-zinc-950 border border-white/10 px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500/50 cursor-pointer"
                  >
                    <option value="unassigned">General Library (No Subject)</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>

                {organizingItem.type === 'file' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Assign Folder</label>
                    <select
                      value={organizeFolderId || ''}
                      onChange={(e) => {
                        const val = e.target.value
                        setOrganizeFolderId(val === '' ? null : val)
                      }}
                      className="w-full rounded-xl bg-zinc-950 border border-white/10 px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500/50 cursor-pointer"
                    >
                      <option value="">No Folder (Root)</option>
                      {folders.map((fold) => (
                        <option key={fold.id} value={fold.id}>{fold.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setOrganizingItem(null)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-xs font-semibold text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleOrganizeItem(organizingItem.id, organizingItem.type, organizeSubjectId, organizeFolderId)}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-[0_4px_12px_rgba(139,92,246,0.15)] cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLASHCARD STUDY PLAYER */}
      {activeStudySet !== null && (
        <div className="fixed inset-0 z-[90] flex flex-col justify-between bg-[#080c14] text-white p-6 md:p-8 select-none animate-fade-in">
          {/* Minimal Top-edge Progress Runner */}
          {!studyFinished && (
            <div className="fixed top-0 left-0 w-full h-[3px] bg-zinc-900/60 z-[95]">
              <div
                className="h-full bg-purple-500 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-[0_0_12px_rgba(168,85,247,0.8)]"
                style={{ width: `${((currentCardIndex + 1) / activeStudySet.cards.length) * 100}%` }}
              />
            </div>
          )}

          {!studyFinished ? (
            <>
              {/* Top Bar */}
              <div className="w-full max-w-4xl mx-auto flex items-center justify-between pt-2">
                <button
                  onClick={() => setActiveStudySet(null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                  <span>Exit</span>
                </button>
                <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600 truncate max-w-[200px] md:max-w-md">{activeStudySet.title}</h3>
                <span className="text-[10px] text-zinc-500 font-bold font-mono">
                  {currentCardIndex + 1} / {activeStudySet.cards.length}
                </span>
              </div>

              {/* Card Container */}
              <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl mx-auto py-8">
                {activeStudySet.cards[currentCardIndex] && (
                  <div className="perspective-1000 w-full max-w-2xl h-80 md:h-[380px] relative select-none">
                    <div
                      onClick={handleCardFlip}
                      className={`relative w-full h-full preserve-3d transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer ${
                        isFlipped ? 'rotate-y-180' : ''
                      }`}
                    >
                      {/* Front Face */}
                      <div className="absolute inset-0 backface-hidden">
                        <div className="double-bezel-outer h-full w-full bg-[#0a0c14] border-white/5">
                          <div className="double-bezel-inner p-8 flex flex-col justify-between h-full bg-[#07090f]">
                            <div className="text-[9px] uppercase font-bold text-zinc-600 tracking-[0.2em] flex items-center gap-1.5">
                              <BookOpen className="h-3.5 w-3.5 text-zinc-700" strokeWidth={1.5} />
                              <span>Question</span>
                            </div>
                            <div className="flex-1 flex items-center justify-center py-6">
                              <p className="text-base md:text-lg font-semibold text-zinc-200 text-center leading-relaxed px-4">
                                {activeStudySet.cards[currentCardIndex].front}
                              </p>
                            </div>
                            <div className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest text-center">
                              Space / Click to Flip
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Back Face */}
                      <div className="absolute inset-0 backface-hidden rotate-y-180">
                        <div className="double-bezel-outer h-full w-full bg-purple-950/[0.05] border-purple-500/10">
                          <div className="double-bezel-inner p-8 flex flex-col justify-between h-full bg-purple-500/[0.02]">
                            <div className="text-[9px] uppercase font-bold text-purple-400/80 tracking-[0.2em] flex items-center gap-1.5">
                              <Sparkles className="h-3.5 w-3.5 text-purple-500/50" strokeWidth={1.5} />
                              <span>Answer</span>
                            </div>
                            <div className="flex-1 flex items-center justify-center py-6">
                              <p className="text-base md:text-lg font-semibold text-zinc-200 text-center leading-relaxed px-4">
                                {activeStudySet.cards[currentCardIndex].back}
                              </p>
                            </div>
                            <div className="text-[9px] text-purple-400/50 font-bold uppercase tracking-widest text-center">
                              Answer Revealed
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="w-full max-w-xl mx-auto flex items-center gap-4 pb-6">
                <button
                  onClick={() => markCardPractice(activeStudySet.cards[currentCardIndex].id)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.02] hover:bg-amber-500/5 hover:border-amber-500/30 text-amber-400 py-3.5 text-xs font-bold transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-[1px] active:scale-[0.98] cursor-pointer"
                >
                  <AlertCircle className="h-4.5 w-4.5" strokeWidth={1.5} />
                  <span>Practice (←)</span>
                </button>

                <button
                  onClick={handleCardFlip}
                  className="rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 text-zinc-400 hover:text-zinc-200 px-8 py-3.5 text-xs font-bold transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-[1px] active:scale-[0.98] cursor-pointer"
                >
                  Flip (Space)
                </button>

                <button
                  onClick={() => markCardKnown(activeStudySet.cards[currentCardIndex].id)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02] hover:bg-emerald-500/5 hover:border-emerald-500/30 text-emerald-400 py-3.5 text-xs font-bold transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-[1px] active:scale-[0.98] cursor-pointer"
                >
                  <CheckCircle className="h-4.5 w-4.5" strokeWidth={1.5} />
                  <span>Known (→)</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center max-w-2xl w-full mx-auto space-y-8 animate-fade-in">
              <div className="relative">
                <div className="h-20 w-20 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(168,85,247,0.25)] mx-auto animate-pulse">
                  <Award className="h-10 w-10 text-purple-400" strokeWidth={1.5} />
                </div>
              </div>

              <div className="text-center space-y-2">
                <h3 className="font-display text-2xl font-bold text-white tracking-tight">Study Session Complete!</h3>
                <p className="text-zinc-400 text-xs max-w-xs mx-auto leading-relaxed font-medium">
                  Excellent job completing this flashcard deck. Here is your study recap:
                </p>
              </div>

              <div className="space-y-5 w-full">
                {/* Visual bar breakdown */}
                <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden flex border border-white/5">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${(knownCardIds.length / activeStudySet.cards.length) * 100}%` }}
                  />
                  <div
                    className="bg-amber-500 h-full transition-all duration-500"
                    style={{ width: `${(needsPracticeCardIds.length / activeStudySet.cards.length) * 100}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 pt-2 text-left">
                  <div className="bg-[#050507] border border-white/5 rounded-xl p-4">
                    <div className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Known</div>
                    <div className="text-lg font-bold text-emerald-400 mt-1">{knownCardIds.length}</div>
                  </div>
                  <div className="bg-[#050507] border border-white/5 rounded-xl p-4">
                    <div className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Practice</div>
                    <div className="text-lg font-bold text-amber-400 mt-1">{needsPracticeCardIds.length}</div>
                  </div>
                  <div className="bg-[#050507] border border-white/5 rounded-xl p-4">
                    <div className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Score</div>
                    <div className="text-lg font-bold text-purple-400 mt-1">
                      {Math.round((knownCardIds.length / activeStudySet.cards.length) * 100)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full pt-6">
                <button
                  onClick={restartStudySession}
                  className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3.5 text-xs font-bold text-zinc-300 hover:text-white cursor-pointer transition-all hover:-translate-y-[1px] active:scale-[0.98]"
                >
                  Study Again
                </button>
                <button
                  onClick={() => setActiveStudySet(null)}
                  className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-3.5 text-xs font-bold text-white cursor-pointer transition-all shadow-[0_2px_10px_rgba(168,85,247,0.15)] hover:-translate-y-[1px] active:scale-[0.98]"
                >
                  Finish Session
                </button>
              </div>
            </div>
          )}
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
