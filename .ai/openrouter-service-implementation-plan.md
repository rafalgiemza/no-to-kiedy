# OpenRouter Service - Implementation Plan

## 1. Opis usługi

Usługa OpenRouter jest uniwersalną backendomą warstwą abstrakcji do komunikacji z OpenRouter API, która umożliwia wykorzystanie różnych modeli LLM w aplikacji "No to kiedy". Usługa zapewnia:

- Bezpieczne zarządzanie kluczem API po stronie serwera
- Typowane interfejsy dla żądań i odpowiedzi
- Wsparcie dla ustrukturyzowanych odpowiedzi (JSON Schema)
- Konfigurację parametrów modelu
- Kompleksową obsługę błędów
- Integrację z Next.js App Router (Server Actions)

## 2. Opis konstruktora

### Konfiguracja usługi

```typescript
interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string; // domyślnie: 'https://openrouter.ai/api/v1'
  defaultModel?: string; // domyślnie: 'anthropic/claude-3.5-sonnet'
  defaultTemperature?: number; // domyślnie: 0.7
  defaultMaxTokens?: number; // domyślnie: 4096
  timeout?: number; // domyślnie: 30000 (30s)
}
```

**Konstruktor:**

- Przyjmuje obiekt konfiguracyjny `OpenRouterConfig`
- Waliduje obecność klucza API
- Ustawia wartości domyślne dla opcjonalnych parametrów
- Inicjalizuje klienta HTTP (fetch API z timeout)

## 3. Publiczne metody i pola

### 3.1 Główna metoda: `complete()`

```typescript
async complete<T = unknown>(params: CompletionParams<T>): Promise<CompletionResponse<T>>
```

**Parametry:**

```typescript
interface CompletionParams<T> {
  // Wiadomości
  messages: Message[];

  // Konfiguracja modelu
  model?: string; // nadpisuje defaultModel
  temperature?: number; // 0-2
  maxTokens?: number;
  topP?: number; // 0-1
  frequencyPenalty?: number; // -2 do 2
  presencePenalty?: number; // -2 do 2

  // Ustrukturyzowana odpowiedź
  responseFormat?: ResponseFormat<T>;

  // Dodatkowe opcje
  stream?: boolean; // domyślnie: false
  stop?: string[]; // sekwencje stop
}

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ResponseFormat<T> {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: true;
    schema: JSONSchema<T>;
  };
}
```

**Przykład użycia bez response_format:**

```typescript
const response = await openRouter.complete({
  messages: [
    { role: "system", content: "Jesteś pomocnym asystentem." },
    { role: "user", content: "Przeanalizuj ten tekst..." },
  ],
  model: "anthropic/claude-3.5-sonnet",
  temperature: 0.7,
});
```

**Przykład użycia z response_format:**

```typescript
interface AnalysisResult {
  summary: string;
  sentiment: "positive" | "negative" | "neutral";
  keywords: string[];
}

const response = await openRouter.complete<AnalysisResult>({
  messages: [
    {
      role: "system",
      content: "Zwróć analizę tekstu w formacie JSON.",
    },
    {
      role: "user",
      content: "Przeanalizuj: [tekst do analizy]",
    },
  ],
  responseFormat: {
    type: "json_schema",
    json_schema: {
      name: "analysis_result",
      strict: true,
      schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          sentiment: {
            type: "string",
            enum: ["positive", "negative", "neutral"]
          },
          keywords: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["summary", "sentiment", "keywords"],
        additionalProperties: false,
      },
    },
  },
});
```

**Zwracana wartość:**

```typescript
interface CompletionResponse<T> {
  id: string;
  model: string;
  created: number;
  choices: Array<{
    message: {
      role: "assistant";
      content: string;
      parsed?: T; // dostępne gdy użyto responseFormat
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
```

### 3.2 Metoda listowania modeli: `getAvailableModels()`

```typescript
async getAvailableModels(): Promise<Model[]>
```

Zwraca listę dostępnych modeli z OpenRouter.

## 4. Prywatne metody i pola

### 4.1 Prywatne pola

```typescript
private readonly apiKey: string;
private readonly baseUrl: string;
private readonly config: Required<OpenRouterConfig>;
```

### 4.2 Metoda: `makeRequest()`

```typescript
private async makeRequest<T>(
  endpoint: string,
  body: unknown
): Promise<T>
```

