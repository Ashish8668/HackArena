import { writeBatch, doc } from 'firebase/firestore'
import { ref, uploadBytes } from 'firebase/storage'
import { db, storage } from './config'
import { SYNTHETIC_TRIALS } from '../data/trials'
import { generateSyntheticPatients } from '../data/patients'

async function commitInChunks(records, collectionName, idField) {
  const chunkSize = 400
  for (let i = 0; i < records.length; i += chunkSize) {
    const batch = writeBatch(db)
    const slice = records.slice(i, i + chunkSize)
    slice.forEach((record) => {
      batch.set(doc(db, collectionName, record[idField]), {
        ...record,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    })
    await batch.commit()
  }
}

export async function seedSyntheticDataset() {
  const patients = generateSyntheticPatients()
  await commitInChunks(SYNTHETIC_TRIALS, 'trials', 'trial_id')
  await commitInChunks(patients, 'patients', 'patient_id')
  return { trialCount: SYNTHETIC_TRIALS.length, patientCount: patients.length }
}

export async function uploadSourceFile(file) {
  if (!storage) return
  const fileRef = ref(storage, `uploads/${Date.now()}_${file.name}`)
  await uploadBytes(fileRef, file)
  return fileRef.fullPath
}
