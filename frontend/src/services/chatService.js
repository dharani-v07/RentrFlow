import api from './api';

async function listMessages(jobId) {
  const { data } = await api.get(`/api/chat/jobs/${jobId}/messages`);
  return data;
}

async function sendMessage(jobId, content) {
  const { data } = await api.post(`/api/chat/jobs/${jobId}/messages`, { content });
  return data;
}

async function markMessagesRead(jobId) {
  const { data } = await api.post(`/api/chat/jobs/${jobId}/read`);
  return data;
}

export { listMessages, sendMessage, markMessagesRead };
