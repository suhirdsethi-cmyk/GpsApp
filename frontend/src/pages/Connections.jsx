import React, { useState, useEffect } from 'react';
import { Users, Key, Copy, Check, Plus, ShieldCheck, UserCheck, Trash2, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTracking } from '../context/TrackingContext';
import api from '../services/api';

const Connections = () => {
  const { user } = useAuth();
  const { triggerToast } = useTracking();

  const [connections, setConnections] = useState([]);
  const [activeInvite, setActiveInvite] = useState(null);
  const [redeemCode, setRedeemCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchConnections = async () => {
    try {
      const res = await api.get('/connections');
      setConnections(res.data);
    } catch (err) {
      console.error("Failed to load connections:", err);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  // Generate Invite Code
  const handleCreateInvite = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/connections/invite', { expires_in_minutes: 30 });
      setActiveInvite(res.data);
      setLoading(false);
      triggerToast(`Invitation code created: ${res.data.code}`, "success");
    } catch (err) {
      setLoading(false);
      setError("Failed to create invitation code.");
    }
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    if (!activeInvite) return;
    navigator.clipboard.writeText(activeInvite.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Redeem Invite Code
  const handleRedeemCode = async (e) => {
    e.preventDefault();
    if (!redeemCode.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/connections/accept', { code: redeemCode.trim() });
      setLoading(false);
      setRedeemCode('');
      triggerToast("Connection request sent! Waiting for approval.", "success");
      fetchConnections();
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.detail || "Invalid or expired invitation code.");
    }
  };

  // Approve Connection Request
  const handleApprove = async (id) => {
    try {
      await api.post(`/connections/approve/${id}`);
      triggerToast("Connection approved!", "success");
      fetchConnections();
    } catch (err) {
      triggerToast("Failed to approve connection.", "error");
    }
  };

  // Reject / Delete Connection
  const handleDelete = async (id) => {
    try {
      await api.delete(`/connections/${id}`);
      triggerToast("Connection removed.", "info");
      fetchConnections();
    } catch (err) {
      triggerToast("Failed to remove connection.", "error");
    }
  };

  const pendingIncoming = connections.filter(c => c.status === 'PENDING' && c.sharer_id === user?.id);
  const pendingOutgoing = connections.filter(c => c.status === 'PENDING' && c.viewer_id === user?.id);
  const acceptedList = connections.filter(c => c.status === 'ACCEPTED');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24 md:pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-brand-400" />
            Consensual Connections
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Connect with friends & family. Location viewing requires explicit approval.
          </p>
        </div>

        <button
          onClick={handleCreateInvite}
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-brand-500/20 hover:brightness-110 transition-all flex items-center justify-center gap-2"
        >
          <Key className="w-4 h-4" />
          <span>Generate Invite Code</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Generated Code Display Card */}
      {activeInvite && (
        <div className="p-6 rounded-2xl bg-emerald-950/60 border border-emerald-500/30 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-xs uppercase font-semibold text-emerald-400">Share This Code With Your Friend</span>
            <div className="text-3xl font-extrabold text-white font-mono tracking-widest bg-slate-900 px-4 py-2 rounded-xl border border-emerald-500/40 inline-block">
              {activeInvite.code}
            </div>
            <p className="text-xs text-slate-400">Expires at: {new Date(activeInvite.expires_at).toLocaleTimeString()}</p>
          </div>

          <button
            onClick={handleCopyCode}
            className="px-6 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm flex items-center gap-2 hover:bg-emerald-400 transition-all"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>
        </div>
      )}

      {/* Connection Invite Redemption Form */}
      <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
        <h2 className="text-lg font-bold text-white font-outfit flex items-center gap-2">
          <Key className="w-5 h-5 text-brand-400" />
          Enter Friend's Invitation Code
        </h2>
        <form onSubmit={handleRedeemCode} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="e.g. 7K4P9Q"
            value={redeemCode}
            onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
            maxLength={10}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-mono uppercase tracking-wider focus:outline-none focus:border-brand-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-brand-400 font-bold text-sm border border-slate-700 transition-colors disabled:opacity-50"
          >
            Connect User
          </button>
        </form>
      </div>

      {/* Pending Incoming Approval Requests */}
      {pendingIncoming.length > 0 && (
        <div className="glass-panel rounded-2xl p-6 border border-amber-500/30 bg-amber-950/20 space-y-4">
          <h2 className="text-lg font-bold text-amber-300 font-outfit flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            Pending Connection Requests (Needs Your Approval)
          </h2>
          <div className="space-y-3">
            {pendingIncoming.map((conn) => (
              <div key={conn.id} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-white">{conn.viewer_name}</h4>
                  <span className="text-xs text-slate-400">{conn.viewer_email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(conn.id)}
                    className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleDelete(conn.id)}
                    className="px-4 py-2 rounded-lg bg-rose-500/20 text-rose-300 font-semibold text-xs border border-rose-500/30 hover:bg-rose-500/30 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Trusted Connections List */}
      <div className="glass-panel rounded-3xl p-6 border border-white/10 space-y-4">
        <h2 className="text-lg font-bold text-white font-outfit flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-emerald-400" />
          Active Connections ({acceptedList.length})
        </h2>

        {acceptedList.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <Users className="w-12 h-12 mx-auto opacity-30 stroke-1" />
            <p className="text-sm font-medium">No active connections yet.</p>
            <p className="text-xs text-slate-600">Generate an invitation code or enter your friend's code above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {acceptedList.map((conn) => {
              const friendName = conn.sharer_id === user?.id ? conn.viewer_name : conn.sharer_name;
              const friendEmail = conn.sharer_id === user?.id ? conn.viewer_email : conn.sharer_email;
              const role = conn.sharer_id === user?.id ? "Can view your location during active sessions" : "You can view their location during active sessions";
              
              return (
                <div key={conn.id} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-sm font-bold text-brand-400">
                      {friendName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{friendName}</h4>
                      <p className="text-xs text-slate-400">{friendEmail} • <span className="text-emerald-400">{role}</span></p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(conn.id)}
                    title="Remove connection"
                    className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default Connections;
