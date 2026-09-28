import {
  getDrugKnowledgeContext,
  lookupDrugInKnowledgeBase,
  normalizeMedicineName,
} from '../data/drugKnowledgeBase'
import { analyzeMedicineConflictWithAI, hasGeminiKey } from './geminiService'

// Local in-memory & localStorage Medicine Match Cache
const CACHE_STORAGE_KEY = 'trialmatch_medicine_cache'

function getMemoryCache() {
  if (typeof window === 'undefined') return new Map()
  if (!window.__trialmatch_med_cache) {
    window.__trialmatch_med_cache = new Map()
    try {
      const persisted = window.localStorage.getItem(CACHE_STORAGE_KEY)
      if (persisted) {
        const parsed = JSON.parse(persisted)
        Object.entries(parsed).forEach(([k, v]) => window.__trialmatch_med_cache.set(k, v))
      }
    } catch {
      // Ignore parse failure
    }
  }
  return window.__trialmatch_med_cache
}

function persistCacheEntry(key, value) {
  const cache = getMemoryCache()
  cache.set(key, value)
  try {
    const obj = {}
    // Keep max 200 items in persistent storage
    const entries = Array.from(cache.entries()).slice(-200)
    entries.forEach(([k, v]) => {
      obj[k] = v
    })
    window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(obj))
  } catch {
    // Local storage full or unavailable
  }
}

/**
 * AI Medicine Helper (RAG + Rule-based + LLM)
 * Evaluates whether a patient's medicine conflicts with a trial's excluded medicine
 * based on exclusion scope: 'exact_drug' | 'same_class' | 'same_effect'
 */
