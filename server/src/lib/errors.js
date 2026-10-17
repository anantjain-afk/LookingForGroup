export class AppError extends Error {
  constructor(status, message, code = 'REQUEST_FAILED') {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export function parse(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) throw new AppError(400, result.error.issues[0]?.message || 'Invalid input', 'VALIDATION_ERROR');
  return result.data;
}
