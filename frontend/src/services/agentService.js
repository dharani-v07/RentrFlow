import api from './api';

async function getStats() {
  const { data } = await api.get('/api/agent/stats');
  return data;
}

async function listJobs({ status } = {}) {
  const { data } = await api.get('/api/agent/jobs', { params: status ? { status } : undefined });
  return data;
}

async function createJob(payload) {
  const { data } = await api.post('/api/agent/jobs', payload);
  return data;
}

async function getJob(jobId) {
  const { data } = await api.get(`/api/agent/jobs/${jobId}`);
  return data;
}

async function listApplicants(jobId) {
  const { data } = await api.get(`/api/agent/jobs/${jobId}/applicants`);
  return data;
}

async function listContractors(arg) {
  const params =
    typeof arg === 'string' ? (arg ? { q: arg } : undefined) : arg && typeof arg === 'object' ? arg : undefined;
  const { data } = await api.get('/api/agent/contractors', { params });
  return data;
}

async function assignContractor(jobId, contractorId) {
  const { data } = await api.post(`/api/agent/jobs/${jobId}/assign`, { contractorId });
  return data;
}

async function listWorkOrders() {
  const { data } = await api.get('/api/agent/work-orders');
  return data;
}

async function listInvoices({ status } = {}) {
  const { data } = await api.get('/api/agent/invoices', { params: status ? { status } : undefined });
  return data;
}

async function approveInvoice(invoiceId) {
  const { data } = await api.post(`/api/agent/invoices/${invoiceId}/approve`);
  return data;
}

async function rejectInvoice(invoiceId, reason) {
  const { data } = await api.post(`/api/agent/invoices/${invoiceId}/reject`, { reason });
  return data;
}

async function markInvoicePaid(invoiceId) {
  const { data } = await api.post(`/api/agent/invoices/${invoiceId}/paid`);
  return data;
}

async function listNotifications({ unread } = {}) {
  const { data } = await api.get('/api/agent/notifications', { params: typeof unread === 'boolean' ? { unread } : undefined });
  return data;
}

async function markNotificationRead(notificationId) {
  const { data } = await api.post(`/api/agent/notifications/${notificationId}/read`);
  return data;
}

export {
  getStats,
  listJobs,
  createJob,
  getJob,
  listApplicants,
  listContractors,
  assignContractor,
  listWorkOrders,
  listInvoices,
  approveInvoice,
  rejectInvoice,
  markInvoicePaid,
  listNotifications,
  markNotificationRead,
};
