import {
  storeListTrials,
  storeGetTrial,
  storeUpsertTrial,
  storeDeleteTrial,
} from '../services/dataStore'

export async function listTrials() {
  return storeListTrials()
}

export async function getTrial(trialId) {
  return storeGetTrial(trialId)
}

export async function upsertTrial(trial) {
  return storeUpsertTrial(trial)
}

export async function deleteTrial(trialId) {
  return storeDeleteTrial(trialId)
}
