// Centralized configuration for API Keys and IDs

export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'YOUR_OPENAI_API_KEY_HERE';
export const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || 'YOUR_ELEVENLABS_API_KEY_HERE';

// Default Voice ID (Rachel) - can be overridden by env variable
export const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'YOUR_ELEVENLABS_VOICE_ID_HERE'; 
