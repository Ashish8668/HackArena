import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'
import { db } from './config'

const COLLECTION = 'trials'

export async function listTrials() {
  const snapshot = await getDocs(query(collection(db, COLLECTION)))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

export async function getTrial(trialId) {
  const snapshot = await getDoc(doc(db, COLLECTION, trialId))
  if (!snapshot.exists()) return null
  return { id: snapshot.id, ...snapshot.data() }
}

export async function upsertTrial(trial) {
  const ref = doc(db, COLLECTION, trial.trial_id)
  const existing = await getDoc(ref)
  await setDoc(
    ref,
    {
      trial_id: trial.trial_id,
      title: trial.title,
      condition: trial.condition,
      min_age: Number(trial.min_age),
      max_age: Number(trial.max_age),
      gender: trial.gender,
      max_hba1c: Number(trial.max_hba1c),
      min_bmi: Number(trial.min_bmi),
      max_bmi: Number(trial.max_bmi),
      excluded_medicine: trial.excluded_medicine,
      updatedAt: serverTimestamp(),
      createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(),
    },
    { merge: true },
  )
}

export async function deleteTrial(trialId) {
  await deleteDoc(doc(db, COLLECTION, trialId))
}
