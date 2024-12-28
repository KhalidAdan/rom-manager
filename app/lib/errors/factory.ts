export enum ErrorCode {
  // Authentication/Authorization
  UNAUTHORIZED = "AUTH001",
  FORBIDDEN = "AUTH002",
  INVALID_CREDENTIALS = "AUTH003",
  SESSION_EXPIRED = "AUTH004",

  // Resource errors
  NOT_FOUND = "RES001",
  ALREADY_EXISTS = "RES002",
  INVALID_STATE = "RES003",

  // Game specific
  GAME_BORROWED = "GAME001",
  GAME_NOT_AVAILABLE = "GAME002",
  BORROW_LIMIT_REACHED = "GAME003",
  INVALID_SAVE_STATE = "GAME004",
  GAME_NOT_BORROWED = "GAME005",

  // File operations
  FILE_TOO_LARGE = "FILE001",
  INVALID_FILE_TYPE = "FILE002",
  UPLOAD_FAILED = "FILE003",

  // Validation
  INVALID_INPUT = "VAL001",
  MISSING_REQUIRED_FIELD = "VAL002",

  // Server/System
  INTERNAL_SERVER_ERROR = "SYS001",
  SERVICE_UNAVAILABLE = "SYS002",
  DATABASE_ERROR = "SYS003",
  CACHE_ERROR = "SYS004",
}

export type ErrorMetadata = Record<string, unknown>;
export type ErrorDefinition = {
  message: string;
  status?: number;
};

export class ApplicationError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 500,
    public meta: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = this.constructor.name;
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
    };
  }

  toString() {
    return `${this.code}: ${this.message}`;
  }
}
export class ErrorFactory {
  private static errorDefinitions: Record<ErrorCode, ErrorDefinition> = {
    // Authentication/Authorization
    [ErrorCode.UNAUTHORIZED]: {
      message: "Authentication required to access this resource",
      status: 401,
    },
    [ErrorCode.FORBIDDEN]: {
      message: "You do not have permission to perform this action",
      status: 403,
    },
    [ErrorCode.INVALID_CREDENTIALS]: {
      message: "Invalid credentials provided",
      status: 401,
    },
    [ErrorCode.SESSION_EXPIRED]: {
      message: "Your session has expired, please log in again",
      status: 401,
    },

    // Resource errors
    [ErrorCode.NOT_FOUND]: {
      message: "The requested resource was not found",
      status: 404,
    },
    [ErrorCode.ALREADY_EXISTS]: {
      message: "Resource already exists",
      status: 409,
    },
    [ErrorCode.INVALID_STATE]: {
      message: "Resource is in an invalid state for this operation",
      status: 409,
    },

    // Game specific
    [ErrorCode.GAME_BORROWED]: {
      message: "This game is currently borrowed by another user",
      status: 409,
    },
    [ErrorCode.GAME_NOT_AVAILABLE]: {
      message: "This game is not currently available",
      status: 404,
    },
    [ErrorCode.BORROW_LIMIT_REACHED]: {
      message: "You have reached your maximum number of borrowed games",
      status: 409,
    },
    [ErrorCode.INVALID_SAVE_STATE]: {
      message: "The save state for this game is invalid or corrupted",
      status: 400,
    },
    [ErrorCode.GAME_NOT_BORROWED]: {
      message: "There is no current borrtow voucher on this game",
      status: 400,
    },

    // File operations
    [ErrorCode.FILE_TOO_LARGE]: {
      message: "The uploaded file exceeds the maximum allowed size",
      status: 413,
    },
    [ErrorCode.INVALID_FILE_TYPE]: {
      message: "The file type is not supported",
      status: 415,
    },
    [ErrorCode.UPLOAD_FAILED]: {
      message: "Failed to upload file",
      status: 500,
    },

    // Validation
    [ErrorCode.INVALID_INPUT]: {
      message: "The provided input is invalid",
      status: 400,
    },
    [ErrorCode.MISSING_REQUIRED_FIELD]: {
      message: "A required field is missing",
      status: 400,
    },

    // Server/System
    [ErrorCode.INTERNAL_SERVER_ERROR]: {
      message: "An internal server error occurred",
      status: 500,
    },
    [ErrorCode.SERVICE_UNAVAILABLE]: {
      message: "The service is currently unavailable",
      status: 503,
    },
    [ErrorCode.DATABASE_ERROR]: {
      message: "A database error occurred",
      status: 500,
    },
    [ErrorCode.CACHE_ERROR]: {
      message: "A cache error occurred",
      status: 500,
    },
  };

  static create(
    code: ErrorCode,
    customMessage?: string,
    meta: ErrorMetadata = {}
  ): ApplicationError {
    const definition = this.errorDefinitions[code];
    if (!definition) {
      throw new Error(`Unknown error code: ${code}`);
    }

    return new ApplicationError(
      code,
      customMessage || definition.message,
      definition.status,
      meta
    );
  }

  static isApplicationError(error: unknown): error is ApplicationError {
    return error instanceof ApplicationError;
  }
}
