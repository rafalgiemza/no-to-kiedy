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
  async complete<T = unknown>(
    params: CompletionParams<T>
  ): Promise<CompletionResponse<T>> {
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
          "HTTP-Referer": "https://no-to-kiedy-app.vercel.app", // TODO: replace with generic value
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
