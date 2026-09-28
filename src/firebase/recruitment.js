import {
  storeListRecruitment,
  storeGetRecruitment,
  storeUpsertRecruitment,
} from '../services/dataStore'

export function matchDocumentId(patientId, trialId) {
  return `${patientId}_${trialId}`
}

export async function listRecruitment() {
  return storeListRecruitment()
}

export async function getRecruitment(patientId, trialId) {
  return storeGetRecruitment(patientId, trialId)
}

export async function listRecruitmentForPatient(patientId) {
  const all = await storeListRecruitment()
  return all.filter((r) => r.patient_id === patientId)
}

export async function upsertRecruitment(record) {
  return storeUpsertRecruitment(record)
}
