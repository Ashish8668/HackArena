const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'openai/gpt-oss-20b'

export function groqConfigured() {
  return Boolean(import.meta.env.VITE_GROQ_API_KEY)
}

export async function groqAnswer(question, context) {
  const key = import.meta.env.VITE_GROQ_API_KEY
  if (!key) {
    throw new Error('Groq key missing.')
  }

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content:
            'Answer only from the trial record. If the record does not contain the answer, say it is not in this trial record. Do not give medical advice or eligibility decisions.',
        },
        {
          role: 'user',
          content: `Trial record:\n${context}\n\nQuestion: ${question}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error('Ask failed.')
  }

  const payload = await response.json()
  return String(payload.choices?.[0]?.message?.content || '').trim()
}