- Wykonuje HTTP POST do OpenRouter API
- Dodaje wymagane nagłówki (Authorization, Content-Type)
- Obsługuje timeout
- Parsuje i waliduje odpowiedź

### 4.3 Metoda: `validateMessages()`

```typescript
private validateMessages(messages: Message[]): void
```

- Sprawdza czy messages nie jest puste
- Waliduje strukturę każdej wiadomości
- Weryfikuje czy pierwszy message to 'system' lub 'user'

### 4.4 Metoda: `buildRequestBody()`

```typescript
private buildRequestBody<T>(params: CompletionParams<T>): OpenRouterRequest
```

- Konstruuje ciało żądania zgodne z API OpenRouter
- Mapuje parametry z interfejsu CompletionParams
- Dodaje response_format jeśli zdefiniowany

### 4.5 Metoda: `parseResponse()`

```typescript
private parseResponse<T>(
  rawResponse: OpenRouterRawResponse,
  responseFormat?: ResponseFormat<T>
): CompletionResponse<T>
```

- Parsuje surową odpowiedź z API
- Jeśli użyto responseFormat, parsuje JSON z content i dodaje jako `parsed`
- Waliduje strukturę odpowiedzi

## 5. Obsługa błędów

### 5.1 Hierarchia błędów

```typescript
class OpenRouterError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "OpenRouterError";
  }
}

class OpenRouterAPIError extends OpenRouterError {
  constructor(message: string, public statusCode: number, public code: string) {
    super(message, code);
    this.name = "OpenRouterAPIError";
  }
}

class OpenRouterValidationError extends OpenRouterError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
    this.name = "OpenRouterValidationError";
  }
}

class OpenRouterTimeoutError extends OpenRouterError {
  constructor() {
    super("Request timeout", "TIMEOUT");
    this.name = "OpenRouterTimeoutError";
  }
}

class OpenRouterParseError extends OpenRouterError {
  constructor(message: string) {
    super(message, "PARSE_ERROR");
    this.name = "OpenRouterParseError";
  }
}
```

### 5.2 Scenariusze błędów

1. **Brak klucza API** - rzuca `OpenRouterValidationError` w konstruktorze
2. **Nieprawidłowe messages** - rzuca `OpenRouterValidationError` w `validateMessages()`
3. **Timeout żądania** - rzuca `OpenRouterTimeoutError`
4. **Błąd API (4xx, 5xx)** - rzuca `OpenRouterAPIError` z odpowiednim statusem
5. **Nieprawidłowy format odpowiedzi** - rzuca `OpenRouterParseError`
6. **Nieprawidłowy JSON w structured output** - rzuca `OpenRouterParseError`

### 5.3 Przykład obsługi błędów w Server Action

```typescript
"use server";

export async function processWithAI(input: string) {
  try {
    const response = await openRouter.complete({
      messages: [
        { role: "system", content: "Jesteś pomocnym asystentem." },
        { role: "user", content: input }
      ]
    });
    return { success: true, data: response };
  } catch (error) {
    if (error instanceof OpenRouterValidationError) {
      return { success: false, error: error.message };
    }
    if (error instanceof OpenRouterAPIError) {
      return { success: false, error: error.message, code: error.code };
    }
    if (error instanceof OpenRouterTimeoutError) {
      return { success: false, error: "Request timeout" };
    }
    return { success: false, error: "Internal server error" };
  }
}
```

## 6. Kwestie bezpieczeństwa

### 6.1 Ochrona klucza API

- ✅ Klucz API przechowywany TYLKO w zmiennych środowiskowych (`process.env.OPENROUTER_API_KEY`)
- ✅ Serwis używany TYLKO w Server Components, Route Handlers lub Server Actions
- ❌ NIGDY nie eksponuj klucza API do klienta
- ❌ NIGDY nie loguj klucza API

### 6.2 Walidacja danych wejściowych

- Waliduj wszystkie parametry przed wysłaniem do API
- Sanityzuj user input w messages
- Limituj długość messages (np. max 10 wiadomości)
- Limituj długość pojedynczej wiadomości (np. max 10000 znaków)

### 6.3 Rate limiting

Zaimplementuj rate limiting w Server Actions zgodnie z wymaganiami aplikacji.

### 6.4 Bezpieczeństwo aplikacji

- Waliduj wszystkie dane wejściowe przed przekazaniem do serwisu
- Używaj serwisu TYLKO w środowisku serwerowym (Server Actions, Server Components)

