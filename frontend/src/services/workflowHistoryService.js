import api from './api';

async function getJobHistory(jobId) {
  const { data } = await api.get(`/api/jobs/${jobId}/history`);
  return data;
}

async function getWorkOrderHistory(workOrderId) {
  const { data } = await api.get(`/api/workorders/${workOrderId}/history`);
  return data;
}

async function getInvoiceHistory(invoiceId) {
  const { data } = await api.get(`/api/invoices/${invoiceId}/history`);
  return data;
}

export { getJobHistory, getWorkOrderHistory, getInvoiceHistory };
