import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationArrow, faDirections, faLeaf, faWifi, faGift } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { auth } from './firebase';
import { motion, AnimatePresence } from 'framer-motion';

const defaultCenter = {
    lat: 12.238791, // Default to Nha Trang center
    lng: 109.196749
};

const getPinColor = (tier) => {
    switch (tier) {
        case 1: return '#00FF66'; // Green: Max Discount
        case 2: return '#FFFF00'; // Yellow: Medium
        case 3: return '#D4AF37'; // Gold: Starter VIP
        default: return '#FF3333'; // Red: Min/Base
    }
};

const getPinGlow = (tier) => {
    switch (tier) {
        case 1: return '0 0 12px #00FF66, 0 0 4px #00FF66';
        case 2: return '0 0 12px #FFFF00, 0 0 4px #FFFF00';
        case 3: return '0 0 12px #D4AF37, 0 0 4px #D4AF37';
        default: return '0 0 12px #FF3333, 0 0 4px #FF3333';
    }
};

const PartnerMap = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [currentPosition, setCurrentPosition] = useState(defaultCenter);
    const [venues, setVenues] = useState([]);
    const [selectedVenue, setSelectedVenue] = useState(null);
    const [loading, setLoading] = useState(true);

    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerGroupRef = useRef(null);

    // Get live position on load
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setCurrentPosition(pos);
                    if (mapInstanceRef.current) {
                        mapInstanceRef.current.setView([pos.lat, pos.lng], 13);
                    }
                },
                () => console.log("Geolocation permission denied")
            );
        }
    }, []);

    // Load hotspots and apply cache strategy
    useEffect(() => {
        const loadHotspots = async () => {
            const cacheTime = localStorage.getItem('vip_hotspots_cache_time');
            const cachedData = localStorage.getItem('vip_hotspots_data');
            
            if (cachedData && cacheTime && (Date.now() - Number(cacheTime) < 5 * 60 * 1000)) {
                setVenues(JSON.parse(cachedData));
                setLoading(false);
                return;
            }

            try {
                const user = auth.currentUser;
                const headers = {};
                if (user) {
                    const token = await user.getIdToken();
                    headers['Authorization'] = `Bearer ${token}`;
                }
                const response = await fetch('/api/user/hotspots-map', { headers });
                if (response.ok) {
                    const data = await response.json();
                    setVenues(data);
                    localStorage.setItem('vip_hotspots_data', JSON.stringify(data));
                    localStorage.setItem('vip_hotspots_cache_time', String(Date.now()));
                }
            } catch (e) {
                console.error("Failed to load hotspots:", e);
            } finally {
                setLoading(false);
            }
        };

        loadHotspots();
    }, []);

    // Initialize Leaflet Map
    useEffect(() => {
        if (mapRef.current && !mapInstanceRef.current) {
            const map = L.map(mapRef.current, {
                zoomControl: false,
                attributionControl: false
            }).setView([currentPosition.lat, currentPosition.lng], 13);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 20
            }).addTo(map);

            mapInstanceRef.current = map;
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Render Pin Markers
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || venues.length === 0) return;

        if (markerGroupRef.current) {
            map.removeLayer(markerGroupRef.current);
        }

        const markers = L.layerGroup();

        venues.forEach(venue => {
            const color = getPinColor(venue.tier_level);
            const glow = getPinGlow(venue.tier_level);

            const customIcon = L.divIcon({
                className: 'custom-leaflet-marker',
                html: `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; width: 80px; height: 80px;">
                        <div style="
                            width: 18px;
                            height: 18px;
                            border-radius: 50%;
                            background-color: ${color};
                            border: 2.5px solid #FFFFFF;
                            box-shadow: ${glow};
                            animation: pulse 1.8s infinite alternate;
                        "></div>
                        <div style="
                            width: 0;
                            height: 0;
                            border-left: 4.5px solid transparent;
                            border-right: 4.5px solid transparent;
                            border-top: 5px solid #FFFFFF;
                            margin-top: -1px;
                        "></div>
                        <div style="
                            background: rgba(18, 18, 18, 0.92);
                            border: 1px solid rgba(255, 255, 255, 0.15);
                            border-radius: 8px;
                            padding: 4px 8px;
                            color: #FFFFFF;
                            font-size: 9px;
                            font-weight: 800;
                            font-family: system-ui, -apple-system, sans-serif;
                            white-space: nowrap;
                            position: absolute;
                            bottom: 48px;
                            box-shadow: 0 6px 16px rgba(0,0,0,0.6);
                            backdrop-filter: blur(4px);
                        ">
                            ⚡ ${venue.wifi_speed_mbps} Mbps | 🔥 -${venue.user_discount_percentage}%
                        </div>
                    </div>
                `,
                iconSize: [80, 80],
                iconAnchor: [40, 40]
            });

            const marker = L.marker([venue.latitude, venue.longitude], { icon: customIcon });
            
            marker.on('click', () => {
                setSelectedVenue(venue);
                map.setView([venue.latitude, venue.longitude], 15);
            });

            markers.addLayer(marker);
        });

        markers.addTo(map);
        markerGroupRef.current = markers;

    }, [venues]);

    return (
        <div className="relative w-full h-screen font-sans antialiased text-white bg-black overflow-hidden select-none">
            <style>{`
                @keyframes pulse {
                    0% { transform: scale(0.95); }
                    100% { transform: scale(1.1); }
                }
                .venue-glass-card {
                    background: rgba(20, 20, 20, 0.65);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 215, 0, 0.25);
                    border-radius: 32px 32px 0 0;
                    box-shadow: 0 -8px 32px 0 rgba(0, 0, 0, 0.5);
                    padding: 24px;
                    color: #FFFFFF;
                }
                .leaflet-grab {
                    cursor: grab;
                }
                .leaflet-dragging .leaflet-grab {
                    cursor: grabbing;
                }
            `}</style>

            {/* Map Container */}
            <div ref={mapRef} className="w-full h-full absolute inset-0 z-0" />

            {/* Floating Top UI elements */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none z-10">
                <button
                    onClick={() => navigate(-1)}
                    className="pointer-events-auto bg-[#1C1C1E]/80 backdrop-blur-2xl px-5 py-3 rounded-[20px] shadow-2xl border border-white/10 text-white font-black text-xs uppercase tracking-wider active:scale-[0.97] transition-all flex items-center justify-center"
                >
                    {i18n.language?.startsWith('ru') ? "← Назад" : "← Back"}
                </button>

                <div className="bg-[#1C1C1E]/80 backdrop-blur-2xl p-2.5 px-4.5 rounded-[20px] shadow-2xl border border-white/10 text-white font-extrabold text-[12px] flex items-center gap-2">
                    <FontAwesomeIcon icon={faLeaf} className="text-[#00FF41] animate-pulse" />
                    <span className="opacity-90">{i18n.language?.startsWith('ru') ? "VIP Карта" : "VIP Hotspots"}</span>
                </div>
            </div>

            {/* Center to User Location Button */}
            <button
                onClick={() => {
                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((pos) => {
                            const userLoc = [pos.coords.latitude, pos.coords.longitude];
                            mapInstanceRef.current?.setView(userLoc, 14);
                        });
                    }
                }}
                className="absolute bottom-28 right-6 z-10 w-12 h-12 bg-[#1C1C1E]/90 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl flex items-center justify-center text-white active:scale-95 transition-transform"
            >
                <FontAwesomeIcon icon={faLocationArrow} className="text-sm" />
            </button>

            {/* Loading Indicator */}
            {loading && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[99] flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-4 border-white/10 border-t-white rounded-full animate-spin mb-4" />
                    <p className="text-xs uppercase tracking-widest opacity-40">Loading Hotspots...</p>
                </div>
            )}

            {/* Glassmorphic Bottom Sheet */}
            <AnimatePresence>
                {selectedVenue && (
                    <>
                        {/* Overlay backdrop to dismiss */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/30 z-[998]"
                            onClick={() => setSelectedVenue(null)}
                        />

                        {/* Slide up Bottom Sheet Card */}
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 220 }}
                            className="fixed bottom-0 left-0 right-0 z-[999] venue-glass-card max-w-md mx-auto"
                        >
                            {/* Top Handle */}
                            <div className="flex justify-center mb-4 cursor-pointer" onClick={() => setSelectedVenue(null)}>
                                <div className="w-12 h-1 bg-white/20 rounded-full" />
                            </div>

                            {/* Venue Title */}
                            <h2 className="text-[22px] font-black tracking-tight text-white mb-4 leading-tight">
                                {selectedVenue.name}
                            </h2>

                            {/* Stats Row */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                {/* Badge 1 (Wi-Fi Speed) */}
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[11px] font-extrabold uppercase tracking-wide">
                                    <FontAwesomeIcon icon={faWifi} />
                                    <span>
                                        {i18n.language?.startsWith('ru') ? "Скорость:" : "Speed:"} {selectedVenue.wifi_speed_mbps} {i18n.language?.startsWith('ru') ? "Мбит/с" : "Mbps"}
                                    </span>
                                </div>

                                {/* Badge 2 (Personal Discount) */}
                                <div
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold border uppercase tracking-wide"
                                    style={{
                                        backgroundColor: `${getPinColor(selectedVenue.tier_level)}12`,
                                        borderColor: `${getPinColor(selectedVenue.tier_level)}25`,
                                        color: getPinColor(selectedVenue.tier_level)
                                    }}
                                >
                                    <FontAwesomeIcon icon={faGift} />
                                    <span>
                                        {i18n.language?.startsWith('ru') ? "Скидка:" : "Discount:"} -{selectedVenue.user_discount_percentage}%
                                    </span>
                                </div>
                            </div>

                            {/* Upsell Prompt */}
                            {selectedVenue.tier_level > 1 && (
                                <p className="text-[11px] text-[#FFD700] italic font-semibold mb-6 flex items-center gap-1.5">
                                    <span>
                                        {i18n.language?.startsWith('ru')
                                            ? `💡 Внесите депозит в заведении, чтобы повысить скидку до ${selectedVenue.deposit_discount || selectedVenue.max_discount || selectedVenue.user_discount_percentage || 20}%`
                                            : (i18n.language?.startsWith('vi')
                                                ? `💡 Hãy nạp tiền tại địa điểm để tăng chiết khấu lên ${selectedVenue.deposit_discount || selectedVenue.max_discount || selectedVenue.user_discount_percentage || 20}%`
                                                : `💡 Make a deposit at the venue to increase your discount to ${selectedVenue.deposit_discount || selectedVenue.max_discount || selectedVenue.user_discount_percentage || 20}%`)}
                                    </span>
                                </p>
                            )}

                            {/* Action CTA Button */}
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={() => window.open(selectedVenue.google_maps_url, '_blank')}
                                className="w-full py-4 bg-white text-black font-extrabold rounded-[20px] text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(255,255,255,0.15)]"
                            >
                                🗺 {i18n.language?.startsWith('ru') ? "СМОТРЕТЬ НА GOOGLE MAPS" : (i18n.language?.startsWith('vi') ? "XEM TRÊN GOOGLE MAPS" : "VIEW ON GOOGLE MAPS")}
                            </motion.button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PartnerMap;
