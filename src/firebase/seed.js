import { SYNTHETIC_TRIALS } from '../data/trials'
import { generateSyntheticPatients } from '../data/patients'
import { isFirebaseConfigured, db, storage } from './config'
import { storeUpsertPatient, storeUpsertTrial } from '../services/dataStore'

export async function seedSyntheticDataset() {
  const patients = generateSyntheticPatients()

  // Always seed the unified local store
  for (const t of SYNTHETIC_TRIALS) {
    await storeUpsertTrial(t)
  }
  for (const p of patients) {
    await storeUpsertPatient(p)
  }

  // Also seed Firebase if configured
  if (isFirebaseConfigured() && db) {
    try {
      const { writeBatch, doc } = await import('firebase/firestore')
      const chunkSize = 400
      for (let i = 0; i < patients.length; i += chunkSize) {
        const batch = writeBatch(db)
        const slice = patients.slice(i, i + chunkSize)
        slice.forEach((record) => {
          batch.set(doc(db, 'patients', record.patient_id), {
            ...record,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        })
        await batch.commit()
      }
      for (let i = 0; i < SYNTHETIC_TRIALS.length; i += chunkSize) {
        const batch = writeBatch(db)
        const slice = SYNTHETIC_TRIALS.slice(i, i + chunkSize)
        slice.forEach((record) => {
          batch.set(doc(db, 'trials', record.trial_id), {
            ...record,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        })
        await batch.commit()
      }
    } catch (err) {
      console.warn('Firebase batch seed warning:', err)
    }
  }

  return { trialCount: SYNTHETIC_TRIALS.length, patientCount: patients.length }
}

export async function uploadSourceFile(file) {
  if (!storage) return 'local_upload_' + file.name
  try {
    const { ref, uploadBytes } = await import('firebase/storage')
    const fileRef = ref(storage, `uploads/${Date.now()}_${file.name}`)
    await uploadBytes(fileRef, file)
    return fileRef.fullPath
  } catch {
    return 'local_upload_' + file.name
  }
}
