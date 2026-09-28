import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Award, CheckCircle2, HeartHandshake, Mail, UserCheck } from 'lucide-react'
import { listRecruitment, upsertRecruitment } from '../firebase/recruitment'
import { listPatients } from '../firebase/patients'
import { listTrials } from '../firebase/trials'
import { RECRUITMENT_STATUSES } from '../matching/config'
import StatusBadge from '../components/StatusBadge'
import OutreachModal from '../components/OutreachModal'

export default function RecruitmentPage() {
  const [rows, setRows] = useState([])
  const [trials, setTrials] = useState([])
  const [patients, setPatients] = useState([])
  const [statusFilter, setStatusFilter] = useState('All')
  const [activeOutreach, setActiveOutreach] = useState(null)

  async function refresh() {
    const [nextRows, nextTrials, nextPatients] = await Promise.all([
      listRecruitment(),
      listTrials(),
      listPatients(),
    ])
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
    await upsertRecruitment({
      ...row,
      patient_id: row.patient_id,
      trial_id: row.trial_id,
      status,
    })
    await refresh()
  }

  async function grantConsent(row) {
    await upsertRecruitment({
      ...row,
      patient_id: row.patient_id,
      trial_id: row.trial_id,
      status: 'Screened',
      consent_status: 'Granted',
      consent_date: new Date().toISOString(),
    })
    await refresh()
  }

  function trialTitle(trialId) {
    return trials.find((trial) => trial.trial_id === trialId)?.title || trialId
  }

  function trialRecord(trialId) {
    return trials.find((trial) => trial.trial_id === trialId)
  }

  function patientRecord(patientId) {
    return patients.find((item) => item.patient_id === patientId)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recruitment & Informed Consent Pipeline</h1>
          <p className="text-xs text-slate-500">
            Track participant progression across the 4 stages: <strong>Identified → Contacted → Screened → Enrolled</strong>. Nobody is enrolled without informed consent.
          </p>
        </div>

        <Link
          to="/decision-paths"
          className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800"
        >
          <Award className="h-4 w-4" /> 3-Path Decision Board
        </Link>
      </div>

      {/* Filter and stats */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold text-slate-600">Filter by Stage:</label>
        <select
          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-xs focus:outline-hidden"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option>All</option>
          {RECRUITMENT_STATUSES.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-4 py-3">Patient Record</th>
              <th className="px-4 py-3">Target Protocol</th>
              <th className="px-4 py-3">Stage & Pipeline Progress</th>
              <th className="px-4 py-3">Informed Consent</th>
              <th className="px-4 py-3">Update Stage</th>
              <th className="px-4 py-3">Outreach Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((row) => {
              const person = patientRecord(row.patient_id)
              const trial = trialRecord(row.trial_id)
              const consent = row.consent_status || 'Pending'

              return (
                <tr key={`${row.patient_id}_${row.trial_id}`} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <Link className="font-bold text-teal-800 hover:underline" to={`/patients/${row.patient_id}`}>
                      {person?.name || row.patient_id}
                    </Link>
                    <div className="text-[11px] text-slate-400">
                      {row.patient_id} · {person?.condition} · Age {person?.age}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{row.trial_id}</div>
                    <div className="text-[11px] text-slate-500 truncate max-w-xs">{trialTitle(row.trial_id)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge value={row.status} />
                    </div>
                    {/* Visual Progress Steps */}
                    <div className="mt-2 flex items-center gap-1 w-32">
                      {RECRUITMENT_STATUSES.map((st, i) => {
                        const active = i <= RECRUITMENT_STATUSES.indexOf(row.status)
                        return (
                          <div
                            key={st}
                            className={`h-1.5 flex-1 rounded-full ${active ? 'bg-teal-700' : 'bg-slate-200'}`}
                          />
                        )
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {consent === 'Granted' ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        Consent Granted
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          Pending
                        </span>
                        <button
                          type="button"
                          onClick={() => grantConsent(row)}
                          className="text-[11px] font-semibold text-teal-700 hover:underline"
                        >
                          Log Consent
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800"
                      value={row.status}
                      onChange={(e) => updateStatus(row, e.target.value)}
                    >
                      {RECRUITMENT_STATUSES.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setActiveOutreach({ patient: person, trial: trial || { trial_id: row.trial_id } })}
                      className="inline-flex items-center gap-1 rounded-lg border border-teal-700 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-100"
                    >
                      <Mail className="h-3 w-3 text-teal-700" />
                      Draft Outreach (EN/HI/MR)
                    </button>
                  </td>
                </tr>
              )
            })}
            {!filtered.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No recruitment records found matching filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Outreach Modal */}
      {activeOutreach && (
        <OutreachModal
          isOpen={Boolean(activeOutreach)}
          onClose={() => setActiveOutreach(null)}
          patient={activeOutreach.patient}
          trial={activeOutreach.trial}
          onStatusUpdated={() => refresh()}
        />
      )}
    </div>
  )
}
