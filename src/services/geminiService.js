import { GoogleGenAI } from '@google/genai'

const API_KEY_STORAGE_KEY = 'trialmatch_gemini_api_key'
const PRIMARY_MODEL = 'gemini-3.8-flash'
const FALLBACK_MODELS = ['gemini-3.8-flash', 'gemini-1.5-flash', 'gemini-2.5-flash']

export function getStoredGeminiKey() {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem(API_KEY_STORAGE_KEY)
    if (saved && saved.trim()) return saved.trim()
  }
  return import.meta.env.VITE_GEMINI_API_KEY || ''
}

export function setStoredGeminiKey(key) {
  if (typeof window !== 'undefined' && window.localStorage) {
    if (key && key.trim()) {
      window.localStorage.setItem(API_KEY_STORAGE_KEY, key.trim())
    } else {
      window.localStorage.removeItem(API_KEY_STORAGE_KEY)
    }
  }
}

export function hasGeminiKey() {
  const key = getStoredGeminiKey()
  return Boolean(key && key.length > 5)
}

function getGenAIClient(customKey) {
  const key = customKey || getStoredGeminiKey()
  if (!key) return null
  try {
    return new GoogleGenAI({ apiKey: key })
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err)
    return null
  }
}

/**
 * Resilient content generation with automatic model fallback
 */
async function generateContentWithFallback(ai, contents) {
  let lastError = null
  for (const model of FALLBACK_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
      })
      return { response, model }
    } catch (err) {
      lastError = err
      const msg = err?.message || ''
      if (
        msg.includes('404') ||
        msg.includes('not found') ||
        msg.includes('no longer available') ||
        msg.includes('unsupported')
      ) {
        continue // Try next candidate model
      }
      throw err
    }
  }
  throw lastError
}

/**
 * Validate that an API key works by making a tiny ping request
 */
export async function testGeminiApiKey(testKey) {
  const keyToUse = testKey || getStoredGeminiKey()
  if (!keyToUse) {
    return { success: false, message: 'No API key provided.' }
  }

  const ai = getGenAIClient(keyToUse)
  if (!ai) {
    return { success: false, message: 'Could not initialize GoogleGenAI client.' }
  }

  try {
    const { response, model } = await generateContentWithFallback(
      ai,
      'Respond with the single word "OK" to test connectivity.'
    )
    const text = response?.text || ''
    if (text.toLowerCase().includes('ok') || text.length > 0) {
      return {
        success: true,
        message: `Connection successful! Gemini API is active using model: ${model}.`,
      }
    }
    return { success: false, message: 'Unexpected response from Gemini API.' }
  } catch (error) {
    return {
      success: false,
      message: error?.message || 'Failed to authenticate with Google Gemini API.',
    }
  }
}

/**
 * AI Medicine Conflict Analysis (RAG + LLM)
 * Strictly privacy compliant: Only drug names and pharmacological data are passed. No patient identifiers!
 */
export async function analyzeMedicineConflictWithAI({
  patientMedicine,
  excludedMedicine,
  scope = 'exact_drug',
  ragContext = null,
}) {
  const ai = getGenAIClient()
  if (!ai) {
    return null // Caller will fall back to local RAG rules
  }

  const prompt = `You are a clinical pharmacologist assisting in clinical trial recruitment.
Your task is to analyze whether a patient's current medicine conflicts with a clinical trial's excluded medicine criterion.

[PRIVACY NOTICE]: You are only given drug names and pharmacological reference. No patient information or PHI is included.

TRIAL EXCLUSION SCOPE: "${scope}"
- "exact_drug": Only the exact chemical entity or direct synonym/brand is excluded.
- "same_class": Any drug in the same pharmacological / therapeutic class is excluded.
- "same_effect": Any drug sharing the primary mechanism of action or biological target is excluded.

DRUGS UNDER EVALUATION:
- Patient Current Medicine: "${patientMedicine}"
- Trial Excluded Medicine: "${excludedMedicine}"

RAG KNOWLEDGE BASE CONTEXT:
${ragContext ? JSON.stringify(ragContext, null, 2) : 'No additional monograph.'}

Analyze whether there is a conflict under the specified scope.
Return a STRICT JSON response only (no markdown code blocks, just raw JSON) matching this schema:
{
  "conflict": boolean,
  "confidence": number between 0 and 1,
  "classification": "exact" | "same_class" | "same_effect" | "none",
  "explanation": "Clear, concise 1-2 sentence medical explanation for the research coordinator",
  "evidence": "Pharmacological evidence such as drug class, ATC code, or mechanism",
  "recommendation": "Actionable next step for the coordinator (e.g. 'Exclude patient' or 'Proceed to screening' or 'Consult PI for washout protocol')"
}
`

  try {
    const { response, model } = await generateContentWithFallback(ai, prompt)

    let clean = (response?.text || '').trim()
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    const parsed = JSON.parse(clean)
    return {
      ...parsed,
      source: `gemini_llm (${model})`,
    }
  } catch (err) {
    console.warn('Gemini LLM medicine analysis failed, falling back to local RAG:', err)
    return null
  }
}

