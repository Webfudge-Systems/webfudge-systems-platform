/**
 * Product catalogue, price books and catalogue quotes (ticket G13).
 */
import strapiClient from '../strapiClient';

const productService = {
  async list({ activeOnly = false, q } = {}) {
    const res = await strapiClient.get('/crm-products', { ...(activeOnly ? { active: 'true' } : {}), ...(q ? { q } : {}) });
    return Array.isArray(res?.data) ? res.data : [];
  },
  async create(payload) {
    return (await strapiClient.post('/crm-products', { data: payload }))?.data;
  },
  async update(id, payload) {
    return (await strapiClient.put(`/crm-products/${id}`, { data: payload }))?.data;
  },
  async remove(id) {
    return strapiClient.delete(`/crm-products/${id}`);
  },
  async listPriceBooks() {
    const res = await strapiClient.get('/crm-price-books');
    return Array.isArray(res?.data) ? res.data : [];
  },
  async createPriceBook(payload) {
    return (await strapiClient.post('/crm-price-books', { data: payload }))?.data;
  },
  async updatePriceBook(id, payload) {
    return (await strapiClient.put(`/crm-price-books/${id}`, { data: payload }))?.data;
  },
  async removePriceBook(id) {
    return strapiClient.delete(`/crm-price-books/${id}`);
  },
  /** Quote (proposal) → draft GST invoice. Returns { invoice, existing }. */
  async convertQuoteToInvoice(proposalId) {
    const res = await strapiClient.post(`/proposals/${proposalId}/convert-to-invoice`, {});
    return { invoice: res?.data, existing: Boolean(res?.meta?.existing) };
  },
  /** G27: org max discount % before manager approval (null = no limit). */
  async getQuotePolicy() {
    return (await strapiClient.get('/crm-quote-policy'))?.data || { maxDiscountPct: null };
  },
  async updateQuotePolicy(maxDiscountPct) {
    return (await strapiClient.put('/crm-quote-policy', { data: { maxDiscountPct } }))?.data;
  },
  /** decision: 'approve' | 'reject' */
  async decideApproval(proposalId, decision, note) {
    return (await strapiClient.post(`/proposals/${proposalId}/approval`, { data: { decision, note } }))?.data;
  },
  /** E-sign hand-off. Returns { esign, configured, message }. */
  async sendForSignature(proposalId, signer = {}) {
    const res = await strapiClient.post(`/proposals/${proposalId}/send-for-signature`, { data: signer });
    return { esign: res?.data, configured: Boolean(res?.meta?.configured), message: res?.meta?.message || '' };
  },
};

/** Price for a product in a price book (falls back to the list price). */
export function priceFor(product, book) {
  const p = book?.prices?.[product.id];
  return p != null ? Number(p) : Number(product.unitPrice) || 0;
}

export default productService;
