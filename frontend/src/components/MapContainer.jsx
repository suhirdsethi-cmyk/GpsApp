import React, { useState, useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapContainer as LeafletMap, TileLayer, Marker as LeafletMarker, Popup as LeafletPopup, Circle as LeafletCircle, Polyline as LeafletPolyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Compass, AlertTriangle, StopCircle, Shield, Layers, Key, Check, Globe, Navigation, Car, Footprints, Bike, LocateFixed, Maximize2 } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { calculateDistanceKm, formatDistance, calculateETA } from '../utils/distance';

// Fix default Leaflet icon paths for fallback
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Blue Leaflet Icon for Viewer
const viewerLeafletIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Helper component to re-center Leaflet fallback map
const LeafletMapController = ({ center, followUser }) => {
  const map = useMap();
  useEffect(() => {
    if (center && followUser && center[0] && center[1]) {
      map.panTo(center, { animate: true });
    }
  }, [center, followUser, map]);
  return null;
};

// Generate GeoJSON Circle Polygon for accuracy radius in MapLibre
const createCirclePolygon = (centerLng, centerLat, radiusInMeters, points = 64) => {
  const km = (radiusInMeters || 10) / 1000;
  const ret = [];
  const distanceX = km / (111.320 * Math.cos(centerLat * Math.PI / 180));
  const distanceY = km / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    ret.push([centerLng + x, centerLat + y]);
  }
  ret.push(ret[0]);
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [ret]
    }
  };
};

