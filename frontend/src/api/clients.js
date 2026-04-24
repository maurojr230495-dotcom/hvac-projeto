import api from './client'

export const getClients  = (params) => api.get('/clients', { params }).then(r => r.data)
export const getClient   = (id)     => api.get(`/clients/${id}`).then(r => r.data)
export const createClient = (body)  => api.post('/clients', body).then(r => r.data)
export const updateClient = (id, body) => api.patch(`/clients/${id}`, body).then(r => r.data)
