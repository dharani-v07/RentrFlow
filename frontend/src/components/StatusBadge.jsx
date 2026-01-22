import React from 'react';

function styleForStatus(status) {
  const s = String(status || '').toUpperCase();

  if (s === 'CREATED' || s === 'DRAFT') return 'bg-[#e0e0e0] text-[#555]';
  if (s === 'ACTIVE' || s === 'ISSUED') return 'bg-[#0d6efd] text-white';
  if (s === 'VERIFIED' || s === 'SIGNED') return 'bg-[#198754] text-white';
  if (s === 'CLOSED') return 'bg-slate-900 text-white';

  if (s === 'IN_PROGRESS') return 'bg-[#198754] text-white';
  if (s === 'OPEN') return 'bg-[#f0ad4e] text-white';
  if (s === 'ASSIGNED') return 'bg-[#0d6efd] text-white';
  if (s === 'COMPLETED') return 'bg-[#f0ad4e] text-white';
  if (s === 'PENDING') return 'bg-[#e0e0e0] text-[#555]';
  if (s === 'APPROVED') return 'bg-[#ffecb5] text-[#856404]';
  if (s === 'OVERDUE') return 'bg-[#f8d7da] text-[#721c24]';
  if (s === 'SUBMITTED') return 'bg-[#e0e0e0] text-[#555]';
  if (s === 'REJECTED') return 'bg-[#f8d7da] text-[#721c24]';
  if (s === 'PAID') return 'bg-[#198754] text-white';
  return 'bg-slate-200 text-slate-700';
}

function labelForStatus(status) {
  const s = String(status || '').toUpperCase();
  if (s === 'CREATED' || s === 'DRAFT') return 'Created';
  if (s === 'ACTIVE' || s === 'ISSUED') return 'Active';
  if (s === 'VERIFIED' || s === 'SIGNED') return 'Verified';
  if (s === 'CLOSED') return 'Closed';
  if (s === 'IN_PROGRESS') return 'In Progress';
  if (s === 'OPEN') return 'Open';
  if (s === 'ASSIGNED') return 'Assigned';
  if (s === 'COMPLETED') return 'Completed';
  if (s === 'SUBMITTED') return 'Pending';
  return s.replace(/_/g, ' ');
}

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-block text-[0.75rem] font-semibold px-2.5 py-1 rounded ${styleForStatus(status)}`}>
      {labelForStatus(status)}
    </span>
  );
}
