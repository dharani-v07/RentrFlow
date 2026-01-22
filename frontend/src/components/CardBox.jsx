import React from 'react';

export default function CardBox({ title, right, children }) {
  return (
    <div className="bg-white rounded-lg p-5 shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
      {title ? (
        <div className="flex items-center justify-between mb-5">
          <div className="text-[1.1rem] font-bold text-slate-800">{title}</div>
          {right ? <div>{right}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
