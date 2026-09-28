import { semanticSimilarity } from './embeddingService'

export async function searchTrialsByQuery(query, trials, limit = 10) {
  const trimmed = String(query || '').trim()
  if (!trimmed) return []

  const scored = []
  for (const trial of trials) {
    const haystack = `${trial.title} ${trial.condition}`
    const score = await semanticSimilarity(trimmed, haystack)
    scored.push({ trial, score })
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => ({
      ...item.trial,
      search_similarity: Number(item.score.toFixed(2)),
    }))
}