const MapContainer = ({
  location,
  historyLocations = [],
  session,
  isSharer = false,
  onStopSharing,
  gpsError,
  viewerLocation,
  isViewerGpsActive,
  onToggleViewerGps,
  viewerGpsError
}) => {
  const [followUser, setFollowUser] = useState(true);
  const [remainingTime, setRemainingTime] = useState('');
  const [mapEngine, setMapEngine] = useState('maplibre'); // 'maplibre' | 'leaflet'
  const [customApiKey, setCustomApiKey] = useState(localStorage.getItem('maptiler_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [tempKeyInput, setTempKeyInput] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('openfree-dark'); // 'openfree-dark' | 'openfree-bright' | 'dataviz-dark' | 'streets-v2' | 'hybrid'
  const [travelMode, setTravelMode] = useState('driving'); // 'driving' | 'walking' | 'cycling'
  const [unit, setUnit] = useState('km'); // 'km' | 'miles'

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const viewerMarkerRef = useRef(null);
  const popupRef = useRef(null);

  const maptilerKey = customApiKey || import.meta.env.VITE_MAPTILER_API_KEY || '';

  const lat = location?.latitude || 30.9000;
  const lng = location?.longitude || 75.8573;
  const accuracy = location?.accuracy || 10;
  const speed = location?.speed ? (location.speed * 3.6).toFixed(1) : 0; // m/s to km/h

  // Distance & Travel Time Calculations
  const distanceKm = (viewerLocation?.latitude && viewerLocation?.longitude && location?.latitude && location?.longitude)
    ? calculateDistanceKm(viewerLocation.latitude, viewerLocation.longitude, location.latitude, location.longitude)
    : null;

  const formattedDistance = distanceKm !== null ? formatDistance(distanceKm, unit) : null;
  const etaText = distanceKm !== null ? calculateETA(distanceKm, travelMode) : null;

  // Resolve MapLibre style JSON URL
  const getStyleUrl = (styleName) => {
    switch (styleName) {
      case 'openfree-bright':
        return 'https://tiles.openfreemap.org/styles/bright';
      case 'dataviz-dark':
        return maptilerKey ? `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${maptilerKey}` : 'https://tiles.openfreemap.org/styles/dark';
      case 'streets-v2':
        return maptilerKey ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${maptilerKey}` : 'https://tiles.openfreemap.org/styles/bright';
      case 'hybrid':
        return maptilerKey ? `https://api.maptiler.com/maps/hybrid/style.json?key=${maptilerKey}` : 'https://tiles.openfreemap.org/styles/dark';
      case 'openfree-dark':
      default:
        return 'https://tiles.openfreemap.org/styles/dark';
    }
  };

  // Format countdown remaining time
  useEffect(() => {
    if (!session || session.status !== 'ACTIVE' || !session.remaining_seconds) {
      setRemainingTime('');
      return;
    }

    let secondsLeft = session.remaining_seconds;
    const interval = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        setRemainingTime('Expired');
        clearInterval(interval);
        return;
      }

      const hrs = Math.floor(secondsLeft / 3600);
      const mins = Math.floor((secondsLeft % 3600) / 60);
      const secs = Math.floor(secondsLeft % 60);

      if (hrs > 0) {
        setRemainingTime(`${hrs}h ${mins}m ${secs}s`);
      } else {
        setRemainingTime(`${mins}m ${secs}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  // Save custom MapTiler API Key
  const handleSaveApiKey = (e) => {
    e.preventDefault();
    const cleanKey = tempKeyInput.trim();
    if (cleanKey) {
      localStorage.setItem('maptiler_api_key', cleanKey);
      setCustomApiKey(cleanKey);
      setSelectedStyle('dataviz-dark');
    } else {
      localStorage.removeItem('maptiler_api_key');
      setCustomApiKey('');
      setSelectedStyle('openfree-dark');
    }
    setShowKeyInput(false);
  };

  // Fit both positions on map
  const fitBothLocations = () => {
    const map = mapRef.current;
    if (!map || !viewerLocation || !location) return;
    const minLng = Math.min(viewerLocation.longitude, location.longitude);
    const maxLng = Math.max(viewerLocation.longitude, location.longitude);
    const minLat = Math.min(viewerLocation.latitude, location.latitude);
    const maxLat = Math.max(viewerLocation.latitude, location.latitude);

    map.fitBounds(
      [[minLng, minLat], [maxLng, maxLat]],
      { padding: 100, duration: 1000 }
    );
  };

  // Initialize MapLibre GL JS Map
  useEffect(() => {
    if (mapEngine !== 'maplibre' || !mapContainerRef.current) return;

    const styleUrl = getStyleUrl(selectedStyle);

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center: [lng, lat],
      zoom: 15,
      pitch: 0,
      attributionControl: true
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-left');

    map.on('load', () => {
      // 1. Add Trail Polyline Source & Layer
      const trailCoords = historyLocations.map(l => [l.longitude, l.latitude]);
      if (location && (trailCoords.length === 0 || trailCoords[trailCoords.length - 1][0] !== lng)) {
        trailCoords.push([lng, lat]);
      }

      map.addSource('trail-source', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: trailCoords.length > 0 ? trailCoords : [[lng, lat]]
          }
        }
      });

      map.addLayer({
        id: 'trail-layer',
        type: 'line',
        source: 'trail-source',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#22c55e',
          'line-width': 4,
          'line-dasharray': [2, 2],
          'line-opacity': 0.95
        }
      });

      // 2. Add Accuracy Circle Source & Layers
      map.addSource('accuracy-source', {
        type: 'geojson',
        data: createCirclePolygon(lng, lat, accuracy)
      });

      map.addLayer({
        id: 'accuracy-fill',
        type: 'fill',
        source: 'accuracy-source',
        paint: { 'fill-color': '#22c55e', 'fill-opacity': 0.15 }
      });

      map.addLayer({
        id: 'accuracy-stroke',
        type: 'line',
        source: 'accuracy-source',
        paint: { 'line-color': '#22c55e', 'line-width': 1.5, 'line-opacity': 0.6 }
      });

      // 3. Add Connecting Line between Viewer and Sharer
      map.addSource('connector-source', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: viewerLocation
              ? [[viewerLocation.longitude, viewerLocation.latitude], [lng, lat]]
              : []
          }
        }
      });

      map.addLayer({
        id: 'connector-layer',
        type: 'line',
        source: 'connector-source',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 3.5,
          'line-dasharray': [3, 3],
          'line-opacity': 0.9
        }
      });

      // 4. Create Sharer Marker
      const markerEl = document.createElement('div');
      markerEl.className = 'custom-maplibre-marker';
      markerEl.innerHTML = `
        <div class="relative flex items-center justify-center cursor-pointer">
          <span class="animate-ping absolute inline-flex h-9 w-9 rounded-full bg-emerald-400 opacity-75"></span>
          <div class="relative w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 border-2 border-white shadow-2xl flex items-center justify-center text-slate-950">
            <svg class="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
          </div>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div class="p-1 font-sans text-slate-900">
          <strong class="block text-xs font-bold text-slate-900">${session?.sharer_name || "Sharer"}</strong>
          <span class="text-[11px] text-slate-600 block">Accuracy: ±${Math.round(accuracy)}m</span>
          <span class="text-[11px] text-slate-600 block">Speed: ${speed} km/h</span>
        </div>
      `);
      popupRef.current = popup;

      const marker = new maplibregl.Marker({ element: markerEl })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      markerRef.current = marker;

      // 5. Create Viewer Marker if present
      if (viewerLocation) {
        const vEl = document.createElement('div');
        vEl.innerHTML = `
          <div class="relative flex items-center justify-center cursor-pointer">
            <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-blue-400 opacity-75"></span>
            <div class="relative w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 border-2 border-white shadow-2xl flex items-center justify-center text-white">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>
            </div>
          </div>
        `;
        const vMarker = new maplibregl.Marker({ element: vEl })
          .setLngLat([viewerLocation.longitude, viewerLocation.latitude])
          .addTo(map);
        viewerMarkerRef.current = vMarker;
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapEngine, selectedStyle]);

  // Update position, accuracy circle, trail line, connector, viewer position, and smooth pan
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapEngine !== 'maplibre' || !map.isStyleLoaded()) return;

    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
    }

    if (popupRef.current) {
      popupRef.current.setHTML(`
        <div class="p-1 font-sans text-slate-900">
          <strong class="block text-xs font-bold text-slate-900">${session?.sharer_name || "Sharer"}</strong>
          <span class="text-[11px] text-slate-600 block">Accuracy: ±${Math.round(accuracy)}m</span>
          <span class="text-[11px] text-slate-600 block">Speed: ${speed} km/h</span>
        </div>
      `);
    }

    const accuracySource = map.getSource('accuracy-source');
    if (accuracySource) {
      accuracySource.setData(createCirclePolygon(lng, lat, accuracy));
    }

    const trailSource = map.getSource('trail-source');
    if (trailSource) {
      const trailCoords = historyLocations.map(l => [l.longitude, l.latitude]);
      if (location && (trailCoords.length === 0 || trailCoords[trailCoords.length - 1][0] !== lng)) {
        trailCoords.push([lng, lat]);
      }
      trailSource.setData({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: trailCoords.length > 0 ? trailCoords : [[lng, lat]]
        }
      });
    }

    // Update Viewer Marker
    if (viewerLocation) {
      if (viewerMarkerRef.current) {
        viewerMarkerRef.current.setLngLat([viewerLocation.longitude, viewerLocation.latitude]);
      } else {
        const vEl = document.createElement('div');
        vEl.innerHTML = `
          <div class="relative flex items-center justify-center cursor-pointer">
            <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-blue-400 opacity-75"></span>
            <div class="relative w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 border-2 border-white shadow-2xl flex items-center justify-center text-white">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>
            </div>
          </div>
        `;
        viewerMarkerRef.current = new maplibregl.Marker({ element: vEl })
          .setLngLat([viewerLocation.longitude, viewerLocation.latitude])
          .addTo(map);
      }
    } else if (viewerMarkerRef.current) {
      viewerMarkerRef.current.remove();
      viewerMarkerRef.current = null;
    }

    // Update Connecting Line
    const connectorSource = map.getSource('connector-source');
    if (connectorSource) {
      connectorSource.setData({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: viewerLocation
            ? [[viewerLocation.longitude, viewerLocation.latitude], [lng, lat]]
            : []
        }
      });
    }

    if (followUser && !viewerLocation) {
      map.easeTo({ center: [lng, lat], duration: 800 });
    }
  }, [lat, lng, accuracy, historyLocations, followUser, mapEngine, location, session, speed, viewerLocation]);

  const leafletPolylineCoords = historyLocations.map(l => [l.latitude, l.longitude]);
  if (location && (leafletPolylineCoords.length === 0 || leafletPolylineCoords[leafletPolylineCoords.length - 1][0] !== lat)) {
    leafletPolylineCoords.push([lat, lng]);
  }

  const leafletConnectorCoords = viewerLocation && location
    ? [[viewerLocation.latitude, viewerLocation.longitude], [lat, lng]]
    : [];

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-slate-950 overflow-hidden">

      {/* MapLibre GL Vector Map Container */}
      {mapEngine === 'maplibre' ? (
        <div ref={mapContainerRef} className="w-full h-full z-0" />
      ) : (
        /* Fallback Leaflet Container */
        <LeafletMap
          center={[lat, lng]}
          zoom={16}
          scrollWheelZoom={true}
          className="w-full h-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          <LeafletMapController center={[lat, lng]} followUser={followUser} />

          {/* Trail Polyline */}
          {leafletPolylineCoords.length > 1 && (
            <LeafletPolyline
              positions={leafletPolylineCoords}
              color="#22c55e"
              weight={4}
              opacity={0.8}
              dashArray="8, 8"
            />
          )}

          {/* Connecting Line between Viewer and Sharer */}
          {leafletConnectorCoords.length === 2 && (
            <LeafletPolyline
              positions={leafletConnectorCoords}
              color="#3b82f6"
              weight={3}
              opacity={0.9}
              dashArray="6, 6"
            />
          )}

          {/* Sharer Accuracy Circle */}
          {location && (
            <LeafletCircle
              center={[lat, lng]}
              radius={accuracy}
              pathOptions={{ fillColor: '#22c55e', fillOpacity: 0.15, color: '#22c55e', weight: 1 }}
            />
          )}

          {/* Sharer Marker */}
          {location && (
            <LeafletMarker position={[lat, lng]}>
              <LeafletPopup>
                <div className="p-1 text-slate-900 font-sans">
                  <strong class="block text-sm font-bold">{session?.sharer_name || "Sharer"}</strong>
                  <span className="text-xs text-slate-600 block">Accuracy: ±{Math.round(accuracy)}m</span>
                  <span className="text-xs text-slate-600 block">Speed: {speed} km/h</span>
                </div>
              </LeafletPopup>
            </LeafletMarker>
          )}

          {/* Viewer Marker */}
          {viewerLocation && (
            <LeafletMarker position={[viewerLocation.latitude, viewerLocation.longitude]} icon={viewerLeafletIcon}>
              <LeafletPopup>
                <div className="p-1 text-slate-900 font-sans">
                  <strong className="block text-sm font-bold text-blue-600">Your Location (You)</strong>
                  <span className="text-xs text-slate-600 block">Accuracy: ±{Math.round(viewerLocation.accuracy || 10)}m</span>
                </div>
              </LeafletPopup>
            </LeafletMarker>
          )}
        </LeafletMap>
      )}

      {/* Warning Overlay if GPS Error */}
      {(gpsError || accuracy > 300 || viewerGpsError) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 max-w-md w-[90%] bg-amber-950/90 border border-amber-500/40 text-amber-200 px-4 py-2.5 rounded-xl shadow-xl backdrop-blur-md flex items-center gap-3 text-xs font-medium">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            {viewerGpsError ? (
              <span>Viewer GPS: {viewerGpsError}</span>
            ) : gpsError ? (
              <span>{gpsError}</span>
            ) : (
              <span>GPS accuracy is low (±{Math.round(accuracy)}m). Move outdoors for improved signal fix.</span>
            )}
          </div>
        </div>
      )}

      {/* Top Right Floating Controls (Map Style, Provider, Follow User, API Key) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 backdrop-blur-md shadow-2xl">
          <button
            onClick={() => setMapEngine(mapEngine === 'maplibre' ? 'leaflet' : 'maplibre')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              mapEngine === 'maplibre'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{mapEngine === 'maplibre' ? 'MapLibre Vector' : 'Leaflet OSM'}</span>
          </button>

          {mapEngine === 'maplibre' && (
            <select
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value)}
              className="bg-slate-800 text-slate-200 text-xs font-medium rounded-xl px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:border-brand-500"
            >
              <option value="openfree-dark">OpenFreeMap Dark (Free)</option>
              <option value="openfree-bright">OpenFreeMap Bright (Free)</option>
              {maptilerKey && <option value="dataviz-dark">MapTiler Dark</option>}
              {maptilerKey && <option value="streets-v2">MapTiler Streets</option>}
              {maptilerKey && <option value="hybrid">MapTiler Satellite</option>}
            </select>
          )}

          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            title="Configure Optional MapTiler API Key"
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </div>

        <button
          onClick={() => setFollowUser(!followUser)}
          className={`p-3 rounded-xl shadow-xl backdrop-blur-md border font-semibold text-xs flex items-center gap-2 transition-all ${
            followUser
              ? 'bg-brand-500 text-slate-950 border-brand-400 shadow-brand-500/20'
              : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:bg-slate-800'
          }`}
        >
          <Compass className={`w-4 h-4 ${followUser ? 'animate-spin-slow' : ''}`} />
          <span className="hidden sm:inline">{followUser ? 'Following Sharer' : 'Follow Sharer'}</span>
        </button>

        {/* Fit Both Locations Button */}
        {viewerLocation && location && (
          <button
            onClick={fitBothLocations}
            className="px-3 py-2.5 rounded-xl bg-blue-600/90 text-white hover:bg-blue-500 border border-blue-400/30 shadow-xl backdrop-blur-md font-semibold text-xs flex items-center gap-1.5 transition-all"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fit Both on Map</span>
          </button>
        )}
      </div>

      {/* MapTiler API Key Modal Overlay */}
      {showKeyInput && (
        <div className="absolute top-16 right-4 z-30 max-w-sm w-[90vw] glass-panel rounded-2xl p-4 border border-slate-700 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" /> MapTiler API Key (Optional)
            </h4>
            <button onClick={() => setShowKeyInput(false)} className="text-slate-400 text-xs hover:text-white">✕</button>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            By default, <strong>OpenFreeMap Dark</strong> provides 100% free unlimited vector maps!
          </p>
          <form onSubmit={handleSaveApiKey} className="space-y-2">
            <input
              type="text"
              placeholder="e.g. key_xyz123..."
              value={tempKeyInput || customApiKey}
              onChange={(e) => setTempKeyInput(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-brand-500"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-brand-500 hover:bg-brand-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> Save Key
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Real-Time Distance & Travel Time Card (for Viewers) */}
      {!isSharer && (
        <div className="absolute top-4 left-4 z-20 max-w-sm w-[88vw] sm:w-80 glass-panel rounded-2xl p-4 border border-blue-500/30 shadow-2xl space-y-3 backdrop-blur-xl bg-slate-950/85">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 animate-pulse" /> Live Distance & ETA
            </span>
            <button
              onClick={onToggleViewerGps}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 transition-all ${
                isViewerGpsActive
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <LocateFixed className="w-3 h-3" />
              <span>{isViewerGpsActive ? 'My GPS: ON' : 'Locate Me'}</span>
            </button>
          </div>

          {isViewerGpsActive && distanceKm !== null ? (
            <>
              {/* Distance Display */}
              <div className="flex items-baseline justify-between bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Distance to Sharer</span>
                  <span className="text-2xl font-extrabold text-white font-mono">{formattedDistance}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Travel Mode</span>
                  <button
                    onClick={() => setUnit(unit === 'km' ? 'miles' : 'km')}
                    className="text-xs font-semibold text-blue-400 hover:underline"
                  >
                    Switch to {unit === 'km' ? 'Miles' : 'Km'}
                  </button>
                </div>
              </div>

              {/* Travel Mode Selector Tabs */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800">
                <button
                  onClick={() => setTravelMode('driving')}
                  className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                    travelMode === 'driving'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Car className="w-3.5 h-3.5" /> Drive
                </button>
                <button
                  onClick={() => setTravelMode('walking')}
                  className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                    travelMode === 'walking'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Footprints className="w-3.5 h-3.5" /> Walk
                </button>
                <button
                  onClick={() => setTravelMode('cycling')}
                  className={`py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                    travelMode === 'cycling'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" /> Bike
                </button>
              </div>

              {/* ETA Display */}
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-slate-400 font-medium">Estimated Arrival Time:</span>
                <span className="font-bold text-emerald-400 font-mono text-sm">{etaText}</span>
              </div>
            </>
          ) : (
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-center space-y-1.5">
              <p className="text-xs text-slate-300">
                Turn on <strong>My GPS</strong> to see real-time distance and driving/walking time to {session?.sharer_name || "Sharer"}.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bottom Live Tracking Status Card */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 max-w-lg w-[92%] glass-panel rounded-2xl p-5 border border-white/10 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-brand-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-tight">
                {session?.sharer_name ? `${session.sharer_name}'s Location` : 'Live Tracking'}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                {location?.timestamp ? `Updated ${new Date(location.timestamp).toLocaleTimeString()}` : 'Waiting for GPS fix...'}
              </p>
            </div>
          </div>
          <StatusBadge status={session?.status || 'ACTIVE'} />
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Remaining</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">{remainingTime || 'Until Stop'}</span>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Accuracy</span>
            <span className="text-sm font-bold text-slate-200 font-mono">±{Math.round(accuracy)}m</span>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Speed</span>
            <span className="text-sm font-bold text-slate-200 font-mono">{speed} km/h</span>
          </div>
        </div>

        {/* STOP SHARING Action Button */}
        {isSharer && session?.status === 'ACTIVE' && (
          <button
            onClick={onStopSharing}
            className="w-full py-3.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold border border-rose-500/30 flex items-center justify-center gap-2 shadow-lg shadow-rose-500/10 transition-all active:scale-[0.99]"
          >
            <StopCircle className="w-5 h-5 fill-rose-500/20" />
            <span>STOP LOCATION SHARING</span>
          </button>
        )}
      </div>

    </div>
  );
};

export default MapContainer;
