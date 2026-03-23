/**
 * openaiClient.js
 * Resume analysis powered by Groq (free, lightning-fast Llama 3 API).
 * Uses the standard OpenAI SDK pointing to Groq's endpoint.
 */

const OpenAI = require('openai');

// Lazily create the Groq client so the server can start without a key
let _client = null;
function getClient() {
  if (!_client) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error(
        'GROQ_API_KEY is not set. Please add GROQ_API_KEY=gsk_... to server/.env\n' +
        'Get a free key at: https://console.groq.com/keys'
      );
    }
    _client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1', // Point OpenAI SDK to Groq
    });
  }
  return _client;
}

/**
 * Analyze a resume using Groq's Llama 3 API.
 * @param {string} resumeText     - Extracted plain text from the resume
 * @param {string} jobDescription - Optional job description / role for matching
 * @returns {Promise<Object>} Structured analysis result
 */
async function analyzeResume(resumeText, jobDescription = '') {
  const jobSection = jobDescription
    ? `\n\nJob Description / Role provided by the user:\n${jobDescription}`
    : '\n\nNo job description was provided.';

  const prompt = `
You are an expert HR recruiter and career coach. Analyze the following resume thoroughly and return ONLY a valid JSON object (no markdown, no explanation outside JSON).

Resume Text:
${resumeText}
${jobSection}

Return this exact JSON structure (fill all fields accurately based on the resume):
{
  "score": <integer 0-100 overall resume score>,
  "grade": "<letter grade: A+, A, B+, B, C+, C, D, F>",
  "summary": "<2-3 sentence overall summary of the candidate>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "suggestions": [
    {"title": "<suggestion title>", "detail": "<detailed suggestion>", "priority": "<high|medium|low>"},
    {"title": "<suggestion title>", "detail": "<detailed suggestion>", "priority": "<high|medium|low>"},
    {"title": "<suggestion title>", "detail": "<detailed suggestion>", "priority": "<high|medium|low>"}
  ],
  "skills": {
    "extracted": ["<skill1>", "<skill2>", "<skill3>"],
    "missing": ["<missing skill 1>", "<missing skill 2>", "<missing skill 3>"]
  },
  "jobMatch": {
    "guessedTargetRole": "<if no job description is given, guess the role they are applying for based on the resume. If given, just repeat the role title from the job description>",
    "percentage": <integer 0-100 match percentage${jobDescription ? ' against the provided job description' : ' against industry standards for the guessedTargetRole'}>,
    "missingKeywords": ["<keyword1>", "<keyword2>", "<keyword3>"],
    "matchedKeywords": ["<keyword1>", "<keyword2>", "<keyword3>"]
  },
  "sections": {
    "education": {
      "score": <integer 0-100>,
      "feedback": "<detailed feedback on the education section>",
      "suggestions": ["<suggestion 1>", "<suggestion 2>"]
    },
    "experience": {
      "score": <integer 0-100>,
      "feedback": "<detailed feedback on the experience section>",
      "suggestions": ["<suggestion 1>", "<suggestion 2>"]
    },
    "skills": {
      "score": <integer 0-100>,
      "feedback": "<detailed feedback on the skills section>",
      "suggestions": ["<suggestion 1>", "<suggestion 2>"]
    }
  },
  "atsCompatibility": <integer 0-100 ATS compatibility score>,
  "wordCount": <integer word count of resume>
}

IMPORTANT: Reply ONLY with valid JSON. Do not wrap in markdown \`\`\` blocs. Do not include any pretext or posttext.
`;

  let response;
  try {
    // We use llama-3.1-8b-instant which is incredibly fast and free.
    response = await getClient().chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You are a JSON-only API. You output raw valid JSON without markdown wrapping.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 3000,
    });
  } catch (apiErr) {
    const status = apiErr.status || apiErr.statusCode;
    if (status === 429) {
      throw new Error(
        'Groq API rate limit exceeded. Please wait a few seconds and try again.'
      );
    }
    if (status === 401) {
      throw new Error(
        'Invalid Groq API key. Please check your GROQ_API_KEY in the server/.env file.\n' + 
        'Get a free key at: https://console.groq.com/keys'
      );
    }
    throw new Error(`Groq API error (${status || 'unknown'}): ${apiErr.message}`);
  }

  const content = response.choices[0].message.content.trim();

  // Strip markdown code fences if model accidentally wraps in them
  const cleaned = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (parseErr) {
    throw new Error(`Groq returned invalid JSON: ${parseErr.message}\nRaw: ${cleaned.substring(0, 300)}`);
  }
}

module.exports = { analyzeResume };
