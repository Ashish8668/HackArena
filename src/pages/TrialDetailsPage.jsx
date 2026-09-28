import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getTrial } from '../firebase/trials'
import { listMatches } from '../firebase/matches'
import StatusBadge from '../components/StatusBadge'
import { overallLabel } from '../matching/eligibilityEngine'

export default function TrialDetailsPage() {
  const { trialId } = useParams()
  const [trial, setTrial] = useState(null)
  const [matches, setMatches] = useState([])

  useEffect(() => {
    getTrial(trialId).then(setTrial)
    listMatches().then((all) => setMatches(all.filter((item) => item.trial_id === trialId)))
  }, [trialId])

  if (!trial) return <p className="text-slate-500">Loading trial...</p>

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

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Saved match results</h2>
        <div className="mt-4 divide-y divide-slate-100">
          {matches.map((match) => (
            <div key={match.patient_id} className="flex items-center justify-between py-3">
              <Link className="font-medium text-teal-700" to={`/patients/${match.patient_id}`}>
                {match.patient_id}
              </Link>
              <StatusBadge value={overallLabel(match)} />
            </div>
          ))}
          {!matches.length ? <p className="text-sm text-slate-500">No matches.</p> : null}
        </div>
      </section>
    </div>
  )
}
