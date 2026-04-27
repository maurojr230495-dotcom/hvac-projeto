import api from './client'

export const getDashboardStats = () =>
  api.get('/analytics/dashboard').then(r => r.data)

export const getTechnicianUtilisation = (days = 7) =>
  api.get('/analytics/technician-utilisation', { params: { days } }).then(r => r.data)
