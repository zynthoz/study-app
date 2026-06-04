import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  Award,
  BookOpen,
  MessageSquare,
  Upload,
  Sparkles,
  ArrowRight,
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════
   PRIMITIVES
   ═══════════════════════════════════════════════════════════ */

/** Scroll-reveal wrapper – fades + slides up + deblurs on viewport entry */
function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
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

/** Mouse-tracking 3D tilt – sets CSS custom properties, no React re-renders */
function TiltCard({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  const onMove = useCallback((e: React.MouseEvent) => {
    if (reduced.current || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    ref.current.style.setProperty('--tilt-x', `${-y * 5}deg`)
    ref.current.style.setProperty('--tilt-y', `${x * 5}deg`)
  }, [])

  const onLeave = useCallback(() => {
    if (!ref.current) return
    ref.current.style.setProperty('--tilt-x', '0deg')
    ref.current.style.setProperty('--tilt-y', '0deg')
  }, [])

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`landing-tilt ${className}`}
    >
      {children}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   LOGO MARK (inline SVG – matches Navbar)
   ═══════════════════════════════════════════════════════════ */

function LogoMark({ className = 'h-full w-full' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill="none"
      stroke="currentColor"
    >
      <rect x="30" y="30" width="40" height="40" rx="4" strokeWidth="6" />
      <rect
        x="30"
        y="30"
        width="40"
        height="40"
        rx="4"
        transform="rotate(45, 50, 50)"
        opacity="0.6"
        strokeWidth="4"
      />
      <circle cx="50" cy="50" r="7" fill="currentColor" stroke="none" />
    </svg>
  )
}

/* ═══════════════════════════════════════════════════════════
   NAVIGATION
   ═══════════════════════════════════════════════════════════ */

function LandingNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
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
        {/* Brand */}
        <Link to="/welcome" className="flex items-center gap-2.5 group">
          <div className="h-7 w-7 flex items-center justify-center text-purple-400 group-hover:text-purple-300 transition-colors duration-300">
            <LogoMark />
          </div>
          <span className="font-display text-sm font-bold text-white tracking-tight group-hover:text-purple-300 transition-colors duration-300">
            IndexAI
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="text-sm text-zinc-400 hover:text-white transition-colors duration-300 px-3 py-1.5 rounded-lg hover:bg-white/[0.04]"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 px-4 py-1.5 rounded-lg transition-all duration-300 active:scale-[0.98]"
          >
            Get started
          </Link>
        </div>
      </div>
    </nav>
  )
}

/* ═══════════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════════ */

