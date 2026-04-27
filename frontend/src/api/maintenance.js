import api from './client'

export const getSchedules = (params = {}) =>
  api.get('/maintenance/', { params }).then(r => r.data)

export const createSchedule = (data) =>
  api.post('/maintenance/', data).then(r => r.data)

export const updateSchedule = (id, data) =>
  api.patch(`/maintenance/${id}`, data).then(r => r.data)

export const generateWorkOrder = (id) =>
  api.post(`/maintenance/${id}/generate`).then(r => r.data)

export const getUpcomingSchedules = (days = 30) =>
  api.get('/maintenance/upcoming', { params: { days } }).then(r => r.data)
