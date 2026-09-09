import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, MapPin, Users, Clock, Radio, UserCheck, StopCircle, ArrowRight, User, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTracking } from '../context/TrackingContext';
import StatusBadge from '../components/StatusBadge';
import StartSharingModal from '../components/StartSharingModal';
import api from '../services/api';

const Dashboard = () => {
  const { user } = useAuth();
  const { myActiveSession, activeSessions, currentLocation, stopSharing } = useTracking();
  const navigate = useNavigate();

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [connections, setConnections] = useState([]);
  const [historyCount, setHistoryCount] = useState(0);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const connRes = await api.get('/connections');
        setConnections(connRes.data);

        const histRes = await api.get('/tracking/history');
        setHistoryCount(histRes.data.length);
      } catch (err) {
        console.error("Error loading dashboard metrics:", err);
      }
    };
    loadDashboardData();
  }, []);

  // Filter connection lists
  const acceptedConnections = connections.filter(c => c.status === 'ACCEPTED');
  const pendingApprovals = connections.filter(c => c.status === 'PENDING' && c.sharer_id === user?.id);

  // Friends sharing location WITH ME (where I am viewer)
  const friendsSharingWithMe = activeSessions.filter(s => s.sharer_id !== user?.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24 md:pb-12">
      
      {/* Welcome & Profile Header Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-slate-950 font-bold text-2xl shadow-xl shadow-brand-500/20">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <span className="text-xs uppercase font-semibold tracking-wider text-emerald-400">Consensual GPS Portal</span>
            <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-white leading-tight">Welcome, {user?.name}!</h1>
            <p className="text-sm text-slate-400">{user?.email}</p>
          </div>
        </div>

        {/* Quick Action Button */}
        <div className="relative z-10 w-full md:w-auto">
          {myActiveSession && myActiveSession.status === 'ACTIVE' ? (
            <button
              onClick={() => stopSharing()}
              className="w-full md:w-auto px-6 py-4 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold border border-rose-500/30 flex items-center justify-center gap-3 shadow-xl shadow-rose-500/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <StopCircle className="w-6 h-6 fill-rose-500/20" />
              <span>STOP LOCATION SHARING</span>
            </button>
          ) : (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="w-full md:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-500 to-emerald-400 text-slate-950 font-bold text-base shadow-xl shadow-brand-500/25 hover:brightness-110 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
              <span>SHARE MY LOCATION</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Session Highlight Banner if Sharing */}
      {myActiveSession && myActiveSession.status === 'ACTIVE' && (
        <div className="p-6 rounded-2xl bg-emerald-950/50 border border-emerald-500/30 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white font-outfit">Your Location Sharing is Currently ACTIVE</h3>
                <StatusBadge status="ACTIVE" />
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Session ID: <code className="font-mono bg-slate-900 px-2 py-0.5 rounded text-emerald-400">{myActiveSession.id}</code>
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/map?session_id=${myActiveSession.id}`)}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm flex items-center gap-2 hover:bg-emerald-400 transition-all"
          >
            <span>View Live Map</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: My Location */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">My GPS Status</span>
            <MapPin className="w-5 h-5 text-brand-400" />
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {currentLocation ? `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}` : 'GPS Ready'}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {myActiveSession?.status === 'ACTIVE' ? 'Broadcasting live position' : 'Idle (No active sharing)'}
          </p>
        </div>

        {/* Card 2: People Sharing With Me */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sharing With Me</span>
            <Radio className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-outfit">
            {friendsSharingWithMe.length} <span className="text-sm font-normal text-slate-400">Active</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Friends broadcasting live position to you</p>
        </div>

        {/* Card 3: Connected People */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Connected Friends</span>
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white font-outfit">
            {acceptedConnections.length} <span className="text-sm font-normal text-slate-400">Trusted</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Authorized for consensual tracking</p>
        </div>

        {/* Card 4: History Logged */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recorded Sessions</span>
            <Clock className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white font-outfit">
            {historyCount} <span className="text-sm font-normal text-slate-400">Sessions</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Stored route breadcrumbs</p>
        </div>
      </div>

      {/* Main Content Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2-Cols: Active Tracking Sessions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white font-outfit flex items-center gap-2">
                <Radio className="w-5 h-5 text-emerald-400" />
                Active Tracking Sessions
              </h2>
              <button
                onClick={() => navigate('/map')}
                className="text-xs font-semibold text-brand-400 hover:underline flex items-center gap-1"
              >
                <span>Full Map</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeSessions.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-3">
                <Radio className="w-12 h-12 mx-auto opacity-30 stroke-1" />
                <p className="text-sm font-medium">No active tracking sessions at this moment.</p>
                <p className="text-xs text-slate-600">Click "Share My Location" above or connect with friends to view live tracks.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeSessions.map((sess) => {
                  const isMine = sess.sharer_id === user?.id;
                  return (
                    <div
                      key={sess.id}
                      onClick={() => navigate(`/map?session_id=${sess.id}`)}
                      className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-brand-500/50 transition-all cursor-pointer flex items-center justify-between gap-4 group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center font-bold">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-white group-hover:text-brand-400 transition-colors">
                              {isMine ? 'You (My Location)' : sess.sharer_name}
                            </h4>
                            <StatusBadge status={sess.status} />
                          </div>
                          <span className="text-xs text-slate-400">
                            Started: {new Date(sess.start_time).toLocaleTimeString()} • Expires: {new Date(sess.end_time).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-brand-400 transition-colors" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1-Col: Quick Connections & Approvals */}
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white font-outfit flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Trusted Connections
              </h2>
              <button
                onClick={() => navigate('/connections')}
                className="text-xs font-semibold text-brand-400 hover:underline"
              >
                Manage
              </button>
            </div>

            {pendingApprovals.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
                <span>{pendingApprovals.length} pending approval request(s)</span>
                <button
                  onClick={() => navigate('/connections')}
                  className="font-bold underline text-amber-400"
                >
                  Review
                </button>
              </div>
            )}

            {acceptedConnections.length === 0 ? (
              <div className="py-8 text-center text-slate-500 space-y-2">
                <UserCheck className="w-10 h-10 mx-auto opacity-30" />
                <p className="text-xs">No connected friends yet.</p>
                <button
                  onClick={() => navigate('/connections')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-medium text-brand-400 hover:bg-slate-700 transition-colors"
                >
                  + Add Connection
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {acceptedConnections.slice(0, 5).map((conn) => {
                  const friendName = conn.sharer_id === user?.id ? conn.viewer_name : conn.sharer_name;
                  return (
                    <div key={conn.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                          {friendName.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-slate-200">{friendName}</span>
                      </div>
                      <span className="text-[10px] uppercase font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Approved
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Start Sharing Modal */}
      <StartSharingModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onSuccess={() => navigate('/map')}
      />

    </div>
  );
};

export default Dashboard;
