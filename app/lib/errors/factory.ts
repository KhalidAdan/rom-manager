import { ErrorCode } from "./codes";


export type ErrorMetadata = Record<string, unknown>;
export type ErrorSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type RecoveryStrategy = {
  type: 'retry' | 'fallback' | 'reset';
  maxAttempts?: number;
  backoffMs?: number;
  currentAttempt?: number;
};

export type ErrorDefinition = {
  message: string;
  status?: number;
  retryable?: boolean;
  severity?: ErrorSeverity;
  recovery?: RecoveryStrategy;
};

export class ApplicationError extends Error {
  public readonly timestamp: Date;
  public readonly retryAttempt: number;

  constructor(
    public code: string,
    message: string,
    public status: number = 500,
    public meta: ErrorMetadata = {},
    public retryable: boolean = false,
    public severity: ErrorSeverity = 'ERROR',
    public recovery?: RecoveryStrategy
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.retryAttempt = recovery?.currentAttempt ?? 0;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      meta: this.meta,
      timestamp: this.timestamp,
      retryable: this.retryable,
      severity: this.severity,
      recovery: this.recovery,
      retryAttempt: this.retryAttempt
    };
  }

  toString() {
    return `${this.code} [${this.severity}]: ${this.message}`;
  }

  canRetry(): boolean {
    if (!this.retryable || !this.recovery) return false;
    const { currentAttempt = 0, maxAttempts = 3 } = this.recovery;
    return currentAttempt < maxAttempts;
  }

  nextRetryDelay(): number {
    if (!this.recovery?.backoffMs) return 1000; // Default 1 second
    return Math.min(
      this.recovery.backoffMs * Math.pow(2, this.retryAttempt),
      30000 // Max 30 seconds
    );
  }

  incrementRetry(): ApplicationError {
    if (!this.recovery) return this;
    
    return new ApplicationError(
      this.code,
      this.message,
      this.status,
      this.meta,
      this.retryable,
      this.severity,
      {
        ...this.recovery,
        currentAttempt: (this.recovery.currentAttempt ?? 0) + 1
      }
    );
  }
}

