import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import {
  FileText,
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
  Filter,
  Share2,
} from 'lucide-react'

interface Subject {
  id: string
  name: string
  color: string
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

export const Notes: React.FC = () => {
  const { user, session } = useAuth()
  const navigate = useNavigate()
  
  const [notes, setNotes] = useState<Note[]>([])
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

  // Tabs & Sharing States
  const [activeNotesTab, setActiveNotesTab] = useState<'my' | 'shared'>('my')
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [sharingNoteId, setSharingNoteId] = useState<string | null>(null)
  const [shareEmail, setShareEmail] = useState('')
  const [existingShares, setExistingShares] = useState<any[]>([])
  const [loadingShares, setLoadingShares] = useState(false)

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
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch all notes
  const fetchNotes = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('tbl_notes')
        .select('*')
        .order('updated_at', { ascending: false })

      if (fetchError) throw fetchError
      setNotes(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notes')
    } finally {
      setLoading(false)
    }
  }, [user])

  const openShareModal = async (noteId: string) => {
    setSharingNoteId(noteId)
    setIsShareModalOpen(true)
    setLoadingShares(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('tbl_shares')
        .select('*')
        .eq('note_id', noteId)

      if (fetchError) throw fetchError
      setExistingShares(data || [])
    } catch (err: any) {
      console.error(err)
      setError('Failed to fetch shares.')
    } finally {
      setLoadingShares(false)
    }
  }

  const handleAddShare = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sharingNoteId || !shareEmail.trim()) return
    try {
      const { data, error: shareError } = await supabase
        .from('tbl_shares')
        .insert({
          note_id: sharingNoteId,
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
      alert(err.message || 'Failed to share note.')
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
    fetchNotes()
    fetchMaterials()
    fetchSubjects()
  }, [fetchNotes, fetchMaterials, fetchSubjects])

  // Delete note
  const handleDeleteNote = async (e: React.MouseEvent, noteId: string, title: string) => {
    e.preventDefault() // Prevent navigation to detail page
    e.stopPropagation()
    
    openConfirmModal(
      'Delete Study Guide',
      `Are you sure you want to delete "${title}"? This action is permanent.`,
      async () => {
        setDeletingId(noteId)
        setError(null)
        try {
          const { error: deleteError } = await supabase
            .from('tbl_notes')
            .delete()
            .eq('id', noteId)

          if (deleteError) throw deleteError
          setNotes((prev) => prev.filter((n) => n.id !== noteId))
        } catch (err: any) {
          setError(err.message || 'Failed to delete note')
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

  // Handle generation
  const handleGenerateNotes = async () => {
    if (selectedMaterials.length === 0) {
      setError('Please select at least one material to generate notes.')
      return
    }

    setError(null)
    setGenerating(true)

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(
        `${supabaseUrl}/functions/v1/generate-notes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            material_ids: selectedMaterials,
            subject_id: selectedSubjectId || null,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate notes')
      }

      setIsModalOpen(false)
      setSelectedMaterials([])
      // Redirect to the newly created note detail page
      navigate(`/notes/${result.id}`)
    } catch (err: any) {
      setError(err.message || 'Notes generation failed')
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

  const filteredNotes = notes.filter((n) => {
    // 1. Filter by owner vs shared
    const isOwner = n.user_id === user?.id
    if (activeNotesTab === 'my' && !isOwner) return false
    if (activeNotesTab === 'shared' && isOwner) return false

    // 2. Filter by subject
    if (filterSubjectId === 'all') return true
    if (filterSubjectId === 'unassigned') return !n.subject_id
    return n.subject_id === filterSubjectId
  })

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
            Study Notes
          </h1>
          <p className="mt-2 text-gray-400">
            Generate and manage your AI-synthesized study guides and notes.
          </p>
        </div>
        <button
          onClick={() => {
            setError(null)
            setIsModalOpen(true)
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-tr from-brand-600 to-purple-500 hover:from-brand-500 hover:to-purple-400 px-5 py-3 text-sm font-semibold text-white transition-all duration-200 cursor-pointer shadow-[0_4px_20px_rgba(139,92,246,0.25)] hover:shadow-[0_4px_25px_rgba(139,92,246,0.35)]"
        >
          <Plus className="h-5 w-5" />
          Generate Notes
        </button>
      </div>

      {/* Error Alert */}
      {error && !generating && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400 animate-fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Search/Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveNotesTab('my')}
            className={`text-sm font-bold pb-2 border-b-2 transition-all cursor-pointer ${
              activeNotesTab === 'my'
                ? 'text-white border-purple-500'
                : 'text-zinc-400 border-transparent hover:text-zinc-200'
            }`}
          >
            My Notes
          </button>
          <button
            onClick={() => setActiveNotesTab('shared')}
            className={`text-sm font-bold pb-2 border-b-2 transition-all cursor-pointer ${
              activeNotesTab === 'shared'
                ? 'text-white border-purple-500'
                : 'text-zinc-400 border-transparent hover:text-zinc-200'
            }`}
          >
            Shared with Me
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-xs font-semibold text-gray-400">Filter:</span>
          <select
            value={filterSubjectId}
            onChange={(e) => setFilterSubjectId(e.target.value)}
            className="rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500/50 cursor-pointer"
          >
            <option value="all">All Subjects</option>
            <option value="unassigned">Unassigned</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500 ml-2">
            {filteredNotes.length} guide{filteredNotes.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 text-brand-400 animate-spin" />
        </div>
      ) : notes.length === 0 ? (
        <div className="glass-card rounded-xl p-16 text-center">
          <div className="mb-4 flex h-14 w-14 mx-auto items-center justify-center rounded-xl bg-brand-500/10 border border-brand-500/20">
            <FileText className="h-6 w-6 text-brand-400" />
          </div>
          <p className="font-display text-lg font-semibold text-gray-300">
            No notes generated yet
          </p>
          <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
            Click "Generate Notes" above to create your first comprehensive study guide.
          </p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="glass-card rounded-xl p-16 text-center">
          <div className="mb-4 flex h-14 w-14 mx-auto items-center justify-center rounded-xl bg-brand-500/10 border border-brand-500/20">
            <Filter className="h-6 w-6 text-brand-400" />
          </div>
          <p className="font-display text-lg font-semibold text-gray-300">
            No study guides found
          </p>
          <p className="mt-1 text-sm text-gray-500">
            There are no notes associated with this subject.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredNotes.map((note) => {
            const subject = subjects.find((s) => s.id === note.subject_id)
            const colorStyles = subject ? getSubjectColorStyles(subject.color) : null

            return (
              <Link
                key={note.id}
                to={`/notes/${note.id}`}
                className="glass-card rounded-xl p-6 flex flex-col justify-between hover:border-brand-500/30 transition-all duration-200 group relative overflow-hidden bg-white/[0.01]"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 group-hover:bg-brand-500/15 group-hover:text-brand-300 transition-all">
                      <FileText className="h-5 w-5" />
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {/* Share Button (only for own notes) */}
                      {note.user_id === user?.id && (
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            openShareModal(note.id)
                          }}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/0 border border-transparent text-gray-500 hover:bg-white/10 hover:text-purple-400 transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Share Note"
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                      )}

                      {/* Delete Button (only for own notes) */}
                      {note.user_id === user?.id && (
                        <button
                          onClick={(e) => handleDeleteNote(e, note.id, note.title)}
                          disabled={deletingId === note.id}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/0 border border-transparent text-gray-500 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Delete Note"
                        >
                          {deletingId === note.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {subject && (
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${colorStyles?.bg}`}>
                        {subject.name}
                      </span>
                    )}
                  </div>

                  <h3 className="font-display text-lg font-bold text-white group-hover:text-brand-300 transition-colors line-clamp-1">
                    {note.title || 'Untitled Notes'}
                  </h3>
                  
                  {/* Content snippet */}
                  <p className="text-sm text-gray-400 mt-2 line-clamp-3 leading-relaxed">
                    {note.content?.replace(/[#*`_]/g, '') || 'No content.'}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-white/5">
                  <span className="inline-flex items-center gap-1.5 text-xs text-brand-400 font-medium">
                    <BookOpen className="h-3.5 w-3.5" />
                    {note.material_ids?.length || 0} source{(note.material_ids?.length || 0) !== 1 ? 's' : ''}
                  </span>
                  
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(note.updated_at || note.created_at)}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* SHARING MODAL */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsShareModalOpen(false)}></div>
          <div className="double-bezel-outer max-w-md w-full relative z-10">
            <div className="double-bezel-inner p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <h3 className="text-base font-bold text-white tracking-tight">Share Document</h3>
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
                  <p className="text-xs text-zinc-500 italic">This note is private. Add emails to share access.</p>
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

      {/* Generation Modal & Loading Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => !generating && setIsModalOpen(false)}
          ></div>

          {/* Modal Content */}
          <div className="glass-card w-full max-w-lg rounded-xl p-6 sm:p-8 relative z-10 overflow-hidden shadow-2xl border-white/10">
            {generating ? (
              /* Generating Loading State */
              <div className="flex flex-col items-center justify-center text-center py-12 space-y-6">
                <div className="relative">
                  {/* Rotating outer ring */}
                  <div className="h-20 w-20 rounded-full border-4 border-t-brand-500 border-r-transparent border-b-purple-500 border-l-transparent animate-spin"></div>
                  {/* Inner logo/glow */}
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

                {/* Simulated progress indicator */}
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden max-w-[240px]">
                  <div className="bg-gradient-to-r from-brand-500 to-purple-500 h-full w-2/3 rounded-full animate-pulse"></div>
                </div>
              </div>
            ) : (
              /* Selection Form State */
              <>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display text-2xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-brand-400" />
                    Select Materials
                  </h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-all"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <p className="text-sm text-gray-400 mb-6">
                  Choose the files you want the AI to synthesize into comprehensive study notes. You can select multiple documents or images.
                </p>

                {/* Error inside modal */}
                {error && (
                  <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Subject Selector inside Modal */}
                <div className="mb-4 space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400">Link Notes to Subject (Optional)</label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500/50 cursor-pointer"
                  >
                    <option value="">Unassigned / None</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Materials List Checkbox Container */}
                <div className="max-h-[280px] overflow-y-auto pr-1 space-y-2 mb-6">
                  {materials.length === 0 ? (
                    <div className="text-center py-8 bg-white/5 rounded-xl border border-white/5">
                      <p className="text-sm text-gray-400">No materials available.</p>
                      <Link
                        to="/materials"
                        className="text-xs text-brand-400 font-semibold mt-1 inline-block hover:underline"
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
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 select-none
                            ${isSelected
                              ? 'bg-brand-500/10 border-brand-500/30'
                              : 'bg-white/5 border-transparent hover:bg-white/10'
                            }
                          `}
                        >
                          <div className="text-brand-400 shrink-0">
                            {isSelected ? (
                              <CheckSquare className="h-5 w-5 text-brand-400" />
                            ) : (
                              <Square className="h-5 w-5 text-gray-500" />
                            )}
                          </div>
                          
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-200 truncate">
                              {m.file_name}
                            </p>
                            <span className="text-[10px] text-gray-500 uppercase font-semibold">
                              {m.file_type}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm font-semibold text-gray-300 hover:bg-white/10 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateNotes}
                    disabled={selectedMaterials.length === 0}
                    className="flex-1 rounded-xl bg-gradient-to-tr from-brand-600 to-purple-500 hover:from-brand-500 hover:to-purple-400 px-4 py-3 text-sm font-semibold text-white transition shadow-[0_4px_15px_rgba(139,92,246,0.2)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Generate
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}></div>
          <div className="glass-card rounded-xl p-6 max-w-sm w-full relative z-10 border border-white/10 shadow-2xl bg-[#0c101c] animate-fade-in space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">{confirmModal.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const onConfirm = confirmModal.onConfirm
                  setConfirmModal(prev => ({ ...prev, isOpen: false }))
                  await onConfirm()
                }}
                className="rounded-xl px-5 py-2.5 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
