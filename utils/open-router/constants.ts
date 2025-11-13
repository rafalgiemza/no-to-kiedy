// constants.ts
export const DEFAULT_CONFIG = {
  baseUrl: "https://openrouter.ai/api/v1",
  defaultModel: "anthropic/claude-3.5-sonnet",
  defaultTemperature: 0.7,
  defaultMaxTokens: 4096,
  timeout: 30000,
} as const;

export const ENDPOINTS = {
  completions: "/chat/completions",
  models: "/models",
} as const;

export const LIMITS = {
  maxMessages: 50,
  maxMessageLength: 100000,
  minTemperature: 0,
  maxTemperature: 2,
  minTopP: 0,
  maxTopP: 1,
} as const;
