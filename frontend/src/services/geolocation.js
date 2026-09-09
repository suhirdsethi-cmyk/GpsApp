/**
 * Device GPS & Geolocation Service Layer
 * Supports native Capacitor Geolocation on iOS/Android and HTML5 Geolocation in Web browsers.
 */
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export const getCurrentDevicePosition = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      // Request native location permissions on Android / iOS
      await Geolocation.requestPermissions();
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        speed: pos.coords.speed || 0,
        heading: pos.coords.heading || 0,
        timestamp: new Date(pos.timestamp).toISOString(),
      };
    } catch (err) {
      console.warn("Capacitor native location failed, falling back to browser API:", err);
    }
  }

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser or device."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = position.coords;
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          speed: coords.speed || 0,
          heading: coords.heading || 0,
          timestamp: new Date(position.timestamp).toISOString(),
        });
      },
      (error) => {
        let message = "Failed to obtain GPS location.";
        if (error.code === error.PERMISSION_DENIED) {
          message = "GPS location permission denied. Please allow location access in settings.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "GPS position unavailable. Waiting for GPS fix...";
        } else if (error.code === error.TIMEOUT) {
          message = "GPS request timed out. Retrying...";
        }
        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};

export const watchDevicePosition = (onSuccess, onError) => {
  if (Capacitor.isNativePlatform()) {
    let watchId = null;
    Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 10000 },
      (position, err) => {
        if (err) {
          onError(new Error(err.message || "Native GPS error"));
          return;
        }
        if (position) {
          onSuccess({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed || 0,
            heading: position.coords.heading || 0,
            timestamp: new Date(position.timestamp).toISOString(),
          });
        }
      }
    ).then(id => { watchId = id; });

    return () => {
      if (watchId !== null) {
        Geolocation.clearWatch({ id: watchId });
      }
    };
  }

  if (!navigator.geolocation) {
    onError(new Error("Geolocation is not supported by your browser or device."));
    return null;
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const coords = position.coords;
      onSuccess({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        speed: coords.speed || 0,
        heading: coords.heading || 0,
        timestamp: new Date(position.timestamp).toISOString(),
      });
    },
    (error) => {
      let message = "GPS update error.";
      if (error.code === error.PERMISSION_DENIED) {
        message = "GPS location permission denied.";
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        message = "Waiting for GPS location...";
      }
      onError(new Error(message));
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
};
