import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { getCurrentDevicePosition, watchDevicePosition } from '../services/geolocation';

const TrackingContext = createContext();

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

export const TrackingProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [myActiveSession, setMyActiveSession] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const trackingIntervalRef = useRef(null);
  const socketRef = useRef(null);

  const triggerToast = (msg, type = 'info') => {
    setToastMessage({ id: Date.now(), text: msg, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Fetch active sessions from backend
  const fetchActiveSessions = useCallback(async () => {
    if (!token) return;
    try {
      // 1. My active session as sharer
      const myRes = await api.get('/tracking/sharer/active');
      setMyActiveSession(myRes.data);

      // 2. All active sessions available (mine + friends)
      const allRes = await api.get('/tracking/active');
      setActiveSessions(allRes.data);
    } catch (err) {
      console.error("Failed to fetch active tracking sessions:", err);
    }
  }, [token]);

  useEffect(() => {
    fetchActiveSessions();
    const interval = setInterval(fetchActiveSessions, 15000);
    return () => clearInterval(interval);
  }, [fetchActiveSessions]);

  // Send single GPS update to server
  const sendLocationUpdate = useCallback(async (session_id, loc) => {
    try {
      await api.post('/locations', {
        session_id,
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracy: loc.accuracy,
        speed: loc.speed,
        heading: loc.heading,
        timestamp: loc.timestamp
      });
      setCurrentLocation(loc);
      setGpsError(null);
    } catch (err) {
      console.error("Error sending location update:", err);
      if (err.response && err.response.data && err.response.data.detail) {
        if (err.response.data.detail.includes("expired") || err.response.data.detail.includes("inactive")) {
          setMyActiveSession(null);
          triggerToast("Location sharing session has ended.", "warning");
        }
      }
    }
  }, []);

  // GPS Tracking Loop when myActiveSession is ACTIVE
  useEffect(() => {
    if (!myActiveSession || myActiveSession.status !== 'ACTIVE') {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
        trackingIntervalRef.current = null;
      }
      return;
    }

    setIsGpsLoading(true);

    const performLocationFetch = async () => {
      try {
        const pos = await getCurrentDevicePosition();
        setCurrentLocation(pos);
        setGpsError(null);
        setIsGpsLoading(false);
        await sendLocationUpdate(myActiveSession.id, pos);
      } catch (err) {
        setIsGpsLoading(false);
        setGpsError(err.message);
      }
    };

    // Immediate initial fetch
    performLocationFetch();

    // Loop every 10 seconds (configurable)
    trackingIntervalRef.current = setInterval(performLocationFetch, 10000);

    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
        trackingIntervalRef.current = null;
      }
    };
  }, [myActiveSession, sendLocationUpdate]);

  // Start Location Sharing
  const startSharing = async (durationType, customHours = 0, customMinutes = 0, startTime = null, endTime = null) => {
    try {
      const res = await api.post('/tracking/start', {
        duration_type: durationType,
        custom_hours: customHours,
        custom_minutes: customMinutes,
        start_time: startTime,
        end_time: endTime
      });
      setMyActiveSession(res.data);
      triggerToast("🟢 Location sharing started successfully!", "success");
      await fetchActiveSessions();
      return res.data;
    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Failed to start location sharing.";
      triggerToast(errorMsg, "error");
      throw err;
    }
  };

  // Stop Location Sharing
  const stopSharing = async (sessionId = null) => {
    try {
      const idToStop = sessionId || myActiveSession?.id;
      const res = await api.post(`/tracking/stop?session_id=${idToStop || ''}`);
      setMyActiveSession(null);
      triggerToast("⚪ Location sharing stopped.", "info");
      await fetchActiveSessions();
      return res.data;
    } catch (err) {
      console.error("Failed to stop tracking session:", err);
      setMyActiveSession(null);
    }
  };

  return (
    <TrackingContext.Provider value={{
      myActiveSession,
      activeSessions,
      currentLocation,
      gpsError,
      isGpsLoading,
      toastMessage,
      triggerToast,
      startSharing,
      stopSharing,
      fetchActiveSessions
    }}>
      {children}
    </TrackingContext.Provider>
  );
};

export const useTracking = () => useContext(TrackingContext);
