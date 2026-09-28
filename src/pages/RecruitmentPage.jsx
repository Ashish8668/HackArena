import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listRecruitment, upsertRecruitment } from '../firebase/recruitment'
import { listPatients } from '../firebase/patients'
import { listTrials } from '../firebase/trials'
import { RECRUITMENT_STATUSES } from '../matching/config'
import StatusBadge from '../components/StatusBadge'
import { contactPatientMailto } from '../services/runMatching'

export default function RecruitmentPage() {
  const [rows, setRows] = useState([])
  const [trials, setTrials] = useState([])
  const [patients, setPatients] = useState([])
  const [statusFilter, setStatusFilter] = useState('All')

  async function refresh() {
    const [nextRows, nextTrials, nextPatients] = await Promise.all([listRecruitment(), listTrials(), listPatients()])
    setRows(nextRows)
    setTrials(nextTrials)
    setPatients(nextPatients)
  }

  useEffect(() => {
    refresh()
  }, [])

  const filtered = useMemo(
    () => rows.filter((row) => statusFilter === 'All' || row.status === statusFilter),
    [rows, statusFilter],
  )

  async function updateStatus(row, status) {
    await upsertRecruitment({ patient_id: row.patient_id, trial_id: row.trial_id, status })
    await refresh()
  }

  function trialTitle(trialId) {
    return trials.find((trial) => trial.trial_id === trialId)?.title || trialId
  }

  function patientRecord(patientId) {
    return patients.find((item) => item.patient_id === patientId)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Recruitment tracking</h1>
        <p className="text-sm text-slate-500">Move a self-registered or demo participant from identified to enrolled for each trial.</p>
      </div>
      <select
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
      >
        <option>All</option>
        {RECRUITMENT_STATUSES.map((status) => (
          <option key={status}>{status}</option>
        ))}
      </select>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Trial</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Update</th>
              <th className="px-4 py-3">Contact</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const person = patientRecord(row.patient_id)
              const mail = contactPatientMailto(person, { title: trialTitle(row.trial_id) })
              return (
                <tr key={`${row.patient_id}_${row.trial_id}`} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <Link className="font-medium text-teal-700" to={`/patients/${row.patient_id}`}>
                      {person?.name || row.patient_id}
                    </Link>
                    <div className="text-xs text-slate-500">{person?.email || row.patient_id}</div>
                  </td>
                  <td className="px-4 py-3">
                    {row.trial_id}
                    <div className="text-xs text-slate-500">{trialTitle(row.trial_id)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={row.status} />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg border border-slate-300 px-3 py-1.5"
                      value={row.status}
                      onChange={(e) => updateStatus(row, e.target.value)}
                    >
                      {RECRUITMENT_STATUSES.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {mail ? (
                      <a className="text-teal-700" href={mail}>
                        Email
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              )
            })}
            {!filtered.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-slate-500">
                  No recruitment records yet. They appear when a patient profile is matched to a study.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
