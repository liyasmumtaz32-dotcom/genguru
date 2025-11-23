
import { GoogleGenAI, Modality, GenerateContentResponse, LiveServerMessage, Blob } from "@google/genai";

export const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const handleGeminiError = (error: any) => {
    console.error("Gemini API Error Full:", error);
    
    // Extract error details from various potential structures
    const msg = error?.message || JSON.stringify(error);
    const status = error?.status || error?.response?.status;
    const code = error?.error?.code;
    const errStatus = error?.error?.status;

    // Check for 429 / Resource Exhausted
    if (
        status === 429 || 
        code === 429 || 
        msg.includes('429') || 
        msg.includes('quota') || 
        msg.includes('RESOURCE_EXHAUSTED') ||
        errStatus === 'RESOURCE_EXHAUSTED'
    ) {
        throw new Error("⚠️ KUOTA HABIS (429): Batas penggunaan AI harian telah tercapai. Silakan coba lagi besok.");
    }

    throw new Error(`Gagal memproses permintaan AI: ${msg.substring(0, 100)}...`);
};

// Default Flash generation
export const generateTextContent = async (prompt: string, systemInstruction?: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });
    return response.text;
  } catch (error) {
    handleGeminiError(error);
    return ""; // Should not reach here
  }
};

// Fast generation using Flash-Lite
export const generateFastContent = async (prompt: string, systemInstruction?: string) => {
    try {
      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite-latest',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });
      return response.text;
    } catch (error) {
      handleGeminiError(error);
      return "";
    }
};

// Smart generation using Pro Preview
export const generateSmartContentStream = async (
    prompt: string, 
    onChunk: (text: string) => void,
    systemInstruction?: string
): Promise<string> => {
    try {
        const ai = getAI();
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
            }
        });

        let fullText = '';
        for await (const chunk of responseStream) {
            const chunkText = (chunk as GenerateContentResponse).text || '';
            fullText += chunkText;
            onChunk(chunkText);
        }
        return fullText;
    } catch (error) {
        handleGeminiError(error);
        return "";
    }
};

// Search Grounding
export const generateContentWithSearchStream = async (
    prompt: string,
    onChunk: (text: string) => void
): Promise<string> => {
    try {
        const ai = getAI();
        // Use Flash for search integration as per guidelines if not requiring complex reasoning
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash', 
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        let fullText = '';
        for await (const chunk of responseStream) {
            const chunkText = (chunk as GenerateContentResponse).text || '';
            fullText += chunkText;
            onChunk(chunkText);
        }
        return fullText;
    } catch (error) {
        handleGeminiError(error);
        return "";
    }
}

// Streaming response (Generic)
export const generateTextContentStream = async (
    prompt: string, 
    onChunk: (text: string) => void,
    systemInstruction?: string
): Promise<string> => {
    try {
        const ai = getAI();
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
            }
        });

        let fullText = '';
        for await (const chunk of responseStream) {
            const chunkText = (chunk as GenerateContentResponse).text || '';
            fullText += chunkText;
            onChunk(chunkText);
        }
        return fullText;
    } catch (error) {
        handleGeminiError(error);
        return "";
    }
};

// Chat Bot (Gemini 3 Pro)
export const createChatSession = () => {
    const ai = getAI();
    return ai.chats.create({
        model: 'gemini-3-pro-preview',
        config: {
            systemInstruction: "Anda adalah asisten AI pendidikan yang cerdas dan membantu untuk guru.",
        }
    });
};

// Image Analysis (Multimodal)
export const analyzeImage = async (base64Data: string, mimeType: string, prompt: string): Promise<string> => {
    try {
        const ai = getAI();
        // Remove header if present
        const cleanData = base64Data.replace(/^data:image\/\w+;base64,/, "");
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: cleanData,
                            mimeType: mimeType
                        }
                    },
                    { text: prompt }
                ]
            }
        });
        return response.text || "Tidak ada respons.";
    } catch (e) {
        handleGeminiError(e);
        return "";
    }
};

export const generateImage = async (prompt: string): Promise<string | null> => {
  try {
    const ai = getAI();
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
      },
    });
    const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (base64ImageBytes) {
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    }
    return null;
  } catch (error) {
    handleGeminiError(error);
    return null;
  }
};

export const generateVideo = async (prompt: string): Promise<string | undefined> => {
  try {
    if (window.aistudio && !await window.aistudio.hasSelectedApiKey()) {
        await window.aistudio.openSelectKey();
    }
    const ai = getAI();
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p', 
        aspectRatio: '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (downloadLink) {
        return `${downloadLink}&key=${process.env.API_KEY}`;
    }
    return undefined;
  } catch (error) {
    handleGeminiError(error);
    return undefined;
  }
};

export const textToSpeech = async (text: string, voiceName: string = 'Kore'): Promise<ArrayBuffer | null> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
             const binaryString = atob(base64Audio);
             const len = binaryString.length;
             const bytes = new Uint8Array(len);
             for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
             }
             return bytes.buffer;
        }
        return null;

    } catch (e) {
        handleGeminiError(e);
        return null;
    }
}

export const editImage = async (base64Image: string, prompt: string): Promise<string | null> => {
    try {
        const ai = getAI();
        const data = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: data,
                            mimeType: 'image/png',
                        },
                    },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        const part = response.candidates?.[0]?.content?.parts?.[0];
        if (part && part.inlineData) {
             return `data:image/png;base64,${part.inlineData.data}`;
        }
        return null;
    } catch(e) {
        handleGeminiError(e);
        return null;
    }
}
