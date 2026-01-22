import React from 'react';

export default function DashboardStatCard({ color = 'blue', icon, number, label }) {
  const bg =
    color === 'navy'
      ? 'bg-[#103f91]'
      : color === 'orange'
        ? 'bg-[#f0ad4e]'
        : color === 'teal'
          ? 'bg-[#17a2b8]'
          : 'bg-[#1e5aa0]';

  return (
    <div className={`rounded-lg p-5 text-white flex items-center justify-between shadow-[0_4px_6px_rgba(0,0,0,0.1)] ${bg}`}>
      <div>
        <div className="text-3xl font-bold leading-none">{number}</div>
        <div className="text-sm opacity-90 mt-1">{label}</div>
      </div>
      <i className={`fa-solid ${icon} text-xl opacity-90`} />
    </div>
  );
}
