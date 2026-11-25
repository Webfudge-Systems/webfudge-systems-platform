'use strict';

/**
 * Typed errors. `code` is stable and safe to send to the browser; `status` is the HTTP status the
 * backend answers with. Messages are user-facing (short, plain English).
 */
class AiError extends Error {
  constructor(message, { code = 'AI_ERROR', status = 500, details = {}, cause, retryable = false } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.details = details;
    this.retryable = retryable;
    if (cause) this.cause = cause;
  }
}

/** AI is switched off (Internal mode, AI_ENABLED not "true", or no provider key). */
class AiDisabledError extends AiError {
  constructor(message = 'Fudge AI is not switched on for this workspace.', details = {}) {
    super(message, { code: 'AI_DISABLED', status: 403, details });
  }
}

/** The provider is not configured (missing key / unknown provider name). */
class AiNotConfiguredError extends AiError {
  constructor(message = 'The AI provider is not configured.', details = {}) {
    super(message, { code: 'AI_NOT_CONFIGURED', status: 503, details });
  }
}

/** The organization has used its monthly AI credits. Answered as 402 with an upgrade link. */
class AiCreditsExhaustedError extends AiError {
  constructor(message = 'Your organization has used all of its AI credits for this month.', details = {}) {
    super(message, { code: 'AI_CREDITS_EXHAUSTED', status: 402, details });
  }
}

class AiTimeoutError extends AiError {
  constructor(ms, cause) {
    super(`The AI request timed out after ${ms} ms.`, { code: 'AI_TIMEOUT', status: 504, retryable: true, cause });
  }
}

/** The model output did not match the JSON schema after every retry. */
class AiInvalidOutputError extends AiError {
  constructor(message = 'The AI returned an answer we could not use. Please try again.', details = {}) {
    super(message, { code: 'AI_INVALID_OUTPUT', status: 502, details });
  }
}

/** The model declined the request (stop_reason "refusal"). Not retried. */
class AiRefusalError extends AiError {
  constructor(details = {}) {
    super('The AI declined this request.', { code: 'AI_REFUSED', status: 422, details });
  }
}

/** Provider-side failure (rate limit, overload, network). `retryable` decides the retry loop. */
class AiProviderError extends AiError {
  constructor(message, { status = 502, retryable = false, cause, details } = {}) {
    super(message, { code: 'AI_PROVIDER_ERROR', status, retryable, cause, details });
  }
}

/** An agent action was not allowed for the acting user. */
class AiPermissionError extends AiError {
  constructor(message = 'You do not have permission for this AI action.', details = {}) {
    super(message, { code: 'AI_ACTION_FORBIDDEN', status: 403, details });
  }
}

module.exports = {
  AiError,
  AiDisabledError,
  AiNotConfiguredError,
  AiCreditsExhaustedError,
  AiTimeoutError,
  AiInvalidOutputError,
  AiRefusalError,
  AiProviderError,
  AiPermissionError,
};