## 7. Plan wdrożenia krok po kroku

### Krok 1: Struktura projektu

Utwórz następującą strukturę plików:

```text
utils/open-router/
├── index.ts                 # Export głównej klasy
├── openrouter-service.ts    # Implementacja klasy OpenRouterService
├── types.ts                 # Definicje typów TypeScript
├── errors.ts                # Klasy błędów
└── constants.ts             # Stałe (defaultowe wartości, endpoints)
```

### Krok 2: Implementacja typów (`types.ts`)

```typescript
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
```

### Krok 3: Implementacja błędów (`errors.ts`)

```typescript
// errors.ts
export class OpenRouterError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "OpenRouterError";
  }
}

export class OpenRouterAPIError extends OpenRouterError {
  constructor(message: string, public statusCode: number, code: string) {
    super(message, code);
    this.name = "OpenRouterAPIError";
  }
}

export class OpenRouterValidationError extends OpenRouterError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
    this.name = "OpenRouterValidationError";
  }
}

export class OpenRouterTimeoutError extends OpenRouterError {
  constructor() {
    super("Request timeout", "TIMEOUT");
    this.name = "OpenRouterTimeoutError";
  }
}

export class OpenRouterParseError extends OpenRouterError {
  constructor(message: string) {
    super(message, "PARSE_ERROR");
    this.name = "OpenRouterParseError";
  }
}
```

### Krok 4: Implementacja stałych (`constants.ts`)

```typescript
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
```

### Krok 5: Implementacja głównej klasy (`openrouter-service.ts`)