function HeroSection() {
  return (
    <section className="relative min-h-[100dvh] flex items-center pt-24 pb-16 landing-light-sweep">
      {/* Atmospheric background */}
      <div className="absolute inset-0 landing-dot-grid opacity-25 pointer-events-none" />
      <div className="absolute top-1/4 -left-40 h-[500px] w-[500px] rounded-full bg-purple-500/[0.035] blur-[120px] animate-float-slow pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 h-[400px] w-[400px] rounded-full bg-indigo-500/[0.03] blur-[100px] animate-float-medium pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 w-full grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left — Copy */}
        <div className="max-w-xl">
          <Reveal>
            <h1
              className="font-display font-bold tracking-[-0.02em] leading-[1.1] text-white"
              style={{
                fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
                textWrap: 'balance',
              }}
            >
              One upload.
              <br />
              <span className="text-purple-400">
                Notes, exams, flashcards.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={80}>
            <p
              className="mt-6 text-base sm:text-lg text-zinc-400 leading-relaxed max-w-[48ch]"
              style={{ textWrap: 'pretty' }}
            >
              IndexAI reads your textbooks and lecture materials, then generates
              everything you need for your next exam.
            </p>
          </Reveal>

          <Reveal delay={160}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/signup"
                className="landing-cta-primary inline-flex items-center gap-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 px-6 py-3 rounded-lg transition-all duration-300 active:scale-[0.98]"
              >
                Start studying free
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-white/10 transition-transform duration-300 group-hover:translate-x-0.5">
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
              </Link>
              <Link
                to="/login"
                className="text-sm font-medium text-zinc-400 hover:text-white px-5 py-3 rounded-lg transition-all duration-300 border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.03]"
              >
                Sign in
              </Link>
            </div>
          </Reveal>
        </div>

        {/* Right — Animated brand visual */}
        <Reveal delay={200} className="hidden lg:block">
          <TiltCard>
            <div className="relative">
              {/* Ambient glow */}
              <div className="absolute inset-0 bg-purple-500/[0.05] blur-[60px] rounded-full scale-75 pointer-events-none" />

              {/* Double-bezel frame */}
              <div className="relative rounded-xl p-1.5 bg-white/[0.015] border border-white/[0.04] shadow-[0_4px_40px_rgba(0,0,0,0.5)]">
                <div className="rounded-[calc(0.75rem-6px)] bg-[#06060a] border border-white/[0.015] p-10 flex items-center justify-center aspect-square">
                  <svg viewBox="0 0 400 400" className="w-full max-w-[300px]">
                    {/* Outer orbit — slow rotation */}
                    <circle
                      cx="200"
                      cy="200"
                      r="190"
                      stroke="rgba(139,92,246,0.06)"
                      strokeWidth="0.5"
                      fill="none"
                      strokeDasharray="6 12"
                      className="landing-spin-slow"
                      style={{ transformOrigin: '200px 200px' }}
                    />
                    {/* Static ring */}
                    <circle
                      cx="200"
                      cy="200"
                      r="165"
                      stroke="rgba(139,92,246,0.07)"
                      strokeWidth="0.75"
                      fill="none"
                    />

                    {/* Grid axes */}
                    <line
                      x1="30"
                      y1="200"
                      x2="370"
                      y2="200"
                      stroke="rgba(139,92,246,0.04)"
                      strokeDasharray="4 8"
                      strokeWidth="0.5"
                    />
                    <line
                      x1="200"
                      y1="30"
                      x2="200"
                      y2="370"
                      stroke="rgba(139,92,246,0.04)"
                      strokeDasharray="4 8"
                      strokeWidth="0.5"
                    />

                    {/* Primary square */}
                    <rect
                      x="120"
                      y="120"
                      width="160"
                      height="160"
                      rx="16"
                      stroke="#8b5cf6"
                      strokeWidth="2.5"
                      fill="none"
                      className="landing-pulse-opacity"
                    />
                    {/* Rotated square */}
                    <rect
                      x="120"
                      y="120"
                      width="160"
                      height="160"
                      rx="16"
                      transform="rotate(45, 200, 200)"
                      stroke="#a78bfa"
                      strokeWidth="1.5"
                      fill="none"
                      opacity="0.35"
                    />

                    {/* Center nucleus */}
                    <circle cx="200" cy="200" r="14" fill="#8b5cf6" opacity="0.75" />
                    <circle
                      cx="200"
                      cy="200"
                      r="24"
                      stroke="#8b5cf6"
                      strokeWidth="0.75"
                      fill="none"
                      opacity="0.2"
                    />

                    {/* Corner nodes */}
                    <circle cx="120" cy="120" r="3" fill="#8b5cf6" opacity="0.3" />
                    <circle cx="280" cy="120" r="3" fill="#8b5cf6" opacity="0.3" />
                    <circle cx="120" cy="280" r="3" fill="#8b5cf6" opacity="0.3" />
                    <circle cx="280" cy="280" r="3" fill="#8b5cf6" opacity="0.3" />

                    {/* Diagonal corner nodes (rotated square vertices) */}
                    <circle cx="200" cy="87" r="2.5" fill="#a78bfa" opacity="0.2" />
                    <circle cx="313" cy="200" r="2.5" fill="#a78bfa" opacity="0.2" />
                    <circle cx="200" cy="313" r="2.5" fill="#a78bfa" opacity="0.2" />
                    <circle cx="87" cy="200" r="2.5" fill="#a78bfa" opacity="0.2" />

                    {/* Central glow */}
                    <circle cx="200" cy="200" r="90" fill="url(#heroGlow)" />

                    <defs>
                      <radialGradient id="heroGlow">
                        <stop
                          offset="0%"
                          stopColor="#8b5cf6"
                          stopOpacity="0.1"
                        />
                        <stop
                          offset="100%"
                          stopColor="#8b5cf6"
                          stopOpacity="0"
                        />
                      </radialGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>
          </TiltCard>
        </Reveal>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════
   FEATURES (bento grid — alternating column spans)
   ═══════════════════════════════════════════════════════════ */

const features = [
  {
    icon: FileText,
    title: 'Structured notes from any file',
    description:
      'Upload a PDF, photo, or document. Get back structured markdown notes with headings, key concepts, definitions, and summaries.',
    span: 'lg:col-span-7',
    glowPos: '-top-8 -right-8',
    glowColor: 'bg-purple-500/[0.04]',
  },
  {
    icon: Award,
    title: 'Practice exams, scored instantly',
    description:
      'Generate multiple-choice and open-ended questions from your content. Take timed exams and get your score immediately.',
    span: 'lg:col-span-5',
    glowPos: '-bottom-8 -left-8',
    glowColor: 'bg-indigo-500/[0.04]',
  },
  {
    icon: BookOpen,
    title: 'Flashcards for active recall',
    description:
      'Auto-generated flashcard decks from your notes. Flip through cards and track which concepts you\'ve mastered.',
    span: 'lg:col-span-5',
    glowPos: '-bottom-8 -right-8',
    glowColor: 'bg-violet-500/[0.04]',
  },
  {
    icon: MessageSquare,
    title: 'Chat with your notes',
    description:
      'Ask IndexAI questions about any note. Get explanations, worked examples, and deeper understanding on demand.',
    span: 'lg:col-span-7',
    glowPos: '-top-8 -left-8',
    glowColor: 'bg-blue-500/[0.04]',
  },
]

function FeaturesSection() {
  return (
    <section className="py-24 lg:py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <h2
            className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight mb-4 text-center"
            style={{ textWrap: 'balance' }}
          >
            Your study toolkit
          </h2>
          <p className="text-zinc-500 text-center mb-14 max-w-[50ch] mx-auto">
            Upload once. Every tool works with your content.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
          {features.map((f, i) => {
            const Icon = f.icon
            return (
              <Reveal
                key={f.title}
                delay={i * 80}
                className={f.span}
              >
                <div className="h-full rounded-xl p-[5px] bg-white/[0.012] border border-white/[0.04] shadow-[0_4px_30px_rgba(0,0,0,0.6)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-white/[0.08] hover:-translate-y-0.5">
                  <div className="relative h-full rounded-[calc(0.75rem-5px)] bg-[#08080a] border border-white/[0.015] p-6 lg:p-8 overflow-hidden">
                    {/* Decorative glow */}
                    <div
                      className={`absolute ${f.glowPos} h-40 w-40 rounded-full ${f.glowColor} blur-[60px] pointer-events-none`}
                    />

                    <div className="relative z-10">
                      <div className="h-11 w-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-5 transition-colors duration-300">
                        <Icon
                          className="h-5 w-5 text-purple-400"
                          strokeWidth={1.5}
                        />
                      </div>
                      <h3 className="font-display text-base lg:text-lg font-semibold text-white mb-2.5 tracking-tight">
                        {f.title}
                      </h3>
                      <p className="text-sm text-zinc-500 leading-relaxed max-w-[45ch]">
                        {f.description}
                      </p>
                    </div>
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
   PROCESS (How it works — 3-step flow, no numbered markers)
   ═══════════════════════════════════════════════════════════ */

const processSteps = [
  {
    icon: Upload,
    title: 'Upload your materials',
    description: 'PDFs, photos, slide decks, or handwritten notes.',
  },
  {
    icon: Sparkles,
    title: 'AI generates your study kit',
    description:
      'IndexAI parses your content and creates notes, exams, and flashcards.',
  },
  {
    icon: BookOpen,
    title: 'Study and track progress',
    description:
      'Review notes, take exams, flip flashcards, and watch your scores improve.',
  },
]

function ProcessSection() {
  return (
    <section className="py-20 lg:py-28 px-6">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <h2
            className="font-display text-2xl sm:text-3xl font-bold text-white text-center mb-16 tracking-tight"
            style={{ textWrap: 'balance' }}
          >
            How it works
          </h2>
        </Reveal>

        <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-14 lg:gap-6">
          {/* Connector line — desktop only */}
          <div
            className="hidden lg:block absolute h-px border-t border-dashed border-white/[0.08]"
            style={{ top: '28px', left: '20%', right: '20%' }}
          />

          {processSteps.map((step, i) => {
            const Icon = step.icon
            return (
              <Reveal key={step.title} delay={i * 100}>
                <div className="flex flex-col items-center text-center">
                  <div className="relative z-10 h-14 w-14 rounded-full bg-[#08080a] border border-white/[0.08] flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(139,92,246,0.05)]">
                    <Icon
                      className="h-5 w-5 text-purple-400"
                      strokeWidth={1.5}
                    />
                  </div>
                  <h3 className="font-display text-sm font-semibold text-white mb-1.5">
                    {step.title}
                  </h3>
                  <p className="text-xs text-zinc-500 leading-relaxed max-w-[28ch]">
                    {step.description}
                  </p>
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
   CTA
   ═══════════════════════════════════════════════════════════ */

function CTASection() {
  return (
    <section className="py-20 lg:py-28 px-6">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="rounded-xl p-[5px] bg-white/[0.012] border border-white/[0.04] shadow-[0_4px_40px_rgba(0,0,0,0.6)]">
            <div className="relative rounded-[calc(0.75rem-5px)] bg-[#08080a] border border-white/[0.015] px-8 py-16 lg:px-16 lg:py-20 text-center overflow-hidden">
              {/* Background glow */}
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
                    Create your account
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-white/10">
                      <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                    </span>
                  </Link>
                  <Link
                    to="/login"
                    className="text-sm font-medium text-zinc-400 hover:text-white px-5 py-3 rounded-lg transition-all duration-300 border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.03]"
                  >
                    Sign in
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
    <footer className="border-t border-white/[0.04] py-8 px-6">
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
  return (
    <div className="relative min-h-screen bg-[#030303] text-zinc-100 overflow-x-clip">
      <LandingNav />
      <HeroSection />
      <FeaturesSection />
      <ProcessSection />
      <CTASection />
      <FooterSection />
    </div>
  )
}
