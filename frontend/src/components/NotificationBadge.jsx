import React from 'react';

export default function NotificationBadge({ count }) {
  const n = Number(count || 0);
  if (!n) return null;

  return (
    <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-[#dc3545] text-white text-[11px] font-bold">
      {n > 99 ? '99+' : n}
    </span>
  );
}
