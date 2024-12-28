import {
  ApplicationError,
  ErrorCode,
  ErrorFactory,
  ErrorMetadata,
} from "./factory";

export const createNotFoundError = (
  resource: string,
  meta?: ErrorMetadata
): ApplicationError => {
  return ErrorFactory.create(
    ErrorCode.NOT_FOUND,
    `The requested ${resource} was not found`,
    meta
  );
};

export const createValidationError = (
  details: string,
  meta?: ErrorMetadata
): ApplicationError => {
  return ErrorFactory.create(
    ErrorCode.INVALID_INPUT,
    `Validation error: ${details}`,
    meta
  );
};

export const createUnauthorizedError = (
  reason?: string,
  meta?: ErrorMetadata
): ApplicationError => {
  return ErrorFactory.create(
    ErrorCode.UNAUTHORIZED,
    reason ? `Authentication required: ${reason}` : undefined,
    meta
  );
};
