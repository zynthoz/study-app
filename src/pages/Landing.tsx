import React from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  FileText,
  BookOpen,
  Award,
  MessageSquare,
  FolderOpen,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/* ═══════════════════════════════════════════════════════════
   PRIMITIVES
   ═══════════════════════════════════════════════════════════ */

function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true)
      return
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -32px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`landing-reveal ${visible ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function LogoMark({ className = 'h-full w-full' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      stroke="currentColor"
    >
      <g strokeWidth="2.5">
        <rect x="15" y="15" width="70" height="70" rx="6" />
        <rect x="15" y="15" width="70" height="70" rx="6" transform="rotate(45, 50, 50)" opacity="0.5" stroke-width="1.5" />
        <line x1="2" y1="50" x2="98" y2="50" strokeDasharray="4 4" strokeWidth="1" opacity="0.3" />
        <line x1="50" y1="2" x2="50" y2="98" strokeDasharray="4 4" strokeWidth="1" opacity="0.3" />
        <circle cx="50" cy="50" r="4.5" fill="currentColor" stroke="none" />
      </g>
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════
   NAVIGATION
   ═══════════════════════════════════════════════════════════ */

function LandingNav() {
  const [scrolled, setScrolled] = React.useState(false)

  React.useEffect(() => {
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 40)
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 pt-4 sm:pt-5">
      <div
        className={`max-w-5xl mx-auto flex items-center justify-between rounded-xl px-5 py-2.5 border transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          scrolled
            ? 'bg-black/70 backdrop-blur-xl border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)]'
            : 'bg-black/40 backdrop-blur-md border-white/[0.04]'
        }`}
      >
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] backdrop-blur-md border border-white/[0.08] text-purple-400 group-hover:text-purple-300 transition-colors duration-300 p-1.5 shadow-[0_0_15px_rgba(168,85,247,0.08)]">
            <LogoMark />
          </div>
          <span className="font-display text-sm font-bold text-white tracking-tight group-hover:text-purple-300 transition-colors duration-300">
            IndexAI
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="text-sm text-zinc-400 hover:text-white transition-colors duration-300 px-3 py-1.5 rounded-lg hover:bg-white/[0.04]"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 px-4 py-1.5 rounded-lg transition-all duration-300 active:scale-[0.98] shadow-[0_2px_10px_rgba(139,92,246,0.2)]"
          >
            Get started
          </Link>
        </div>
      </div>
    </nav>
  )
}

/* ═══════════════════════════════════════════════════════════
   HERO SECTION (CENTERED)
   ═══════════════════════════════════════════════════════════ */

function HeroSection() {
  return (
    <section className="relative min-h-[100dvh] flex items-center justify-center pt-28 pb-16 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 landing-dot-grid opacity-20 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 h-80 w-80 rounded-full bg-purple-500/5 blur-3xl animate-float-slow pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-indigo-500/5 blur-3xl animate-float-medium pointer-events-none"></div>

      <div className="max-w-3xl mx-auto px-6 w-full text-center flex flex-col items-center">
        <Reveal>
          <h1
            className="font-display font-bold tracking-[-0.03em] leading-[1.08] text-white"
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 4rem)',
              textWrap: 'balance',
            }}
          >
            Upload once.
            <br />
            <span className="text-purple-400">Master any subject.</span>
          </h1>
        </Reveal>

        <Reveal delay={80}>
          <p
            className="mt-6 text-sm sm:text-base text-zinc-400 leading-relaxed max-w-[40ch]"
            style={{ textWrap: 'pretty' }}
          >
            IndexAI extracts structured notes, creates flippable flashcards, and answers questions from your lecture files.
          </p>
        </Reveal>

        <Reveal delay={160}>
          <div className="mt-8">
            <Link
              to="/signup"
              className="landing-cta-primary inline-flex items-center gap-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 px-6 py-3 rounded-lg transition-all duration-300 active:scale-[0.98] shadow-[0_4px_20px_rgba(139,92,246,0.25)]"
            >
              Start studying free
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-white/10">
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   5-CELL SYMMETRIC BENTO GRID
   ═══════════════════════════════════════════════════════════ */

const featureList = [
  {
    icon: FileText,
    title: 'Notes Synthesis',
    description: 'Transform textbooks, lecture slides, and images into clean, structured study guides automatically.',
    span: 'md:col-span-1 lg:col-span-2',
  },
  {
    icon: BookOpen,
    title: 'Active Recall Cards',
    description: 'Practice with flippable flashcard decks generated directly from notes to test and reinforce memory.',
    span: 'md:col-span-1 lg:col-span-2',
  },
  {
    icon: Award,
    title: 'Practice Exams',
    description: 'Take mock tests with timers and instant scoring feedback to measure your subject preparation.',
    span: 'md:col-span-1 lg:col-span-2',
  },
  {
    icon: MessageSquare,
    title: 'Contextual AI Chat',
    description: 'Query the assistant side-by-side with notes to clarify formulas and quiz yourself on demand.',
    span: 'md:col-span-1 lg:col-span-3',
  },
  {
    icon: FolderOpen,
    title: 'Subject Workspace Hubs',
    description: 'Keep all lecture files, notes, cards, and exam sessions organized within designated folder workspaces.',
    span: 'md:col-span-2 lg:col-span-3',
  },
]

function FeatureGrid() {
  return (
    <section className="py-24 border-t border-white/[0.04] px-6">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight mb-4 text-center">
            Study space features
          </h2>
          <p className="text-zinc-500 text-center mb-14 max-w-[48ch] mx-auto">
            One workspace, multiple outputs. Everything aligns to maximize retention.
          </p>
        </Reveal>

        {/* 6-Column Base Grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          {featureList.map((f, i) => {
            const Icon = f.icon
            return (
              <Reveal key={f.title} delay={i * 60} className={f.span}>
                <div className="h-full rounded-xl border border-white/[0.04] bg-[#0c0c10]/20 p-6 flex flex-col justify-between shadow-[0_4px_30px_rgba(0,0,0,0.5)] transition-all duration-300 hover:border-white/[0.08] hover:bg-white/[0.01]">
                  <div>
                    <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-5 text-purple-400">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <h3 className="font-display text-sm font-semibold text-white mb-2 tracking-tight">
                      {f.title}
                    </h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      {f.description}
                    </p>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   CTA SECTION
   ═══════════════════════════════════════════════════════════ */

function CTASection() {
  return (
    <section className="py-20 lg:py-28 px-6">
      <div className="max-w-4xl mx-auto">
        <Reveal>
          <div className="rounded-xl p-[5px] bg-white/[0.01] border border-white/[0.04] shadow-[0_4px_40px_rgba(0,0,0,0.6)]">
            <div className="relative rounded-[calc(0.75rem-5px)] bg-[#07070a] px-8 py-16 lg:px-16 lg:py-20 text-center overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-56 w-56 rounded-full bg-purple-500/[0.05] blur-[80px] pointer-events-none" />

              <div className="relative z-10">
                <h2
                  className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight mb-4"
                  style={{
                    fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                    textWrap: 'balance',
                  }}
                >
                  Your next exam starts here
                </h2>
                <p className="text-zinc-500 text-sm sm:text-base mb-8 max-w-[36ch] mx-auto">
                  Free to use. No credit card required.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link
                    to="/signup"
                    className="landing-cta-primary inline-flex items-center gap-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 px-6 py-3 rounded-lg transition-all duration-300 active:scale-[0.98]"
                  >
                    Create free account
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-white/10">
                      <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════════ */

function FooterSection() {
  return (
    <footer className="border-t border-white/[0.04] py-8 px-6 bg-[#080c14]">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-purple-400">
          <div className="h-5 w-5">
            <LogoMark />
          </div>
          <span className="text-xs text-zinc-500 font-medium tracking-tight">
            IndexAI
          </span>
        </div>
        <p className="text-xs text-zinc-600">
          &copy; {new Date().getFullYear()} IndexAI. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

/* ═══════════════════════════════════════════════════════════
   PAGE EXPORT
   ═══════════════════════════════════════════════════════════ */

export function Landing() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080c14] relative overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl animate-float-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl animate-float-medium"></div>
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent shadow-[0_0_15px_rgba(168,85,247,0.5)]"></div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="relative min-h-screen bg-[#080c14] text-zinc-100 overflow-x-clip">
      <LandingNav />
      <HeroSection />
      <FeatureGrid />
      <CTASection />
      <FooterSection />
    </div>
  )
}
