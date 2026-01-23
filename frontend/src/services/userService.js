import api from './api';

async function getMyProfile() {
  const { data } = await api.get('/api/users/me/profile');
  return data;
}

async function updateMyProfile(payload) {
  const { data } = await api.put('/api/users/me/profile', payload || {});
  return data;
}

async function uploadMyResume(file) {
  const form = new FormData();
  form.append('resume', file);

  const { data } = await api.post('/api/users/me/resume', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data;
}

async function getMyResume() {
  const { data } = await api.get('/api/users/me/resume');
  return data;
}

export { getMyProfile, updateMyProfile, uploadMyResume, getMyResume };
