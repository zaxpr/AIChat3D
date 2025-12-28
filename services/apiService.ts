import { Message } from '../types';
import { OPENAI_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID } from '../config';

/**
 * Generates text response using OpenAI GPT-3.5-turbo
 */
export const generateTextResponse = async (messages: Message[], userPrompt: string): Promise<string> => {
  if (!OPENAI_API_KEY) {
    return "Error: OPENAI_API_KEY is missing in configuration.";
  }

  // Convert internal Message format to OpenAI format
  // Internal: 'user' | 'model'
  // OpenAI: 'user' | 'assistant'
  const apiMessages = messages.map(m => ({
    role: m.role === 'model' ? 'assistant' : 'user',
    content: m.text
  }));

  // Add the current prompt
  apiMessages.push({ role: 'user', content: userPrompt });

  // Add system instruction
  const systemMessage = {
    role: 'system',
    content: "You are a helpful, cheerful 3D virtual assistant. Keep your responses concise (under 2 sentences) so the conversation flows quickly and the text-to-speech doesn't take too long."
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [systemMessage, ...apiMessages],
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'OpenAI API Error');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "I couldn't think of a response.";

  } catch (error) {
    console.error("OpenAI Error:", error);
    throw error;
  }
};

/**
 * Converts text to speech using ElevenLabs API
 */
export const generateSpeech = async (text: string): Promise<ArrayBuffer> => {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY is missing.");
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail?.message || 'ElevenLabs API Error');
    }

    // ElevenLabs returns the audio file binary directly
    const arrayBuffer = await response.arrayBuffer();
    return arrayBuffer;

  } catch (error) {
    console.error("ElevenLabs TTS Error:", error);
    throw error;
  }
};