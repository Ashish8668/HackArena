import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { db } from './config'
import { matchDocumentId } from './matches'

const COLLECTION = 'recruitment'

export async function listRecruitment() {
  const snapshot = await getDocs(collection(db, COLLECTION))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

export async function getRecruitment(patientId, trialId) {
  const snapshot = await getDoc(doc(db, COLLECTION, matchDocumentId(patientId, trialId)))
  if (!snapshot.exists()) return null
  return { id: snapshot.id, ...snapshot.data() }
}

export async function listRecruitmentForPatient(patientId) {
  const snapshot = await getDocs(query(collection(db, COLLECTION), where('patient_id', '==', patientId)))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

export async function upsertRecruitment({ patient_id, trial_id, status }) {
  await setDoc(doc(db, COLLECTION, matchDocumentId(patient_id, trial_id)), {
    patient_id,
    trial_id,
    status,
    updatedAt: serverTimestamp(),
  })
}
