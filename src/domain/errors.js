export const ErrorCode = Object.freeze({
  VALIDATION: "VALIDATION",
  NOT_FOUND: "NOT_FOUND",
  SOLD_OUT: "SOLD_OUT",
  ALREADY_CANCELLED: "ALREADY_CANCELLED",
});

export class DomainError extends Error {
  /**
   * @param {string} code machine-readable code such as VALIDATION, NOT_FOUND, SOLD_OUT
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}

export function fail(code, message) {
  throw new DomainError(code, message);
}
