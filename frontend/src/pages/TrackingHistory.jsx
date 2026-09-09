import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Trash2, Calendar, ArrowRight, X, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTracking } from '../context/TrackingContext';
import StatusBadge from '../components/StatusBadge';
import MapContainer from '../components/MapContainer';
import api from '../services/api';

const TrackingHistory = () => {
  const { user } = useAuth();
  const { triggerToast } = useTracking();

  const [historySessions, setHistorySessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionLocations, setSessionLocations] = useState([]);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tracking/history');
      setHistorySessions(res.data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.error("Failed to load tracking history:", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // View Route on Map
  const handleViewRoute = async (sess) => {
    try {
      setSelectedSession(sess);
      const res = await api.get(`/locations/history/${sess.id}`);
      setSessionLocations(res.data);
      setIsMapModalOpen(true);
    } catch (err) {
      triggerToast("Failed to load location history for this session.", "error");
    }
  };

  // Delete single session history
  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this tracking session history?")) {
      return;
    }

    try {
      await api.delete(`/tracking/history/${sessionId}`);
      triggerToast("Tracking history session deleted.", "info");
      fetchHistory();
    } catch (err) {
      triggerToast("Failed to delete session history.", "error");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24 md:pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-white flex items-center gap-3">
            <Clock className="w-8 h-8 text-purple-400" />
            Tracking History
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            View past location sharing sessions, inspect routes, or delete history for privacy.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 space-y-2">
          <Clock className="w-8 h-8 mx-auto animate-spin text-brand-400" />
          <p className="text-sm">Loading session history...</p>
        </div>
      ) : historySessions.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center text-slate-500 space-y-3 border border-white/10">
          <Calendar className="w-12 h-12 mx-auto opacity-30 stroke-1" />
          <h3 className="text-base font-bold text-white">No Tracking History Found</h3>
          <p className="text-xs text-slate-400">Past location sharing sessions will appear here once recorded.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {historySessions.map((sess) => {
            const isMine = sess.sharer_id === user?.id;
            const startDate = new Date(sess.start_time);
            const endDate = new Date(sess.end_time);
            const durationMins = Math.round((endDate - startDate) / (1000 * 60));

            return (
              <div
                key={sess.id}
                onClick={() => handleViewRoute(sess)}
                className="glass-card rounded-2xl p-5 border border-white/10 hover:border-brand-500/50 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold shrink-0">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-bold text-white group-hover:text-brand-400 transition-colors">
                        {isMine ? 'My Location Session' : `${sess.sharer_name}'s Location`}
                      </h3>
                      <StatusBadge status={sess.status} />
                    </div>
                    <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-3 font-mono">
                      <span>📅 {startDate.toLocaleDateString()}</span>
                      <span>⏰ {startDate.toLocaleTimeString()} – {endDate.toLocaleTimeString()}</span>
                      <span>⏱️ {durationMins} mins</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <button
                    onClick={() => handleViewRoute(sess)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-brand-400 font-semibold text-xs border border-slate-700 hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                  >
                    <span>View Route</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {isMine && (
                    <button
                      onClick={(e) => handleDeleteSession(sess.id, e)}
                      title="Delete History"
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Historical Route Map Modal */}
      {isMapModalOpen && selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full h-[85vh] overflow-hidden flex flex-col relative shadow-2xl">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 z-30">
              <div>
                <h3 className="text-lg font-bold text-white font-outfit">
                  Historical Route Path ({sessionLocations.length} GPS Points)
                </h3>
                <p className="text-xs text-slate-400 font-mono">Session ID: {selectedSession.id}</p>
              </div>
              <button
                onClick={() => setIsMapModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Map Area */}
            <div className="flex-1 relative">
              <MapContainer
                location={sessionLocations.length > 0 ? sessionLocations[sessionLocations.length - 1] : null}
                historyLocations={sessionLocations}
                session={selectedSession}
                isSharer={false}
              />
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default TrackingHistory;
