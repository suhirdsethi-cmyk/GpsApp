import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MapPin, Radio, Shield, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTracking } from '../context/TrackingContext';
import MapContainer from '../components/MapContainer';
import api from '../services/api';
import { watchDevicePosition } from '../services/geolocation';

const getWsBaseUrl = () => {
  const envUrl = import.meta.env.VITE_WS_BASE_URL;
  if (envUrl && envUrl.trim() !== '') {
    let cleanUrl = envUrl.trim();
    if (!cleanUrl.startsWith('ws://') && !cleanUrl.startsWith('wss://')) {
      cleanUrl = `wss://${cleanUrl}`;
    }
    return cleanUrl;
  }
  if (typeof window !== 'undefined' && window.location.hostname.includes('onrender.com')) {
    const backendHost = window.location.hostname.replace('frontend', 'backend');
    return `wss://${backendHost}`;
  }
  return 'ws://localhost:8000';
};

const WS_BASE_URL = getWsBaseUrl();

const LiveTracking = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { myActiveSession, currentLocation, stopSharing, activeSessions } = useTracking();

  const querySessionId = searchParams.get('session_id');
  const targetSessionId = querySessionId || myActiveSession?.id;

  const [session, setSession] = useState(null);
  const [liveLocation, setLiveLocation] = useState(null);
  const [historyLocations, setHistoryLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);

  // Viewer Location Tracking state (when viewing someone else's tracker)
  const [viewerLocation, setViewerLocation] = useState(null);
  const [isViewerGpsActive, setIsViewerGpsActive] = useState(false);
  const [viewerGpsError, setViewerGpsError] = useState(null);

  const isSharer = session?.sharer_id === user?.id;

  // Load session info & initial locations
  useEffect(() => {
    if (!targetSessionId) {
      setLoading(false);
      return;
    }

    const fetchSessionAndHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch session detail
        const sessRes = await api.get(`/tracking/session/${targetSessionId}`);
        setSession(sessRes.data);

        // Fetch location history breadcrumbs
        const histRes = await api.get(`/locations/history/${targetSessionId}`);
        setHistoryLocations(histRes.data);

        if (histRes.data.length > 0) {
          setLiveLocation(histRes.data[histRes.data.length - 1]);
        }

        setLoading(false);
      } catch (err) {
        setLoading(false);
        setError(err.response?.data?.detail || "Unable to access tracking session.");
      }
    };

    fetchSessionAndHistory();
  }, [targetSessionId]);

  // Sync latest location from context if I am the sharer
  useEffect(() => {
    if (isSharer && currentLocation) {
      setLiveLocation(currentLocation);
      setHistoryLocations(prev => [...prev, currentLocation]);
    }
  }, [isSharer, currentLocation]);

  // WebSocket Connection for Real-Time Streaming
  useEffect(() => {
    if (!targetSessionId || !token) return;

    const wsUrl = `${WS_BASE_URL}/ws/tracking/${targetSessionId}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'LOCATION_UPDATE') {
          const newLoc = data.location;
          setLiveLocation(newLoc);
          setHistoryLocations(prev => [...prev, newLoc]);
        } else if (data.type === 'SESSION_EXPIRED') {
          setSession(prev => prev ? { ...prev, status: 'EXPIRED', remaining_seconds: 0 } : null);
        } else if (data.type === 'SESSION_STOPPED') {
          setSession(prev => prev ? { ...prev, status: 'STOPPED', remaining_seconds: 0 } : null);
        }
      } catch (e) {
        console.error("Error parsing WebSocket message:", e);
      }
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [targetSessionId, token]);

  // Viewer Device GPS Tracking (when comparing distance to sharer)
  useEffect(() => {
    if (!isViewerGpsActive || isSharer) {
      setViewerLocation(null);
      setViewerGpsError(null);
      return;
    }

    const unwatch = watchDevicePosition(
      (pos) => {
        setViewerLocation(pos);
        setViewerGpsError(null);
      },
      (err) => {
        setViewerGpsError(err.message);
      }
    );

    return () => {
      if (unwatch) unwatch();
    };
  }, [isViewerGpsActive, isSharer]);

  const handleToggleViewerGps = () => {
    setIsViewerGpsActive(prev => !prev);
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-3">
        <Radio className="w-10 h-10 text-brand-400 animate-pulse" />
        <p className="text-sm font-medium text-slate-300">Connecting to live location stream...</p>
      </div>
    );
  }

  if (error || (!targetSessionId && !myActiveSession)) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold font-outfit text-white">No Active Tracking Session Selected</h2>
          <p className="text-sm text-slate-400">
            {error || "Select an active tracking session from your dashboard or start location sharing."}
          </p>
        </div>
        <div className="flex justify-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 rounded-xl bg-slate-800 text-slate-200 font-semibold hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-4rem)]">
      <MapContainer
        location={liveLocation}
        historyLocations={historyLocations}
        session={session}
        isSharer={isSharer}
        onStopSharing={() => stopSharing(session?.id)}
        viewerLocation={viewerLocation}
        isViewerGpsActive={isViewerGpsActive}
        onToggleViewerGps={handleToggleViewerGps}
        viewerGpsError={viewerGpsError}
      />
    </div>
  );
};

export default LiveTracking;