```typescript
// openrouter-service.ts
import { env } from "node:process";
import {
  OpenRouterConfig,
  CompletionParams,
  CompletionResponse,
  Message,
  Model,
  OpenRouterRequest,
  OpenRouterRawResponse,
  ResponseFormat,
} from "./types";
import {
  OpenRouterError,
  OpenRouterAPIError,
  OpenRouterValidationError,
  OpenRouterTimeoutError,
  OpenRouterParseError,
} from "./errors";
import { DEFAULT_CONFIG, ENDPOINTS, LIMITS } from "./constants";

export class OpenRouterService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly config: Required<Omit<OpenRouterConfig, "apiKey">>;

  constructor(config?: Partial<OpenRouterConfig>) {
    // Pobierz klucz API z env lub config
    this.apiKey = config?.apiKey ?? env.OPENROUTER_API_KEY ?? "";

    if (!this.apiKey) {
      throw new OpenRouterValidationError(
        "OpenRouter API key is required. Set OPENROUTER_API_KEY environment variable or pass apiKey in config."
      );
    }

    this.baseUrl = config?.baseUrl ?? DEFAULT_CONFIG.baseUrl;
    this.config = {
      baseUrl: this.baseUrl,
      defaultModel: config?.defaultModel ?? DEFAULT_CONFIG.defaultModel,
      defaultTemperature:
        config?.defaultTemperature ?? DEFAULT_CONFIG.defaultTemperature,
      defaultMaxTokens:
        config?.defaultMaxTokens ?? DEFAULT_CONFIG.defaultMaxTokens,
      timeout: config?.timeout ?? DEFAULT_CONFIG.timeout,
    };
  }

  /**
   * Wysyła żądanie completion do OpenRouter API
   */
  async complete<T = unknown>(params: CompletionParams<T>): Promise<CompletionResponse<T>> {
    // Walidacja
    this.validateMessages(params.messages);
    this.validateCompletionParams(params);

    // Buduj request body
    const requestBody = this.buildRequestBody(params);

    // Wykonaj żądanie
    const rawResponse = await this.makeRequest<OpenRouterRawResponse>(
      ENDPOINTS.completions,
      requestBody
    );

    // Parsuj odpowiedź
    return this.parseResponse(rawResponse, params.responseFormat);
  }

  /**
   * Pobiera listę dostępnych modeli
   */
  async getAvailableModels(): Promise<Model[]> {
    const response = await this.makeRequest<{ data: Model[] }>(
      ENDPOINTS.models,
      {}
    );
    return response.data;
  }

  /**
   * Wykonuje HTTP request do OpenRouter API
   */
  private async makeRequest<T>(endpoint: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://no-to-kiedy.app", // Zmień na właściwy URL
          "X-Title": "No to kiedy",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new OpenRouterAPIError(
          errorData.error?.message ??
            `API request failed with status ${response.status}`,
          response.status,
          errorData.error?.code ?? "API_ERROR"
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof OpenRouterAPIError) {
        throw error;
      }

      if ((error as Error).name === "AbortError") {
        throw new OpenRouterTimeoutError();
      }

      throw new OpenRouterError(
        `Request failed: ${(error as Error).message}`,
        "REQUEST_FAILED"
      );
    }
  }

  /**
   * Waliduje parametry messages
   */
  private validateMessages(messages: Message[]): void {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new OpenRouterValidationError("Messages array cannot be empty");
    }

    if (messages.length > LIMITS.maxMessages) {
      throw new OpenRouterValidationError(
        `Messages array cannot exceed ${LIMITS.maxMessages} messages`
      );
    }

    for (const [index, message] of messages.entries()) {
      if (
        !message.role ||
        !["system", "user", "assistant"].includes(message.role)
      ) {
        throw new OpenRouterValidationError(
          `Invalid role at message ${index}: ${message.role}`
        );
      }

      if (typeof message.content !== "string") {
        throw new OpenRouterValidationError(
          `Message content must be a string at index ${index}`
        );
      }

      if (message.content.length > LIMITS.maxMessageLength) {
        throw new OpenRouterValidationError(
          `Message content at index ${index} exceeds maximum length of ${LIMITS.maxMessageLength}`
        );
      }
    }

    // Pierwsza wiadomość powinna być system lub user
    if (!["system", "user"].includes(messages[0].role)) {
      throw new OpenRouterValidationError(
        "First message must be from system or user"
      );
    }
  }

  /**
   * Waliduje parametry completion
   */
  private validateCompletionParams<T>(params: CompletionParams<T>): void {
    if (params.temperature !== undefined) {
      if (
        params.temperature < LIMITS.minTemperature ||
        params.temperature > LIMITS.maxTemperature
      ) {
        throw new OpenRouterValidationError(
          `Temperature must be between ${LIMITS.minTemperature} and ${LIMITS.maxTemperature}`
        );
      }
    }

    if (params.topP !== undefined) {
      if (params.topP < LIMITS.minTopP || params.topP > LIMITS.maxTopP) {
        throw new OpenRouterValidationError(
          `topP must be between ${LIMITS.minTopP} and ${LIMITS.maxTopP}`
        );
      }
    }

    if (params.responseFormat) {
      if (params.responseFormat.type !== "json_schema") {
        throw new OpenRouterValidationError(
          "Only json_schema response format is supported"
        );
      }
      if (params.responseFormat.json_schema.strict !== true) {
        throw new OpenRouterValidationError("json_schema.strict must be true");
      }
    }
  }

  /**
   * Buduje request body dla OpenRouter API
   */
  private buildRequestBody<T>(params: CompletionParams<T>): OpenRouterRequest {
    return {
      model: params.model ?? this.config.defaultModel,
      messages: params.messages,
      temperature: params.temperature ?? this.config.defaultTemperature,
      max_tokens: params.maxTokens ?? this.config.defaultMaxTokens,
      top_p: params.topP,
      frequency_penalty: params.frequencyPenalty,
      presence_penalty: params.presencePenalty,
      response_format: params.responseFormat,
      stream: params.stream ?? false,
      stop: params.stop,
    };
  }

  /**
   * Parsuje odpowiedź z OpenRouter API
   */
  private parseResponse<T>(
    rawResponse: OpenRouterRawResponse,
    responseFormat?: ResponseFormat<T>
  ): CompletionResponse<T> {
    try {
      const choice = rawResponse.choices[0];

      let parsed: T | undefined;
      if (responseFormat) {
        try {
          parsed = JSON.parse(choice.message.content) as T;
        } catch (error) {
          throw new OpenRouterParseError(
            `Failed to parse JSON response: ${(error as Error).message}`
          );
        }
      }

      return {
        id: rawResponse.id,
        model: rawResponse.model,
        created: rawResponse.created,
        choices: [
          {
            message: {
              role: "assistant",
              content: choice.message.content,
              parsed,
            },
            finishReason: this.mapFinishReason(choice.finish_reason),
            index: choice.index,
          },
        ],
        usage: {
          promptTokens: rawResponse.usage.prompt_tokens,
          completionTokens: rawResponse.usage.completion_tokens,
          totalTokens: rawResponse.usage.total_tokens,
        },
      };
    } catch (error) {
      if (error instanceof OpenRouterParseError) {
        throw error;
      }
      throw new OpenRouterParseError(
        `Failed to parse response: ${(error as Error).message}`
      );
    }
  }

  /**
   * Mapuje finish_reason z API na nasz typ
   */
  private mapFinishReason(
    reason: string
  ): "stop" | "length" | "content_filter" {
    switch (reason) {
      case "stop":
        return "stop";
      case "length":
      case "max_tokens":
        return "length";
      case "content_filter":
        return "content_filter";
      default:
        return "stop";
    }
  }
}
```

