'use strict';

/** Vertical packs (G22): one data file per industry, applied by utils/vertical-pack-apply.js. */
const PACKS = [
  require('./real-estate'),
  require('./ev'),
  require('./jewellery'),
  require('./education'),
  require('./clinics'),
];

const BY_KEY = Object.fromEntries(PACKS.map((p) => [p.key, p]));

/** Card-sized summaries for pickers (sign-up, Settings). */
function listPacks() {
  return PACKS.map((p) => ({
    key: p.key,
    label: p.label,
    description: p.description,
    counts: {
      pipelines: p.pipelines.length,
      leadStatuses: p.leadStatuses.length,
      customFields: p.customFields.length,
      cadences: p.cadences.length,
      whatsappTemplates: p.whatsappTemplates.length,
      views: p.views.length,
    },
  }));
}

function getPack(key) {
  return BY_KEY[String(key || '')] || null;
}

module.exports = { listPacks, getPack, PACK_KEYS: PACKS.map((p) => p.key) };
