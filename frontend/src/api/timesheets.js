import api from './client'

export const getTimesheets  = (params) => api.get('/timesheets', { params }).then(r => r.data)
export const checkin        = (body)   => api.post('/timesheets/checkin', body).then(r => r.data)
export const checkout       = (id, body) => api.post(`/timesheets/${id}/checkout`, body).then(r => r.data)
export const reviewTimesheet = (id, body) => api.post(`/timesheets/${id}/review`, body).then(r => r.data)
