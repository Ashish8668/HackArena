import { cosineSimilarity } from './cosineSimilarity'
import { canonicalizeCondition } from './normalization'

const embeddingCache = new Map()

let extractorPromise = null
let modelStatus = 'idle'

export function getEmbeddingModelStatus() {
  return modelStatus
}

async function loadExtractor() {
  if (extractorPromise) return extractorPromise
  modelStatus = 'loading'
  extractorPromise = import('@xenova/transformers')
    .then(async ({ pipeline, env }) => {
      env.allowLocalModels = false
      env.useBrowserCache = true
      const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
      modelStatus = 'ready'
      return extractor
    })
    .catch((error) => {
      modelStatus = 'fallback'
      extractorPromise = null
      console.warn('Transformers.js model unavailable; using lexical fallback.', error)
      throw error
    })
  return extractorPromise
}

function lexicalVector(text) {
  const tokens = canonicalizeCondition(text).split(/[_\s]+/).filter(Boolean)
  const counts = {}
  tokens.forEach((token) => {
    counts[token] = (counts[token] || 0) + 1
    if (token.length > 2) {
      for (let i = 0; i < token.length - 2; i += 1) {
        const gram = token.slice(i, i + 3)
        counts[gram] = (counts[gram] || 0) + 0.3
      }
    }
  })
  const keys = Object.keys(counts).sort()
  return { keys, values: keys.map((key) => counts[key]) }
}

function lexicalSimilarity(a, b) {
  const va = lexicalVector(a)
  const vb = lexicalVector(b)
  const keys = Array.from(new Set([...va.keys, ...vb.keys])).sort()
  const mapA = Object.fromEntries(va.keys.map((k, i) => [k, va.values[i]]))
  const mapB = Object.fromEntries(vb.keys.map((k, i) => [k, vb.values[i]]))
  return cosineSimilarity(
    keys.map((k) => mapA[k] || 0),
    keys.map((k) => mapB[k] || 0),
  )
}

export async function embedText(text) {
  const canonical = canonicalizeCondition(text)
  const cacheKey = `emb:${canonical}`
  if (embeddingCache.has(cacheKey)) return embeddingCache.get(cacheKey)

  try {
    const extractor = await loadExtractor()
    const output = await extractor(canonical, { pooling: 'mean', normalize: true })
    const vector = Array.from(output.data)
    embeddingCache.set(cacheKey, vector)
    return vector
  } catch {
    modelStatus = 'fallback'
    return null
  }
}

export async function semanticSimilarity(textA, textB) {
  const canonicalA = canonicalizeCondition(textA)
  const canonicalB = canonicalizeCondition(textB)
  if (canonicalA && canonicalA === canonicalB) return 1

  const [embA, embB] = await Promise.all([embedText(textA), embedText(textB)])
  if (embA && embB) return cosineSimilarity(embA, embB)
  return lexicalSimilarity(textA, textB)
}

export async function warmupEmbeddingModel() {
  try {
    await embedText('type 2 diabetes mellitus')
  } catch {
    modelStatus = 'fallback'
  }
}
