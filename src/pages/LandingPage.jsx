import { Link } from 'react-router-dom'
import { ArrowRight, Award, BarChart3, CheckCircle2, Flame, HeartHandshake, Mail, Shield, Sliders, Sparkles } from 'lucide-react'

const steps = [
  {
    n: 'Path 1: Yes',
    title: 'Ranked Shortlist & Multilingual Outreach',
    body: 'Eligible patients receive a priority score from 0 to 100. Coordinators review top fits, draft SMS/email outreach in English, Hindi, or Marathi, and log informed consent.',
    icon: Flame,
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  {
    n: 'Path 2: Almost',
    title: 'Near-Miss Rescue & What-If Simulator',
    body: 'Patients separated by a minor gap (HbA1c <= 0.5%, BMI <= 2) are simulated interactively. Add to watch-lists, schedule re-tests, and graduate them into Path 1.',
    icon: Sliders,
    color: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  {
    n: 'Path 3: No',
    title: 'Bottleneck Analyzer & Protocol Refinement',
    body: 'Identifies which protocol rules reject the most participants (e.g. 60% rejected by HbA1c). Trial Heads can simulate protocol amendments to safely optimize enrollment yield.',
    icon: BarChart3,
    color: 'text-rose-700 bg-rose-50 border-rose-200',
  },
]

export default function LandingPage({ signedIn = false, workspacePath = '/login' }) {
  return (
    <div className="min-h-screen bg-[#f4efe6] text-stone-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/" className="text-sm font-bold tracking-[0.18em] uppercase text-stone-900">
          TrialMatch Core System
        </Link>
        <div className="flex items-center gap-3 text-xs">
          {signedIn ? (
            <Link to={workspacePath} className="rounded-full bg-stone-900 px-4 py-2 font-semibold text-white hover:bg-stone-800">
              Open Workspace
            </Link>
          ) : (
            <>
              <Link to="/login" className="rounded-full px-4 py-2 font-semibold text-stone-700 hover:bg-stone-200/70">
                Sign In / Demo
              </Link>
              <Link to="/signup" className="rounded-full bg-stone-900 px-4 py-2 font-semibold text-white hover:bg-stone-800">
                Create Account
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-8 pt-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white/60 px-3.5 py-1 text-xs font-semibold text-stone-700">
          <Sparkles className="h-3.5 w-3.5 text-amber-600" />
          Powered by 3-Path Eligibility Engine & Gemini AI Medicine RAG
        </div>
        <h1 className="mt-4 max-w-4xl font-serif text-4xl leading-[1.1] tracking-tight text-stone-950 md:text-6xl">
          Smarter Clinical Trial Matching. Transparent 3-Path Decisions.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600 md:text-lg">
          Transform clinical trial recruitment from guesswork into structured precision. Self-registered patients branch into <strong>Eligible (Priority Scored 0-100)</strong>, <strong>Near-Miss (What-If Rescue)</strong>, and <strong>Ineligible (Bottleneck Analysis)</strong>.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full bg-[#c45c26] px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-[#a94c1e]"
          >
            Launch 1-Click Demo Workspace <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/signup?role=patient"
            className="inline-flex items-center gap-2 rounded-full border border-stone-400 bg-white/70 px-5 py-3 text-sm font-semibold text-stone-800 hover:bg-white"
          >
            Participant Portal
          </Link>
        </div>
      </section>

      {/* 3-Path Framework Section */}
      <section className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">Decision Architecture</span>
          <h2 className="text-2xl font-serif font-bold text-stone-900">The 3 Eligibility Paths</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon
            return (
              <article key={step.n} className="rounded-3xl border border-stone-200 bg-white/80 p-6 shadow-xs">
                <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1 text-xs font-bold ${step.color}`}>
                  <Icon className="h-4 w-4" />
                  {step.n}
                </div>
                <h3 className="mt-4 text-base font-bold text-stone-900">{step.title}</h3>
                <p className="mt-2 text-xs leading-5 text-stone-600">{step.body}</p>
              </article>
            )
          })}
        </div>
      </section>

      {/* Role Cards Section */}
      <section className="mx-auto grid max-w-6xl gap-6 px-5 pb-16 lg:grid-cols-3">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Patient (Self Access)</span>
          <h3 className="mt-2 font-serif text-xl text-stone-900">Discover & Apply for Studies</h3>
          <p className="mt-2 text-xs text-stone-600 leading-relaxed">
            Enter your basic clinical info once. View only eligible studies you qualify for, submit applications, and grant informed screening consent.
          </p>
          <Link
            to="/login"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:underline"
          >
            Try Patient Portal →
          </Link>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Research Coordinator</span>
          <h3 className="mt-2 font-serif text-xl text-stone-900">Manage Recruitment Pipeline</h3>
          <p className="mt-2 text-xs text-stone-600 leading-relaxed">
            Review ranked shortlists with priority scores (0-100), draft multilingual outreach (EN/HI/MR), and rescue near-misses with What-If simulations.
          </p>
          <Link
            to="/login"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:underline"
          >
            Try Coordinator Workspace →
          </Link>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-700">System Admin & Trial Head</span>
          <h3 className="mt-2 font-serif text-xl text-stone-900">Protocols, RAG & Analytics</h3>
          <p className="mt-2 text-xs text-stone-600 leading-relaxed">
            Configure medicine exclusion scopes (`exact_drug`, `same_class`, `same_effect`), manage Drug Knowledge Base, and test Gemini AI keys.
          </p>
          <Link
            to="/login"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:underline"
          >
            Try Admin Control Center →
          </Link>
        </div>
      </section>

      <footer className="border-t border-stone-300/80 px-5 py-8 text-center text-xs text-stone-500">
        TrialMatch Core System · Practice Data & Ethical Clinical Research Assisting Platform ·{' '}
        <Link to="/login" className="font-semibold text-stone-800 hover:underline">
          Sign In
        </Link>
      </footer>
    </div>
  )
}
