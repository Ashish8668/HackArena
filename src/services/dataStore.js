/**
 * Unified Data Store
 * Supports both Firestore (when configured) and local in-memory/localStorage (for offline demo mode)
 * Ensures 100% functionality out of the box with zero setup friction.
 */
import { isFirebaseConfigured, db } from '../firebase/config'
import { SYNTHETIC_TRIALS } from '../data/trials'
import { generateSyntheticPatients } from '../data/patients'
import { DRUG_KNOWLEDGE_BASE } from '../data/drugKnowledgeBase'

const LS_PATIENTS = 'trialmatch_local_patients'
const LS_TRIALS = 'trialmatch_local_trials'
const LS_MATCHES = 'trialmatch_local_matches'
const LS_RECRUITMENT = 'trialmatch_local_recruitment'
const LS_DRUGS = 'trialmatch_local_drugs'
const LS_AUDIT = 'trialmatch_local_audit_logs'

function safeGet(key, fallback = []) {
  if (typeof window === 'undefined') return fallback
  try {
    const item = window.localStorage.getItem(key)
    if (!item) return fallback
    return JSON.parse(item)
  } catch {
    return fallback
  }
}

function safeSet(key, value) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.warn(`LocalStorage write failed for key ${key}:`, err)
  }
}

// Ensure default data exists in local storage
export function initializeLocalDataStore() {
  if (typeof window === 'undefined') return

  let trials = safeGet(LS_TRIALS, null)
  if (!trials || !trials.length) {
    trials = SYNTHETIC_TRIALS.map((t, idx) => ({
      ...t,
      medicine_scope: idx % 3 === 0 ? 'same_class' : idx % 3 === 1 ? 'exact_drug' : 'same_effect',
      site_location: idx % 2 === 0 ? 'Memorial Research Center, Site A (Mumbai)' : 'Metro Clinical Trials Unit, Site B (Pune)',
      phase: idx % 2 === 0 ? 'Phase II' : 'Phase III',
      recruitment_target: 30 + idx * 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))
    safeSet(LS_TRIALS, trials)
  }

  let patients = safeGet(LS_PATIENTS, null)
  if (!patients || !patients.length) {
    patients = generateSyntheticPatients().slice(0, 50).map((p) => ({
      ...p,
      watch_list: false,
      retest_date: null,
      watch_notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))
    safeSet(LS_PATIENTS, patients)
  }

  let drugs = safeGet(LS_DRUGS, null)
  if (!drugs || !drugs.length) {
    safeSet(LS_DRUGS, DRUG_KNOWLEDGE_BASE)
  }
}

// Initialize immediately if in browser
if (typeof window !== 'undefined') {
  initializeLocalDataStore()
}

// ---------------- PATIENTS ----------------

export async function storeListPatients() {
  if (isFirebaseConfigured() && db) {
    try {
      const { collection, getDocs } = await import('firebase/firestore')
      const snapshot = await getDocs(collection(db, 'patients'))
      if (!snapshot.empty) {
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      }
    } catch (e) {
      console.warn('Firestore listPatients failed, using local store:', e)
    }
  }
  return safeGet(LS_PATIENTS, [])
}

export async function storeGetPatient(patientId) {
  const all = await storeListPatients()
  return all.find((p) => p.patient_id === patientId || p.id === patientId) || null
}

export async function storeUpsertPatient(patient) {
  if (isFirebaseConfigured() && db) {
    try {
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
      await setDoc(
        doc(db, 'patients', patient.patient_id),
        { ...patient, updatedAt: serverTimestamp() },
        { merge: true }
      )
    } catch (e) {
      console.warn('Firestore upsertPatient failed, updating local store:', e)
    }
  }

  const all = safeGet(LS_PATIENTS, [])
  const idx = all.findIndex((p) => p.patient_id === patient.patient_id)
  const updated = {
    ...patient,
    age: Number(patient.age),
    hba1c: Number(patient.hba1c),
    bmi: Number(patient.bmi),
    updatedAt: new Date().toISOString(),
    createdAt: idx >= 0 ? all[idx].createdAt : new Date().toISOString(),
  }

  if (idx >= 0) {
    all[idx] = { ...all[idx], ...updated }
  } else {
    all.unshift(updated)
  }
  safeSet(LS_PATIENTS, all)
  return updated
}

export async function storeDeletePatient(patientId) {
  if (isFirebaseConfigured() && db) {
    try {
      const { doc, deleteDoc } = await import('firebase/firestore')
      await deleteDoc(doc(db, 'patients', patientId))
    } catch (e) {
      console.warn('Firestore deletePatient failed:', e)
    }
  }
  const all = safeGet(LS_PATIENTS, [])
  const filtered = all.filter((p) => p.patient_id !== patientId && p.id !== patientId)
  safeSet(LS_PATIENTS, filtered)
}

// ---------------- TRIALS ----------------

export async function storeListTrials() {
  if (isFirebaseConfigured() && db) {
    try {
      const { collection, getDocs } = await import('firebase/firestore')
      const snapshot = await getDocs(collection(db, 'trials'))
      if (!snapshot.empty) {
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      }
    } catch (e) {
      console.warn('Firestore listTrials failed, using local store:', e)
    }
  }
  return safeGet(LS_TRIALS, [])
}

export async function storeGetTrial(trialId) {
  const all = await storeListTrials()
  return all.find((t) => t.trial_id === trialId || t.id === trialId) || null
}

export async function storeUpsertTrial(trial) {
  if (isFirebaseConfigured() && db) {
    try {
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
      await setDoc(
        doc(db, 'trials', trial.trial_id),
        { ...trial, updatedAt: serverTimestamp() },
        { merge: true }
      )
    } catch (e) {
      console.warn('Firestore upsertTrial failed, updating local store:', e)
    }
  }

  const all = safeGet(LS_TRIALS, [])
  const idx = all.findIndex((t) => t.trial_id === trial.trial_id)
  const updated = {
    ...trial,
    min_age: Number(trial.min_age),
    max_age: Number(trial.max_age),
    max_hba1c: Number(trial.max_hba1c),
    min_bmi: Number(trial.min_bmi),
    max_bmi: Number(trial.max_bmi),
    medicine_scope: trial.medicine_scope || 'exact_drug',
    site_location: trial.site_location || 'City Clinical Research Center',
    updatedAt: new Date().toISOString(),
    createdAt: idx >= 0 ? all[idx].createdAt : new Date().toISOString(),
  }

  if (idx >= 0) {
    all[idx] = { ...all[idx], ...updated }
  } else {
    all.unshift(updated)
  }
  safeSet(LS_TRIALS, all)
  return updated
}

export async function storeDeleteTrial(trialId) {
  if (isFirebaseConfigured() && db) {
    try {
      const { doc, deleteDoc } = await import('firebase/firestore')
      await deleteDoc(doc(db, 'trials', trialId))
    } catch (e) {
      console.warn('Firestore deleteTrial failed:', e)
    }
  }
  const all = safeGet(LS_TRIALS, [])
  const filtered = all.filter((t) => t.trial_id !== trialId && t.id !== trialId)
  safeSet(LS_TRIALS, filtered)
}

// ---------------- MATCHES ----------------

export async function storeListMatches() {
  if (isFirebaseConfigured() && db) {
    try {
      const { collection, getDocs } = await import('firebase/firestore')
      const snapshot = await getDocs(collection(db, 'matches'))
      if (!snapshot.empty) {
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      }
    } catch (e) {
      console.warn('Firestore listMatches failed, using local store:', e)
    }
  }
  return safeGet(LS_MATCHES, [])
}

export async function storeListMatchesForPatient(patientId) {
  const all = await storeListMatches()
  return all.filter((m) => m.patient_id === patientId)
}

export async function storeSaveMatches(matches) {
  if (!matches || !matches.length) return
  if (isFirebaseConfigured() && db) {
    try {
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
      await Promise.all(
        matches.map((m) =>
          setDoc(
            doc(db, 'matches', `${m.patient_id}_${m.trial_id}`),
            { ...m, createdAt: serverTimestamp() },
            { merge: true }
          )
        )
      )
    } catch (e) {
      console.warn('Firestore saveMatches failed, updating local store:', e)
    }
  }

  const all = safeGet(LS_MATCHES, [])
  const matchMap = new Map(all.map((m) => [`${m.patient_id}_${m.trial_id}`, m]))
  matches.forEach((m) => {
    matchMap.set(`${m.patient_id}_${m.trial_id}`, {
      ...m,
      id: `${m.patient_id}_${m.trial_id}`,
      updatedAt: new Date().toISOString(),
    })
  })
  safeSet(LS_MATCHES, Array.from(matchMap.values()))
}

// ---------------- RECRUITMENT / CONSENT PIPELINE ----------------

export async function storeListRecruitment() {
  if (isFirebaseConfigured() && db) {
    try {
      const { collection, getDocs } = await import('firebase/firestore')
      const snapshot = await getDocs(collection(db, 'recruitment'))
      if (!snapshot.empty) {
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      }
    } catch (e) {
      console.warn('Firestore listRecruitment failed, using local store:', e)
    }
  }
  return safeGet(LS_RECRUITMENT, [])
}

export async function storeGetRecruitment(patientId, trialId) {
  const all = await storeListRecruitment()
  return all.find((r) => r.patient_id === patientId && r.trial_id === trialId) || null
}

export async function storeUpsertRecruitment(record) {
  if (isFirebaseConfigured() && db) {
    try {
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
      await setDoc(
        doc(db, 'recruitment', `${record.patient_id}_${record.trial_id}`),
        { ...record, updatedAt: serverTimestamp() },
        { merge: true }
      )
    } catch (e) {
      console.warn('Firestore upsertRecruitment failed, updating local store:', e)
    }
  }

  const all = safeGet(LS_RECRUITMENT, [])
  const key = `${record.patient_id}_${record.trial_id}`
  const idx = all.findIndex((r) => `${r.patient_id}_${r.trial_id}` === key)

  const updated = {
    ...record,
    id: key,
    status: record.status || 'Identified',
    consent_status: record.consent_status || 'Pending',
    updatedAt: new Date().toISOString(),
    createdAt: idx >= 0 ? all[idx].createdAt : new Date().toISOString(),
  }

  if (idx >= 0) {
    all[idx] = { ...all[idx], ...updated }
  } else {
    all.push(updated)
  }
  safeSet(LS_RECRUITMENT, all)
  return updated
}

// ---------------- DRUG KNOWLEDGE BASE ----------------

export async function storeListDrugs() {
  return safeGet(LS_DRUGS, DRUG_KNOWLEDGE_BASE)
}

export async function storeUpsertDrug(drug) {
  const all = safeGet(LS_DRUGS, DRUG_KNOWLEDGE_BASE)
  const idx = all.findIndex((d) => d.id === drug.id || d.name.toLowerCase() === drug.name.toLowerCase())
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...drug }
  } else {
    all.push({
      ...drug,
      id: drug.id || `DRUG-${String(all.length + 1).padStart(3, '0')}`,
      aliases: Array.isArray(drug.aliases) ? drug.aliases : (drug.aliases || '').split(',').map((s) => s.trim()).filter(Boolean),
    })
  }
  safeSet(LS_DRUGS, all)
  return drug
}

// ---------------- AUDIT LOGS ----------------

export function logAuditEvent(action, details = {}) {
  const logs = safeGet(LS_AUDIT, [])
  const entry = {
    id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    action,
    details,
    timestamp: new Date().toISOString(),
  }
  logs.unshift(entry)
  safeSet(LS_AUDIT, logs.slice(0, 200)) // Keep recent 200 logs
}

export function listAuditLogs() {
  return safeGet(LS_AUDIT, [])
}
