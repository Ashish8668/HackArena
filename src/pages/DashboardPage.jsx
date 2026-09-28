import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import { listPatients } from '../firebase/patients'
import { listTrials } from '../firebase/trials'
import { listRecruitment } from '../firebase/recruitment'
import { RECRUITMENT_STATUSES } from '../matching/config'

export default function DashboardPage() {
  const [patients, setPatients] = useState([])
  const [trials, setTrials] = useState([])
  const [recruitment, setRecruitment] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([listPatients(), listTrials(), listRecruitment()])
      .then(([nextPatients, nextTrials, nextRecruitment]) => {
        setPatients(nextPatients)
        setTrials(nextTrials)
        setRecruitment(nextRecruitment)
      })
      .catch((err) => setError(err.message))
  }, [])

  const applied = recruitment.filter((item) => item.status === 'Applied').length
  const identified = recruitment.filter((item) => item.status === 'Identified').length
  const enrolled = recruitment.filter((item) => item.status === 'Enrolled').length

  const trialRows = useMemo(() => {
    return trials.map((trial) => {
      const rows = recruitment.filter((item) => item.trial_id === trial.trial_id)
      const counts = Object.fromEntries(
        RECRUITMENT_STATUSES.map((status) => [status, rows.filter((item) => item.status === status).length]),
      )
      return { ...trial, ...counts }
    })
  }, [trials, recruitment])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {error ? <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Trials" value={trials.length} />
        <StatCard label="Participants" value={patients.length} />
        <StatCard label="Applied" value={applied} />
        <StatCard label="Identified" value={identified} />
        <StatCard label="Enrolled" value={enrolled} />
      </div>

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-4">
          <h2 className="font-semibold">Trials</h2>
          <Link to="/trials" className="text-sm text-teal-700">
            Open
          </Link>
        </div>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Trial</th>
              {RECRUITMENT_STATUSES.map((status) => (
                <th key={status} className="px-4 py-3">
                  {status}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trialRows.map((row) => (
              <tr key={row.trial_id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <Link className="font-medium text-teal-700" to={`/trials/${row.trial_id}`}>
                    {row.trial_id}
                  </Link>
                  <div className="text-xs text-slate-500">{row.title}</div>
                </td>
                {RECRUITMENT_STATUSES.map((status) => (
                  <td key={status} className="px-4 py-3">
                    {row[status]}
                  </td>
                ))}
              </tr>
            ))}
            {!trialRows.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-slate-500">
                  No trials.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-4">
          <h2 className="font-semibold">Participants</h2>
          <Link to="/patients" className="text-sm text-teal-700">
            Open
          </Link>
        </div>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Condition</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Applications</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((patient) => {
              const rows = recruitment.filter((item) => item.patient_id === patient.patient_id)
              return (
                <tr key={patient.patient_id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <Link className="font-medium text-teal-700" to={`/patients/${patient.patient_id}`}>
                      {patient.patient_id}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{patient.name || '—'}</td>
                  <td className="px-4 py-3">{patient.condition}</td>
                  <td className="px-4 py-3">{patient.source === 'self' ? 'Registered' : 'Added'}</td>
                  <td className="px-4 py-3">
                    {rows.length ? (
                      <div className="flex flex-wrap gap-1">
                        {rows.map((item) => (
                          <StatusBadge key={item.trial_id} value={item.status} />
                        ))}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              )
            })}
            {!patients.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-slate-500">
                  No participants.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  )
}