export async function evaluateMedicineConflict({
  patientMedicine,
  excludedMedicine,
  scope = 'exact_drug',
  allowAi = true,
}) {
  const normPatient = normalizeMedicineName(patientMedicine)
  const normExcluded = normalizeMedicineName(excludedMedicine)

  // Empty or non-exclusion cases
  if (
    !normExcluded ||
    normExcluded === 'none' ||
    normExcluded === 'na' ||
    normExcluded === 'n a' ||
    normExcluded === 'nil'
  ) {
    return {
      conflict: false,
      status: 'NO_CONFLICT',
      patient_value: patientMedicine || 'None',
      excluded_medicine: excludedMedicine || 'None',
      scope,
      explanation: 'Trial has no excluded medicines specified.',
      evidence: 'No exclusion criteria configured.',
      source: 'rule_engine',
    }
  }

  if (
    !normPatient ||
    normPatient === 'none' ||
    normPatient === 'na' ||
    normPatient === 'nil'
  ) {
    return {
      conflict: false,
      status: 'NO_CONFLICT',
      patient_value: patientMedicine || 'None',
      excluded_medicine: excludedMedicine,
      scope,
      explanation: 'Patient is not currently taking any conflicting medication.',
      evidence: 'Patient reports no active medication.',
      source: 'rule_engine',
    }
  }

  // Check Cache
  const cacheKey = `${normPatient}|${normExcluded}|${scope}`
  const cache = getMemoryCache()
  if (cache.has(cacheKey)) {
    return {
      ...cache.get(cacheKey),
      patient_value: patientMedicine,
      excluded_medicine: excludedMedicine,
      cached: true,
    }
  }

  // Step 1 & 2: Exact Name & Alias Check in Drug Knowledge Base
  const patientDrug = lookupDrugInKnowledgeBase(patientMedicine)
  const excludedDrug = lookupDrugInKnowledgeBase(excludedMedicine)

  // Exact chemical match check
  const isDirectMatch =
    normPatient === normExcluded ||
    (patientDrug && excludedDrug && patientDrug.id === excludedDrug.id)

  if (isDirectMatch) {
    const result = {
      conflict: true,
      status: 'CONFLICT',
      classification: 'exact',
      patient_value: patientMedicine,
      excluded_medicine: excludedMedicine,
      scope,
      explanation: `Patient is taking ${patientDrug ? patientDrug.name : patientMedicine}, which directly matches the excluded drug ${excludedMedicine}.`,
      evidence: patientDrug
        ? `Matched via canonical registry [${patientDrug.name}, ATC ${patientDrug.atc}]`
        : 'Exact string/alias match',
      source: 'knowledge_base_exact',
    }
    persistCacheEntry(cacheKey, result)
    return result
  }

  // If scope is ONLY exact_drug and they don't match, we check if there's any ambiguous brand alias
  if (scope === 'exact_drug') {
    const result = {
      conflict: false,
      status: 'NO_CONFLICT',
      classification: 'none',
      patient_value: patientMedicine,
      excluded_medicine: excludedMedicine,
      scope,
      explanation: `Patient's medication (${patientMedicine}) does not match the specific excluded drug (${excludedMedicine}).`,
      evidence: 'Different chemical entities under exact drug scope.',
      source: 'knowledge_base_exact',
    }
    persistCacheEntry(cacheKey, result)
    return result
  }

  // Step 3: Pharmacological Class & ATC Check (Local RAG)
  if (patientDrug && excludedDrug) {
    const sameClass =
      patientDrug.class.toLowerCase() === excludedDrug.class.toLowerCase() ||
      (patientDrug.atc &&
        excludedDrug.atc &&
        patientDrug.atc.slice(0, 3) === excludedDrug.atc.slice(0, 3))

    if (sameClass) {
      const result = {
        conflict: true,
        status: 'CONFLICT',
        classification: 'same_class',
        patient_value: patientMedicine,
        excluded_medicine: excludedMedicine,
        scope,
        explanation: `Class conflict: ${patientDrug.name} and ${excludedDrug.name} both belong to the '${patientDrug.class}' class (ATC category: ${patientDrug.atc.slice(0, 3)}).`,
        evidence: `ATC codes: ${patientDrug.atc} vs ${excludedDrug.atc}. Mechanism: ${patientDrug.mechanism}`,
        source: 'knowledge_base_class',
      }
      persistCacheEntry(cacheKey, result)
      return result
    }

    // Mechanism / Same Effect Check
    if (scope === 'same_effect') {
      const relatedClass =
        (patientDrug.relatedClasses || []).some((rc) =>
          rc.toLowerCase().includes(excludedDrug.class.toLowerCase())
        ) ||
        (excludedDrug.relatedClasses || []).some((rc) =>
          rc.toLowerCase().includes(patientDrug.class.toLowerCase())
        )

      if (relatedClass) {
        const result = {
          conflict: true,
          status: 'CONFLICT',
          classification: 'same_effect',
          patient_value: patientMedicine,
          excluded_medicine: excludedMedicine,
          scope,
          explanation: `Pharmacological cross-effect: ${patientDrug.name} (${patientDrug.class}) shares clinical targets with ${excludedDrug.name} (${excludedDrug.class}).`,
          evidence: `Mechanism comparison: ${patientDrug.mechanism}`,
          source: 'knowledge_base_effect',
        }
        persistCacheEntry(cacheKey, result)
        return result
      }
    }
  }

  // Step 4: If LLM is available and user enabled AI, use Gemini RAG + LLM analysis
  if (allowAi && hasGeminiKey()) {
    const ragContext = getDrugKnowledgeContext(patientMedicine, excludedMedicine)
    const aiResult = await analyzeMedicineConflictWithAI({
      patientMedicine,
      excludedMedicine,
      scope,
      ragContext,
    })

    if (aiResult) {
      const result = {
        conflict: Boolean(aiResult.conflict),
        status: aiResult.conflict ? 'CONFLICT' : 'NO_CONFLICT',
        classification: aiResult.classification || 'none',
        patient_value: patientMedicine,
        excluded_medicine: excludedMedicine,
        scope,
        explanation: aiResult.explanation,
        evidence: aiResult.evidence,
        recommendation: aiResult.recommendation,
        confidence: aiResult.confidence,
        source: 'gemini_rag_llm',
      }
      persistCacheEntry(cacheKey, result)
      return result
    }
  }

  // Fallback default: No conflict identified
  const finalResult = {
    conflict: false,
    status: 'NO_CONFLICT',
    classification: 'none',
    patient_value: patientMedicine,
    excluded_medicine: excludedMedicine,
    scope,
    explanation: `No pharmacological conflict detected between ${patientMedicine} and ${excludedMedicine} under scope '${scope}'.`,
    evidence: patientDrug && excludedDrug
      ? `Distinct drug classes: ${patientDrug.class} vs ${excludedDrug.class}`
      : 'Knowledge base inspection showed distinct pharmacological profiles.',
    source: 'knowledge_base_rule',
  }
  persistCacheEntry(cacheKey, finalResult)
  return finalResult
}
