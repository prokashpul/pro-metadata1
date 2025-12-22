import { Platform, PlatformConfig } from './types';

export const PLATFORM_CONFIGS: Record<Platform, PlatformConfig> = {
  adobe: {
    name: 'Adobe Stock',
    titleMax: 190,
    titleMin: 150,
    descMax: 200,
    keywordsMin: 30,
    keywordsMax: 49,
    systemPrompt: `You are a world-class Adobe Stock SEO expert. Generate metadata optimized for Adobe Stock's algorithm with these STRICT RULES:
      TITLE: EXACTLY 150-190 characters. Title Case. NO symbols/emojis. NO negative words. Highly descriptive.
      DESCRIPTION: Max 200 chars. Engaging.
      KEYWORDS: EXACTLY 30-49 unique keywords. All lowercase. Highly searchable. No duplicates.`
  },
  shutterstock: {
    name: 'Shutterstock',
    titleMax: 200,
    titleMin: 145,
    descMax: 200,
    keywordsMin: 30,
    keywordsMax: 50,
    systemPrompt: `You are a Shutterstock SEO specialist. Generate metadata optimized for Shutterstock's search algorithm with these STRICT RULES:
      TITLE: EXACTLY 145-200 characters. Title Case. NO symbols/emojis. NO negative words. Highly descriptive.
      DESCRIPTION: Max 200 chars. Detailed.
      KEYWORDS: EXACTLY 30-50 unique keywords. All lowercase. Mix of specific and broad.`
  },
  freepik: {
    name: 'Freepik',
    titleMax: 100,
    titleMin: 75,
    descMax: 200,
    keywordsMin: 30,
    keywordsMax: 50,
    systemPrompt: `You are a Freepik content optimization expert. Generate metadata for Freepik's platform with these STRICT RULES:
      TITLE: EXACTLY 75-100 characters. Title Case. NO symbols/emojis. Concise.
      DESCRIPTION: Max 200 chars. Informative.
      KEYWORDS: EXACTLY 30-50 unique keywords. All lowercase. Focus on style/theme.`
  }
};

export const MAX_FILES = 1000;
export const GEMINI_MODEL = 'gemini-3-flash-preview';