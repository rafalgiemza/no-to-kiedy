// types.ts
export interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModel?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  timeout?: number;
}

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export type JSONSchemaType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "array"
  | "null";

export interface JSONSchema<T = unknown> {
  type: JSONSchemaType;
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  additionalProperties?: boolean;
  enum?: string[];
  [key: string]: unknown;
}

export interface ResponseFormat<T = unknown> {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: true;
    schema: JSONSchema<T>;
  };
}

export interface CompletionParams<T = unknown> {
  messages: Message[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  responseFormat?: ResponseFormat<T>;
  stream?: boolean;
  stop?: string[];
}

export interface CompletionResponse<T = unknown> {
  id: string;
  model: string;
  created: number;
  choices: Array<{
    message: {
      role: "assistant";
      content: string;
      parsed?: T;
    };
    finishReason: "stop" | "length" | "content_filter";
    index: number;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface Model {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: number;
    completion: number;
  };
  contextLength: number;
}

// Typy wewnętrzne dla API OpenRouter
export interface OpenRouterRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  response_format?: ResponseFormat;
  stream?: boolean;
  stop?: string[];
}

export interface OpenRouterRawResponse {
  id: string;
  model: string;
  created: number;
  choices: Array<{
    message: {
      role: "assistant";
      content: string;
    };
    finish_reason: string;
    index: number;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
