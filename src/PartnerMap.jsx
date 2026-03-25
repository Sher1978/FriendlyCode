import React, { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationArrow, faMapMarkerAlt, faStore, faDirections, faLeaf } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const containerStyle = {
    width: '100%',
    height: '100vh'
};

const defaultCenter = {
    lat: 55.751244, // Default to Moscow or major city if no geolocation
    lng: 37.618423
};

// Mock Data - In real app, fetch from Firestore 'venues' collection
const mockVenues = [
    {
        id: '1',
        name: 'Coffee & Friends',
        address: 'Tverskaya St, 15',
        category: 'Cafe',
        lat: 55.7558,
        lng: 37.6173,
        link: 'https://instagram.com/coffee_friends'
    },
    {
        id: '2', // Fixed duplicate ID
        name: 'Burger Heroes',
        address: 'Kuznetsky Most, 12',
        category: 'Restaurant',
        lat: 55.7601,
        lng: 37.625,
        link: 'https://burgerheroes.ru'
    }
];

const PartnerMap = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [currentPosition, setCurrentPosition] = useState(defaultCenter);
    const [selectedVenue, setSelectedVenue] = useState(null);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setCurrentPosition({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                () => console.log("Geolocation permission denied")
            );
        }
    }, []);

    // Placeholder for Google Maps API Key
    // In production, replace 'YOUR_API_KEY' with actual key or use iframe fallback
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

    if (!apiKey) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-black text-white font-sans antialiased relative overflow-hidden">
                <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_center,_#FFFFFF_0%,_transparent_70%)] opacity-5 pointer-events-none" />
                <div className="w-24 h-24 bg-white/10 rounded-[32px] border border-white/5 backdrop-blur-3xl flex items-center justify-center mb-6 shadow-2xl">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="text-4xl text-white" />
                </div>
                <h2 className="text-[32px] font-bold tracking-tight mb-2 leading-tight">{t('partner_map_title')}</h2>
                <p className="text-white/50 mb-8 max-w-sm font-medium text-[15px] leading-relaxed">
                    {t('map_dev_mode')}
                    <br />
                    <span className="text-[12px] uppercase tracking-widest opacity-50">(API Key Missing)</span>
                </p>
                <div className="w-full max-w-md h-96 bg-[#1C1C1E]/80 backdrop-blur-3xl border border-white/10 rounded-[36px] flex items-center justify-center text-white/30 font-semibold tracking-wider relative overflow-hidden shadow-2xl">
                    <div className="absolute inset-0 bg-white/5 animate-pulse"></div>
                    <span className="relative z-10">{t('map_placeholder')}</span>
                </div>
                <button
                    onClick={() => navigate('/')}
                    className="mt-12 text-[14px] font-semibold text-white/60 hover:text-white transition-colors uppercase tracking-widest px-6 py-3 border border-white/10 rounded-full hover:bg-white/5"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    // Google Maps iOS Dark Mode Style Array
    const darkMapStyles = [
        { elementType: "geometry", stylers: [{ color: "#1C1C1E" }] },
        { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#1C1C1E" }] },
        { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
        { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
        { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
        { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
        { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
        { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#181818" }] },
        { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
        { featureType: "poi.park", elementType: "labels.text.stroke", stylers: [{ color: "#1b1b1b" }] },
        { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
        { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
        { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373737" }] },
        { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
        { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: "#4e4e4e" }] },
        { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
        { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
        { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] }
    ];

    return (
        <LoadScript googleMapsApiKey={apiKey}>
            <div className="relative font-sans antialiased text-white bg-black">
                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={currentPosition}
                    zoom={14}
                    options={{
                        disableDefaultUI: true,
                        zoomControl: false,
                        styles: darkMapStyles
                    }}
                >
                    {mockVenues.map(venue => (
                        <Marker
                            key={venue.id}
                            position={{ lat: venue.lat, lng: venue.lng }}
                            onClick={() => setSelectedVenue(venue)}
                            icon={{
                                path: faMapMarkerAlt.icon[4],
                                fillColor: "#FFFFFF",
                                fillOpacity: 1,
                                strokeWeight: 0,
                                scale: 0.08,
                            }}
                        />
                    ))}

                    {selectedVenue && (
                        <InfoWindow
                            position={{ lat: selectedVenue.lat, lng: selectedVenue.lng }}
                            onCloseClick={() => setSelectedVenue(null)}
                        >
                            <div className="p-3 min-w-[220px] font-sans bg-black text-white rounded-[20px] border border-white/10 shadow-2xl">
                                <h3 className="font-bold text-[18px] mb-1 tracking-tight">{selectedVenue.name}</h3>
                                <p className="text-[13px] text-white/50 mb-4">{selectedVenue.address}</p>
                                <div className="flex gap-2">
                                    <a
                                        href={selectedVenue.link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex-1 bg-white text-black text-[12px] font-semibold py-2.5 px-3 rounded-[12px] text-center active:scale-95 transition-transform"
                                    >
                                        Open Link
                                    </a>
                                    <a
                                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedVenue.lat},${selectedVenue.lng}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex-shrink-0 bg-white/10 text-white p-2.5 px-3.5 rounded-[12px] hover:bg-white/20 active:scale-95 transition-transform"
                                    >
                                        <FontAwesomeIcon icon={faDirections} />
                                    </a>
                                </div>
                            </div>
                        </InfoWindow>
                    )}
                </GoogleMap>

                {/* Floating UI Elements (iOS Glass Style) */}
                <div className="absolute top-6 left-6 right-6 flex justify-between items-start pointer-events-none z-10">
                    <button
                        onClick={() => navigate('/')}
                        className="pointer-events-auto bg-[#1C1C1E]/80 backdrop-blur-2xl p-3 px-5 rounded-[18px] shadow-2xl border border-white/10 text-white font-semibold text-[15px] active:scale-[0.97] transition-all flex items-center justify-center"
                    >
                        ← Back
                    </button>

                    <div className="bg-[#1C1C1E]/80 backdrop-blur-2xl p-2.5 px-4 rounded-[18px] shadow-2xl border border-white/10 text-white font-semibold text-[13px] flex items-center gap-2">
                        <FontAwesomeIcon icon={faLeaf} className="text-[#00FF41]" />
                        <span className="opacity-90">Locations</span>
                    </div>
                </div>
            </div>
        </LoadScript>
    );
};

export default PartnerMap;
