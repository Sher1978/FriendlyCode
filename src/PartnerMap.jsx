import React, { useState, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationArrow, faMapMarkerAlt, faStore, faDirections, faLeaf } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';

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
        id: '1',
        name: 'Burger Heroes',
        address: 'Kuznetsky Most, 12',
        category: 'Restaurant',
        lat: 55.7601,
        lng: 37.625,
        link: 'https://burgerheroes.ru'
    }
];

const PartnerMap = () => {
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
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-background-cream text-brand-brown">
                <div className="w-24 h-24 bg-brand-brown/5 rounded-full flex items-center justify-center mb-6">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="text-4xl text-brand-orange" />
                </div>
                <h2 className="text-3xl font-black mb-2">Partner Map</h2>
                <p className="text-brand-brown/60 mb-8 max-w-sm font-medium">
                    The interactive city guide is currently in development mode.
                    <br />
                    (API Key Missing)
                </p>
                <div className="w-full max-w-md h-96 bg-surface-cream border-2 border-brand-brown/10 rounded-[32px] flex items-center justify-center text-brand-brown/40 font-bold tracking-widest relative overflow-hidden">
                    <div className="absolute inset-0 bg-brand-brown/5 animate-pulse"></div>
                    <span className="relative z-10">MAP PLACEHOLDER</span>
                </div>
                <button
                    onClick={() => navigate('/')}
                    className="mt-8 text-sm font-bold text-brand-brown/80 hover:text-brand-brown transition-colors uppercase tracking-wider"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    return (
        <LoadScript googleMapsApiKey={apiKey}>
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={currentPosition}
                zoom={14}
                options={{
                    disableDefaultUI: true,
                    zoomControl: false,
                    styles: [
                        {
                            "featureType": "all",
                            "elementType": "geometry",
                            "stylers": [{ "color": "#FFF8E1" }] // Cream background
                        },
                        {
                            "featureType": "all",
                            "elementType": "labels.text.fill",
                            "stylers": [{ "color": "#4E342E" }] // Brown text
                        },
                        {
                            "featureType": "road",
                            "elementType": "geometry",
                            "stylers": [{ "color": "#ffffff" }] // White roads
                        }
                    ]
                }}
            >
                {mockVenues.map(venue => (
                    <Marker
                        key={venue.id}
                        position={{ lat: venue.lat, lng: venue.lng }}
                        onClick={() => setSelectedVenue(venue)}
                        icon={{
                            path: faMapMarkerAlt.icon[4],
                            fillColor: "#E68A00",
                            fillOpacity: 1,
                            strokeWeight: 0,
                            scale: 0.07,
                        }}
                    />
                ))}

                {selectedVenue && (
                    <InfoWindow
                        position={{ lat: selectedVenue.lat, lng: selectedVenue.lng }}
                        onCloseClick={() => setSelectedVenue(null)}
                    >
                        <div className="p-2 min-w-[200px] font-sans">
                            <h3 className="font-bold text-lg mb-1 text-brand-brown">{selectedVenue.name}</h3>
                            <p className="text-sm text-brand-brown/60 mb-3">{selectedVenue.address}</p>
                            <div className="flex gap-2">
                                <a
                                    href={selectedVenue.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex-1 bg-brand-orange text-white text-xs font-bold py-2 px-3 rounded-lg text-center shadow-lg shadow-brand-orange/20"
                                >
                                    Open Link
                                </a>
                                <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedVenue.lat},${selectedVenue.lng}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex-shrink-0 bg-brand-brown/5 text-brand-brown p-2 rounded-lg hover:bg-brand-brown/10"
                                >
                                    <FontAwesomeIcon icon={faDirections} />
                                </a>
                            </div>
                        </div>
                    </InfoWindow>
                )}
            </GoogleMap>

            {/* Floating UI Elements */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                <button
                    onClick={() => navigate('/')}
                    className="pointer-events-auto bg-background-cream/90 backdrop-blur-md p-3 px-4 rounded-xl shadow-xl border border-brand-brown/5 text-brand-brown font-bold text-sm hover:scale-105 transition-transform"
                >
                    ← Back
                </button>

                <div className="bg-background-cream/90 backdrop-blur-md p-2 rounded-xl shadow-xl border border-brand-brown/5 text-brand-brown font-bold text-xs flex items-center gap-2">
                    <FontAwesomeIcon icon={faLeaf} className="text-brand-green" />
                    <span>Friendly Map</span>
                </div>
            </div>
        </LoadScript>
    );
};

export default PartnerMap;
