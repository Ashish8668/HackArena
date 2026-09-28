import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Award, CheckCircle2, ChevronRight, Sliders, Sparkles, TrendingUp, Users, XCircle } from 'lucide-react'
import StatCard from '../components/StatCard'
import { listPatients } from '../firebase/patients'
import { listTrials } from '../firebase/trials'
import { listMatches } from '../firebase/matches'
import { listRecruitment } from '../firebase/recruitment'
import { RECRUITMENT_STATUSES } from '../matching/config'

export default function DashboardPage() {
  const [patients, setPatients] = useState([])
  const [trials, setTrials] = useState([])
  const [matches, setMatches] = useState([])
  const [recruitment, setRecruitment] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([listPatients(), listTrials(), listMatches(), listRecruitment()])
      .then(([nextPatients, nextTrials, nextMatches, nextRecruitment]) => {
        setPatients(nextPatients)
        setTrials(nextTrials)
        setMatches(nextMatches)
        setRecruitment(nextRecruitment)
      })
      .catch((err) => setError(err.message))
  }, [])

  const registeredCount = patients.filter((item) => item.source === 'self').length
  const potentialMatches = matches.filter((item) => item.eligible).length
  const nearEligiblePatients = new Set(matches.filter((item) => item.near_eligible).map((item) => item.patient_id)).size
  const contacted = recruitment.filter((item) => item.status === 'Contacted').length
  const screened = recruitment.filter((item) => item.status === 'Screened').length
  const enrolled = recruitment.filter((item) => item.status === 'Enrolled').length

  const pipeline = useMemo(() => {
    return trials.map((trial) => {
      const rows = recruitment.filter((item) => item.trial_id === trial.trial_id)
      const counts = Object.fromEntries(
        RECRUITMENT_STATUSES.map((status) => [status, rows.filter((item) => item.status === status).length]),
      )
      return { trial_id: trial.trial_id, title: trial.title, ...counts }
    })
  }, [trials, recruitment])

  const chartData = RECRUITMENT_STATUSES.map((status) => ({
    status,
    count: recruitment.filter((item) => item.status === status).length,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Coordinator Dashboard</h1>
        <p className="mt-1 text-xs text-slate-500">
          Monitor recruitment pipeline, 3-path eligibility distributions, and active study conversion funnels.
        </p>
      </div>

      {error ? <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</p> : null}

      {/* 3-Path Eligibility Engine Feature Banner */}
      <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-teal-300">
              <Award className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Clinical Decision Framework</span>
            </div>
            <h2 className="text-xl font-bold">3-Path Eligibility & Bottleneck Engine</h2>
            <p className="max-w-2xl text-xs text-slate-300 leading-relaxed">
              Every participant branches into: <strong>Path 1 (Ranked Shortlist with Priority Scores 0-100 & Multilingual Outreach)</strong>, <strong>Path 2 (Near-Miss Rescue with What-If Simulator & Watch-List)</strong>, and <strong>Path 3 (Cohort Bottlenecks & Refine Protocol Rules)</strong>.
            </p>
          </div>

          <Link
            to="/decision-paths"
            className="inline-flex items-center gap-2 rounded-xl bg-teal-400 px-5 py-3 text-xs font-bold text-slate-950 shadow-md hover:bg-teal-300 transition shrink-0"
          >
            Launch Decision Board <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total Registered Patients" value={patients.length} hint={`${registeredCount} self-registered profiles`} />
        <StatCard label="Path 1: Fully Eligible Matches" value={potentialMatches} hint="Priority scored (0-100)" />
        <StatCard label="Path 2: Near-Miss Candidates" value={nearEligiblePatients} hint="Rescuable via What-If Simulator" />
        <StatCard label="Outreach Contacted" value={contacted} hint="SMS / Email sent in EN/HI/MR" />
        <StatCard label="Screened & Consented" value={screened} hint="Patient informed consent logged" />
        <StatCard label="Enrolled in Trials" value={enrolled} hint="Completed full protocol enrollment" />
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs xl:col-span-2">
          <h2 className="text-base font-bold text-slate-900">Recruitment Conversion Funnel</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0f766e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs xl:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Protocol Recruitment Pipeline</h2>
            <Link to="/decision-paths" className="text-xs font-semibold text-teal-700 hover:underline">
              View All Decision Paths →
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="pb-3">Protocol</th>
                  {RECRUITMENT_STATUSES.map((status) => (
                    <th key={status} className="pb-3 text-center">
                      {status}
                    </th>
                  ))}
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pipeline.map((row) => (
                  <tr key={row.trial_id} className="hover:bg-slate-50/50">
                    <td className="py-3 font-medium">
                      <div className="font-bold text-teal-800">{row.trial_id}</div>
                      <div className="text-[11px] font-normal text-slate-500">{row.title}</div>
                    </td>
                    {RECRUITMENT_STATUSES.map((status) => (
                      <td key={status} className="py-3 text-center font-semibold text-slate-700">
                        {row[status]}
                      </td>
                    ))}
                    <td className="py-3 text-right">
                      <Link
                        to={`/decision-paths?trial=${row.trial_id}`}
                        className="rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-100 border border-teal-200"
                      >
                        Decision Board
                      </Link>
                    </td>
                  </tr>
                ))}
                {!pipeline.length ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      No protocols active yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
