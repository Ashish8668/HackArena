import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './config'

const COLLECTION = 'patients'

export async function listPatients() {
  const snapshot = await getDocs(query(collection(db, COLLECTION)))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

export async function getPatient(patientId) {
  const snapshot = await getDoc(doc(db, COLLECTION, patientId))
  if (!snapshot.exists()) return null
  return { id: snapshot.id, ...snapshot.data() }
}

export async function getPatientByUid(uid) {
  const snapshot = await getDocs(query(collection(db, COLLECTION), where('uid', '==', uid)))
  if (snapshot.empty) return null
  const item = snapshot.docs[0]
  return { id: item.id, ...item.data() }
}

export function isProfileComplete(patient) {
  if (!patient) return false
  return Boolean(
    patient.name &&
      patient.email &&
      patient.age !== '' &&
      patient.age != null &&
      !Number.isNaN(Number(patient.age)) &&
      patient.gender &&
      patient.condition &&
      patient.hba1c !== '' &&
      patient.hba1c != null &&
      !Number.isNaN(Number(patient.hba1c)) &&
      patient.bmi !== '' &&
      patient.bmi != null &&
      !Number.isNaN(Number(patient.bmi)) &&
      patient.current_medicine,
  )
}

export async function upsertPatient(patient) {
  const ref = doc(db, COLLECTION, patient.patient_id)
  const existing = await getDoc(ref)
  const previous = existing.exists() ? existing.data() : {}
  await setDoc(
    ref,
    {
      patient_id: patient.patient_id,
      uid: patient.uid || previous.uid || null,
      name: patient.name || previous.name || '',
      email: patient.email || previous.email || '',
      age: Number(patient.age),
      gender: patient.gender,
      condition: patient.condition,
      hba1c: Number(patient.hba1c),
      bmi: Number(patient.bmi),
      current_medicine: patient.current_medicine,
      source: patient.source || previous.source || 'coordinator',
      updatedAt: serverTimestamp(),
      createdAt: existing.exists() ? previous.createdAt : serverTimestamp(),
    },
    { merge: true },
  )
}

export async function updatePatient(patientId, updates) {
  await updateDoc(doc(db, COLLECTION, patientId), {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

export async function deletePatient(patientId) {
  await deleteDoc(doc(db, COLLECTION, patientId))
}
