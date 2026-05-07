"use client";
import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation";
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-routing-machine'
import { ArrowLeft, Navigation, Phone, MapPin, Loader2, AlertCircle, PhoneCall } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { motion } from "motion/react"
import { useTranslation } from "react-i18next"

// Custom Hospital Icon
const hospitalIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom User Icon
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function RoutingMachine({ userLocation, destination }: { userLocation: [number, number], destination: [number, number] }) {
  const map = useMap();
  const routingControlRef = useRef<L.Routing.Control | null>(null);

  useEffect(() => {
    if (!map || !userLocation || !destination) return;

    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current);
    }

    routingControlRef.current = L.Routing.control({
      waypoints: [
        L.latLng(userLocation[0], userLocation[1]),
        L.latLng(destination[0], destination[1])
      ],
      routeWhileDragging: true,
      show: true,
      addWaypoints: false,
      fitSelectedRoutes: true,
      lineOptions: {
        styles: [{ color: '#FF2D55', weight: 6 }],
        extendToWaypoints: true,
        missingRouteTolerance: 10
      },
      // Customize the container for directions
      containerClassName: 'routing-container'
    }).addTo(map);

    return () => {
      if (routingControlRef.current) {
        map.removeControl(routingControlRef.current);
      }
    };
  }, [map, userLocation, destination]);

  return null;
}

export default function HospitalDirections() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const lat = parseFloat(searchParams.get("lat") || "0");
  const lon = parseFloat(searchParams.get("lon") || "0");
  const name = searchParams.get("name") || "Hospital";
  const address = searchParams.get("address") || "";

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
          setLoading(false);
        },
        (err) => {
          console.error("Geolocation error:", err);
          setError("Location access denied. Please enable location to see directions.");
          setLoading(false);
        }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF9F5] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-12 h-12 text-[#FF2D55] animate-spin mb-4" />
        <h2 className="text-xl font-bold text-[#1A1A2E] mb-2">{t('calculatingRoute') || 'Calculating Route...'}</h2>
        <p className="text-gray-500">{t('pleaseWait')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FFF9F5] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-[#1A1A2E] mb-2">{t('error')}</h2>
        <p className="text-gray-500 mb-6">{error}</p>
        <Button onClick={() => router.back()} variant="primary" className="rounded-full px-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('goBack') || 'Go Back'}
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-[2000] p-4 pointer-events-none">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center pointer-events-auto active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-6 h-6 text-[#1A1A2E]" />
          </button>
          <div className="flex-1 bg-white rounded-2xl shadow-xl p-3 pointer-events-auto border border-pink-50 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-[#1A1A2E] line-clamp-1">{name}</h1>
              <p className="text-[10px] text-gray-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {address || t('hospitalLocation') || 'Hospital Location'}
              </p>
            </div>
            <button 
              onClick={() => window.location.href = `tel:+911234567890`}
              className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center ml-2 active:scale-90 transition-transform"
            >
              <PhoneCall className="w-5 h-5 text-[#FF2D55]" />
            </button>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative z-0">
        <MapContainer 
          center={userLocation || [lat, lon]} 
          zoom={15} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {userLocation && (
            <Marker position={userLocation} icon={userIcon}>
              <Popup>{t('yourLocation') || 'Your Location'}</Popup>
            </Marker>
          )}

          <Marker position={[lat, lon]} icon={hospitalIcon}>
            <Popup>{name}</Popup>
          </Marker>

          {userLocation && (
            <RoutingMachine userLocation={userLocation} destination={[lat, lon]} />
          )}
        </MapContainer>
      </div>

      {/* Floating Action Button for Google Maps fallback */}
      <div className="absolute bottom-8 right-6 z-[2000]">
        <Button 
          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank')}
          className="w-14 h-14 rounded-full bg-white shadow-2xl border-2 border-pink-50 flex items-center justify-center p-0 hover:bg-pink-50"
        >
          <Navigation className="w-6 h-6 text-[#FF2D55] rotate-45" />
        </Button>
      </div>

      <style>{`
        .routing-container {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          max-height: 35vh;
          overflow-y: auto;
          z-index: 1000;
          padding: 1rem;
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          box-shadow: 0 -10px 25px rgba(0,0,0,0.1);
          font-family: inherit;
        }
        .leaflet-routing-container {
          width: 100% !important;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-routing-alt {
          max-height: none !important;
        }
        .leaflet-routing-geocoders {
          display: none;
        }
      `}</style>
    </div>
  );
}
