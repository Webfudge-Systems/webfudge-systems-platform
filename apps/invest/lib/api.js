import strapiClient from './strapiClient'

const all = { 'pagination[pageSize]': 5000 }

export const investApi = {
  access: () => strapiClient.get('/invest/access'),

  listInstruments: () => strapiClient.get('/invest/instruments', all).then((r) => r?.data || []),
  createInstrument: (data) => strapiClient.post('/invest/instruments', { data }).then((r) => r?.data),
  updateInstrument: (id, data) => strapiClient.put(`/invest/instruments/${id}`, { data }).then((r) => r?.data),
  deleteInstrument: (id) => strapiClient.delete(`/invest/instruments/${id}`),

  listTransactions: () => strapiClient.get('/invest/transactions', all).then((r) => r?.data || []),
  createTransaction: (data) => strapiClient.post('/invest/transactions', { data }).then((r) => r?.data),
  updateTransaction: (id, data) => strapiClient.put(`/invest/transactions/${id}`, { data }).then((r) => r?.data),
  deleteTransaction: (id) => strapiClient.delete(`/invest/transactions/${id}`),

  listSips: () => strapiClient.get('/invest/sips', all).then((r) => r?.data || []),
  createSip: (data) => strapiClient.post('/invest/sips', { data }).then((r) => r?.data),
  updateSip: (id, data) => strapiClient.put(`/invest/sips/${id}`, { data }).then((r) => r?.data),
  deleteSip: (id) => strapiClient.delete(`/invest/sips/${id}`),
  syncSip: (id) => strapiClient.post(`/invest/sips/${id}/sync`, {}),

  refreshPrices: (force = false) => strapiClient.post('/invest/prices/refresh', { force }),
  lookup: (kind, q) => strapiClient.get('/invest/lookup', { kind, q }),
  history: (id, from) => strapiClient.get(`/invest/instruments/${id}/history`, from ? { from } : {}),
}
