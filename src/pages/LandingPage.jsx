import { Link } from 'react-router-dom'

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
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="rounded-full px-4 py-2 text-stone-700 hover:bg-stone-200/70">
                Sign in
              </Link>
              <Link to="/signup" className="rounded-full bg-stone-900 px-4 py-2 text-white hover:bg-stone-800">
                Register
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-10 pt-6">
        <h1 className="max-w-3xl font-serif text-4xl leading-tight text-stone-950 md:text-5xl">
          Clinical trial matching
        </h1>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/signup?role=patient"
            className="rounded-full bg-[#c45c26] px-5 py-3 text-sm font-semibold text-white hover:bg-[#a94c1e]"
          >
            Participant
          </Link>
          <Link
            to="/signup?role=coordinator"
            className="rounded-full border border-stone-400 px-5 py-3 text-sm font-semibold text-stone-800 hover:bg-white"
          >
            Coordinator
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16">
        <img
          src="/images/landing-hero.png"
          alt=""
          className="h-[280px] w-full rounded-[1.5rem] object-cover md:h-[420px]"
        />
      </section>
    </div>
  )
}
