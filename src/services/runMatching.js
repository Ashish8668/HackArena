import { listTrials } from '../firebase/trials'
import { saveMatches } from '../firebase/matches'
import { getRecruitment, upsertRecruitment } from '../firebase/recruitment'
import { matchPatientToTrials } from '../matching/eligibilityEngine'

export async function runAndPersistMatching(patient) {
  const trials = await listTrials()
  const results = await matchPatientToTrials(patient, trials)
  await saveMatches(results)
  return results
}

export async function applyToTrial(patient, trialId) {
  const existing = await getRecruitment(patient.patient_id, trialId)
  if (existing && existing.status !== 'Applied') {
    throw new Error('Already in process.')
  }
  if (existing?.status === 'Applied') return existing
  await upsertRecruitment({
    patient_id: patient.patient_id,
    trial_id: trialId,
    status: 'Applied',
  })
  return { patient_id: patient.patient_id, trial_id: trialId, status: 'Applied' }
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
