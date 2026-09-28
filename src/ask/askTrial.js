import { TRIAL_KNOWLEDGE } from './trialKnowledge'
import { groqAnswer, groqConfigured } from './groqAsk'

function tokens(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((item) => item.length > 1)
}

function scoreChunk(question, chunkText) {
  const q = new Set(tokens(question))
  const c = tokens(chunkText)
  if (!q.size || !c.length) return 0
  let hit = 0
  c.forEach((token) => {
    if (q.has(token)) hit += 1
  })
  return hit / Math.sqrt(q.size * c.length)
}

function routeHint(question) {
  const q = tokens(question).join(' ')
  if (/\b(age|years|old)\b/.test(q)) return 'age'
  if (/\b(gender|male|female|women|men)\b/.test(q)) return 'gender'
  if (/\b(hba1c|a1c|sugar|glucose)\b/.test(q)) return 'hba1c'
  if (/\b(bmi|weight|obesity)\b/.test(q)) return 'bmi'
  if (/\b(medicine|drug|insulin|excluded|tablet)\b/.test(q)) return 'medicine'
  if (/\b(condition|disease|diabetes|copd|ckd|heart|hypertension)\b/.test(q)) return 'condition'
  if (/\b(visit|clinic|session)\b/.test(q)) return 'visits'
  if (/\b(what|about|purpose|study|trial)\b/.test(q)) return 'purpose'
  return ''
}

function splitKnowledge(text) {
  return String(text || '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      if (line.length <= 400) return [line]
      const parts = []
      for (let i = 0; i < line.length; i += 360) {
        parts.push(line.slice(i, i + 400))
      }
      return parts
    })
}

export function trialChunks(trial) {
  if (!trial?.trial_id) return []
  const extra = TRIAL_KNOWLEDGE[trial.trial_id] || {}
  const knowledgeLines = splitKnowledge(trial.knowledge)
  return [
    { id: 'title', text: `${trial.trial_id} ${trial.title}` },
    { id: 'condition', text: `Condition: ${trial.condition}` },
    { id: 'age', text: `Age range: ${trial.min_age} to ${trial.max_age}` },
    { id: 'gender', text: `Gender: ${trial.gender}` },
    { id: 'hba1c', text: `Maximum HbA1c: ${trial.max_hba1c}` },
    { id: 'bmi', text: `BMI range: ${trial.min_bmi} to ${trial.max_bmi}` },
    { id: 'medicine', text: `Excluded medicine: ${trial.excluded_medicine}` },
    { id: 'purpose', text: extra.purpose || '' },
    { id: 'visits', text: extra.visits || '' },
    ...knowledgeLines.map((text, index) => ({ id: `knowledge-${index}`, text })),
  ].filter((item) => item.text)
}

export function retrieveTrialContext(trial, question, limit = 6) {
  const text = String(question || '').trim()
  const chunks = trialChunks(trial)
  const hint = routeHint(text)
  return chunks
    .map((chunk) => {
      let score = scoreChunk(text, chunk.text)
      if (hint && chunk.id === hint) score += 0.35
      if (String(chunk.id).startsWith('knowledge')) score += 0.05
      return { ...chunk, score }
    })
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0)
    .slice(0, limit)
}

export function askAboutTrial(trial, question) {
  const text = String(question || '').trim()
  if (!trial || !text) {
    return { answer: 'Ask a question about this trial.', sources: [] }
  }

  const top = retrieveTrialContext(trial, text, 3)
  if (!top.length) {
    return { answer: 'Not in this trial record.', sources: [] }
  }

  return {
    answer: top.map((item) => item.text).join(' '),
    sources: top.map((item) => item.id),
  }
}

export async function askTrialQuestion(trial, question) {
  const fallback = askAboutTrial(trial, question)
  if (!groqConfigured()) return fallback

  const ranked = retrieveTrialContext(trial, question, 8)
  const context = (ranked.length ? ranked : trialChunks(trial)).map((item) => item.text).join('\n')

  try {
    const answer = await groqAnswer(question, context)
    return {
      answer: answer || fallback.answer,
      sources: ranked.map((item) => item.id),
    }
  } catch {
    return fallback
  }
}
