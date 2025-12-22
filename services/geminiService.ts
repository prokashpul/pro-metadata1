import { GoogleGenAI, Type } from "@google/genai";
import { Platform, Metadata, GenerationSettings } from "../types";
import { PLATFORM_CONFIGS, GEMINI_MODEL } from "../constants";

// Helper for Title Case
const toTitleCase = (str: string) => {
  return str.toLowerCase().split(' ').map(word => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
};

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

  // Fallback for non-image files
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
        const baseDelay = 2000 * Math.pow(2, i);
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;
        console.warn(`API Error ${error.status || 'unknown'}. Retrying in ${Math.round(delay)}ms...`);
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
  platform: Platform,
  settings: GenerationSettings
): Promise<Metadata> => {
  const config = PLATFORM_CONFIGS[platform];
  const ai = new GoogleGenAI({ apiKey });

  // Use preview file if available (for vectors), otherwise original file
  const fileToProcess = previewFile || file;
  
  const imagePart = await fileToPart(fileToProcess);

  // --- 1. SYSTEM PROMPT ENGINEERING ---
  let systemInstructions = `You are an Elite Stock Photography Metadata Expert for ${config.name}.
  
  OBJECTIVE:
  Generate high-converting, strictly compliant, and SEO-optimized metadata.
  
  PLATFORM SPECS (${config.name}):
  - Title: ${config.titleMin}-${config.titleMax} chars. Title Case.
  - Description: Max ${config.descMax} chars.
  - Keywords: ${config.keywordsMin}-${config.keywordsMax} tags.
  
  COMMERCIAL COMPLIANCE & SAFETY (CRITICAL):
  - NO TRADEMARKS or BRANDS (e.g., Apple, Nike, BMW). Use generic descriptions (e.g., "smartphone", "sportswear", "luxury car").
  - NO REAL NAMES of people.
  - NO COPYRIGHTED DESIGNS or LOGOS.
  - Avoid "Editorial" language unless the image is clearly news-based (default to Commercial).
  
  SEO STRATEGY (MAXIMIZE VISIBILITY):
  - "Front-Load" Titles: Place the most searchable/important subject in the first 3-5 words.
  - Keyword Stack:
     1. Visuals: Literal objects present in the image.
     2. Concepts: Emotions, themes (e.g., "success", "freedom").
     3. Technicals: (e.g., "isolated", "copy space", "aerial") if applicable.
  - Language: Professional, concise, standard US English.
  `;
  
  // Apply User Customizations to System Prompt
  const constraints = [];
  
  if (settings.enableSilhouette) constraints.push("VISUAL: Subject is a silhouette/shadow.");
  if (settings.enableWhiteBg) constraints.push("VISUAL: Isolated on white background.");
  if (settings.enableTransparentBg) constraints.push("VISUAL: Transparent background/alpha channel.");
  
  if (settings.enableSingleWordKeywords) {
    constraints.push("KEYWORDS FORMAT: STRICTLY SINGLE WORDS ONLY. Split phrases into words (e.g., 'business man' -> 'business', 'man').");
  } else {
    constraints.push("KEYWORDS FORMAT: Allow relevant phrases (2-3 words max) for high specificity.");
  }

  if (settings.enableProhibitedWords && settings.prohibitedWordsText) {
    constraints.push(`NEGATIVE LIST: DO NOT include these words: ${settings.prohibitedWordsText}.`);
  }
  
  if (constraints.length > 0) {
    systemInstructions += `\n\nSTRICT CONSTRAINTS:\n${constraints.join("\n")}`;
  }

  if (settings.enableCustomPrompt && settings.customPromptText) {
    systemInstructions += `\n\nCUSTOM USER INSTRUCTION:\n${settings.customPromptText}`;
  }

  // --- 2. USER PROMPT CONSTRUCTION ---
  const userPrompt = `Analyze this image and generate JSON metadata.
  
  1. TITLE:
     - Target: ${settings.minTitleWords} to ${settings.maxTitleWords} WORDS.
     - Content: Most important subject first. Include action and context.
     - NO trademarks.
  
  2. DESCRIPTION:
     - Target: ${settings.minDescWords} to ${settings.maxDescWords} WORDS.
     - Content: Full sentence describing the scene, mood, and potential usage.
  
  3. KEYWORDS:
     - Target: ${settings.minKeywords} to ${settings.maxKeywords} tags.
     - Sort by IMPORTANCE (Most relevant first).
     - Ensure mix of literal and conceptual tags.
  
  Output standard JSON format.`;

  try {
    const response = await generateContentWithRetry(ai, {
      model: GEMINI_MODEL,
      contents: {
        role: 'user',
        parts: [
          { text: userPrompt },
          imagePart 
        ]
      },
      config: {
        systemInstruction: systemInstructions,
        temperature: 0.5, // Lower temperature for more adherence to rules
        topP: 0.95,
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
    
    // --- 3. POST-PROCESSING & COMPLIANCE CHECKS ---
    
    // Clean Title
    let title = json.title || "";
    
    // Enforce Title Case if setting is enabled
    if (settings.enforceTitleCase) {
      title = toTitleCase(title);
    }

    // Ensure title meets min length logic (padding if needed for SEO)
    if (title.length < config.titleMin) {
       title += " - High Quality Stock Photo";
    }
    // Hard limit truncation (respecting word boundaries)
    if (title.length > config.titleMax) {
        const cut = title.substring(0, config.titleMax);
        title = cut.substring(0, Math.min(cut.length, cut.lastIndexOf(" "))) || cut;
    }

    // Clean Keywords
    let keywords = (json.keywords || [])
      .map((k: string) => k.toLowerCase().trim())
      .filter((k: string) => k.length > 1); // Remove junk 1-char tags
    
    // Strict Prohibited Words Filtering
    if (settings.enableProhibitedWords && settings.prohibitedWordsText) {
      const prohibited = settings.prohibitedWordsText.split(/[,;\n]/).map(w => w.trim().toLowerCase()).filter(Boolean);
      keywords = keywords.filter((k: string) => !prohibited.some((bad: string) => k.includes(bad)));
    }
    
    // Strict Single Word Enforcement (AI Backup)
    if (settings.enableSingleWordKeywords) {
      keywords = keywords.flatMap((k: string) => k.split(/\s+/));
    }

    // Deduplicate
    keywords = [...new Set(keywords)];
    
    // Ensure Counts
    keywords = keywords.slice(0, settings.maxKeywords);
    
    // Description Limiting
    let description = json.description || "";
    if (description.length > config.descMax) {
        description = description.substring(0, config.descMax - 3) + "...";
    }

    return {
      title: title,
      description: description,
      keywords: keywords
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};