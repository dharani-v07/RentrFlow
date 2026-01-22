import api from './api';

async function listOpenJobs(q) {
  const { data } = await api.get('/api/contractor/jobs/open', { params: q ? { q } : undefined });
  return data;
}

async function applyToJob(jobId, note) {
  const { data } = await api.post(`/api/contractor/jobs/${jobId}/apply`, { note });
  return data;
}

async function listAssignedJobs({ status } = {}) {
  const { data } = await api.get('/api/contractor/jobs/assigned', { params: status ? { status } : undefined });
  return data;
}

async function updateJobStatus(jobId, status) {
  const { data } = await api.post(`/api/contractor/jobs/${jobId}/status`, { status });
  return data;
}

async function listWorkOrders() {
  const { data } = await api.get('/api/contractor/work-orders');
  return data;
}

async function createInvoice(jobId, payload) {
  const { data } = await api.post(`/api/contractor/jobs/${jobId}/invoices`, payload);
  return data;
}

async function listInvoices({ status } = {}) {
  const { data } = await api.get('/api/contractor/invoices', { params: status ? { status } : undefined });
  return data;
}

async function listNotifications({ unread } = {}) {
  const { data } = await api.get('/api/contractor/notifications', { params: typeof unread === 'boolean' ? { unread } : undefined });
  return data;
}

async function markNotificationRead(notificationId) {
  const { data } = await api.post(`/api/contractor/notifications/${notificationId}/read`);
  return data;
}

export {
  listOpenJobs,
  applyToJob,
  listAssignedJobs,
  updateJobStatus,
  listWorkOrders,
  createInvoice,
  listInvoices,
  listNotifications,
  markNotificationRead,
};
