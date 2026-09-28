import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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
      const counts = Object.fromEntries(RECRUITMENT_STATUSES.map((status) => [status, rows.filter((item) => item.status === status).length]))
      return { trial_id: trial.trial_id, title: trial.title, ...counts }
    })
  }, [trials, recruitment])

  const chartData = RECRUITMENT_STATUSES.map((status) => ({
    status,
    count: recruitment.filter((item) => item.status === status).length,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Coordinator dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Patients register themselves. You review potential matches, explain criteria, contact people, then screen and enroll. Nothing here is a final medical eligibility decision.
        </p>
      </div>

      {error ? <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total patients" value={patients.length} hint={`${registeredCount} self-registered`} />
        <StatCard label="Potential matches" value={potentialMatches} hint="Structured criteria currently pass" />
        <StatCard label="Near-eligible patients" value={nearEligiblePatients} hint="Close numeric miss — still not eligible" />
        <StatCard label="Contacted" value={contacted} />
        <StatCard label="Screened" value={screened} />
        <StatCard label="Enrolled" value={enrolled} />
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="font-semibold">Recruitment pipeline</h2>
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

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Pipeline by trial</h2>
            <Link to="/settings" className="text-sm text-teal-700">
              Seed demo trials
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3">Trial</th>
                  {RECRUITMENT_STATUSES.map((status) => (
                    <th key={status} className="pb-3">
                      {status}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pipeline.map((row) => (
                  <tr key={row.trial_id} className="border-t border-slate-100">
                    <td className="py-3 font-medium">
                      {row.trial_id}
                      <div className="text-xs font-normal text-slate-500">{row.title}</div>
                    </td>
                    {RECRUITMENT_STATUSES.map((status) => (
                      <td key={status}>{row[status]}</td>
                    ))}
                  </tr>
                ))}
                {!pipeline.length ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-slate-500">
                      No trials yet. Seed demo trials from Data Setup so patients can be matched.
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
