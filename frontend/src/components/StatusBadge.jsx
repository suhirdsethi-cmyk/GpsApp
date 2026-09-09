import React from 'react';

const StatusBadge = ({ status }) => {
  if (status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 absolute"></span>
        Tracking Active
      </span>
    );
  }

  if (status === 'EXPIRED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
        <span className="w-2 h-2 rounded-full bg-slate-500"></span>
        Session Expired
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
      Location Stopped
    </span>
  );
};

export default StatusBadge;
