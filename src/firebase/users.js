import { isFirebaseConfigured, db } from './config'

const LS_USERS = 'trialmatch_local_users'

function getLocalUsers() {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(LS_USERS) || '{}')
  } catch {
    return {}
  }
}

function setLocalUsers(map) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LS_USERS, JSON.stringify(map))
  } catch {}
}

export function patientIdFromUid(uid) {
  return `PT${String(uid).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`
}

export async function getUserProfile(uid) {
  if (isFirebaseConfigured() && db) {
    try {
      const { doc, getDoc } = await import('firebase/firestore')
      const snapshot = await getDoc(doc(db, 'users', uid))
      if (snapshot.exists()) return { id: snapshot.id, ...snapshot.data() }
    } catch {}
  }
  const local = getLocalUsers()
  return local[uid] || null
}

export async function saveUserProfile(profile) {
  if (isFirebaseConfigured() && db) {
    try {
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
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
    } catch {}
  }
  const local = getLocalUsers()
  local[profile.uid] = { ...profile, updatedAt: new Date().toISOString() }
  setLocalUsers(local)
}

export function homePathForRole(role) {
  if (role === 'patient') return '/app'
  if (role === 'admin') return '/admin'
  return '/dashboard'
}
