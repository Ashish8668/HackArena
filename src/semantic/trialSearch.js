import { semanticSimilarity } from './embeddingService'
import { canonicalizeCondition } from './normalization'

/**
 * Fast token/ngram lexical matching score (0 to 1)
 */
function fastTextScore(query, text) {
  if (!query || !text) return 0
  const qTokens = query.toLowerCase().split(/[_\s,.-]+/).filter((t) => t.length > 2)
  if (!qTokens.length) return 0
  const tNorm = text.toLowerCase()

  let matches = 0
  qTokens.forEach((token) => {
    if (tNorm.includes(token)) {
      matches += 1
    }
  })

  // Exact phrase match bonus
  if (tNorm.includes(query.toLowerCase().trim())) {
    return Math.min(1.0, 0.4 + (matches / qTokens.length) * 0.6)
  }

  return Number((matches / qTokens.length).toFixed(2))
}

/**
 * Refined Hybrid Trial Search:
 * Combines instant high-precision keyword/token scoring with semantic condition embeddings
 */
export async function searchTrialsByQuery(query, trials, limit = 20) {
  const trimmed = String(query || '').trim()
  if (!trimmed) {
    return trials.map((t) => ({ ...t, search_similarity: 1.0 }))
  }

  const scored = []
  for (const trial of trials) {
    const haystack = `${trial.title} ${trial.condition} ${trial.trial_id} ${trial.excluded_medicine || ''} ${trial.site_location || ''}`
    
    // Quick token match
    const lexicalScore = fastTextScore(trimmed, haystack)

    // Semantic condition similarity
    let semanticScore = 0
    try {
      semanticScore = await semanticSimilarity(trimmed, trial.condition)
    } catch {
      semanticScore = lexicalScore
    }

    // Weighted hybrid score
    const combinedScore = Math.max(lexicalScore, semanticScore * 0.7 + lexicalScore * 0.3)

    scored.push({
      trial,
      score: combinedScore,
    })
  }

  return scored
    .filter((item) => item.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => ({
      ...item.trial,
      search_similarity: Number(item.score.toFixed(2)),
    }))
}
