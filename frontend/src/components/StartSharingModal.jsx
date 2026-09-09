import React, { useState } from 'react';
import { Clock, Calendar, ShieldCheck, X, AlertCircle } from 'lucide-react';
import { useTracking } from '../context/TrackingContext';

const StartSharingModal = ({ isOpen, onClose, onSuccess }) => {
  const { startSharing } = useTracking();

  const [durationType, setDurationType] = useState('1h');
  const [customHours, setCustomHours] = useState(3);
  const [customMinutes, setCustomMinutes] = useState(45);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const presetOptions = [
    { label: '15 Minutes', value: '15m' },
    { label: '30 Minutes', value: '30m' },
    { label: '1 Hour', value: '1h' },
    { label: '2 Hours', value: '2h' },
    { label: '4 Hours', value: '4h' },
    { label: '8 Hours', value: '8h' },
    { label: '12 Hours', value: '12h' },
    { label: '24 Hours', value: '24h' },
    { label: 'Custom Duration', value: 'custom_duration' },
    { label: 'Custom Time Range', value: 'custom_time' },
    { label: 'Until I Stop', value: 'until_stop' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (durationType === 'custom_duration') {
      if (customHours === 0 && customMinutes === 0) {
        setError("Custom duration must be greater than 0.");
        return;
      }
    } else if (durationType === 'custom_time') {
      if (!startTime || !endTime) {
        setError("Please select both start time and end time.");
        return;
      }
      const st = new Date(startTime);
      const et = new Date(endTime);
      if (et <= st) {
        setError("End time must be later than start time.");
        return;
      }
    }

    try {
      setLoading(true);
      await startSharing(
        durationType,
        customHours,
        customMinutes,
        startTime ? new Date(startTime).toISOString() : null,
        endTime ? new Date(endTime).toISOString() : null
      );
      setLoading(false);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.detail || "Failed to start location sharing.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-outfit">Share My Location</h2>
              <p className="text-xs text-slate-400">Choose explicit duration for consensual tracking</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              How long do you want to share your location?
            </label>
            
            {/* Grid of preset pills */}
            <div className="grid grid-cols-3 gap-2">
              {presetOptions.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => {
                    setDurationType(opt.value);
                    setError(null);
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-medium border text-center transition-all ${
                    durationType === opt.value
                      ? 'bg-brand-500 text-slate-950 font-bold border-brand-400 shadow-lg shadow-brand-500/20 scale-[1.02]'
                      : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Duration Inputs */}
          {durationType === 'custom_duration' && (
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
              <span className="text-xs font-semibold text-brand-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Specify Hours & Minutes
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Hours</label>
                  <input
                    type="number"
                    min="0"
                    max="168"
                    value={customHours}
                    onChange={(e) => setCustomHours(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Minutes</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Selected duration: <strong className="text-white">{customHours}h {customMinutes}m</strong>
              </p>
            </div>
          )}

          {/* Custom Start & End Time Pickers */}
          {durationType === 'custom_time' && (
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-3">
              <span className="text-xs font-semibold text-brand-400 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> Custom Start & End Time
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Prominent Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-500 to-emerald-400 text-slate-950 font-bold text-base shadow-xl shadow-brand-500/25 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <span>Initializing Session...</span>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>START SHARING NOW</span>
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};

export default StartSharingModal;
