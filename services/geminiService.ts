import { GoogleGenAI, Type } from "@google/genai";
import { Platform, Metadata } from "../types";
import { PLATFORM_CONFIGS, GEMINI_MODEL } from "../constants";

// Helper to convert File to Base64 with resizing for optimization
const fileToPart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  // If image, resize to max 1536px to save bandwidth and memory
  if (file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        const MAX_DIMENSION = 1536;
        let width = img.width;
        let height = img.height;
        
        // Scale down if too large
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
          width *= ratio;
          height *= ratio;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Get data as JPEG quality 0.85
          const base64Data = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
          resolve({
            inlineData: {
              data: base64Data,
              mimeType: 'image/jpeg',
            },
          });
        } else {
          // Fallback if canvas context fails
          reject(new Error("Failed to create canvas context"));
        }
        URL.revokeObjectURL(url);
      };
      
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      
      img.src = url;
    });
  }

  // Fallback for non-image files (like small videos if strictly needed, though batching large videos is risky)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result) {
        const base64Data = (reader.result as string).split(',')[1];
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: file.type,
          },
        });
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const generateContentWithRetry = async (ai: GoogleGenAI, params: any, retries = 5): Promise<any> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      // Check for Rate Limits (429) and Server Overload (503)
      const isRetryable = error.status === 429 || 
                          error.status === 503 || 
                          (error.message && (
                            error.message.includes('429') || 
                            error.message.includes('503') || 
                            error.message.includes('Quota exceeded') || 
                            error.message.includes('overloaded')
                          ));
      
      if (isRetryable && i < retries - 1) {
        // Exponential backoff with jitter: base 2s
        const baseDelay = 2000 * Math.pow(2, i);
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;
        
        console.warn(`API Error ${error.status || 'unknown'} (${error.message?.slice(0, 50)}...). Retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${retries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
};

export const generateMetadataForPlatform = async (
  apiKey: string,
  file: File,
  previewFile: File | undefined,
  platform: Platform
): Promise<Metadata> => {
  const config = PLATFORM_CONFIGS[platform];
  const ai = new GoogleGenAI({ apiKey });

  // Use preview file if available (for vectors), otherwise original file
  const fileToProcess = previewFile || file;
  
  // This now returns a resized, memory-optimized image part
  const imagePart = await fileToPart(fileToProcess);

  const prompt = `Generate ${config.name} metadata for this asset. Filename: ${file.name}. 
  CRITICAL: Title must be ${config.titleMin}-${config.titleMax} chars. 
  Keywords: ${config.keywordsMin}-${config.keywordsMax} items. 
  Positive, commercial, SEO-optimized content only.`;

  try {
    const response = await generateContentWithRetry(ai, {
      model: GEMINI_MODEL,
      contents: {
        role: 'user',
        parts: [
          { text: prompt },
          imagePart // Image comes second usually, or mixed in parts
        ]
      },
      config: {
        systemInstruction: config.systemPrompt,
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            keywords: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            }
          },
          required: ["title", "description", "keywords"]
        }
      }
    });

    if (!response.text) {
      throw new Error("No response text generated");
    }

    const json = JSON.parse(response.text);
    
    // Post-process to ensure strict compliance (AI sometimes misses exact char counts)
    let title = json.title || "";
    // Simple padding if too short
    if (title.length < config.titleMin) {
       title += " - Professional High Quality Stock Content";
    }
    // Truncate if too long
    if (title.length > config.titleMax) {
        title = title.substring(0, config.titleMax);
    }

    return {
      title: title,
      description: (json.description || "").substring(0, config.descMax),
      keywords: (json.keywords || []).slice(0, config.keywordsMax).map((k: string) => k.toLowerCase())
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};