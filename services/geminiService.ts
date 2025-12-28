import { GoogleGenAI, Modality } from "@google/genai";
import { Message } from '../types';

// Initialize Gemini Client
// We use Gemini for BOTH text and TTS to streamline the application and reduce latency/dependencies.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates a text response from Gemini 3 Flash.
 */
export const generateTextResponse = async (messages: Message[], prompt: string): Promise<string> => {
  try {
    // The messages array includes the latest user prompt at the end.
    // For the history configuration, we need all previous messages.
    const historyMessages = messages.slice(0, -1);
    
    const history = historyMessages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      history: history,
      config: {
        systemInstruction: "You are a helpful, cheerful anime character assistant. Keep your responses concise (under 2 sentences) so the conversation flows quickly.",
      }
    });

    const response = await chat.sendMessage({ message: prompt });
    return response.text || "I couldn't think of a response.";
  } catch (error) {
    console.error("Gemini Text Error:", error);
    throw error;
  }
};

/**
 * Converts text to speech using Gemini 2.5 Flash TTS.
 */
export const generateSpeech = async (text: string): Promise<ArrayBuffer> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // 'Kore', 'Puck', 'Charon', 'Fenrir'
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) {
      throw new Error("No audio data received from Gemini.");
    }

    // Decode Base64 to ArrayBuffer
    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes.buffer;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    throw error;
  }
};