import api from './client'

export const getInvoices = (params = {}) =>
  api.get('/invoices/', { params }).then(r => r.data)

export const getInvoice = (id) =>
  api.get(`/invoices/${id}`).then(r => r.data)

export const createInvoiceFromWO = (woId, data) =>
  api.post(`/invoices/from-work-order/${woId}`, data).then(r => r.data)

export const updateInvoice = (id, data) =>
  api.patch(`/invoices/${id}`, data).then(r => r.data)