/**
 * Multilingual Outreach Message Generator (English, Hindi, Marathi)
 * Formats: SMS or Email
 */
export async function generateOutreachMessage({
  trialTitle,
  patientName = 'Participant',
  siteLocation = 'City Medical Research Institute, Pune / Mumbai',
  language = 'en', // 'en' | 'hi' | 'mr'
  format = 'email', // 'email' | 'sms'
  condition = '',
  coordinatorName = 'Clinical Research Coordinator',
}) {
  const ai = getGenAIClient()

  // High quality pre-built templates for offline / instant fallback
  const fallbackTemplates = {
    en: {
      email: {
        subject: `Clinical Research Opportunity: ${trialTitle}`,
        body: `Dear ${patientName},

We are reaching out from ${siteLocation}. Based on the health information you provided, you may be eligible to participate in our clinical research study: "${trialTitle}".

This study aims to advance treatment options for ${condition || 'your health condition'}. Participation is entirely voluntary, and your healthcare will not be affected whether you join or not.

To confirm whether this study is right for you, we would like to invite you for an initial in-person or phone screening visit.

If you are interested in learning more and consenting to this evaluation, please reply to this email or contact our study team.

Warm regards,
${coordinatorName}
${siteLocation}`,
      },
      sms: {
        subject: `Study Invite: ${trialTitle}`,
        body: `Hello ${patientName}, you may qualify for the "${trialTitle}" study at ${siteLocation}. Participation is voluntary. Reply YES if you'd like to schedule an initial screening, or call us directly. - ${coordinatorName}`,
      },
    },
    hi: {
      email: {
        subject: `क्लिनिकल रिसर्च अध्ययन अवसर: ${trialTitle}`,
        body: `नमस्ते ${patientName},

हम ${siteLocation} से संपर्क कर रहे हैं। आपके द्वारा प्रदान की गई स्वास्थ्य जानकारी के आधार पर, आप हमारे शोध अध्ययन "${trialTitle}" में भाग लेने के पात्र हो सकते हैं।

इस अध्ययन का उद्देश्य ${condition || 'स्वास्थ्य स्थिति'} के लिए बेहतर उपचार विकल्पों की खोज करना है। इसमें भाग लेना पूरी तरह से आपकी इच्छा पर निर्भर है।

यह पुष्टि करने के लिए कि क्या यह अध्ययन आपके लिए उपयुक्त है, हम आपको एक प्रारंभिक जांच (स्क्रीनिंग) के लिए आमंत्रित करना चाहते हैं। कोई भी प्रक्रिया आपकी स्पष्ट सहमति के बिना शुरू नहीं की जाएगी।

यदि आप अधिक जानकारी प्राप्त करने और सहमति देने में रुचि रखते हैं, तो कृपया इस संदेश का उत्तर दें।

सादर,
${coordinatorName}
${siteLocation}`,
      },
      sms: {
        subject: `रिसर्च अध्ययन आमंत्रण: ${trialTitle}`,
        body: `नमस्ते ${patientName}, आप ${siteLocation} में "${trialTitle}" अध्ययन के लिए संभावित रूप से पात्र हैं। भाग लेना स्वैच्छिक है। यदि आप स्क्रीनिंग चर्चा चाहते हैं तो YES लिखकर उत्तर दें। - ${coordinatorName}`,
      },
    },
    mr: {
      email: {
        subject: `क्लिनिकल संशोधन अभ्यास संधी: ${trialTitle}`,
        body: `नमस्कार ${patientName},

आम्ही ${siteLocation} येथून संपर्क साधत आहोत. आपण नोंदवलेल्या आरोग्य माहितीनुसार, आपण आमच्या संशोधन अभ्यास "${trialTitle}" मध्ये सहभागी होण्यासाठी पात्र असू शकता.

या संशोधनाचा मुख्य उद्देश ${condition || 'आरोग्य स्थिती'} साठी प्रगत उपचार पर्याय उपलब्ध करणे हा आहे. यात सहभाग घेणे पूर्णपणे ऐच्छिक आहे.

हा अभ्यास आपल्यासाठी योग्य आहे की नाही हे निश्चित करण्यासाठी, आम्ही आपल्याला प्राथमिक तपासणी (स्क्रीनिंग) साठी आमंत्रित करू इच्छितो. आपल्या संमतीशिवाय कोणताही सहभाग नोंदवला जाणार नाही.

आपल्याला अधिक जाणून घेण्यात आणि संमती देण्यात स्वारस्य असल्यास, कृपया या ईमेलला उत्तर द्या.

आपला नम्र,
${coordinatorName}
${siteLocation}`,
      },
      sms: {
        subject: `अभ्यास आमंत्रण: ${trialTitle}`,
        body: `नमस्कार ${patientName}, आपण ${siteLocation} येथील "${trialTitle}" अभ्यासासाठी पात्र ठरू शकता. सहभाग ऐच्छिक आहे. स्क्रीनिंग संवादासाठी कृपया YES पाठवा. - ${coordinatorName}`,
      },
    },
  }

  const selectedFallback =
    fallbackTemplates[language]?.[format] || fallbackTemplates.en[format]

  if (!ai) {
    return {
      subject: selectedFallback.subject,
      body: selectedFallback.body,
      source: 'template_fallback',
      language,
      format,
    }
  }

  const langNames = { en: 'English', hi: 'Hindi (हिंदी)', mr: 'Marathi (मराठी)' }

  const prompt = `You are a respectful, empathetic clinical research coordinator drafting an outreach message to a patient who has matched with a clinical trial.

TRIAL DETAILS:
- Trial Title: "${trialTitle}"
- Condition: "${condition || 'the relevant health condition'}"
- Research Site Location: "${siteLocation}"
- Patient First Name / Salutation: "${patientName}"
- Target Language: ${langNames[language] || 'English'}
- Message Format: ${format.toUpperCase()} (SMS should be concise under 160 words; Email should be warm, structured, and informative)

REQUIREMENTS:
1. State the trial name and explain the study simply in layperson terms.
2. Emphasize that participation is 100% voluntary and requires their explicit consent.
3. Mention the site location and invite them for a screening conversation.
4. Professional, culturally polite, and clear tone in the requested language (${langNames[language]}).
5. Return STRICT JSON with "subject" and "body" keys only (no markdown fences).
`

  try {
    const { response, model } = await generateContentWithFallback(ai, prompt)

    let clean = (response?.text || '').trim()
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    const parsed = JSON.parse(clean)
    return {
      subject: parsed.subject || selectedFallback.subject,
      body: parsed.body || selectedFallback.body,
      source: `gemini_llm (${model})`,
      language,
      format,
    }
  } catch (err) {
    console.warn('Gemini outreach generation failed, using rich template:', err)
    return {
      subject: selectedFallback.subject,
      body: selectedFallback.body,
      source: 'template_fallback',
      language,
      format,
    }
  }
}
