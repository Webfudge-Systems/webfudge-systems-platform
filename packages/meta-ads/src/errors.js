'use strict';

/** Graph API error. The message must never contain access tokens or lead PII. */
class MetaApiError extends Error {
  constructor(message, { status, type, code, subcode, fbtraceId } = {}) {
    super(message);
    this.name = 'MetaApiError';
    this.status = status;
    this.type = type;
    this.code = code;
    this.subcode = subcode;
    this.fbtraceId = fbtraceId;
  }

  /** True when the token is expired, revoked or missing a permission (the org must reconnect). */
  get isAuthError() {
    return this.code === 190 || this.code === 102 || this.code === 10 || (this.code >= 200 && this.code < 300);
  }
}

module.exports = { MetaApiError };
