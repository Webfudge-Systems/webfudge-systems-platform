'use strict';

/**
 * E-signature hand-off (G27). Provider interface only; no vendor is integrated yet.
 * A provider implements: { name, configured: boolean, async send({ quote, pdfBase64, signer }) → { envelopeId, url? } }.
 * Register one by setting ESIGN_PROVIDER and adding it to PROVIDERS.
 */

const notConfigured = {
  name: null,
  configured: false,
  async send() {
    const err = new Error('E-signature provider is not configured yet.');
    err.code = 'ESIGN_NOT_CONFIGURED';
    throw err;
  },
};

const PROVIDERS = {};

function getEsignProvider() {
  const key = String(process.env.ESIGN_PROVIDER || '').toLowerCase();
  return PROVIDERS[key] || notConfigured;
}

module.exports = { getEsignProvider, PROVIDERS };
