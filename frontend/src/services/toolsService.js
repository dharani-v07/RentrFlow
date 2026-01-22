import api from './api';

async function listTools() {
  const { data } = await api.get('/api/tools');
  return data;
}

async function jobStatus(jobId) {
  const { data } = await api.get('/api/tools/job-status', { params: { jobId } });
  return data;
}

async function analytics() {
  const { data } = await api.get('/api/tools/analytics');
  return data;
}

async function estimate(lineItems) {
  const { data } = await api.post('/api/tools/estimate', { lineItems });
  return data;
}

async function autoGenerateWorkOrder(jobId) {
  const { data } = await api.post('/api/tools/work-orders/auto-generate', { jobId });
  return data;
}

async function uploadDocument({ file, jobId, workOrderId, invoiceId, tags }) {
  const form = new FormData();
  form.append('file', file);
  if (jobId) form.append('jobId', jobId);
  if (workOrderId) form.append('workOrderId', workOrderId);
  if (invoiceId) form.append('invoiceId', invoiceId);
  if (tags) form.append('tags', tags);

  const { data } = await api.post('/api/tools/documents/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

async function listDocuments(params) {
  const { data } = await api.get('/api/tools/documents', { params });
  return data;
}

async function updatePreferences(payload) {
  const { data } = await api.post('/api/tools/settings/preferences', payload);
  return data;
}

export {
  listTools,
  jobStatus,
  analytics,
  estimate,
  autoGenerateWorkOrder,
  uploadDocument,
  listDocuments,
  updatePreferences,
};
