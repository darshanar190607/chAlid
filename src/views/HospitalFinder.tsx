"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react"
import { Search, Filter, MapPin, Phone, Clock, Star, Navigation, PhoneCall, Calendar, ChevronRight, Info, AlertCircle, X, CheckCircle2, Loader2, Plus, Database } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { TopBar } from "@/components/layout/TopBar"
import { BottomNav } from "@/components/layout/BottomNav"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet-routing-machine'

// Fix Leaflet default icon issues in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

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

// Selected Hospital Icon
const selectedHospitalIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [30, 48],
  iconAnchor: [15, 48],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const DEFAULT_CENTER: [number, number] = [28.6139, 77.2090]; // Delhi

interface Hospital {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lon?: number; // compat
  address: string;
  specialties?: string[];
  isEmergency?: boolean;
  isOpen24x7?: boolean;
  hasNicu?: boolean;
  hasNICU?: boolean; // compat
  hasVaccination?: boolean;
  type: 'govt' | 'private' | string;
  rating?: number;
  userRatingsTotal?: number;
  distance?: number;
  isExternal?: boolean;
}

// Component to handle map view updates
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 14, {
      animate: true,
      duration: 1.5
    });
  }, [center, map]);
  return null;
}

export default function HospitalFinder() {
  const { t } = useTranslation()
  const router = useRouter()
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    type: 'all' as 'all' | 'govt' | 'private',
    open24x7: false,
    nicu: false,
    vaccination: false,
    specialties: [] as string[]
  });

  const specialties = ['pediatrics', 'maternity', 'emergency'];

  // No more testConnection or Firebase snapshot.

  // 2. Browser Geolocation
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const loc: [number, number] = [latitude, longitude];
          setUserLocation(loc);
          setMapCenter(loc);
        },
        (err) => {
          console.error("Geolocation error:", err);
          setError("Location access denied. Using default location.");
          setLoading(false);
        }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
    }
  }, []);

  // 3. Fetch from REAL-TIME API when map center changes
  useEffect(() => {
    const fetchNearby = async () => {
      try {
        const [lat, lon] = mapCenter;
        const res = await fetch(`/api/hospitals?lat=${lat}&lon=${lon}`);
        if (!res.ok) return;
        const apiData = await res.json();
        
        setHospitals(prev => {
          // If we move to a completely new city/region, clear the old ones to prevent "Delhi" hospitals showing in Coimbatore
          const [lat, lon] = mapCenter;
          const distFromPrev = prev.length > 0 ? getDistance(lat, lon, prev[0].lat, prev[0].lng || prev[0].lon || 0) : 0;
          
          if (distFromPrev > 50) {
            return apiData;
          }

          const combined = [...prev, ...apiData];
          const map = new Map();
          combined.forEach(h => map.set(String(h.id), h));
          return Array.from(map.values());
        });
      } catch (err) {
        console.error("Nearby API fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    
    if (mapCenter) {
      fetchNearby();
    }
  }, [mapCenter]);

  const seedHospitals = async () => {
    setIsSeeding(true);
    // You should now seed the database using `npx prisma db seed` on your server
    alert("Please run `npx prisma db seed` on your server to populate hospitals.");
    setIsSeeding(false);
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const deg2rad = (deg: number) => deg * (Math.PI / 180);
    const R = 6371; // Radius of earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const filteredHospitals = useMemo(() => {
    const sortLocation = userLocation || mapCenter;
    
    return hospitals
      .filter(h => {
        const matchesSearch = h.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             h.address.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (!matchesSearch) return false;

        if (activeFilters.type !== 'all' && h.type.toLowerCase() !== activeFilters.type.toLowerCase()) {
          return false;
        }
        
        if (activeFilters.open24x7 && !h.isOpen24x7) {
          return false;
        }

        if (activeFilters.nicu && !(h.hasNICU || h.hasNicu)) {
          return false;
        }

        if (activeFilters.vaccination && !h.hasVaccination) {
          return false;
        }

        if (activeFilters.specialties.length > 0) {
          const hasSpecialty = activeFilters.specialties.some(s => {
            const hSpecialties = (h.specialties || []).map(sp => sp.toLowerCase());
            if (s === 'pediatrics') return hSpecialties.includes('pediatrics') || h.name.toLowerCase().includes('children') || h.name.toLowerCase().includes('pediatric');
            if (s === 'maternity') return hSpecialties.includes('maternity') || h.name.toLowerCase().includes('maternity') || h.name.toLowerCase().includes('women');
            if (s === 'emergency') return h.isEmergency || h.name.toLowerCase().includes('emergency') || h.name.toLowerCase().includes('trauma');
            return hSpecialties.includes(s.toLowerCase());
          });
          if (!hasSpecialty) return false;
        }

        const dist = getDistance(sortLocation[0], sortLocation[1], h.lat, h.lng || h.lon || 0);
        // 5-15km preference requested by user, but let's show all local (up to 50km) for safety
        if (dist > 50) return false;

        return true;
      })
      .map(h => ({
        ...h,
        distance: getDistance(sortLocation[0], sortLocation[1], h.lat, h.lng || h.lon || 0)
      }))
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }, [hospitals, searchQuery, activeFilters, userLocation, mapCenter]);

  const handleHospitalClick = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setMapCenter([hospital.lat, hospital.lng || hospital.lon || 0]);
  };

  return (
    <div className="min-h-screen bg-[#FFF9F5] pb-24 flex flex-col">
      <TopBar />
      
      <div className="flex-1 relative flex flex-col">
        {/* Search & Filters */}
        <div className="absolute top-6 left-6 right-6 z-[1000] space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('searchHospitalPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 pl-12 pr-6 rounded-full bg-white shadow-xl border-none focus:ring-2 focus:ring-orange-200 text-base font-dm-sans"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
            <div className="flex gap-2">
              <button
                onClick={() => setIsFilterModalOpen(true)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all shadow-md",
                  (activeFilters.nicu || activeFilters.vaccination || activeFilters.specialties.length > 0)
                    ? "bg-[#FF2D55] text-white"
                    : "bg-white text-gray-400 hover:text-[#FF2D55]"
                )}
              >
                <Filter className="w-3 h-3" />
                {t('filter')}
                {(activeFilters.specialties.length + (activeFilters.nicu ? 1 : 0) + (activeFilters.vaccination ? 1 : 0)) > 0 && (
                  <span className="bg-white text-[#FF2D55] w-4 h-4 rounded-full flex items-center justify-center text-[10px]">
                    {activeFilters.specialties.length + (activeFilters.nicu ? 1 : 0) + (activeFilters.vaccination ? 1 : 0)}
                  </span>
                )}
              </button>

              {hospitals.length === 0 && !loading && (
                <button
                  onClick={seedHospitals}
                  disabled={isSeeding}
                  className="px-4 py-2 rounded-full bg-white text-orange-500 font-bold text-xs shadow-md flex items-center gap-2 hover:bg-orange-50 transition-all"
                >
                  {isSeeding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
                  Seed Data
                </button>
              )}
            </div>

            {(['all', 'govt', 'private', '24x7', 'vaccination'] as const).map(f => (
              <button
                key={f}
                onClick={() => {
                  if (f === '24x7') {
                    setActiveFilters(prev => ({ ...prev, open24x7: !prev.open24x7 }));
                  } else if (f === 'vaccination') {
                    setActiveFilters(prev => ({ ...prev, vaccination: !prev.vaccination }));
                  } else {
                    setActiveFilters(prev => ({ ...prev, type: f }));
                  }
                }}
                className={cn(
                  "px-6 py-2 rounded-full text-xs font-bold capitalize whitespace-nowrap transition-all shadow-md",
                  (f === '24x7' ? activeFilters.open24x7 : f === 'vaccination' ? activeFilters.vaccination : activeFilters.type === f)
                    ? "bg-[#FF2D55] text-white" 
                    : "bg-white text-gray-400 hover:text-[#FF2D55]"
                )}
              >
                {f === 'govt' ? t('govtFree') : f === '24x7' ? t('open24x7') : t(f)}
              </button>
            ))}
          </div>
        </div>

        {/* Map View */}
        <div className="h-[50vh] w-full relative z-0">
          <MapContainer 
            center={mapCenter} 
            zoom={13} 
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater center={mapCenter} />
            
            {userLocation && (
              <Marker position={userLocation} icon={userIcon}>
                <Popup>You are here</Popup>
              </Marker>
            )}

            {filteredHospitals.map(hospital => (
              <Marker 
                key={hospital.id} 
                position={[hospital.lat, hospital.lng || hospital.lon || 0]} 
                icon={selectedHospital?.id === hospital.id ? selectedHospitalIcon : hospitalIcon}
                eventHandlers={{
                  click: () => {
                    setSelectedHospital(hospital);
                    const card = document.getElementById(`hospital-${hospital.id}`);
                    if (card) {
                      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }
                }}
                zIndexOffset={selectedHospital?.id === hospital.id ? 1000 : 0}
              >
                <Popup>
                  <div className="p-1">
                    <h3 className="font-bold text-sm">{hospital.name}</h3>
                    <p className="text-xs text-gray-500">{hospital.address}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* List View */}
        <div className="flex-1 bg-white rounded-t-[32px] -mt-8 relative z-10 shadow-[0_-8px_32px_rgba(0,0,0,0.05)] p-6 overflow-y-auto custom-scrollbar">
          <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-8" />
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold font-nunito text-[#1A1A2E]">{t('nearbyHospitals')}</h3>
              <span className="text-sm font-bold text-gray-400">{filteredHospitals.length} {t('found')}</span>
            </div>

            {error && (
              <div className="bg-red-50 p-4 rounded-2xl flex items-center gap-3 text-red-600 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-10 h-10 text-[#FF2D55] animate-spin" />
                <p className="text-gray-400 font-bold">{t('pleaseWait')}</p>
              </div>
            ) : filteredHospitals.length === 0 ? (
              <div className="text-center py-12 space-y-6">
                <div className="mx-auto w-24 h-24 bg-pink-50 rounded-[32px] flex items-center justify-center shadow-lg shadow-pink-100/50 border-4 border-white relative overflow-hidden">
                  <img 
                    src="https://picsum.photos/seed/ai-hospital-search/200/200" 
                    alt="AI Assistant" 
                    className="w-20 h-20 object-cover rounded-2xl"
                    referrerPolicy="no-referrer"
                  />
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -top-1 -right-1 w-6 h-6 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center"
                  >
                    <Search className="w-3 h-3 text-white" />
                  </motion.div>
                </div>
                <div className="space-y-2">
                  <p className="text-[#1A1A2E] font-bold text-lg">{t('noHospitalsFound')}</p>
                  <p className="text-gray-400 font-dm-sans text-sm px-8">
                    {t('aiAssistantNoHospitals')}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => { 
                    setActiveFilters({
                      type: 'all',
                      open24x7: false,
                      nicu: false,
                      vaccination: false,
                      specialties: []
                    }); 
                    setSearchQuery(''); 
                  }}
                  className="rounded-full border-pink-100 text-[#FF2D55] hover:bg-pink-50"
                >
                  {t('aiAssistantClearFilters')}
                </Button>
              </div>
            ) : (
              filteredHospitals.map((hospital, i) => (
                <motion.div
                  key={hospital.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className={cn(
                    "border-none shadow-sm hover:shadow-md transition-all cursor-pointer",
                    selectedHospital?.id === hospital.id && "ring-2 ring-[#FF2D55]"
                  )} onClick={() => handleHospitalClick(hospital)}>
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border border-gray-100 shadow-sm">
                          <img 
                            src={`https://picsum.photos/seed/hospital-${hospital.id}/200/200`} 
                            alt={hospital.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 space-y-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <h4 className="text-lg font-bold font-nunito">{hospital.name}</h4>
                              <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                                <MapPin className="w-3 h-3" />
                                <span>{hospital.address}</span>
                                {hospital.distance && (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-gray-200" />
                                    <span className="text-[#FF2D55]">{hospital.distance.toFixed(1)} km</span>
                                  </>
                                )}
                                <span className="w-1 h-1 rounded-full bg-gray-200" />
                                <span className={cn(
                                  "px-2 py-0.5 rounded bg-gray-50",
                                  hospital.type.toLowerCase() === 'govt' ? "text-emerald-600 bg-emerald-50" : "text-blue-600 bg-blue-50"
                                )}>
                                  {hospital.type.toLowerCase() === 'govt' ? t('govtFree') : t('private')}
                                </span>
                                {!hospital.isExternal && (
                                  <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-100 flex items-center gap-1">
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    Verified
                                  </span>
                                )}
                              </div>
                              {hospital.rating && (
                                <div className="flex items-center gap-1.5 pt-1">
                                  <div className="flex items-center gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                      <Star 
                                        key={i} 
                                        className={cn(
                                          "w-3 h-3",
                                          i < Math.floor(hospital.rating || 0) 
                                            ? "text-yellow-400 fill-yellow-400" 
                                            : "text-gray-200 fill-gray-200"
                                        )} 
                                      />
                                    ))}
                                  </div>
                                  <span className="text-xs font-bold text-gray-700">{hospital.rating}</span>
                                  {hospital.userRatingsTotal && (
                                    <span className="text-[10px] text-gray-400 font-medium">
                                      ({hospital.userRatingsTotal} {t('reviews') || 'reviews'})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {(hospital.hasNICU || hospital.hasNicu) && <span className="px-2 py-1 rounded-md bg-pink-50 text-[10px] font-bold text-[#FF2D55] uppercase tracking-wider">{t('nicu')}</span>}
                            {hospital.hasVaccination && <span className="px-2 py-1 rounded-md bg-orange-50 text-[10px] font-bold text-[#FF6B35] uppercase tracking-wider">{t('vaccination')}</span>}
                            {hospital.isOpen24x7 && <span className="px-2 py-1 rounded-md bg-emerald-50 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{t('open24x7')}</span>}
                            {(hospital.specialties || []).map(s => (
                              <span key={s} className="px-2 py-1 rounded-md bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">{t(s)}</span>
                            ))}
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button 
                              variant="primary" 
                              size="sm" 
                              className="flex-1 h-12 rounded-xl" 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (userLocation) {
                                  router.push(`/hospital/directions?lat=${hospital.lat}&lon=${hospital.lng || hospital.lon}&name=${encodeURIComponent(hospital.name)}&address=${encodeURIComponent(hospital.address || '')}`);
                                } else {
                                  setError("Please enable location to get directions.");
                                }
                              }}
                            >
                              <Navigation className="w-4 h-4 mr-1" />
                              <span className="text-xs">
                                {t('directions')}
                              </span>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-12 w-12 rounded-xl border-gray-100 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lon}`, '_blank');
                              }}
                              title="Open in Google Maps"
                            >
                              <Navigation className="w-5 h-5 text-[#FF6B35] rotate-45" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-12 w-12 rounded-xl border-gray-100 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                // In a real app, this would trigger a phone call
                                window.location.href = `tel:+911234567890`;
                              }}
                            >
                              <PhoneCall className="w-5 h-5 text-[#FF6B35]" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      <BottomNav />

      {/* Advanced Filter Modal */}
      <AnimatePresence>
        {isFilterModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="relative w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold font-nunito text-[#1A1A2E]">{t('filter')}</h3>
                  <button 
                    onClick={() => setIsFilterModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Services */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">{t('filterByServices')}</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setActiveFilters(prev => ({ ...prev, nicu: !prev.nicu }))}
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left",
                          activeFilters.nicu 
                            ? "border-[#FF2D55] bg-pink-50 text-[#FF2D55]" 
                            : "border-gray-100 hover:border-pink-100 text-gray-600"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center",
                          activeFilters.nicu ? "border-[#FF2D55] bg-[#FF2D55]" : "border-gray-300"
                        )}>
                          {activeFilters.nicu && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <span className="font-bold text-sm">{t('nicuAvailable')}</span>
                      </button>
                      <button
                        onClick={() => setActiveFilters(prev => ({ ...prev, vaccination: !prev.vaccination }))}
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left",
                          activeFilters.vaccination 
                            ? "border-[#FF2D55] bg-pink-50 text-[#FF2D55]" 
                            : "border-gray-100 hover:border-pink-100 text-gray-600"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center",
                          activeFilters.vaccination ? "border-[#FF2D55] bg-[#FF2D55]" : "border-gray-300"
                        )}>
                          {activeFilters.vaccination && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                        <span className="font-bold text-sm">{t('vaccinationCenter')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Specialties */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">{t('filterBySpecialty')}</h4>
                    <div className="flex flex-wrap gap-3">
                      {specialties.map(s => (
                        <button
                          key={s}
                          onClick={() => {
                            setActiveFilters(prev => ({
                              ...prev,
                              specialties: prev.specialties.includes(s)
                                ? prev.specialties.filter(x => x !== s)
                                : [...prev.specialties, s]
                            }));
                          }}
                          className={cn(
                            "px-6 py-3 rounded-xl border-2 font-bold text-sm transition-all",
                            activeFilters.specialties.includes(s)
                              ? "border-[#FF2D55] bg-pink-50 text-[#FF2D55]"
                              : "border-gray-100 text-gray-500 hover:border-pink-100"
                          )}
                        >
                          {t(s)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-14 rounded-2xl"
                    onClick={() => {
                      setActiveFilters({
                        type: 'all',
                        open24x7: false,
                        nicu: false,
                        vaccination: false,
                        specialties: []
                      });
                    }}
                  >
                    {t('aiAssistantClearFilters')}
                  </Button>
                  <Button 
                    variant="primary" 
                    className="flex-[2] h-14 rounded-2xl"
                    onClick={() => setIsFilterModalOpen(false)}
                  >
                    {t('saveRecord')}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
