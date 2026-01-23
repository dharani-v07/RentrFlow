import api from './api';

async function suggestContractors(jobId) {
  const { data } = await api.post('/api/ai/suggest-contractors', { jobId });
  return data;
}

async function generateWorkOrderSummary(workOrderId) {
  const { data } = await api.post('/api/ai/generate-work-order-summary', { workOrderId });
  return data;
}

async function suggestInvoiceItems(jobId) {
  const { data } = await api.post('/api/ai/suggest-invoice-items', { jobId });
  return data;
}

async function summarizeChat(jobId, limit = 20) {
  const { data } = await api.post('/api/ai/summarize-chat', { jobId, limit });
  return data;
}

async function predictJobCost({ title, description, location, currency }) {
  const { data } = await api.post('/api/ai/predict-job-cost', { title, description, location, currency });
  return data;
}

async function prioritizeNotifications(notifications) {
  const body = Array.isArray(notifications) ? { notifications } : {};
  const { data } = await api.post('/api/ai/prioritize-notifications', body);
  return data;
}

export {
  suggestContractors,
  generateWorkOrderSummary,
  suggestInvoiceItems,
  summarizeChat,
  predictJobCost,
  prioritizeNotifications,
};
