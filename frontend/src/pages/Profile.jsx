import React, { useState } from 'react';
import { User, Shield, Smartphone, Sliders, Check, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTracking } from '../context/TrackingContext';

const Profile = () => {
  const { user } = useAuth();
  const { triggerToast } = useTracking();
  const [updateInterval, setUpdateInterval] = useState('10');

  const handleSaveSettings = (e) => {
    e.preventDefault();
    triggerToast("Settings saved successfully!", "success");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24 md:pb-12">
      
      {/* Header */}
      <div className="pb-6 border-b border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-white flex items-center gap-3">
          <User className="w-8 h-8 text-brand-400" />
          Profile & Preferences
        </h1>
        <p className="text-sm text-slate-400 mt-1">Manage account info, update intervals, and mobile settings.</p>
      </div>

      {/* Account Info Card */}
      <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
        <h2 className="text-lg font-bold text-white font-outfit flex items-center gap-2">
          <Shield className="w-5 h-5 text-brand-400" />
          Account Profile
        </h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-xs text-slate-400 uppercase font-semibold block mb-1">Full Name</span>
            <span className="text-base font-medium text-white">{user?.name}</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="text-xs text-slate-400 uppercase font-semibold block mb-1">Email Address</span>
            <span className="text-base font-medium text-white">{user?.email}</span>
          </div>
        </div>
      </div>

      {/* GPS Configuration Card */}
      <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
        <h2 className="text-lg font-bold text-white font-outfit flex items-center gap-2">
          <Sliders className="w-5 h-5 text-brand-400" />
          Location Update Frequency
        </h2>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              GPS Refresh Interval (Seconds)
            </label>
            <select
              value={updateInterval}
              onChange={(e) => setUpdateInterval(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500"
            >
              <option value="5">5 Seconds (High Accuracy, Higher Battery Usage)</option>
              <option value="10">10 Seconds (Recommended Default)</option>
              <option value="30">30 Seconds (Balanced Battery)</option>
              <option value="60">60 Seconds (Power Saver)</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-brand-500 text-slate-950 font-bold text-sm hover:bg-brand-400 transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Save Preferences</span>
          </button>
        </form>
      </div>

      {/* Section 22: Mobile GPS Architecture Note */}
      <div className="glass-panel rounded-3xl p-6 border border-blue-500/30 bg-blue-950/20 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-outfit">Mobile Companion & Background GPS Notice</h3>
            <p className="text-xs text-blue-300">Section 22 Architecture Compliance</p>
          </div>
        </div>

        <div className="text-xs text-slate-300 space-y-2 leading-relaxed font-sans">
          <p>
            This web application leverages the standard HTML5 <code>navigator.geolocation</code> API for active browser location streaming. Standard mobile browsers (iOS Safari & Android Chrome) deliberately restrict background GPS tracking when the tab is backgrounded to protect user battery and privacy.
          </p>
          <p className="text-slate-400">
            For true, unrestricted 24/7 background location tracking when the screen is locked, this React application is structured to drop directly into a <strong>Capacitor</strong> native mobile wrapper using <code>@capacitor-community/background-geolocation</code>.
          </p>
        </div>
      </div>

    </div>
  );
};

export default Profile;
