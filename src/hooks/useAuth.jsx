import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from '../firebase/config'
import { getUserProfile, homePathForRole, patientIdFromUid, saveUserProfile } from '../firebase/users'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isFirebaseConfigured() || !auth) {
      setLoading(false)
      return undefined
    }
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser)
      if (!nextUser) {
        setProfile(null)
        setLoading(false)
        return
      }
      const nextProfile = await getUserProfile(nextUser.uid)
      if (nextProfile) setProfile(nextProfile)
      setLoading(false)
    })
  }, [])

  const value = useMemo(
    () => ({
      user,
      profile,
      role: profile?.role || null,
      loading,
      configured: isFirebaseConfigured(),
      homePath: homePathForRole(profile?.role),
      login: async (email, password) => {
        const credential = await signInWithEmailAndPassword(auth, email, password)
        let nextProfile = await getUserProfile(credential.user.uid)
        if (!nextProfile) {
          nextProfile = {
            uid: credential.user.uid,
            email: credential.user.email,
            name: '',
            role: 'coordinator',
            patient_id: null,
          }
          await saveUserProfile(nextProfile)
        }
        setProfile(nextProfile)
        return nextProfile
      },
      signup: async (email, password, extras = {}) => {
        const role = extras.role === 'patient' ? 'patient' : 'coordinator'
        const credential = await createUserWithEmailAndPassword(auth, email, password)
        const nextProfile = {
          uid: credential.user.uid,
          email,
          name: extras.name || '',
          role,
          patient_id: role === 'patient' ? patientIdFromUid(credential.user.uid) : null,
        }
        await saveUserProfile(nextProfile)
        setProfile(nextProfile)
        return credential
      },
      logout: () => signOut(auth),
    }),
    [user, profile, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
