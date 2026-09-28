import { listTrials } from '../firebase/trials'
import { saveMatches } from '../firebase/matches'
import { getRecruitment, upsertRecruitment } from '../firebase/recruitment'
import { matchPatientToTrials } from '../matching/eligibilityEngine'

export async function runAndPersistMatching(patient) {
  const trials = await listTrials()
  const results = await matchPatientToTrials(patient, trials)
  await saveMatches(results)

  await Promise.all(
    results
      .filter((match) => match.eligible || match.near_eligible)
      .map(async (match) => {
        const existing = await getRecruitment(match.patient_id, match.trial_id)
        if (!existing) {
          await upsertRecruitment({
            patient_id: match.patient_id,
            trial_id: match.trial_id,
            status: 'Identified',
          })
        }
      }),
  )

  return results
}

export function contactPatientMailto(patient, trial) {
  const email = String(patient?.email || '').trim()
  if (!email) return null
  const name = patient.name || patient.patient_id
  const trialTitle = trial?.title || 'a research study'
  const subject = encodeURIComponent(`Clinical trial: ${trialTitle}`)
  const body = encodeURIComponent(`Hello ${name},\n\nRegarding ${trialTitle}.\n`)
  return `mailto:${email}?subject=${subject}&body=${body}`
}