### Krok 6: Export główny (`index.ts`)

```typescript
// index.ts
export { OpenRouterService } from "./openrouter-service";
export * from "./types";
export * from "./errors";
export * from "./constants";
```

### Krok 7: Przykład użycia w Server Action

```typescript
// app/actions/ai-actions.ts
"use server";

import { OpenRouterService } from "@/utils/open-router";

const openRouter = new OpenRouterService();

interface DataAnalysis {
  summary: string;
  insights: string[];
  recommendation: string;
}

export async function analyzeData(input: string): Promise<DataAnalysis> {
  const response = await openRouter.complete<DataAnalysis>({
    messages: [
      {
        role: "system",
        content: "Jesteś asystentem do analizy danych. Zwracasz strukturyzowaną odpowiedź.",
      },
      {
        role: "user",
        content: input,
      },
    ],
    responseFormat: {
      type: "json_schema",
      json_schema: {
        name: "data_analysis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            insights: {
              type: "array",
              items: { type: "string" },
            },
            recommendation: { type: "string" },
          },
          required: ["summary", "insights", "recommendation"],
          additionalProperties: false,
        },
      },
    },
  });

  // Typ response.choices[0].message.parsed jest automatycznie DataAnalysis
  return response.choices[0].message.parsed!;
}
```

### Krok 8: Konfiguracja zmiennych środowiskowych

Utwórz lub zaktualizuj `.env.local`:

```env
OPENROUTER_API_KEY=your_api_key_here
```

Dodaj do `.gitignore`:

```gitignore
.env.local
.env*.local
```

### Krok 9: Testy (opcjonalnie, zgodnie z Vitest guidelines)

Utwórz `utils/open-router/__tests__/openrouter-service.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenRouterService } from "../openrouter-service";
import {
  OpenRouterValidationError,
  OpenRouterAPIError,
  OpenRouterTimeoutError,
} from "../errors";

describe("OpenRouterService", () => {
  let service: OpenRouterService;

  beforeEach(() => {
    service = new OpenRouterService({
      apiKey: "test-key",
    });
  });

  describe("constructor", () => {
    it("should throw error if API key is missing", () => {
      expect(() => new OpenRouterService()).toThrow(OpenRouterValidationError);
    });

    it("should initialize with default config", () => {
      expect(service).toBeDefined();
    });
  });

  describe("complete", () => {
    it("should validate empty messages array", async () => {
      await expect(service.complete({ messages: [] })).rejects.toThrow(
        OpenRouterValidationError
      );
    });

    it("should validate message structure", async () => {
      await expect(
        service.complete({
          messages: [{ role: "invalid" as any, content: "test" }],
        })
      ).rejects.toThrow(OpenRouterValidationError);
    });

    // Dodaj więcej testów...
  });
});
```

## 8. Checklist implementacji

- [ ] Utworzenie struktury katalogów
- [ ] Implementacja typów TypeScript (`types.ts`)
- [ ] Implementacja klas błędów (`errors.ts`)
- [ ] Implementacja stałych (`constants.ts`)
- [ ] Implementacja głównej klasy `OpenRouterService` (`openrouter-service.ts`)
- [ ] Implementacja exportu (`index.ts`)
- [ ] Przykład Server Action
- [ ] Konfiguracja zmiennych środowiskowych
- [ ] Testy jednostkowe (opcjonalnie)
- [ ] Dokumentacja API (JSDoc)

## 9. Następne kroki po implementacji

1. **Testowanie** - przetestuj serwis w różnych scenariuszach użycia
2. **Monitoring** - dodaj logowanie błędów (bez kluczy API!)
3. **Optymalizacja** - w razie potrzeby dodaj cachowanie dla często używanych zapytań
4. **Dokumentacja** - dodaj JSDoc do wszystkich publicznych metod

## 10. Przydatne linki

- [OpenRouter API Documentation](https://openrouter.ai/docs)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [JSON Schema](https://json-schema.org/)
