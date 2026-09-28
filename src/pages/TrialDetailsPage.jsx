import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getTrial } from '../firebase/trials'
import { listPatients } from '../firebase/patients'
import { identifyApplicants, listRecruitmentForTrial, upsertRecruitment } from '../firebase/recruitment'
import StatusBadge from '../components/StatusBadge'
import { RECRUITMENT_STATUSES } from '../matching/config'

export default function TrialDetailsPage() {
  const { trialId } = useParams()
  const [trial, setTrial] = useState(null)
  const [patients, setPatients] = useState([])
  const [rows, setRows] = useState([])
  const [selected, setSelected] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh() {
    const [nextTrial, nextPatients, nextRows] = await Promise.all([
      getTrial(trialId),
      listPatients(),
      listRecruitmentForTrial(trialId),
    ])
    setTrial(nextTrial)
    setPatients(nextPatients)
    setRows(nextRows)
  }

  useEffect(() => {
    refresh().catch((err) => setError(err.message))
  }, [trialId])

  const applied = rows.filter((item) => item.status === 'Applied')
  const pipeline = rows.filter((item) => item.status !== 'Applied')
  const appliedIds = applied.map((item) => item.patient_id)
  const allSelected = appliedIds.length > 0 && appliedIds.every((id) => selected[id])

  function patientRecord(patientId) {
    return patients.find((item) => item.patient_id === patientId)
  }

  function toggleAll() {
    if (allSelected) {
      setSelected({})
      return
    }
    setSelected(Object.fromEntries(appliedIds.map((id) => [id, true])))
  }

  async function identifySelected() {
    const patientIds = appliedIds.filter((id) => selected[id])
    if (!patientIds.length) return
    setBusy(true)
    setError('')
    try {
      await identifyApplicants(trialId, patientIds)
      setSelected({})
      await refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function updateStatus(patientId, status) {
    await upsertRecruitment({ patient_id: patientId, trial_id: trialId, status })
    await refresh()
  }

  if (!trial) return <p className="text-slate-500">Loading...</p>

  return (
    <div className="space-y-6">
      <Link to="/trials" className="text-sm text-teal-700">
        Back
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{trial.title}</h1>
        <p className="text-slate-500">{trial.trial_id}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Condition</p>
          <p className="mt-1 font-medium">{trial.condition}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Age / gender</p>
          <p className="mt-1 font-medium">
            {trial.min_age}-{trial.max_age}, {trial.gender}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">HbA1c / BMI</p>
          <p className="mt-1 font-medium">
            &lt;= {trial.max_hba1c} / {trial.min_bmi}-{trial.max_bmi}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Excluded medicine</p>
          <p className="mt-1 font-medium">{trial.excluded_medicine}</p>
        </div>
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Applied</h2>
          <div className="flex gap-2">
            <button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" onClick={toggleAll}>
              {allSelected ? 'Clear' : 'Select all'}
            </button>
            <button
              type="button"
              disabled={busy || !appliedIds.some((id) => selected[id])}
              onClick={identifySelected}
              className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Identify
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 pr-3" />
                <th className="pb-3">Participant</th>
                <th className="pb-3">Condition</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {applied.map((row) => {
                const person = patientRecord(row.patient_id)
                return (
                  <tr key={row.patient_id} className="border-t border-slate-100">
                    <td className="py-3 pr-3">
                      <input
                        type="checkbox"
                        checked={Boolean(selected[row.patient_id])}
                        onChange={(e) =>
                          setSelected((current) => ({ ...current, [row.patient_id]: e.target.checked }))
                        }
                      />
                    </td>
                    <td className="py-3">
                      <Link className="font-medium text-teal-700" to={`/patients/${row.patient_id}`}>
                        {person?.name || row.patient_id}
                      </Link>
                      <div className="text-xs text-slate-500">{person?.email || row.patient_id}</div>
                    </td>
                    <td className="py-3">{person?.condition || '—'}</td>
                    <td className="py-3">
                      <StatusBadge value={row.status} />
                    </td>
                  </tr>
                )
              })}
              {!applied.length ? (
                <tr>
                  <td colSpan={4} className="py-6 text-slate-500">
                    No applications.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Recruitment</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3">Participant</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Update</th>
              </tr>
            </thead>
            <tbody>
              {pipeline.map((row) => {
                const person = patientRecord(row.patient_id)
                return (
                  <tr key={row.patient_id} className="border-t border-slate-100">
                    <td className="py-3">
                      <Link className="font-medium text-teal-700" to={`/patients/${row.patient_id}`}>
                        {person?.name || row.patient_id}
                      </Link>
                    </td>
                    <td className="py-3">
                      <StatusBadge value={row.status} />
                    </td>
                    <td className="py-3">
                      <select
                        className="rounded-lg border border-slate-300 px-3 py-1.5"
                        value={row.status}
                        onChange={(e) => updateStatus(row.patient_id, e.target.value)}
                      >
                        {RECRUITMENT_STATUSES.filter((status) => status !== 'Applied').map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              })}
              {!pipeline.length ? (
                <tr>
                  <td colSpan={3} className="py-6 text-slate-500">
                    No records.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
