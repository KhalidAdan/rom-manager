import { ErrorCode } from "./codes";
import {
  ApplicationError,
  ErrorFactory,
  ErrorMetadata,
  ErrorSeverity,
  RecoveryStrategy
} from "./factory";

interface ErrorOptions {
  retryable?: boolean;
  severity?: ErrorSeverity;
  recovery?: RecoveryStrategy;
}

export const createNotFoundError = (
  resource: string,
  meta?: ErrorMetadata,
  options?: ErrorOptions
): ApplicationError => {
  return ErrorFactory.create(
    ErrorCode.NOT_FOUND,
    `The requested ${resource} was not found`,
    meta,
    options
  );
};

export const createValidationError = (
  details: string,
  meta?: ErrorMetadata,
  options?: ErrorOptions
): ApplicationError => {
  return ErrorFactory.create(
    ErrorCode.VALIDATION_FAILED,
    `Validation error: ${details}`,
    meta,
    { severity: 'WARNING', ...options }
  );
};

export const createMetadataError = (
  gameTitle: string,
  error: Error,
  meta?: ErrorMetadata
): ApplicationError => {
  return ErrorFactory.create(
    ErrorCode.METADATA_FETCH_FAILED,
    `Failed to fetch metadata for ${gameTitle}: ${error.message}`,
    { originalError: error.message, ...meta },
    {
      retryable: true,
      severity: 'WARNING',
      recovery: {
        type: 'retry',
        maxAttempts: 3,
        backoffMs: 1000
      }
    }
  );
};

export const createRateLimitError = (
  service: string,
  meta?: ErrorMetadata
): ApplicationError => {
  return ErrorFactory.create(
    ErrorCode.RATE_LIMIT_EXCEEDED,
    `Rate limit exceeded for ${service}`,
    meta,
    {
      retryable: true,
      severity: 'WARNING',
      recovery: {
        type: 'retry',
        maxAttempts: 3,
        backoffMs: 5000
      }
    }
  );
};

export const createFileProcessingError = (
  fileName: string,
  error: Error,
  meta?: ErrorMetadata
): ApplicationError => {
  return ErrorFactory.create(
    ErrorCode.FILE_CORRUPTED,
    `Failed to process file ${fileName}: ${error.message}`,
    { originalError: error.message, ...meta },
    { severity: 'ERROR' }
  );
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    backoffMs?: number;
    onRetry?: (attempt: number, error: Error) => void;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    backoffMs = 1000,
    onRetry,
    shouldRetry = isRetryableError
  } = options;

  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (!shouldRetry(lastError) || attempt === maxAttempts) {
        throw lastError;
      }

      onRetry?.(attempt, lastError);
      
      const delay = backoffMs * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof ApplicationError) {
    return error.retryable && error.canRetry();
  }
  
  if (error instanceof Error) {
    // Network-related errors are generally retryable
    return (
      error.name === 'NetworkError' ||
      error.name === 'TimeoutError' ||
      error.message.toLowerCase().includes('network') ||
      error.message.toLowerCase().includes('timeout') ||
      error.message.toLowerCase().includes('connection')
    );
  }

  return false;
}

export function getErrorDetails(error: unknown): {
  code: string;
  message: string;
  status: number;
  severity: ErrorSeverity;
} {
  if (error instanceof ApplicationError) {
    return {
      code: error.code,
      message: error.message,
      status: error.status,
      severity: error.severity
    };
  }

  if (error instanceof Error) {
    return {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: error.message,
      status: 500,
      severity: 'ERROR'
    };
  }

  return {
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    message: String(error),
    status: 500,
    severity: 'ERROR'
  };
}