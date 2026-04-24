/**
 * Google Gemini AI Client
 * Integration for generative AI features
 */

import axios from 'axios';

const GEMINI_API_URL = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY not configured');
}

/**
 * Generate content with Gemini AI
 */
export async function generateContent(
  text: string,
  systemPrompt?: string
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  const parts: any[] = [];

  // Add system prompt if provided
  if (systemPrompt) {
    parts.push({
      text: systemPrompt,
    });
  }

  // Add user query
  parts.push({
    text,
  });

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts,
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // Extract text from response
    if (
      response.data.candidates &&
      response.data.candidates[0]?.content?.parts &&
      response.data.candidates[0].content.parts[0]?.text
    ) {
      return response.data.candidates[0].content.parts[0].text;
    }

    throw new Error('No content in Gemini response');
  } catch (error: any) {
    console.error('Gemini API error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.error?.message || 'Gemini API call failed'
    );
  }
}

/**
 * Generate content with streaming (returns data as it comes)
 */
export async function generateContentStream(
  text: string,
  systemPrompt?: string
): Promise<AsyncIterable<string>> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  const parts: any[] = [];

  if (systemPrompt) {
    parts.push({ text: systemPrompt });
  }

  parts.push({ text });

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}/${GEMINI_MODEL}:streamGenerateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
      }
    );

    // Return async iterator for streaming
    return streamResponseAsyncIterator(response.data);
  } catch (error: any) {
    console.error('Gemini streaming error:', error.message);
    throw new Error('Gemini streaming failed');
  }
}

/**
 * Count tokens in text (estimation)
 */
export async function countTokens(text: string): Promise<number> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}/${GEMINI_MODEL}:countTokens?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [{ text }],
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.totalTokens || 0;
  } catch (error: any) {
    console.error('Token count error:', error.message);
    return Math.ceil(text.length / 4); // Rough estimate
  }
}

/**
 * Summarize text using Gemini
 */
export async function summarizeText(text: string): Promise<string> {
  const systemPrompt =
    'You are a helpful assistant. Summarize the following text concisely in 2-3 sentences.';
  return generateContent(text, systemPrompt);
}

/**
 * Translate text
 */
export async function translateText(
  text: string,
  targetLanguage: string
): Promise<string> {
  const systemPrompt = `Translate the following text to ${targetLanguage}. Return only the translation, no explanations.`;
  return generateContent(text, systemPrompt);
}

/**
 * Generate product description from keywords
 */
export async function generateProductDescription(
  keywords: string[]
): Promise<string> {
  const text = `Generate a compelling product description for an auto parts item with these keywords: ${keywords.join(', ')}. Keep it under 100 words.`;
  return generateContent(text);
}

/**
 * Answer product-related question
 */
export async function answerProductQuestion(question: string, context?: string): Promise<string> {
  const systemPrompt = `You are an auto parts expert assistant for a Venezuelan auto parts store called Turbobujias. 
${context ? `Context about products: ${context}` : ''}
Answer the customer's question helpfully and accurately.`;
  
  return generateContent(question, systemPrompt);
}

/**
 * Helper: Convert stream to async iterator
 */
async function* streamResponseAsyncIterator(
  stream: any
): AsyncIterable<string> {
  return new Promise((resolve, reject) => {
    let buffer = '';
    stream.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
              resolve(data.candidates[0].content.parts[0].text);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    });

    stream.on('end', () => resolve(''));
    stream.on('error', reject);
  }) as any;
}
