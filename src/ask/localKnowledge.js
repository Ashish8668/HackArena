const STORAGE_KEY = 'clinical-match-knowledge'

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function getLocalKnowledge(trialId) {
  if (!trialId) return ''
  return String(readStore()[trialId]?.text || '')
}

export function saveLocalKnowledge(trialId, text, fileName = '') {
  if (!trialId) return
  const store = readStore()
  store[trialId] = {
    text: String(text || ''),
    fileName,
    savedAt: new Date().toISOString(),
  }
  writeStore(store)
}

export function mergeTrialKnowledge(trial) {
  if (!trial) return trial
  const local = getLocalKnowledge(trial.trial_id)
  return {
    ...trial,
    knowledge: trial.knowledge || local || '',
  }
}

export async function readKnowledgeFile(file) {
  return file.text()
}
