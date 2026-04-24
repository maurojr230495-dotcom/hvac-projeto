import axios from 'axios'
import api from './client'

export async function login(email, password) {
  const { data } = await axios.post('/auth/login', { email, password })
  return data
}

export async function logout(refreshToken) {
  await axios.post('/auth/logout', { refresh_token: refreshToken })
}

export async function getMe() {
  const { data } = await api.get('/users/me')
  return data
}

export function microsoftLoginUrl() {
  return '/auth/microsoft/login'
}
