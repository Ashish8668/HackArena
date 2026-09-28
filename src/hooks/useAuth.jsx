import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { auth, isFirebaseConfigured } from '../firebase/config'
import { getUserProfile, homePathForRole, patientIdFromUid, saveUserProfile } from '../firebase/users'

const AuthContext = createContext(null)
const LS_CURRENT_USER = 'trialmatch_active_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check local storage for persistent simulated session first
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem(LS_CURRENT_USER)
        if (saved) {
          const parsed = JSON.parse(saved)
          setUser(parsed.user)
          setProfile(parsed.profile)
          setLoading(false)
          return
        }
      } catch {}
    }

    if (!isFirebaseConfigured() || !auth) {
      // Default to demo coordinator if no active session
      setLoading(false)
      return undefined
    }

    let unsubscribe = () => {}
    import('firebase/auth').then(({ onAuthStateChanged }) => {
      unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
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
    })

    return () => unsubscribe()
  }, [])

  function persistSession(u, p) {
    setUser(u)
    setProfile(p)
    if (typeof window !== 'undefined') {
      if (u && p) {
        window.localStorage.setItem(LS_CURRENT_USER, JSON.stringify({ user: u, profile: p }))
      } else {
        window.localStorage.removeItem(LS_CURRENT_USER)
      }
    }
  }

  const value = useMemo(
    () => ({
      user,
      profile,
      role: profile?.role || 'coordinator',
      loading,
      configured: true, // Always allow application execution (Firebase or local demo)
      isFirebaseReady: isFirebaseConfigured(),
      homePath: homePathForRole(profile?.role),

      // 1-Click Demo Login
      demoLogin: (role = 'coordinator', customPatientId = 'P001') => {
        let demoUser
        let demoProfile

        if (role === 'patient') {
          demoUser = { uid: `demo_patient_${customPatientId}`, email: `${customPatientId.toLowerCase()}@synthetic.local` }
          demoProfile = {
            uid: demoUser.uid,
            email: demoUser.email,
            name: `Participant (${customPatientId})`,
            role: 'patient',
            patient_id: customPatientId,
          }
        } else if (role === 'admin') {
          demoUser = { uid: 'demo_admin_01', email: 'admin@trialmatch.org' }
          demoProfile = {
            uid: demoUser.uid,
            email: demoUser.email,
            name: 'Dr. Evelyn Carter (Trial Admin)',
            role: 'admin',
            patient_id: null,
          }
        } else {
          // Coordinator default
          demoUser = { uid: 'demo_coord_01', email: 'coordinator@trialmatch.org' }
          demoProfile = {
            uid: demoUser.uid,
            email: demoUser.email,
            name: 'Dr. Sarah Jenkins (Lead Coordinator)',
            role: 'coordinator',
            patient_id: null,
          }
        }

        saveUserProfile(demoProfile)
        persistSession(demoUser, demoProfile)
        return demoProfile
      },

      login: async (email, password) => {
        if (isFirebaseConfigured() && auth) {
          const { signInWithEmailAndPassword } = await import('firebase/auth')
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
          persistSession(credential.user, nextProfile)
          return nextProfile
        } else {
          // Local offline auth fallback
          const uid = `usr_${email.replace(/[^a-zA-Z0-9]/g, '_')}`
          const dummyUser = { uid, email }
          let existingProfile = await getUserProfile(uid)
          if (!existingProfile) {
            existingProfile = {
              uid,
              email,
              name: email.split('@')[0],
              role: email.includes('patient') ? 'patient' : email.includes('admin') ? 'admin' : 'coordinator',
              patient_id: email.includes('patient') ? 'P001' : null,
            }
            await saveUserProfile(existingProfile)
          }
          persistSession(dummyUser, existingProfile)
          return existingProfile
        }
      },

      signup: async (email, password, extras = {}) => {
        const role = extras.role === 'patient' ? 'patient' : extras.role === 'admin' ? 'admin' : 'coordinator'

        if (isFirebaseConfigured() && auth) {
          const { createUserWithEmailAndPassword } = await import('firebase/auth')
          const credential = await createUserWithEmailAndPassword(auth, email, password)
          const nextProfile = {
            uid: credential.user.uid,
            email,
            name: extras.name || '',
            role,
            patient_id: role === 'patient' ? patientIdFromUid(credential.user.uid) : null,
          }
          await saveUserProfile(nextProfile)
          persistSession(credential.user, nextProfile)
          return credential
        } else {
          // Local fallback
          const uid = `usr_${email.replace(/[^a-zA-Z0-9]/g, '_')}`
          const nextProfile = {
            uid,
            email,
            name: extras.name || '',
            role,
            patient_id: role === 'patient' ? extras.patient_id || 'P001' : null,
          }
          await saveUserProfile(nextProfile)
          persistSession({ uid, email }, nextProfile)
          return { user: { uid, email } }
        }
      },

      logout: async () => {
        if (isFirebaseConfigured() && auth) {
          const { signOut } = await import('firebase/auth')
          await signOut(auth).catch(() => {})
        }
        persistSession(null, null)
      },
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
