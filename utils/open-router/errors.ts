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
