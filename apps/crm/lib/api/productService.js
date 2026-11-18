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
};

/** Price for a product in a price book (falls back to the list price). */
export function priceFor(product, book) {
  const p = book?.prices?.[product.id];
  return p != null ? Number(p) : Number(product.unitPrice) || 0;
}

export default productService;
