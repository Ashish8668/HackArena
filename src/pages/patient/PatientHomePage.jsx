import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getPatientByUid, isProfileComplete } from '../../firebase/patients'
import { listMatchesForPatient } from '../../firebase/matches'
import { listTrials } from '../../firebase/trials'
import { listRecruitmentForPatient } from '../../firebase/recruitment'
import { patientFacingLabel } from '../../matching/eligibilityEngine'
import StatusBadge from '../../components/StatusBadge'

export default function PatientHomePage() {
  const { user, profile } = useAuth()
  const [patient, setPatient] = useState(null)
  const [matches, setMatches] = useState([])
  const [trials, setTrials] = useState([])
  const [recruitment, setRecruitment] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    Promise.all([getPatientByUid(user.uid), listTrials()])
      .then(async ([nextPatient, nextTrials]) => {
        setPatient(nextPatient)
        setTrials(nextTrials)
        if (nextPatient) {
          const [nextMatches, nextRecruitment] = await Promise.all([
            listMatchesForPatient(nextPatient.patient_id),
            listRecruitmentForPatient(nextPatient.patient_id),
          ])
          setMatches(nextMatches.filter((item) => item.eligible || item.near_eligible))
          setRecruitment(nextRecruitment)
        }
      })
      .catch((err) => setError(err.message))
  }, [user])

  if (!isProfileComplete(patient)) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-xl font-semibold text-amber-950">Complete your profile first</h1>
        <p className="mt-2 text-sm text-amber-900">
          After you enter your clinical information, the system checks listed studies and shows possible matches. A coordinator still confirms every criterion.
        </p>
        <Link to="/app/profile" className="mt-4 inline-flex rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white">
          Create my profile
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Possible studies for you</h1>
        <p className="mt-1 text-sm text-slate-600">
          Hello {patient.name}. These are potential or close matches based on the information you provided. They are not a medical eligibility decision.
        </p>
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {!matches.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No potential or close matches yet. A coordinator can still review your profile if you update your information, or if new studies are added.
        </div>
      ) : null}
      {matches.map((match) => {
        const trial = trials.find((item) => item.trial_id === match.trial_id)
        const status = recruitment.find((item) => item.trial_id === match.trial_id)?.status
        return (
          <article key={match.trial_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">{match.title || trial?.title}</h2>
                <p className="text-sm text-slate-500">{match.trial_id}</p>
              </div>
              <StatusBadge value={patientFacingLabel(match)} />
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {match.eligible
                ? 'Your listed information currently lines up with this study’s structured criteria. A coordinator must still review the details and complete screening before anything is confirmed.'
                : 'One listed number is close to the study range. This is not a match yet. A coordinator may still review whether a screening conversation is appropriate.'}
            </p>
            <ul className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
              <li>Condition on file: {patient.condition}</li>
              <li>Study condition: {trial?.condition}</li>
              {status ? <li>Coordinator pipeline: {status}</li> : <li>Coordinator pipeline: waiting for review</li>}
            </ul>
            {match.near_eligible && match.criteria_results?.hba1c?.status === 'FAIL' ? (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                HbA1c {match.criteria_results.hba1c.patient_value} is slightly outside {match.criteria_results.hba1c.required}. This does not mean you are eligible.
              </p>
            ) : null}
          </article>
        )
      })}
      <p className="text-xs text-slate-500">Account: {profile?.email}. Coordinators use this email only to discuss a possible screening visit.</p>
    </div>
  )
}
