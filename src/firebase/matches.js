import {
  storeListMatches,
  storeListMatchesForPatient,
  storeSaveMatches,
} from '../services/dataStore'

export function matchDocumentId(patientId, trialId) {
  return `${patientId}_${trialId}`
}

export async function saveMatch(match) {
  return storeSaveMatches([match])
}

export async function saveMatches(matches) {
  return storeSaveMatches(matches)
}

export async function listMatches() {
  return storeListMatches()
}

export async function listMatchesForPatient(patientId) {
  return storeListMatchesForPatient(patientId)
}
