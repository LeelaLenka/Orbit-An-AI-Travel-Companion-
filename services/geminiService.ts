
import { GoogleGenAI, Type, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const getPlaceSuggestions = async (prefix: string): Promise<string[]> => {
  if (prefix.length < 2) return [];
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `List exactly 5 well-known cities or towns starting with "${prefix}". Return as a simple comma-separated string. No extra text.`,
  });
  return response.text.split(',').map(s => s.trim()).filter(Boolean);
};

export const searchGlobalPlace = async (from: string, to: string): Promise<any | null> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Provide a high-end luxury travel strategy from "${from}" to "${to}". 
    The goal is to make the user feel like a millionaire on a low budget.
    Include:
    1. Realistic route breakdown for: Flight, Train, Bus, Car, and Bike.
    2. Comparison between 3 luxury sites (Orbit Elite, SkyHigh, GlobalPremier) where Orbit is the cheapest.
    3. Luxury hacks (VIP lounges for cheap, secret budget 5-star spots).
    
    Return JSON only.
    Schema: { 
      "name": "Destination Name", 
      "country": "Country", 
      "description": "Sophisticated description", 
      "estimatedBaseCostUSD": number, 
      "comparisons": [{"site": "string", "priceINR": number}],
      "luxuryTips": ["string"],
      "costs": { "flight": number, "train": number, "bus": number, "car": number, "bike": number },
      "routeSummary": "string",
      "laws": ["string"],
      "healthyFood": ["string"],
      "emergency": { "police": "string", "medical": "string" }
    }`,
    config: { responseMimeType: "application/json" }
  });
  
  try {
    return JSON.parse(response.text);
  } catch (e) {
    return null;
  }
};

export const orbitAgentChat = async (message: string, context: any) => {
  const chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are Orbit Elite, a premium travel strategist.
      Make the user feel like royalty.
      - Compare prices, prioritize low-cost luxury.
      - Provide detailed routes from ${context.location}.
      - Elegant language only.
      - Prices in INR (1 USD = 83 INR).`,
    },
  });

  const response = await chat.sendMessage({ message: message });
  return response.text;
};

export const translateAndSpeak = async (text: string, targetLanguage: string) => {
  const translationResp = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Translate to ${targetLanguage}: "${text}". Return string only.`
  });
  
  const translatedText = translationResp.text || "";

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: [{ parts: [{ text: `Speak with a sophisticated tone in ${targetLanguage}: ${translatedText}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Puck' },
        },
      },
    },
  });

  return {
    audio: response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data,
    text: translatedText
  };
};

export const playBase64Audio = async (base64Audio: string) => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  if (audioContext.state === 'suspended') await audioContext.resume();
  const audioBytes = decode(base64Audio);
  const audioBuffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start();
};
