import api from './api';

async function login({ role, email, password, rememberMe }) {
  const { data } = await api.post('/api/auth/login', { role, email, password, rememberMe });
  return data;
}

async function register({ role, name, email, password, phone, companyName }) {
  const { data } = await api.post('/api/auth/register', { role, name, email, password, phone, companyName });
  return data;
}

async function me() {
  const { data } = await api.get('/api/auth/me');
  return data;
}

export { login, register, me };
