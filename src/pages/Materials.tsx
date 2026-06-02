import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import {
  Upload,
  FileText,
  Image,
  FileSpreadsheet,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2,
  CloudUpload,
  File,
  Filter,
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
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatFileSize(text: string | null): string {
  if (!text) return 'No text extracted'
  const chars = text.length
  if (chars < 1000) return `${chars} characters`
  return `${(chars / 1000).toFixed(1)}k characters`
}

export const Materials: React.FC = () => {
  const { user, session } = useAuth()
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
  const [uploading, setUploading] = useState(false)
  const [uploadFileName, setUploadFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch materials
  const fetchMaterials = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('tbl_materials')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      setMaterials(data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to fetch materials')
    } finally {
      setLoading(false)
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
    fetchMaterials()
    fetchSubjects()
  }, [fetchMaterials, fetchSubjects])

  // Clear messages after 5s
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

  // Upload handler
  const handleUpload = async (file: File) => {
    if (!session) {
      setError('You must be logged in to upload.')
      return
    }

    // Validate file type
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
      if (selectedSubjectId) {
        formData.append('subject_id', selectedSubjectId)
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(
        `${supabaseUrl}/functions/v1/parse-material`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      setSuccess(`"${file.name}" uploaded and parsed successfully!`)
      await fetchMaterials()
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      setUploadFileName(null)
    }
  }

  // Delete handler
  const handleDelete = async (material: Material) => {
    if (!user) return
    setDeletingId(material.id)
    setError(null)

    try {
      // Remove from storage
      const { error: storageError } = await supabase.storage
        .from('materials')
        .remove([material.storage_path])

      if (storageError) {
        console.warn('Storage delete warning:', storageError.message)
      }

      // Remove from database
      const { error: dbError } = await supabase
        .from('tbl_materials')
        .delete()
        .eq('id', material.id)

      if (dbError) throw dbError

      setMaterials((prev) => prev.filter((m) => m.id !== material.id))
      setSuccess(`"${material.file_name}" deleted.`)
    } catch (err: any) {
      setError(err.message || 'Failed to delete material')
    } finally {
      setDeletingId(null)
    }
  }

  // Drag & drop handlers
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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragOver(false)

      const files = e.dataTransfer.files
      if (files.length > 0) {
        handleUpload(files[0])
      }
    },
    [session, selectedSubjectId]
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleUpload(files[0])
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const filteredMaterials = materials.filter((m) => {
    if (filterSubjectId === 'all') return true
    if (filterSubjectId === 'unassigned') return !m.subject_id
    return m.subject_id === filterSubjectId
  })

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-extrabold text-white sm:text-4xl">
          Materials
        </h1>
        <p className="mt-2 text-gray-400">
          Upload your study materials — PDFs, Word docs, PowerPoints, text files, or images.
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400 animate-fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-400 animate-fade-in">
          <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Subject Selector for Upload */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-400">Upload Subject Association:</label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500/50 cursor-pointer"
          >
            <option value="">Unassigned / None</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`glass-card rounded-xl p-10 mb-8 cursor-pointer transition-all duration-300 relative overflow-hidden group
          ${dragOver
            ? 'border-brand-400/60 bg-brand-500/10 shadow-[0_0_30px_rgba(139,92,246,0.15)]'
            : 'hover:border-white/12'
          }
          ${uploading ? 'pointer-events-none opacity-70' : ''}
        `}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_MIME_TYPES.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          id="material-file-input"
        />

        <div className="flex flex-col items-center justify-center text-center">
          {uploading ? (
            <>
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-brand-500/10 border border-brand-500/20">
                <Loader2 className="h-8 w-8 text-brand-400 animate-spin" />
              </div>
              <p className="font-display text-lg font-bold text-white">
                Processing "{uploadFileName}"...
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Uploading and extracting text. This may take a moment.
              </p>
            </>
          ) : (
            <>
              <div
                className={`mb-4 flex h-16 w-16 items-center justify-center rounded-xl border transition-all duration-300
                  ${dragOver
                    ? 'bg-brand-500/20 border-brand-500/40 shadow-[0_0_20px_rgba(139,92,246,0.3)]'
                    : 'bg-brand-500/10 border-brand-500/20 group-hover:bg-brand-500/15 group-hover:border-brand-500/30'
                  }
                `}
              >
                <CloudUpload
                  className={`h-8 w-8 transition-all duration-300
                    ${dragOver ? 'text-brand-300 scale-110' : 'text-brand-400 group-hover:text-brand-300'}
                  `}
                />
              </div>
              <p className="font-display text-lg font-bold text-white">
                {dragOver ? 'Drop your file here' : 'Drag & drop a file here'}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                or{' '}
                <span className="text-brand-400 font-medium">click to browse</span>
              </p>
              <p className="mt-3 text-xs text-gray-500">
                Accepted: PDF, DOCX, PPTX, TXT, JPG, PNG, WEBP
              </p>
            </>
          )}
        </div>
      </div>

      {/* Materials List */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-2 border-b border-white/5">
          <h2 className="font-display text-xl font-bold text-white">
            Your Materials
          </h2>
          
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
              {filteredMaterials.length} file{filteredMaterials.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 text-brand-400 animate-spin" />
          </div>
        ) : materials.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <div className="mb-4 flex h-14 w-14 mx-auto items-center justify-center rounded-xl bg-gray-500/10 border border-gray-500/20">
              <Upload className="h-6 w-6 text-gray-500" />
            </div>
            <p className="font-display text-lg font-semibold text-gray-300">
              No materials yet
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Upload your first file to get started.
            </p>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <div className="mb-4 flex h-14 w-14 mx-auto items-center justify-center rounded-xl bg-gray-500/10 border border-gray-500/20">
              <Filter className="h-6 w-6 text-gray-500" />
            </div>
            <p className="font-display text-lg font-semibold text-gray-300">
              No materials found
            </p>
            <p className="mt-1 text-sm text-gray-500">
              There are no files associated with this subject.
            </p>
          </div>
        ) : (
          filteredMaterials.map((material) => {
            const subject = subjects.find((s) => s.id === material.subject_id)
            const colorStyles = subject ? getSubjectColorStyles(subject.color) : null

            return (
              <div
                key={material.id}
                className="glass-card rounded-xl p-5 flex items-center gap-4 group transition-all duration-200"
              >
                {/* File type icon */}
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${getFileTypeColor(
                    material.file_type
                  )}`}
                >
                  {getFileIcon(material.file_type)}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-100 truncate">
                    {material.file_name}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {subject && (
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${colorStyles?.bg}`}>
                        {subject.name}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 uppercase font-medium">
                      {material.file_type}
                    </span>
                    <span className="text-xs text-gray-600">•</span>
                    <span className="text-xs text-gray-500">
                      {formatFileSize(material.extracted_text)}
                    </span>
                    <span className="text-xs text-gray-600">•</span>
                    <span className="text-xs text-gray-500">
                      {formatDate(material.created_at)}
                    </span>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => handleDelete(material)}
                  disabled={deletingId === material.id}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/0 border border-transparent text-gray-500 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Delete material"
                >
                  {deletingId === material.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