export class ErrorFactory {
  private static errorDefinitions: Record<ErrorCode, ErrorDefinition> = {
    // Authentication/Authorization
    [ErrorCode.UNAUTHORIZED]: {
      message: "Authentication required to access this resource",
      status: 401,
      severity: 'WARNING'
    },
    [ErrorCode.FORBIDDEN]: {
      message: "You do not have permission to perform this action",
      status: 403,
      severity: 'WARNING'
    },
    [ErrorCode.INVALID_CREDENTIALS]: {
      message: "Invalid credentials provided",
      status: 401,
      severity: 'WARNING'
    },
    [ErrorCode.SESSION_EXPIRED]: {
      message: "Your session has expired, please log in again",
      status: 401,
      severity: 'WARNING'
    },

    // Resource errors
    [ErrorCode.NOT_FOUND]: {
      message: "The requested resource was not found",
      status: 404,
      severity: 'WARNING'
    },
    [ErrorCode.ALREADY_EXISTS]: {
      message: "Resource already exists",
      status: 409,
      severity: 'WARNING'
    },
    [ErrorCode.INVALID_STATE]: {
      message: "Resource is in an invalid state for this operation",
      status: 409,
      severity: 'WARNING'
    },

    // Game specific
    [ErrorCode.GAME_BORROWED]: {
      message: "This game is currently borrowed by another user",
      status: 409,
      severity: 'WARNING'
    },
    [ErrorCode.GAME_NOT_AVAILABLE]: {
      message: "This game is not currently available",
      status: 404,
      severity: 'WARNING'
    },
    [ErrorCode.BORROW_LIMIT_REACHED]: {
      message: "You have reached your maximum number of borrowed games",
      status: 409,
      severity: 'WARNING'
    },
    [ErrorCode.INVALID_SAVE_STATE]: {
      message: "The save state for this game is invalid or corrupted",
      status: 400,
      severity: 'ERROR',
      retryable: true,
      recovery: {
        type: 'fallback',
        maxAttempts: 1
      }
    },
    [ErrorCode.GAME_NOT_BORROWED]: {
      message: "There is no current borrow voucher on this game",
      status: 400,
      severity: 'WARNING'
    },
    [ErrorCode.METADATA_FETCH_FAILED]: {
      message: "Failed to fetch game metadata",
      status: 500,
      retryable: true,
      severity: 'WARNING',
      recovery: {
        type: 'retry',
        maxAttempts: 3,
        backoffMs: 1000
      }
    },
    [ErrorCode.METADATA_PROCESSING_FAILED]: {
      message: "Failed to process game metadata",
      status: 500,
      retryable: true,
      severity: 'WARNING',
      recovery: {
        type: 'retry',
        maxAttempts: 2,
        backoffMs: 1000
      }
    },

    // File operations
    [ErrorCode.FILE_TOO_LARGE]: {
      message: "The uploaded file exceeds the maximum allowed size",
      status: 413,
      severity: 'WARNING'
    },
    [ErrorCode.INVALID_FILE_TYPE]: {
      message: "The file type is not supported",
      status: 415,
      severity: 'WARNING'
    },
    [ErrorCode.UPLOAD_FAILED]: {
      message: "Failed to upload file",
      status: 500,
      retryable: true,
      severity: 'ERROR',
      recovery: {
        type: 'retry',
        maxAttempts: 3,
        backoffMs: 1000
      }
    },
    [ErrorCode.FILE_CORRUPTED]: {
      message: "The file appears to be corrupted",
      status: 400,
      severity: 'ERROR'
    },
    [ErrorCode.FILE_ACCESS_DENIED]: {
      message: "Access to the file was denied",
      status: 403,
      severity: 'ERROR'
    },

    // Validation
    [ErrorCode.INVALID_INPUT]: {
      message: "The provided input is invalid",
      status: 400,
      severity: 'WARNING'
    },
    [ErrorCode.MISSING_REQUIRED_FIELD]: {
      message: "A required field is missing",
      status: 400,
      severity: 'WARNING'
    },
    [ErrorCode.VALIDATION_FAILED]: {
      message: "Input validation failed",
      status: 400,
      severity: 'WARNING'
    },
    [ErrorCode.SCHEMA_VALIDATION_FAILED]: {
      message: "Schema validation failed",
      status: 400,
      severity: 'ERROR'
    },

    // Server/System
    [ErrorCode.INTERNAL_SERVER_ERROR]: {
      message: "An internal server error occurred",
      status: 500,
      severity: 'ERROR',
      retryable: true,
      recovery: {
        type: 'retry',
        maxAttempts: 2,
        backoffMs: 1000
      }
    },
    [ErrorCode.SERVICE_UNAVAILABLE]: {
      message: "The service is currently unavailable",
      status: 503,
      severity: 'ERROR',
      retryable: true,
      recovery: {
        type: 'retry',
        maxAttempts: 3,
        backoffMs: 2000
      }
    },
    [ErrorCode.DATABASE_ERROR]: {
      message: "A database error occurred",
      status: 500,
      severity: 'ERROR',
      retryable: true,
      recovery: {
        type: 'retry',
        maxAttempts: 2,
        backoffMs: 1000
      }
    },
    [ErrorCode.CACHE_ERROR]: {
      message: "A cache error occurred",
      status: 500,
      severity: 'WARNING',
      retryable: true,
      recovery: {
        type: 'retry',
        maxAttempts: 2,
        backoffMs: 500
      }
    },
    [ErrorCode.NETWORK_ERROR]: {
      message: "A network error occurred",
      status: 500,
      severity: 'ERROR',
      retryable: true,
      recovery: {
        type: 'retry',
        maxAttempts: 3,
        backoffMs: 1000
      }
    },
    [ErrorCode.RATE_LIMIT_EXCEEDED]: {
      message: "Rate limit exceeded",
      status: 429,
      retryable: true,
      severity: 'WARNING',
      recovery: {
        type: 'retry',
        maxAttempts: 3,
        backoffMs: 5000
      }
    },
    [ErrorCode.EXTERNAL_SERVICE_ERROR]: {
      message: "External service error occurred",
      status: 502,
      severity: 'ERROR',
      retryable: true,
      recovery: {
        type: 'retry',
        maxAttempts: 3,
        backoffMs: 2000
      }
    },

    // Recovery/Retry
    [ErrorCode.RETRY_FAILED]: {
      message: "All retry attempts failed",
      status: 500,
      severity: 'ERROR'
    },
    [ErrorCode.MAX_RETRIES_EXCEEDED]: {
      message: "Maximum retry attempts exceeded",
      status: 500,
      severity: 'ERROR'
    },
    [ErrorCode.RECOVERY_IN_PROGRESS]: {
      message: "Recovery is already in progress",
      status: 409,
      severity: 'WARNING'
    }
  };

  static create(
    code: ErrorCode,
    customMessage?: string,
    meta: ErrorMetadata = {},
    options: {
      retryable?: boolean;
      severity?: ErrorSeverity;
      recovery?: RecoveryStrategy;
    } = {}
  ): ApplicationError {
    const definition = this.errorDefinitions[code];
    if (!definition) {
      throw new Error(`Unknown error code: ${code}`);
    }

    return new ApplicationError(
      code,
      customMessage || definition.message,
      definition.status || 500,
      meta,
      options.retryable ?? definition.retryable ?? false,
      options.severity ?? definition.severity ?? 'ERROR',
      options.recovery ?? definition.recovery
    );
  }

  static isApplicationError(error: unknown): error is ApplicationError {
    return error instanceof ApplicationError;
  }
}
