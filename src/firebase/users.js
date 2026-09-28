import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './config'

export function patientIdFromUid(uid) {
  return `PT${String(uid).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`
}

export async function getUserProfile(uid) {
  const snapshot = await getDoc(doc(db, 'users', uid))
  if (!snapshot.exists()) return null
  return { id: snapshot.id, ...snapshot.data() }
}

export async function saveUserProfile(profile) {
  await setDoc(
    doc(db, 'users', profile.uid),
    {
      uid: profile.uid,
      email: profile.email,
      name: profile.name || '',
      role: profile.role,
      patient_id: profile.patient_id || null,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export function homePathForRole(role) {
  return role === 'patient' ? '/app' : '/dashboard'
}
