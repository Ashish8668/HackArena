import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getPatientByUid, isProfileComplete } from '../../firebase/patients'
import { listMatchesForPatient } from '../../firebase/matches'
import { listTrials } from '../../firebase/trials'
import { listRecruitmentForPatient } from '../../firebase/recruitment'
import { isPotentialMatch, patientFacingLabel } from '../../matching/eligibilityEngine'
import StatusBadge from '../../components/StatusBadge'
import { applyToTrial } from '../../services/runMatching'
import TrialAsk from '../../components/TrialAsk'
import { mergeTrialKnowledge } from '../../ask/localKnowledge'
import { defaultKnowledgeText } from '../../ask/trialKnowledge'

export default function PatientHomePage() {
  const { user } = useAuth()
  const [patient, setPatient] = useState(null)
  const [matches, setMatches] = useState([])
  const [trials, setTrials] = useState([])
  const [recruitment, setRecruitment] = useState([])
  const [error, setError] = useState('')
  const [applying, setApplying] = useState('')

  useEffect(() => {
    if (!user) return
    Promise.all([getPatientByUid(user.uid), listTrials()])
      .then(async ([nextPatient, nextTrials]) => {
        setPatient(nextPatient)
        setTrials(
          nextTrials.map((trial) => {
            const merged = mergeTrialKnowledge(trial)
            return {
              ...merged,
              knowledge: merged.knowledge || defaultKnowledgeText(trial.trial_id),
            }
          }),
        )
        if (nextPatient) {
          const [nextMatches, nextRecruitment] = await Promise.all([
            listMatchesForPatient(nextPatient.patient_id),
            listRecruitmentForPatient(nextPatient.patient_id),
          ])
          setMatches(nextMatches.filter(isPotentialMatch))
          setRecruitment(nextRecruitment)
        }
      })
      .catch((err) => setError(err.message))
  }, [user])

  async function handleApply(trialId) {
    setApplying(trialId)
    setError('')
    try {
      await applyToTrial(patient, trialId)
      setRecruitment((current) => {
        const rest = current.filter((item) => !(item.patient_id === patient.patient_id && item.trial_id === trialId))
        return [...rest, { patient_id: patient.patient_id, trial_id: trialId, status: 'Applied' }]
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setApplying('')
    }
  }

  if (!isProfileComplete(patient)) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold">Profile incomplete</h1>
        <Link to="/app/profile" className="mt-4 inline-flex rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white">
          Complete profile
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Matches</h1>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {!matches.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">No matches.</div>
      ) : null}
      {matches.map((match) => {
        const trial = trials.find((item) => item.trial_id === match.trial_id)
        const status = recruitment.find((item) => item.trial_id === match.trial_id)?.status
        return (
          <article key={match.trial_id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">{match.title || trial?.title}</h2>
                <p className="text-sm text-slate-500">{match.trial_id}</p>
              </div>
              <StatusBadge value={patientFacingLabel(match)} />
            </div>
            <ul className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
              <li>Condition: {patient.condition}</li>
              <li>Trial condition: {trial?.condition}</li>
              {status ? (
                <li>
                  Status: <StatusBadge value={status} />
                </li>
              ) : null}
            </ul>
            {!status ? (
              <button
                type="button"
                disabled={applying === match.trial_id}
                onClick={() => handleApply(match.trial_id)}
                className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {applying === match.trial_id ? 'Applying...' : 'Apply'}
              </button>
            ) : null}
            <TrialAsk trial={trial} />
          </article>
        )
      })}
    </div>
  )
}
