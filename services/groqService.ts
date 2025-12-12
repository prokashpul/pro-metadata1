import { Platform, Metadata, GenerationSettings } from "../types";
import { PLATFORM_CONFIGS } from "../constants";

const GROQ_MODEL = 'llama-3.2-90b-vision-preview';

// Helper to convert File to Base64 Data URL
const fileToDataURL = async (file: File): Promise<string> => {
  if (file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        const MAX_DIMENSION = 1536;
        let width = img.width;
        let height = img.height;
        
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
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
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

  // Fallback
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const callGroqApi = async (apiKey: string, payload: any, retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const status = response.status;
        throw new Error(`Groq API Error ${status}: ${errorData.error?.message || response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      const isRetryable = error.message.includes('429') || 
                          error.message.includes('500') || 
                          error.message.includes('503');
      
      if (isRetryable && i < retries - 1) {
        // Groq has tight rate limits, so we use slightly longer backoff
        const delay = 3000 * Math.pow(2, i) + (Math.random() * 1000);
        console.warn(`Groq API Error. Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
};

export const generateMetadataForPlatformGroq = async (
  apiKey: string,
  file: File,
  previewFile: File | undefined,
  platform: Platform,
  settings: GenerationSettings
): Promise<Metadata> => {
  const config = PLATFORM_CONFIGS[platform];
  const fileToProcess = previewFile || file;
  const imageDataUrl = await fileToDataURL(fileToProcess);

  // --- Construct System Prompt ---
  let systemInstructions = `You are an Elite Stock Photography Metadata Expert for ${config.name}.
  OBJECTIVE: Generate high-converting, strictly compliant, and SEO-optimized metadata.
  
  PLATFORM RULES:
  - Title: ${config.titleMin}-${config.titleMax} chars. Title Case.
  - Description: Max ${config.descMax} chars.
  - Keywords: ${config.keywordsMin}-${config.keywordsMax} tags.
  
  CRITICAL:
  - NO TRADEMARKS/BRANDS.
  - NO REAL NAMES.
  - Output strictly VALID JSON.
  `;

  const constraints = [];
  if (settings.enableSilhouette) constraints.push("VISUAL: Subject is a silhouette/shadow.");
  if (settings.enableWhiteBg) constraints.push("VISUAL: Isolated on white background.");
  if (settings.enableTransparentBg) constraints.push("VISUAL: Transparent background.");
  
  if (settings.enableSingleWordKeywords) {
    constraints.push("KEYWORDS: STRICTLY SINGLE WORDS ONLY. Split phrases.");
  } else {
    constraints.push("KEYWORDS: Allow 2-3 word phrases.");
  }

  if (settings.enableProhibitedWords && settings.prohibitedWordsText) {
    constraints.push(`NEGATIVE LIST: Exclude: ${settings.prohibitedWordsText}.`);
  }

  if (constraints.length > 0) {
    systemInstructions += `\n\nCONSTRAINTS:\n${constraints.join("\n")}`;
  }

  if (settings.enableCustomPrompt && settings.customPromptText) {
    systemInstructions += `\n\nUSER INSTRUCTION:\n${settings.customPromptText}`;
  }

  const userPrompt = `Analyze this image. Return JSON with 'title', 'description', and 'keywords' (array of strings).
  
  1. TITLE: ${settings.minTitleWords}-${settings.maxTitleWords} words. Most important subject first.
  2. DESCRIPTION: ${settings.minDescWords}-${settings.maxDescWords} words. Full sentence.
  3. KEYWORDS: ${settings.minKeywords}-${settings.maxKeywords} tags. Sort by importance.`;

  try {
    const result = await callGroqApi(apiKey, {
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content: systemInstructions
        },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: imageDataUrl } }
          ]
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 1024,
    });

    const content = result.choices[0]?.message?.content;
    if (!content) throw new Error("No content generated from Groq");

    const json = JSON.parse(content);

    // --- Post-Processing ---
    let title = json.title || "";
    if (title.length < config.titleMin) title += " - High Quality Stock Photo";
    if (title.length > config.titleMax) {
      const cut = title.substring(0, config.titleMax);
      title = cut.substring(0, Math.min(cut.length, cut.lastIndexOf(" "))) || cut;
    }

    let keywords = (json.keywords || [])
      .map((k: string) => k.toLowerCase().trim())
      .filter((k: string) => k.length > 1);

    if (settings.enableProhibitedWords && settings.prohibitedWordsText) {
      const prohibited = settings.prohibitedWordsText.split(/[,;\n]/).map(w => w.trim().toLowerCase()).filter(Boolean);
      keywords = keywords.filter((k: string) => !prohibited.some((bad: string) => k.includes(bad)));
    }
    
    if (settings.enableSingleWordKeywords) {
      keywords = keywords.flatMap((k: string) => k.split(/\s+/));
    }

    keywords = [...new Set(keywords)];
    keywords = keywords.slice(0, settings.maxKeywords);

    let description = json.description || "";
    if (description.length > config.descMax) {
      description = description.substring(0, config.descMax - 3) + "...";
    }

    return {
      title,
      description,
      keywords
    };

  } catch (error) {
    console.error("Groq API Error:", error);
    throw error;
  }
};