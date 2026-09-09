/**
 * Distance & Estimated Travel Time Calculation Utilities
 */

/**
 * Calculates the great-circle distance between two points in kilometers using the Haversine formula.
 */
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Formats distance in km or meters / miles for display.
 */
export const formatDistance = (distanceKm, unit = 'km') => {
  if (distanceKm == null || isNaN(distanceKm)) return 'N/A';

  if (unit === 'miles') {
    const miles = distanceKm * 0.621371;
    if (miles < 0.1) {
      return `${Math.round(miles * 5280)} ft`;
    }
    return `${miles.toFixed(2)} mi`;
  }

  // Metric
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(2)} km`;
};

/**
 * Calculates estimated travel time (ETA) for driving, cycling, or walking.
 * Speeds:
 * - Driving: ~40 km/h average city speed
 * - Cycling: ~15 km/h average speed
 * - Walking: ~4.8 km/h average speed
 */
export const calculateETA = (distanceKm, mode = 'driving') => {
  if (distanceKm == null || distanceKm <= 0) return '0 min';

  const speeds = {
    driving: 40,
    cycling: 15,
    walking: 4.8,
  };

  const speedKmH = speeds[mode] || 40;
  const totalMinutes = Math.round((distanceKm / speedKmH) * 60);

  if (totalMinutes < 1) return '< 1 min';
  if (totalMinutes < 60) return `~${totalMinutes} min${totalMinutes > 1 ? 's' : ''}`;

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `~${hours}h ${mins > 0 ? `${mins}m` : ''}`;
};
