import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * DeliveryLocationPickerModal
 * Telegram / Grab style interactive map pin picker for delivery orders.
 * Allows the customer to manually drag the map to pinpoint their exact building entrance/gate.
 */
export default function DeliveryLocationPickerModal({
  isOpen,
  onClose,
  onSelectLocation,
  initialCoords = null,
  venueCoords = null,
  initialAddress = ''
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const userGpsMarkerRef = useRef(null);

  // Default coordinates: initialCoords -> venueCoords -> Ho Chi Minh City / Nha Trang / Da Nang center
  const defaultLat = initialCoords?.latitude || venueCoords?.latitude || 10.7769;
  const defaultLng = initialCoords?.longitude || venueCoords?.longitude || 106.7009;

  const [currentCoords, setCurrentCoords] = useState({ latitude: defaultLat, longitude: defaultLng });
  const [resolvedAddress, setResolvedAddress] = useState(initialAddress || '');
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const geocodeTimeoutRef = useRef(null);

  // Reverse geocoding for current center coordinates
  const reverseGeocode = async (lat, lng) => {
    setIsGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
        headers: { 'Accept-Language': 'ru,en;q=0.8' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const addr = data.address;
          const road = addr.road || addr.street || addr.pedestrian || addr.footway || '';
          const house = addr.house_number || '';
          const suburb = addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || '';
          const city = addr.city || addr.town || addr.village || addr.county || '';

          let composed = [road, house, suburb, city].filter(Boolean).join(', ');
          if (!composed && data.display_name) {
            composed = data.display_name.split(',').slice(0, 3).join(', ').trim();
          }
          if (composed) {
            setResolvedAddress(composed);
          }
        }
      }
    } catch (err) {
      console.warn("Picker reverse geocoding note:", err);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Debounced reverse geocode on map pan/zoom
  const scheduleReverseGeocode = (lat, lng) => {
    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current);
    }
    geocodeTimeoutRef.current = setTimeout(() => {
      reverseGeocode(lat, lng);
    }, 450);
  };

  // Initialize Leaflet Map when Modal is opened
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      if (mapRef.current && !mapInstanceRef.current) {
        const map = L.map(mapRef.current, {
          zoomControl: false,
          attributionControl: false
        }).setView([defaultLat, defaultLng], 17);

        // CartoDB Dark Tiles for sleek modern UI matching the dark theme
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 20,
          subdomains: 'abcd'
        }).addTo(map);

        // Track map movement
        map.on('movestart', () => {
          setIsMapMoving(true);
        });

        map.on('move', () => {
          const center = map.getCenter();
          setCurrentCoords({ latitude: center.lat, longitude: center.lng });
        });

        map.on('moveend', () => {
          setIsMapMoving(false);
          const center = map.getCenter();
          setCurrentCoords({ latitude: center.lat, longitude: center.lng });
          scheduleReverseGeocode(center.lat, center.lng);
        });

        mapInstanceRef.current = map;

        // If we don't have initial address, run initial geocode
        if (!initialAddress) {
          reverseGeocode(defaultLat, defaultLng);
        }
      } else if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
        mapInstanceRef.current.setView([defaultLat, defaultLng], 17);
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current);
      }
    };
  }, [isOpen, defaultLat, defaultLng]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Quick "Locate Me" GPS trigger
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Геолокация не поддерживается вашим браузером");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 18, { duration: 1 });

          // Add or update pulsing GPS blue ring
          if (userGpsMarkerRef.current) {
            mapInstanceRef.current.removeLayer(userGpsMarkerRef.current);
          }
          const gpsIcon = L.divIcon({
            className: 'user-gps-pulse-container',
            html: `
              <div style="position: relative; width: 24px; height: 24px;">
                <div style="position: absolute; inset: 0; border-radius: 9999px; background-color: #3b82f6; opacity: 0.3; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                <div style="position: absolute; inset: 4px; border-radius: 9999px; background-color: #3b82f6; border: 2px solid #ffffff; box-shadow: 0 0 10px rgba(59,130,246,0.8);"></div>
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });
          userGpsMarkerRef.current = L.marker([latitude, longitude], { icon: gpsIcon }).addTo(mapInstanceRef.current);
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn("GPS locate error in picker:", err);
        alert("Не удалось получить геопозицию. Проверьте разрешения GPS в браузере.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Search Address / Place
  const handleSearchSubmit = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`, {
        headers: { 'Accept-Language': 'ru,en;q=0.8' }
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data || []);
        setShowSearchResults(true);
      }
    } catch (err) {
      console.warn("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    if (!isNaN(lat) && !isNaN(lon) && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lon], 18, { duration: 1.2 });
      setResolvedAddress(result.display_name.split(',').slice(0, 3).join(', ').trim());
      setShowSearchResults(false);
      setSearchQuery('');
    }
  };

  // Confirm Point
  const handleConfirm = () => {
    const mapsUrl = `https://www.google.com/maps?q=${currentCoords.latitude},${currentCoords.longitude}`;
    onSelectLocation({
      latitude: currentCoords.latitude,
      longitude: currentCoords.longitude,
      address: resolvedAddress || `Координаты: ${currentCoords.latitude.toFixed(6)}, ${currentCoords.longitude.toFixed(6)}`,
      googleMapsUrl: mapsUrl,
      isManualPin: true
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-xl h-[88vh] sm:h-[680px] bg-[#1a1b1e] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white"
        >
          {/* Header */}
          <div className="p-3.5 bg-[#202124] border-b border-white/10 flex items-center justify-between z-20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold">
                📍
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight">Укажите точку доставки на карте</h3>
                <p className="text-[11px] text-gray-400">Перемещайте карту под прицел метки</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors text-base"
            >
              ✕
            </button>
          </div>

          {/* Search Box on Top of Map */}
          <div className="relative px-3.5 py-2 bg-[#1a1b1e]/90 border-b border-white/5 z-20">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск улицы, дома, отеля..."
                  className="w-full bg-[#202124] border border-[#3C4043] focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none placeholder:text-gray-500"
                />
                <span className="absolute left-3 top-2.5 text-xs text-gray-400">🔍</span>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setShowSearchResults(false);
                    }}
                    className="absolute right-2.5 top-2.5 text-xs text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold rounded-xl transition-all disabled:opacity-50 shrink-0"
              >
                {isSearching ? '...' : 'Найти'}
              </button>
            </form>

            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute left-3.5 right-3.5 top-12 mt-1 bg-[#202124] border border-[#3C4043] rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-white/5 z-30">
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSearchResult(item)}
                    className="w-full text-left p-2.5 hover:bg-white/5 text-xs text-gray-300 hover:text-white transition-colors flex items-start gap-2"
                  >
                    <span className="text-emerald-400 mt-0.5">📍</span>
                    <span className="line-clamp-2 leading-snug">{item.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Map Container Area */}
          <div className="relative flex-1 w-full overflow-hidden bg-[#12141C]">
            <div ref={mapRef} className="w-full h-full" />

            {/* Telegram / Grab Style Central Pin Needle (Pointed directly at exact map center) */}
            <div
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 pointer-events-none z-10 transition-transform duration-200 ${
                isMapMoving ? '-translate-y-[125%] scale-110' : '-translate-y-full scale-100'
              }`}
            >
              {/* Pin Icon Bubble */}
              <div className="relative flex flex-col items-center">
                <div className="px-3 py-1 bg-emerald-500 text-black font-extrabold text-[11px] rounded-full shadow-2xl flex items-center gap-1 whitespace-nowrap border-2 border-white">
                  <span>Доставить сюда</span>
                </div>
                <div className="text-3xl text-emerald-400 drop-shadow-[0_4px_12px_rgba(16,185,129,0.8)] -mt-1">
                  📍
                </div>
              </div>
            </div>

            {/* Shadow & Target Reticle on Ground */}
            <div
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[9] transition-all duration-200 ${
                isMapMoving ? 'w-8 h-8 opacity-40 scale-75' : 'w-5 h-5 opacity-80 scale-100'
              }`}
            >
              <div className="w-full h-full rounded-full border-2 border-emerald-400/80 bg-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.9)] animate-pulse"></div>
            </div>

            {/* Floating Action Controls on Map */}
            <div className="absolute right-3.5 bottom-4 flex flex-col gap-2 z-10">
              {/* "My GPS Location" Button */}
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={isLocating}
                title="Определить моё местоположение"
                className="w-11 h-11 rounded-2xl bg-[#202124]/90 hover:bg-[#202124] border border-white/20 text-white flex items-center justify-center shadow-xl backdrop-blur-md active:scale-90 transition-all"
              >
                {isLocating ? (
                  <span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span className="text-lg">🎯</span>
                )}
              </button>

              {/* Zoom Buttons */}
              <button
                type="button"
                onClick={() => mapInstanceRef.current?.zoomIn()}
                className="w-11 h-9 rounded-t-xl bg-[#202124]/90 hover:bg-[#202124] border border-white/20 border-b-0 text-white text-base font-bold flex items-center justify-center shadow-xl backdrop-blur-md active:scale-95"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => mapInstanceRef.current?.zoomOut()}
                className="w-11 h-9 rounded-b-xl bg-[#202124]/90 hover:bg-[#202124] border border-white/20 text-white text-base font-bold flex items-center justify-center shadow-xl backdrop-blur-md active:scale-95 -mt-2"
              >
                −
              </button>
            </div>
          </div>

          {/* Bottom Confirmation Sheet */}
          <div className="p-4 bg-[#202124] border-t border-white/10 space-y-3 z-20">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                  <span>Выбранный адрес:</span>
                  {isGeocoding && (
                    <span className="inline-block w-2.5 h-2.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></span>
                  )}
                </div>
                <div className="text-xs font-bold text-white truncate leading-relaxed">
                  {resolvedAddress || (isGeocoding ? 'Определяем адрес...' : 'Адрес на карте')}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono">
                  GPS: {currentCoords.latitude.toFixed(6)}, {currentCoords.longitude.toFixed(6)}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span>✓</span> Точка курьеру
                </span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-gray-300 font-bold text-xs transition-colors"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
              >
                <span>Подтвердить эту точку</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
