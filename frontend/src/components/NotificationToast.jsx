import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

const NotificationToast = ({ message, onClose }) => {
  if (!message) return null;

  const { text, type } = message;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-blue-400 shrink-0" />;
    }
  };

  const getBgClass = () => {
    switch (type) {
      case 'success':
        return 'bg-emerald-950/90 border-emerald-500/30 text-emerald-100';
      case 'warning':
        return 'bg-amber-950/90 border-amber-500/30 text-amber-100';
      case 'error':
        return 'bg-rose-950/90 border-rose-500/30 text-rose-100';
      default:
        return 'bg-slate-900/90 border-slate-700 text-slate-100';
    }
  };

  return (
    <div className="fixed top-5 right-5 z-50 max-w-md animate-bounce-short shadow-2xl">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-lg ${getBgClass()}`}>
        {getIcon()}
        <span className="text-sm font-medium pr-2">{text}</span>
        {onClose && (
          <button onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity p-1">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default NotificationToast;
