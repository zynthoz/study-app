import React, { useState, useEffect, useRef } from 'react'
// IDE type-resolution trigger comment
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  Save,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo,
} from 'lucide-react'

const parseMarkdownToHtml = (markdown: string): string => {
  if (!markdown) return ''
  
  // Simple heuristic to check if it's already HTML
  const trimmed = markdown.trim()
  if (trimmed.startsWith('<') && (trimmed.endsWith('>') || trimmed.includes('</p>') || trimmed.includes('</h1>'))) {
    return markdown
  }

  // Convert markdown to HTML
  let html = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`)

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>')

  // Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>')

  // Blockquotes
  html = html.replace(/^&gt;\s+(.*$)/gim, '<blockquote>$1</blockquote>')

  // Lists:
  const lines = html.split('\n')
  let inUl = false
  let inOl = false
  const processedLines = lines.map((line) => {
    const trimmedLine = line.trim()

    // Unordered list item
    const ulMatch = line.match(/^(\s*)[-*+]\s+(.*)$/)
    if (ulMatch) {
      let result = ''
      if (inOl) {
        result += '</ol>'
        inOl = false
      }
      if (!inUl) {
        result += '<ul>'
        inUl = true
      }
      result += `<li>${ulMatch[2]}</li>`
      return result
    }

    // Ordered list item
    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/)
    if (olMatch) {
      let result = ''
      if (inUl) {
        result += '</ul>'
        inUl = false
      }
      if (!inOl) {
        result += '<ol>'
        inOl = true
      }
      result += `<li>${olMatch[2]}</li>`
      return result
    }

    // Normal line
    let prefix = ''
    if (inUl) {
      prefix += '</ul>'
      inUl = false
    }
    if (inOl) {
      prefix += '</ol>'
      inOl = false
    }

    if (trimmedLine === '') {
      return prefix
    }

    if (
      !trimmedLine.startsWith('<h') &&
      !trimmedLine.startsWith('<blockquote') &&
      !trimmedLine.startsWith('<pre') &&
      !trimmedLine.startsWith('<code') &&
      !trimmedLine.startsWith('</')
    ) {
      return `${prefix}<p>${trimmedLine}</p>`
    }

    return prefix + line
  })

  let finalHtml = processedLines.join('\n')
  if (inUl) finalHtml += '</ul>'
  if (inOl) finalHtml += '</ol>'

  return finalHtml
}

interface Subject {
  id: string
  name: string
  color: string
}

export const NoteDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { session, user } = useAuth()

  const [title, setTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Subject States
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')

  // Auto-save states
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Track the last saved state to prevent redundant saves on load
  const lastSavedContentRef = useRef<string>('')
  const lastSavedTitleRef = useRef<string>('')
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initialize Editor
  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[400px] w-full px-4 py-3',
      },
    },
  })

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
        console.error('Failed to fetch subjects in NoteDetail:', err)
      }
    }
    fetchSubjects()
  }, [user])

  // Fetch the note details on load
  useEffect(() => {
    const fetchNote = async () => {
      if (!id || !user) return
      setLoading(true)
      try {
        const { data, error: fetchError } = await supabase
          .from('tbl_notes')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single()

        if (fetchError) throw fetchError
        
        if (data) {
          const fetchedTitle = data.title || ''
          setTitle(fetchedTitle)
          lastSavedTitleRef.current = fetchedTitle
          setNoteContent(data.content || '')
          setSelectedSubjectId(data.subject_id || '')

          if (data.updated_at) {
            setLastSaved(new Date(data.updated_at))
            setSavingStatus('saved')
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load note.')
      } finally {
        setLoading(false)
      }
    }

    fetchNote()
  }, [id, user])

  const handleSubjectChange = async (newSubjectId: string) => {
    setSelectedSubjectId(newSubjectId)
    setSavingStatus('saving')
    try {
      const dbSubjectId = newSubjectId === '' ? null : newSubjectId
      const { error: updateError } = await supabase
        .from('tbl_notes')
        .update({ subject_id: dbSubjectId, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (updateError) throw updateError
      setLastSaved(new Date())
      setSavingStatus('saved')
    } catch (err: any) {
      console.error('Error updating note subject:', err)
      setSavingStatus('error')
    }
  }

  // Set editor content once editor is ready and content is loaded
  useEffect(() => {
    if (editor && !editor.isDestroyed && noteContent && lastSavedContentRef.current === '') {
      const parsedContent = parseMarkdownToHtml(noteContent)
      try {
        editor.commands.setContent(parsedContent)
        lastSavedContentRef.current = editor.getHTML()
      } catch (err: any) {
        console.warn('TipTap initial setContent deferred:', err)
      }
    }
  }, [editor, noteContent])

  // Debounced auto-save for content
  useEffect(() => {
    if (!editor || loading) return

    const handleContentChange = () => {
      const content = editor.getHTML()
      if (content === lastSavedContentRef.current) return

      setSavingStatus('saving')

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(async () => {
        if (!id || !session) return

        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
          const response = await fetch(
            `${supabaseUrl}/functions/v1/update-note`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                note_id: id,
                content: content,
              }),
            }
          )

          if (!response.ok) {
            const result = await response.json()
            throw new Error(result.error || 'Auto-save failed')
          }

          lastSavedContentRef.current = content
          setLastSaved(new Date())
          setSavingStatus('saved')
        } catch (err: any) {
          console.error('Auto-save error:', err)
          setSavingStatus('error')
        }
      }, 1000)
    }

    editor.on('update', handleContentChange)

    return () => {
      editor.off('update', handleContentChange)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [editor, id, session, loading])

  // Debounced title save
  useEffect(() => {
    if (loading || !id) return
    if (title === lastSavedTitleRef.current) return

    const delayDebounce = setTimeout(async () => {
      setSavingStatus('saving')
      try {
        const { error: updateError } = await supabase
          .from('tbl_notes')
          .update({ title, updated_at: new Date().toISOString() })
          .eq('id', id)

        if (updateError) throw updateError
        
        lastSavedTitleRef.current = title
        setLastSaved(new Date())
        setSavingStatus('saved')
      } catch (err: any) {
        console.error('Title save error:', err)
        setSavingStatus('error')
      }
    }, 1000)

    return () => clearTimeout(delayDebounce)
  }, [title, id, loading])

  // Format time helper
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  // Render Editor Toolbar
  const renderToolbar = () => {
    if (!editor) return null

    const getButtonClass = (isActive: boolean) => {
      return `p-2 rounded-lg transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer active:scale-95 border ${
        isActive
          ? 'bg-purple-100/80 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30'
          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-white/5 border-transparent'
      }`
    }

    const getUtilityButtonClass = (disabled: boolean) => {
      return `p-2 rounded-lg transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer active:scale-95 border border-transparent ${
        disabled
          ? 'opacity-25 cursor-not-allowed text-zinc-400 dark:text-zinc-600'
          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-white/5'
      }`
    }

    return (
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-1.5 px-4 py-2.5 border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#0d0d11] shadow-[0_2px_8px_rgba(0,0,0,0.02)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={getButtonClass(editor.isActive('bold'))}
          title="Bold"
        >
          <Bold className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={getButtonClass(editor.isActive('italic'))}
          title="Italic"
        >
          <Italic className="h-4 w-4" strokeWidth={1.5} />
        </button>
        
        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-white/10 mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={getButtonClass(editor.isActive('heading', { level: 1 }))}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={getButtonClass(editor.isActive('heading', { level: 2 }))}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={getButtonClass(editor.isActive('heading', { level: 3 }))}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" strokeWidth={1.5} />
        </button>

        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-white/10 mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={getButtonClass(editor.isActive('bulletList'))}
          title="Bullet List"
        >
          <List className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={getButtonClass(editor.isActive('orderedList'))}
          title="Ordered List"
        >
          <ListOrdered className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={getButtonClass(editor.isActive('blockquote'))}
          title="Blockquote"
        >
          <Quote className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={getButtonClass(editor.isActive('codeBlock'))}
          title="Code Block"
        >
          <Code className="h-4 w-4" strokeWidth={1.5} />
        </button>

        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-white/10 mx-1" />

        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className={getUtilityButtonClass(!editor.can().chain().focus().undo().run())}
          title="Undo"
        >
          <Undo className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className={getUtilityButtonClass(!editor.can().chain().focus().redo().run())}
          title="Redo"
        >
          <Redo className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 space-y-8 animate-fade-in">
      {/* Top Navigation Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 relative z-10">
        <Link
          to="/subjects?tab=guides"
          className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors group"
        >
          <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" strokeWidth={1.5} />
          Back to Workspace
        </Link>

        {/* Saved Status Indicator */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          {savingStatus === 'saving' && (
            <span className="inline-flex items-center gap-1.5 text-purple-600 dark:text-purple-300">
              <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} />
              Saving...
            </span>
          )}
          {savingStatus === 'saved' && lastSaved && (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <Save className="h-3.5 w-3.5" strokeWidth={1.5} />
              Saved at {formatTime(lastSaved)}
            </span>
          )}
          {savingStatus === 'error' && (
            <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400">
              <AlertCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
              Retrying sync...
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/25 p-4 text-xs text-red-400 animate-fade-in relative z-10">
          <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" strokeWidth={1.5} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-32 relative z-10">
          <Loader2 className="h-6 w-6 text-purple-400 animate-spin" strokeWidth={1.5} />
        </div>
      ) : (
        <div className="double-bezel-outer relative z-10">
          <div className="double-bezel-inner">
            {/* Note Title Input & Subject Selection */}
            <div className="p-6 sm:p-8 border-b border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-black/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-t-[calc(1.25rem-0.375rem)]">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your study guide a title..."
                className="flex-1 bg-transparent border-0 font-display text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 focus:outline-none focus:ring-0 p-0 tracking-tight"
              />
              
              <div className="flex items-center gap-1.5 shrink-0 bg-zinc-100 dark:bg-[#050507] border border-zinc-200 dark:border-white/5 rounded-xl px-3 py-1.5">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Subject:</span>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="bg-transparent border-0 text-xs text-zinc-800 dark:text-zinc-300 font-bold focus:outline-none focus:ring-0 cursor-pointer"
                >
                  <option value="" className="bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">Unassigned</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id} className="bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Toolbar */}
            {renderToolbar()}

            {/* Editor Area with Constrained Width */}
            <div className="prose-editor p-4 sm:p-8 min-h-[400px] rounded-b-[calc(1.25rem-0.375rem)]">
              <div className="max-w-[75ch] mx-auto">
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
