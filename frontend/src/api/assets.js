import api from './client'

export const getAssets = (params = {}) =>
  api.get('/assets/', { params }).then(r => r.data)

export const getAsset = (id) =>
  api.get(`/assets/${id}`).then(r => r.data)

export const createAsset = (data) =>
  api.post('/assets/', data).then(r => r.data)

export const updateAsset = (id, data) =>
  api.patch(`/assets/${id}`, data).then(r => r.data)
