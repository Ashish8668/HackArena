import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { db } from './config'

const COLLECTION = 'matches'

export function matchDocumentId(patientId, trialId) {
  return `${patientId}_${trialId}`
}

export async function saveMatch(match) {
  await setDoc(doc(db, COLLECTION, matchDocumentId(match.patient_id, match.trial_id)), {
    patient_id: match.patient_id,
    trial_id: match.trial_id,
    title: match.title || '',
    eligible: match.eligible,
    near_eligible: match.near_eligible,
    criteria_results: match.criteria_results,
    createdAt: serverTimestamp(),
  })
}

export async function saveMatches(matches) {
  await Promise.all(matches.map((match) => saveMatch(match)))
}

export async function listMatches() {
  const snapshot = await getDocs(collection(db, COLLECTION))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

export async function listMatchesForPatient(patientId) {
  const snapshot = await getDocs(query(collection(db, COLLECTION), where('patient_id', '==', patientId)))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}
