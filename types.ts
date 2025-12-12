export type Platform = 'adobe' | 'shutterstock' | 'freepik';

export type AiProvider = 'gemini' | 'mistral' | 'groq';

export interface PlatformConfig {
  name: string;
  titleMin: number;
  titleMax: number;
  descMax: number;
  keywordsMin: number;
  keywordsMax: number;
  systemPrompt: string;
}

export interface Metadata {
  title: string;
  description: string;
  keywords: string[];
}

export type ProcessingStatus = 'pending' | 'processing' | 'complete' | 'error';

export interface ProcessedFile {
  id: string;
  file: File;
  previewFile?: File; // For vector files
  thumbnail: string;
  status: ProcessingStatus;
  platformMetadata: Record<Platform, Metadata | null>;
  error?: string;
  activePlatform: Platform;
}

export interface GenerationSettings {
  minTitleWords: number;
  maxTitleWords: number;
  minKeywords: number;
  maxKeywords: number;
  minDescWords: number;
  maxDescWords: number;
  
  enableSilhouette: boolean;
  enableCustomPrompt: boolean;
  customPromptText: string;
  enableWhiteBg: boolean;
  enableTransparentBg: boolean;
  enableProhibitedWords: boolean;
  prohibitedWordsText: string;
  enableSingleWordKeywords: boolean;
}

export interface AppState {
  files: ProcessedFile[];
  apiKeyPool: string[];
  selectedPlatforms: Platform[];
  isProcessing: boolean;
}