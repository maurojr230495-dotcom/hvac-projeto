import api from './client'

export const getWorkOrders = (params) => api.get('/work-orders', { params }).then(r => r.data)
export const getWorkOrder  = (id)     => api.get(`/work-orders/${id}`).then(r => r.data)
export const createWorkOrder = (body) => api.post('/work-orders', body).then(r => r.data)
export const updateWorkOrder = (id, body) => api.patch(`/work-orders/${id}`, body).then(r => r.data)
export const cancelWorkOrder = (id)   => api.delete(`/work-orders/${id}`)
