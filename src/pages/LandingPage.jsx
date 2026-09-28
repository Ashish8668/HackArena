import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

const steps = [
  {
    n: '01',
    title: 'You share your own details',
    body: 'Patients create a profile once. Coordinators stop retyping charts just to start a conversation.',
  },
  {
    n: '02',
    title: 'The system finds possible studies',
    body: 'Condition language is understood. Age, HbA1c, BMI, gender, and medicines are checked as written rules.',
  },
  {
    n: '03',
    title: 'A coordinator still decides',
    body: 'Potential match is not medical eligibility. Screening, contact, and enrollment stay with the research team.',
  },
]

export default function LandingPage({ signedIn = false, workspacePath = '/login' }) {
  return (
    <div className="min-h-screen bg-[#f4efe6] text-stone-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link to="/" className="text-sm font-semibold tracking-[0.18em] uppercase">
          Clinical Match
        </Link>
        <div className="flex items-center gap-3 text-sm">
          {signedIn ? (
            <Link to={workspacePath} className="rounded-full bg-stone-900 px-4 py-2 text-white hover:bg-stone-800">
              Open workspace
            </Link>
          ) : (
            <>
              <Link to="/login" className="rounded-full px-4 py-2 text-stone-700 hover:bg-stone-200/70">
                Sign in
              </Link>
              <Link to="/signup" className="rounded-full bg-stone-900 px-4 py-2 text-white hover:bg-stone-800">
                Get started
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-10 pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">Recruitment, not diagnosis</p>
        <h1 className="mt-4 max-w-4xl font-serif text-4xl leading-[1.1] tracking-tight text-stone-950 md:text-6xl">
          Fewer charts copied. More people actually reached.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600 md:text-lg">
          Clinical trial recruitment stalls when every participant has to be typed in by hand. Clinical Match lets people register themselves, then shows coordinators possible and close matches — with a reason for every criterion.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/signup?role=patient"
            className="inline-flex items-center gap-2 rounded-full bg-[#c45c26] px-5 py-3 text-sm font-semibold text-white hover:bg-[#a94c1e]"
          >
            Join as a participant <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/signup?role=coordinator"
            className="inline-flex items-center gap-2 rounded-full border border-stone-400 px-5 py-3 text-sm font-semibold text-stone-800 hover:bg-white"
          >
            Open a coordinator account
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5">
        <div className="overflow-hidden rounded-[2rem] border border-stone-300/70 shadow-[0_30px_80px_-40px_rgba(40,24,12,0.55)]">
          <img
            src="/images/landing-hero.png"
            alt="Two people talking through information on laptops at a cafe table"
            className="h-[280px] w-full object-cover object-center md:h-[460px]"
          />
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 py-16 md:grid-cols-3">
        {steps.map((step) => (
          <article key={step.n} className="rounded-3xl bg-white/70 p-6 ring-1 ring-stone-200">
            <p className="font-serif text-3xl text-[#c45c26]">{step.n}</p>
            <h2 className="mt-3 text-lg font-semibold">{step.title}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">{step.body}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-5 pb-20 lg:grid-cols-2">
        <Link to="/signup?role=patient" className="group overflow-hidden rounded-[2rem] bg-stone-900 text-white">
          <img src="/images/landing-patient.png" alt="Person completing a profile at home" className="h-64 w-full object-cover opacity-90 transition group-hover:opacity-100" />
          <div className="p-7">
            <p className="text-xs uppercase tracking-[0.2em] text-orange-200">For participants</p>
            <h2 className="mt-2 font-serif text-3xl">See possible studies in plain language</h2>
            <p className="mt-3 text-sm leading-6 text-stone-300">
              You enter your information. We never tell you that you are medically eligible. If something looks close, a coordinator can still reach out.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-orange-200">
              Create a participant account <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </Link>
        <Link to="/signup?role=coordinator" className="group overflow-hidden rounded-[2rem] bg-white ring-1 ring-stone-200">
          <img src="/images/landing-coordinator.png" alt="Coordinator reviewing notes at a desk" className="h-64 w-full object-cover" />
          <div className="p-7">
            <p className="text-xs uppercase tracking-[0.2em] text-[#c45c26]">For coordinators</p>
            <h2 className="mt-2 font-serif text-3xl text-stone-950">Review why someone matched — then contact them</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              Work from people who already registered. Inspect PASS/FAIL criteria, email from their stored address, and move Identified → Contacted → Screened → Enrolled.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-stone-900">
              Enter the workspace <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </Link>
      </section>

      <footer className="border-t border-stone-300/80 px-5 py-8 text-center text-xs text-stone-500">
        Screening support only. Final eligibility stays with the study team. Already have an account?{' '}
        <Link to="/login" className="font-semibold text-stone-800">
          Sign in
        </Link>
      </footer>
    </div>
  )
}
