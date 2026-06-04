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
  ChevronDown,
  Check,
  Clock,
  FileText,
  Type,
  Share2,
  MessageSquare,
  Download,
  Send,
  Bot,
  User,
  X,
  Sparkles,
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
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-save states
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isSharedNote, setIsSharedNote] = useState(false)

  // Share States
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [existingShares, setExistingShares] = useState<any[]>([])
  const [loadingShares, setLoadingShares] = useState(false)

  // Chat States
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant'; content: string}[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)

  // Stats States
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const readTime = Math.ceil(wordCount / 200)

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
          .single()

        if (fetchError) throw fetchError
        
        if (data) {
          const isShared = data.user_id !== user.id
          setIsSharedNote(isShared)
          
          if (!isShared) {
            fetchShares()
          }
          
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

  const fetchShares = async () => {
    if (!id) return
    setLoadingShares(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('tbl_shares')
        .select('*')
        .eq('note_id', id)

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
          note_id: id,
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

        // Initialize stats
        const text = editor.getText()
        const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length
        setWordCount(words)
        setCharCount(text.length)
      } catch (err: any) {
        console.warn('TipTap initial setContent deferred:', err)
      }
    }
  }, [editor, noteContent])

  // Set editor editability based on share status
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(!isSharedNote)
    }
  }, [editor, isSharedNote])

  // Listen to editor updates to refresh stats in real-time
  useEffect(() => {
    if (!editor || loading) return
    const handleUpdate = () => {
      const text = editor.getText()
      const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length
      setWordCount(words)
      setCharCount(text.length)
    }
    editor.on('update', handleUpdate)
    return () => {
      editor.off('update', handleUpdate)
    }
  }, [editor, loading])

  // Debounced auto-save for content
  useEffect(() => {
    if (!editor || loading || isSharedNote) return

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

  // Debounced auto-save for Title
  useEffect(() => {
    if (loading || isSharedNote) return
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

  // Scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages, chatLoading])

  // Focus chat input when panel opens
  useEffect(() => {
    if (isChatOpen && chatInputRef.current) {
      setTimeout(() => chatInputRef.current?.focus(), 300)
    }
  }, [isChatOpen])

  // Handle sending a chat message
  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading || !session || !id) return

    const userMessage = chatInput.trim()
    setChatInput('')
    setChatMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setChatLoading(true)

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(
        `${supabaseUrl}/functions/v1/chat-with-notes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            note_id: id,
            message: userMessage,
            history: chatMessages.slice(-20),
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      setChatMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err: any) {
      console.error('Chat error:', err)
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Sorry, I couldn't respond. ${err.message || 'Please try again.'}` },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  // Handle chat input key press
  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendChat()
    }
  }

  // Render simple markdown in chat messages
  const renderChatMarkdown = (text: string) => {
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, (_, code) => `<pre class="chat-code-block"><code>${code.trim()}</code></pre>`)
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code class="chat-inline-code">$1</code>')
    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Line breaks
    html = html.replace(/\n/g, '<br />')

    return html
  }

  // Handle PDF Export
  const handleExportPDF = () => {
    if (!editor) return

    const content = editor.getHTML()
    const subjectName = activeSubject ? activeSubject.name : 'Unassigned'
    const dateStr = lastSaved ? lastSaved.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow popups to export PDF.')
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${title || 'Untitled Note'} — IndexAI</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            color: #1a1a2e;
            padding: 48px 56px;
            line-height: 1.7;
            font-size: 14px;
          }
          .header {
            margin-bottom: 32px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
          }
          .header h1 {
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -0.02em;
            margin-bottom: 8px;
            color: #0f0f1a;
          }
          .meta {
            display: flex;
            gap: 16px;
            font-size: 11px;
            color: #6b7280;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .meta span { display: flex; align-items: center; gap: 4px; }
          .content h1 { font-size: 22px; font-weight: 800; margin: 24px 0 12px; color: #0f0f1a; }
          .content h2 { font-size: 18px; font-weight: 700; margin: 20px 0 10px; color: #1a1a2e; }
          .content h3 { font-size: 15px; font-weight: 700; margin: 16px 0 8px; color: #374151; }
          .content p { margin: 8px 0; }
          .content ul, .content ol { margin: 8px 0; padding-left: 24px; }
          .content li { margin: 4px 0; }
          .content strong { font-weight: 700; }
          .content em { font-style: italic; }
          .content blockquote {
            margin: 12px 0;
            padding: 12px 16px;
            border-left: 3px solid #a78bfa;
            background: #f5f3ff;
            color: #4c1d95;
            font-style: italic;
          }
          .content pre {
            margin: 12px 0;
            padding: 16px;
            background: #f3f4f6;
            border-radius: 8px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            overflow-x: auto;
          }
          .content code {
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
            font-size: 10px;
            color: #9ca3af;
            text-align: center;
          }
          @media print {
            body { padding: 32px 40px; }
            @page { margin: 1cm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${(title || 'Untitled Note').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h1>
          <div class="meta">
            <span>Subject: ${subjectName}</span>
            <span>•</span>
            <span>${dateStr}</span>
            <span>•</span>
            <span>${wordCount} words · ${readTime} min read</span>
          </div>
        </div>
        <div class="content">${content}</div>
        <div class="footer">Exported from IndexAI</div>
      </body>
      </html>
    `)

    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  // Render Editor Toolbar
  const renderToolbar = () => {
    if (!editor) return null

    const getButtonClass = (isActive: boolean) => {
      return `p-2 rounded-lg transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer active:scale-90 border ${
        isActive
          ? 'bg-purple-100/90 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-200/60 dark:border-purple-500/30 shadow-[0_2px_8px_rgba(139,92,246,0.08)]'
          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/5 border-transparent'
      }`
    }

    const getUtilityButtonClass = (disabled: boolean) => {
      return `p-2 rounded-lg transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer active:scale-90 border border-transparent ${
        disabled
          ? 'opacity-20 cursor-not-allowed text-zinc-400 dark:text-zinc-600'
          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/5'
      }`
    }

    return (
      <div className="sticky top-4 z-20 mx-4 sm:mx-6 my-3 p-1.5 flex flex-wrap items-center gap-1 border border-zinc-200 dark:border-white/10 bg-white/95 dark:bg-[#0c0c0f]/95 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] rounded-xl transition-all duration-200">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className={`${getButtonClass(editor.isActive('bold'))} relative group/tooltip`}
        >
          <Bold className="h-4 w-4" strokeWidth={1.5} />
          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-[10px] font-bold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-white rounded shadow-md whitespace-nowrap opacity-0 scale-95 transition-all duration-150 ease-out group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 origin-bottom delay-500 z-30 border border-zinc-700/30 dark:border-zinc-200/30">
            Bold (⌘B)
          </span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className={`${getButtonClass(editor.isActive('italic'))} relative group/tooltip`}
        >
          <Italic className="h-4 w-4" strokeWidth={1.5} />
          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-[10px] font-bold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-white rounded shadow-md whitespace-nowrap opacity-0 scale-95 transition-all duration-150 ease-out group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 origin-bottom delay-500 z-30 border border-zinc-700/30 dark:border-zinc-200/30">
            Italic (⌘I)
          </span>
        </button>
        
        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-white/10 mx-1.5" />

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`${getButtonClass(editor.isActive('heading', { level: 1 }))} relative group/tooltip`}
        >
          <Heading1 className="h-4 w-4" strokeWidth={1.5} />
          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-[10px] font-bold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-white rounded shadow-md whitespace-nowrap opacity-0 scale-95 transition-all duration-150 ease-out group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 origin-bottom delay-500 z-30 border border-zinc-700/30 dark:border-zinc-200/30">
            Heading 1 (⌘⌥1)
          </span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`${getButtonClass(editor.isActive('heading', { level: 2 }))} relative group/tooltip`}
        >
          <Heading2 className="h-4 w-4" strokeWidth={1.5} />
          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-[10px] font-bold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-white rounded shadow-md whitespace-nowrap opacity-0 scale-95 transition-all duration-150 ease-out group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 origin-bottom delay-500 z-30 border border-zinc-700/30 dark:border-zinc-200/30">
            Heading 2 (⌘⌥2)
          </span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`${getButtonClass(editor.isActive('heading', { level: 3 }))} relative group/tooltip`}
        >
          <Heading3 className="h-4 w-4" strokeWidth={1.5} />
          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-[10px] font-bold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-white rounded shadow-md whitespace-nowrap opacity-0 scale-95 transition-all duration-150 ease-out group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 origin-bottom delay-500 z-30 border border-zinc-700/30 dark:border-zinc-200/30">
            Heading 3 (⌘⌥3)
          </span>
        </button>

        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-white/10 mx-1.5" />

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`${getButtonClass(editor.isActive('bulletList'))} relative group/tooltip`}
        >
          <List className="h-4 w-4" strokeWidth={1.5} />
          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-[10px] font-bold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-white rounded shadow-md whitespace-nowrap opacity-0 scale-95 transition-all duration-150 ease-out group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 origin-bottom delay-500 z-30 border border-zinc-700/30 dark:border-zinc-200/30">
            Bullet List (⌘⇧8)
          </span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`${getButtonClass(editor.isActive('orderedList'))} relative group/tooltip`}
        >
          <ListOrdered className="h-4 w-4" strokeWidth={1.5} />
          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-[10px] font-bold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-white rounded shadow-md whitespace-nowrap opacity-0 scale-95 transition-all duration-150 ease-out group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 origin-bottom delay-500 z-30 border border-zinc-700/30 dark:border-zinc-200/30">
            Ordered List (⌘⇧9)
          </span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`${getButtonClass(editor.isActive('blockquote'))} relative group/tooltip`}
        >
          <Quote className="h-4 w-4" strokeWidth={1.5} />
          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-[10px] font-bold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-white rounded shadow-md whitespace-nowrap opacity-0 scale-95 transition-all duration-150 ease-out group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 origin-bottom delay-500 z-30 border border-zinc-700/30 dark:border-zinc-200/30">
            Blockquote (⌘⇧B)
          </span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`${getButtonClass(editor.isActive('codeBlock'))} relative group/tooltip`}
        >
          <Code className="h-4 w-4" strokeWidth={1.5} />
          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-[10px] font-bold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-white rounded shadow-md whitespace-nowrap opacity-0 scale-95 transition-all duration-150 ease-out group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 origin-bottom delay-500 z-30 border border-zinc-700/30 dark:border-zinc-200/30">
            Code Block (⌘⌥C)
          </span>
        </button>

        <div className="w-[1px] h-4 bg-zinc-200 dark:bg-white/10 mx-1.5" />

        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className={`${getUtilityButtonClass(!editor.can().chain().focus().undo().run())} relative group/tooltip`}
        >
          <Undo className="h-4 w-4" strokeWidth={1.5} />
          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-[10px] font-bold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-white rounded shadow-md whitespace-nowrap opacity-0 scale-95 transition-all duration-150 ease-out group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 origin-bottom delay-500 z-30 border border-zinc-700/30 dark:border-zinc-200/30">
            Undo (⌘Z)
          </span>
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className={`${getUtilityButtonClass(!editor.can().chain().focus().redo().run())} relative group/tooltip`}
        >
          <Redo className="h-4 w-4" strokeWidth={1.5} />
          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 text-[10px] font-bold text-white dark:text-zinc-900 bg-zinc-900 dark:bg-white rounded shadow-md whitespace-nowrap opacity-0 scale-95 transition-all duration-150 ease-out group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 origin-bottom delay-500 z-30 border border-zinc-700/30 dark:border-zinc-200/30">
            Redo (⌘⇧Z)
          </span>
        </button>
      </div>
    )
  }

  const activeSubject = subjects.find(s => s.id === selectedSubjectId)

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 space-y-8 animate-fade-in relative">
      {/* Dynamic Background Glow for Note Editor Page */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-purple-500/[0.02] dark:bg-purple-500/[0.03] blur-[120px] pointer-events-none z-0" />

      {/* Top Navigation Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 relative z-10">
        <Link
          to="/subjects?tab=guides"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100/50 dark:bg-white/5 border border-zinc-200/60 dark:border-white/5 px-3 py-1.5 rounded-lg transition-all duration-200 hover:border-zinc-300 dark:hover:border-white/10 active:scale-98 group"
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
        <div className="flex flex-col lg:flex-row gap-6 items-start relative z-10 w-full">
          {/* Note Editor Column */}
          <div className={`w-full transition-all duration-300 ${isChatOpen ? 'lg:w-[calc(100%-380px)] xl:w-[calc(100%-440px)]' : 'lg:w-full'}`}>
            <div className="double-bezel-outer relative">
              <div className="double-bezel-inner shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]">
                {/* Note Title Input, Subject Selection, & Stats Bar */}
                <div className="p-6 sm:p-8 border-b border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-black/25 rounded-t-[calc(1.25rem-0.375rem)] flex flex-col gap-4">
                  <div className={`flex flex-col justify-between gap-4 ${isChatOpen ? 'xl:flex-row xl:items-center' : 'sm:flex-row sm:items-center'}`}>
                    <input
                      type="text"
                      value={title}
                      disabled={isSharedNote}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Give your study guide a title..."
                      className="flex-1 min-w-0 bg-transparent border-b border-transparent hover:border-zinc-200 dark:hover:border-white/5 focus:border-purple-500/40 focus:outline-none focus:ring-0 p-0 pb-1 font-display text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-700 tracking-tight transition-all duration-200 disabled:opacity-80"
                    />
                    
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">
                      {/* Export PDF button */}
                      <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-1.5 bg-zinc-100/80 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 border border-zinc-200/60 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-300 font-bold transition-all duration-200 cursor-pointer active:scale-98 shrink-0"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Export PDF</span>
                      </button>

                      {/* Chat with AI button */}
                      <button
                        onClick={() => setIsChatOpen(!isChatOpen)}
                        className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 text-xs font-bold transition-all duration-200 cursor-pointer active:scale-98 shrink-0 group ${
                          isChatOpen
                            ? 'bg-purple-600 text-white border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                            : 'bg-gradient-to-r from-purple-600/15 to-violet-600/15 hover:from-purple-600/25 hover:to-violet-600/25 border-purple-500/20 text-purple-300'
                        }`}
                      >
                        <Sparkles className={`h-3.5 w-3.5 ${isChatOpen ? 'animate-pulse text-white' : 'group-hover:animate-pulse'}`} />
                        <span>AI Chat</span>
                      </button>

                      {/* Share button */}
                      {!isSharedNote && (
                        <button
                          onClick={() => setIsShareModalOpen(true)}
                          className="flex items-center gap-1.5 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 rounded-xl px-3 py-1.5 text-xs text-purple-300 font-bold transition-all duration-200 cursor-pointer active:scale-98 shrink-0"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                          <span>Share</span>
                        </button>
                      )}

                      {/* Custom Dropdown Selector */}
                      <div ref={dropdownRef} className="relative shrink-0">
                        <button
                          onClick={() => !isSharedNote && setDropdownOpen(!dropdownOpen)}
                          disabled={isSharedNote}
                          className="flex items-center gap-2 bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20 rounded-xl px-3 py-1.5 text-xs text-zinc-800 dark:text-zinc-300 font-bold transition-all duration-200 cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Subject:</span>
                        {activeSubject && (
                          <span className={`h-2 w-2 rounded-full ${getSubjectColorStyles(activeSubject.color).dot} shrink-0`} />
                        )}
                        <span className="text-zinc-800 dark:text-zinc-200">{activeSubject ? activeSubject.name : 'Unassigned'}</span>
                        <ChevronDown className={`h-3 w-3 text-zinc-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Custom Dropdown Menu */}
                      {dropdownOpen && (
                        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-zinc-200 dark:border-white/10 bg-white/95 dark:bg-black/95 backdrop-blur-xl shadow-2xl z-30 py-1.5 animate-in fade-in slide-in-from-top-2 duration-205">
                          <button
                            onClick={() => {
                              handleSubjectChange('')
                              setDropdownOpen(false)
                            }}
                            className={`w-full text-left px-4 py-2 text-xs font-semibold flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors ${
                              !selectedSubjectId ? 'text-purple-600 dark:text-purple-400' : 'text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            <span>Unassigned</span>
                            {!selectedSubjectId && <Check className="h-3.5 w-3.5" />}
                          </button>

                          <div className="h-[1px] bg-zinc-200 dark:bg-white/10 my-1" />

                          <div className="max-h-60 overflow-y-auto">
                            {subjects.map((sub) => {
                              const isSelected = sub.id === selectedSubjectId
                              const styles = getSubjectColorStyles(sub.color)
                              return (
                                <button
                                  key={sub.id}
                                  onClick={() => {
                                    handleSubjectChange(sub.id)
                                    setDropdownOpen(false)
                                  }}
                                  className={`w-full text-left px-4 py-2 text-xs font-semibold flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors ${
                                    isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-zinc-700 dark:text-zinc-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    <span className={`h-2 w-2 rounded-full ${styles.dot} shrink-0`} />
                                    <span className="truncate">{sub.name}</span>
                                  </div>
                                  {isSelected && <Check className="h-3.5 w-3.5" />}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                  </div>

                  {/* Monospace Document Stats Bar */}
                  <div className="flex flex-wrap items-center gap-4 text-[10px] font-mono text-zinc-400 dark:text-zinc-500 border-t border-zinc-200/50 dark:border-white/5 pt-3 mt-1 select-none">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-purple-500/50 dark:text-purple-400/40" />
                      <span>WORDS: <strong className="text-zinc-700 dark:text-zinc-300 font-bold">{wordCount}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Type className="h-3.5 w-3.5 text-purple-500/50 dark:text-purple-400/40" />
                      <span>CHARS: <strong className="text-zinc-700 dark:text-zinc-300 font-bold">{charCount}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-purple-500/50 dark:text-purple-400/40" />
                      <span>READ TIME: <strong className="text-zinc-700 dark:text-zinc-300 font-bold">{readTime} MIN</strong></span>
                    </div>
                  </div>
                </div>

                {/* Sticky Floating Toolbar */}
                {!isSharedNote && renderToolbar()}

                {/* Editor Area with Academic Dot-Grid Background */}
                <div className="prose-editor p-4 sm:p-8 min-h-[400px] rounded-b-[calc(1.25rem-0.375rem)] bg-white dark:bg-[#08080a] bg-[radial-gradient(rgba(139,92,246,0.05)_1px,transparent_1px)] dark:bg-[radial-gradient(rgba(167,139,250,0.03)_1px,transparent_1px)] [background-size:24px_24px] relative">
                  <div className="max-w-[75ch] mx-auto relative z-10">
                    <EditorContent editor={editor} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Chat Card Column */}
          {isChatOpen && (
            <div className="w-full lg:w-[356px] xl:w-[416px] shrink-0 double-bezel-outer animate-fade-in relative z-10 lg:sticky lg:top-6">
              <div className="double-bezel-inner shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] bg-white dark:bg-[#08080a] h-[550px] lg:h-[calc(100vh-160px)] flex flex-col overflow-hidden">
                {/* Chat Header */}
                <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-white/[0.06] bg-zinc-50/50 dark:bg-black/25">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/20 border border-purple-500/20 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight">AI Study Assistant</h3>
                      <p className="text-[10px] text-zinc-500 font-semibold">Chat about this note</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsChatOpen(false)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-all duration-200 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
                  {chatMessages.length === 0 && !chatLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-4 opacity-60">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/10 flex items-center justify-center">
                        <MessageSquare className="h-7 w-7 text-purple-500/50" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-400 mb-1">Ask anything about your note</p>
                        <p className="text-xs text-zinc-600 leading-relaxed">
                          "Explain this concept", "Quiz me on this",<br />"Summarize the key points"
                        </p>
                      </div>
                    </div>
                  )}

                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-3 animate-fade-in ${
                        msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                      }`}
                    >
                      <div
                        className={`shrink-0 h-7 w-7 rounded-lg flex items-center justify-center mt-0.5 ${
                          msg.role === 'user'
                            ? 'bg-purple-500/15 border border-purple-500/20'
                            : 'bg-white/5 border border-white/[0.06]'
                        }`}
                      >
                        {msg.role === 'user' ? (
                          <User className="h-3.5 w-3.5 text-purple-400" />
                        ) : (
                          <Bot className="h-3.5 w-3.5 text-zinc-400" />
                        )}
                      </div>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-purple-500/15 border border-purple-500/15 text-purple-100 rounded-tr-md'
                            : 'bg-white/[0.04] border border-white/[0.06] text-zinc-300 rounded-tl-md'
                        }`}
                      >
                        <div
                          className="chat-message-content"
                          dangerouslySetInnerHTML={{ __html: renderChatMarkdown(msg.content) }}
                        />
                      </div>
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="flex gap-3 animate-fade-in">
                      <div className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center mt-0.5 bg-white/5 border border-white/[0.06]">
                        <Bot className="h-3.5 w-3.5 text-zinc-400" />
                      </div>
                      <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-tl-md px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-400/60 animate-bounce [animation-delay:0ms]"></span>
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-400/60 animate-bounce [animation-delay:150ms]"></span>
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-400/60 animate-bounce [animation-delay:300ms]"></span>
                          </div>
                          <span className="text-[11px] text-zinc-500 font-semibold">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="shrink-0 p-4 border-t border-zinc-200 dark:border-white/[0.06] bg-zinc-50/50 dark:bg-black/25">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <textarea
                        ref={chatInputRef}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={handleChatKeyDown}
                        placeholder="Ask about your notes..."
                        rows={1}
                        className="w-full resize-none rounded-xl bg-white/[0.04] border border-white/[0.08] focus:border-purple-500/30 focus:ring-0 focus:outline-none px-4 py-3 pr-10 text-[13px] text-white placeholder-zinc-600 transition-all duration-200 max-h-32 bg-transparent"
                        style={{ minHeight: '44px' }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement
                          target.style.height = '44px'
                          target.style.height = `${Math.min(target.scrollHeight, 128)}px`
                        }}
                      />
                    </div>
                    <button
                      onClick={handleSendChat}
                      disabled={!chatInput.trim() || chatLoading}
                      className="h-[44px] w-[44px] shrink-0 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-white/5 disabled:border-white/[0.06] border border-purple-500/50 disabled:border-white/[0.06] flex items-center justify-center transition-all duration-200 cursor-pointer disabled:cursor-not-allowed active:scale-95"
                    >
                      {chatLoading ? (
                        <Loader2 className="h-4 w-4 text-white/40 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 text-white disabled:text-zinc-600" />
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-600 mt-2 text-center font-medium">Press Enter to send · Shift+Enter for new line</p>
                </div>
              </div>
            </div>
          )}
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
    </div>
  )
}
