import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Modal from '../components/Modal'
import TrialForm from '../components/TrialForm'
import { deleteTrial, listTrials, upsertTrial } from '../firebase/trials'
import { listRecruitment } from '../firebase/recruitment'
import { RECRUITMENT_STATUSES } from '../matching/config'

export default function TrialsPage() {
  const [trials, setTrials] = useState([])
  const [recruitment, setRecruitment] = useState([])
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  async function refresh() {
    const [nextTrials, nextRecruitment] = await Promise.all([listTrials(), listRecruitment()])
    setTrials(nextTrials)
    setRecruitment(nextRecruitment)
  }

  useEffect(() => {
    refresh().catch((err) => setError(err.message))
  }, [])

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    return trials.filter((trial) =>
      [trial.trial_id, trial.title, trial.condition, trial.gender].join(' ').toLowerCase().includes(term),
    )
  }, [trials, search])

  async function handleSave(values) {
    await upsertTrial(values)
    setOpen(false)
    setEditing(null)
    await refresh()
  }

  async function handleDelete(trialId) {
    if (!window.confirm(`Delete ${trialId}?`)) return
    await deleteTrial(trialId)
    await refresh()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Trials</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setOpen(true)
          }}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white"
        >
          Add trial
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm md:max-w-md"
      />
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3">Trial ID</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Condition</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">Gender</th>
              <th className="px-4 py-3">HbA1c</th>
              <th className="px-4 py-3">BMI</th>
              <th className="px-4 py-3">Excluded</th>
              {RECRUITMENT_STATUSES.map((status) => (
                <th key={status} className="px-4 py-3">
                  {status}
                </th>
              ))}
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((trial) => (
              <tr key={trial.trial_id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium">
                  <Link className="text-teal-700" to={`/trials/${trial.trial_id}`}>
                    {trial.trial_id}
                  </Link>
                </td>
                <td className="px-4 py-3">{trial.title}</td>
                <td className="px-4 py-3">{trial.condition}</td>
                <td className="px-4 py-3">
                  {trial.min_age}-{trial.max_age}
                </td>
                <td className="px-4 py-3">{trial.gender}</td>
                <td className="px-4 py-3">&lt;= {trial.max_hba1c}</td>
                <td className="px-4 py-3">
                  {trial.min_bmi}-{trial.max_bmi}
                </td>
                <td className="px-4 py-3">{trial.excluded_medicine}</td>
                {RECRUITMENT_STATUSES.map((status) => (
                  <td key={status} className="px-4 py-3">
                    {recruitment.filter((item) => item.trial_id === trial.trial_id && item.status === status).length}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-slate-600"
                      onClick={() => {
                        setEditing(trial)
                        setOpen(true)
                      }}
                    >
                      Edit
                    </button>
                    <button type="button" className="text-rose-600" onClick={() => handleDelete(trial.trial_id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open ? (
        <Modal title={editing ? 'Edit trial' : 'Add trial'} onClose={() => setOpen(false)}>
          <TrialForm
            initialValue={editing}
            lockId={Boolean(editing)}
            submitLabel={editing ? 'Save changes' : 'Create trial'}
            onSubmit={handleSave}
          />
        </Modal>
      ) : null}
    </div>
  )
}
