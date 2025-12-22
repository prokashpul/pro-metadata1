import { Platform, Metadata, GenerationSettings } from "../types";
import { PLATFORM_CONFIGS } from "../constants";

const MISTRAL_MODEL = 'pixtral-12b-2409';

// Helper for Title Case
const toTitleCase = (str: string) => {
  return str.toLowerCase().split(' ').map(word => {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
};

// Helper to convert File to Base64 (reused concept from geminiService but simplified for DataURL)
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

const callMistralApi = async (apiKey: string, payload: any, retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
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
        throw new Error(`Mistral API Error ${status}: ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      const isRetryable = error.message.includes('429') || 
                          error.message.includes('500') || 
                          error.message.includes('503');
      
      if (isRetryable && i < retries - 1) {
        const delay = 2000 * Math.pow(2, i) + (Math.random() * 1000);
        console.warn(`Mistral API Error. Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
};

export const generateMetadataForPlatformMistral = async (
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
  let systemInstructions = `You are a World-Class Stock Photography Metadata & SEO Architect specializing in ${config.name}.
  
  CORE MISSION:
  Transform visual data into highly accurate, high-conversion metadata that maximizes search visibility and click-through rates.
  
  PLATFORM SPECS (${config.name}):
  - Title: ${config.titleMin}-${config.titleMax} chars. Must be descriptive and front-loaded.
  - Description: Max ${config.descMax} chars. Professional and engaging.
  - Keywords: ${config.keywordsMin}-${config.keywordsMax} unique tags.
  
  SEO STRATEGY (FRONT-LOADING):
  - Place the most critical subject or activity in the first 3-5 words of the title.
  - Titles should act as an answer to a buyer's specific search query.
  
  KEYWORD HIERARCHY:
  1. Primary: Literal objects and main subjects.
  2. Secondary: Emotions, themes, and conceptual vibes (e.g., "collaboration", "tranquility").
  3. Technical: Composition styles (e.g., "low angle", "bokeh", "minimalist").
  
  STRICT COMPLIANCE:
  - NO BRAND NAMES or TRADEMARKS. Use generic terms.
  - NO AI-generated jargon or generic filler words like "beautiful", "amazing", or "background" (unless technical).
  - Output strictly VALID JSON.
  `;

  const constraints = [];
  if (settings.enableSilhouette) constraints.push("VISUAL CONTEXT: The subject is strictly a silhouette.");
  if (settings.enableWhiteBg) constraints.push("VISUAL CONTEXT: Subject is isolated on a pure white background.");
  if (settings.enableTransparentBg) constraints.push("VISUAL CONTEXT: Subject has a transparent background (alpha channel).");
  
  if (settings.enableSingleWordKeywords) {
    constraints.push("KEYWORD FORMAT: STRICTLY single words only. Deconstruct phrases into separate tags.");
  } else {
    constraints.push("KEYWORD FORMAT: Use a mix of single words and high-intent 2-3 word phrases.");
  }

  if (settings.enableProhibitedWords && settings.prohibitedWordsText) {
    constraints.push(`NEGATIVE LIST: NEVER use these terms: ${settings.prohibitedWordsText}.`);
  }

  if (constraints.length > 0) {
    systemInstructions += `\n\nADDITIONAL STIPULATIONS:\n${constraints.join("\n")}`;
  }

  if (settings.enableCustomPrompt && settings.customPromptText) {
    systemInstructions += `\n\nUSER-SPECIFIC DIRECTIVE:\n${settings.customPromptText}`;
  }

  const userPrompt = `Perform a deep analysis of this image and generate JSON metadata.
  
  1. TITLE: Target ${settings.minTitleWords}-${settings.maxTitleWords} words. Front-load the subject. Ensure it matches ${config.name} standards.
  2. DESCRIPTION: Target ${settings.minDescWords}-${settings.maxDescWords} words. Provide context, use case, and atmospheric details.
  3. KEYWORDS: Provide ${settings.minKeywords}-${settings.maxKeywords} tags. Sort by relevance. Include a mix of literal, conceptual, and technical tags.
  
  Format as: {"title": "...", "description": "...", "keywords": ["...", "..."]}`;

  try {
    const result = await callMistralApi(apiKey, {
      model: MISTRAL_MODEL,
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
      temperature: 0.4, // Lower temperature for higher consistency and accuracy
      max_tokens: 1200,
    });

    const content = result.choices[0]?.message?.content;
    if (!content) throw new Error("No content generated from Mistral");

    const json = JSON.parse(content);

    // --- Post-Processing ---
    let title = json.title || "";
    
    // Enforce Title Case if setting is enabled
    if (settings.enforceTitleCase) {
      title = toTitleCase(title);
    }

    // Hard limit truncation
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
    console.error("Mistral API Error:", error);
    throw error;
  }
};