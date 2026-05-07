"use client";
import { useState, useEffect } from "react";
import { Map, AdvancedMarker, Pin, InfoWindow, APIProvider } from "@vis.gl/react-google-maps";
import { Phone, Navigation, Clock, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

interface Hospital {
  id: string;
  name: string;
  type: "Govt" | "Private";
  address?: string;
  city?: string;
  state?: string;
  lat: number;
  lng: number;
  isFree: boolean;
  hasNicu: boolean;
  phone?: string;
  rating?: number;
  distance?: number;
}

interface NearbyDoctorsMapProps {
  userLocation: { lat: number; lng: number };
  urgencyHours?: number;
}

export default function NearbyDoctorsMap({ userLocation, urgencyHours }: NearbyDoctorsMapProps) {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState(userLocation);

  useEffect(() => {
    fetchNearbyHospitals();
  }, [userLocation]);

  const fetchNearbyHospitals = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/hospitals?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=10&pediatric=true`
      );
      
      if (response.ok) {
        const data = await response.json();
        // Calculate distances for each hospital
        const hospitalsWithDistance = data.map((hospital: Hospital) => ({
          ...hospital,
          distance: calculateDistance(userLocation, hospital)
        })).sort((a: Hospital, b: Hospital) => (a.distance || 0) - (b.distance || 0));
        
        setHospitals(hospitalsWithDistance);
      }
    } catch (error) {
      console.error("Failed to fetch hospitals:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (loc1: { lat: number; lng: number }, loc2: Hospital): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLng = (loc2.lng - loc1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  };

  const handleCallHospital = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleGetDirections = (hospital: Hospital) => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${hospital.lat},${hospital.lng}`;
    window.open(url, '_blank');
  };

  const getPinColor = (hospital: Hospital) => {
    if (hospital.isFree) return "#10b981"; // green
    return "#f97316"; // orange
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-gray-100 rounded-lg h-48 animate-pulse"></div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-100 rounded-lg h-20 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Urgency Note */}
      {urgencyHours && (
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-semibold text-orange-900">Visit within {urgencyHours} hours</p>
                <p className="text-sm text-orange-700">Based on symptom analysis</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Google Map */}
      <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
        <div className="h-64 relative">
          <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}>
            <Map
              defaultCenter={mapCenter}
              defaultZoom={12}
              gestureHandling="greedy"
              disableDefaultUI
            >
              {/* User location marker */}
              <AdvancedMarker position={userLocation}>
                <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
              </AdvancedMarker>

              {/* Hospital markers */}
              {hospitals.map((hospital) => (
                <AdvancedMarker
                  key={hospital.id}
                  position={{ lat: hospital.lat, lng: hospital.lng }}
                  onClick={() => setSelectedHospital(hospital)}
                >
                  <Pin
                    background={getPinColor(hospital)}
                    borderColor="white"
                    glyphColor="white"
                  />
                </AdvancedMarker>
              ))}

            {/* InfoWindow for selected hospital */}
            {selectedHospital && (
              <InfoWindow
                position={{ lat: selectedHospital.lat, lng: selectedHospital.lng }}
                onCloseClick={() => setSelectedHospital(null)}
              >
                <div className="p-3 min-w-[200px]">
                  <h3 className="font-semibold text-gray-900 mb-1">{selectedHospital.name}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-full font-medium",
                      selectedHospital.isFree 
                        ? "bg-green-100 text-green-800" 
                        : "bg-orange-100 text-orange-800"
                    )}>
                      {selectedHospital.isFree ? "Free" : "Private"}
                    </span>
                    {selectedHospital.hasNicu && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                        NICU
                      </span>
                    )}
                  </div>
                  
                  {selectedHospital.address && (
                    <p className="text-sm text-gray-600 mb-2">{selectedHospital.address}</p>
                  )}
                  
                  {selectedHospital.distance && (
                    <p className="text-sm text-gray-700 font-medium mb-3">
                      {selectedHospital.distance.toFixed(1)} km away
                    </p>
                  )}

                  <div className="flex gap-2">
                    {selectedHospital.phone && (
                      <Button
                        size="sm"
                        onClick={() => handleCallHospital(selectedHospital.phone!)}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                      >
                        <Phone className="w-3 h-3 mr-1" />
                        Call
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGetDirections(selectedHospital)}
                      className="flex-1"
                    >
                      <Navigation className="w-3 h-3 mr-1" />
                      Directions
                    </Button>
                  </div>
                </div>
              </InfoWindow>
            )}
          </Map>
        </APIProvider>
        </div>
      </div>

      {/* Hospital List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Nearby Hospitals ({hospitals.length})
        </h3>
        
        {hospitals.slice(0, 5).map((hospital) => (
          <Card key={hospital.id} className="border-gray-200 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{hospital.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                      "text-xs px-2 py-1 rounded-full font-medium",
                      hospital.isFree 
                        ? "bg-green-100 text-green-800" 
                        : "bg-orange-100 text-orange-800"
                    )}>
                      {hospital.isFree ? "Free" : "Private"}
                    </span>
                    {hospital.hasNicu && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                        NICU
                      </span>
                    )}
                    {hospital.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-current" />
                        <span className="text-xs text-gray-600">{hospital.rating}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {hospital.distance && (
                  <span className="text-sm font-medium text-gray-700">
                    {hospital.distance.toFixed(1)} km
                  </span>
                )}
              </div>

              {hospital.address && (
                <p className="text-sm text-gray-600 mb-3">{hospital.address}</p>
              )}

              <div className="flex gap-2">
                {hospital.phone && (
                  <Button
                    size="sm"
                    onClick={() => handleCallHospital(hospital.phone)}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm"
                  >
                    <Phone className="w-3 h-3 mr-1" />
                    Call
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleGetDirections(hospital)}
                  className="flex-1 text-sm"
                >
                  <Navigation className="w-3 h-3 mr-1" />
                  Directions
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {hospitals.length === 0 && (
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4 text-center">
              <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No hospitals found nearby</p>
              <p className="text-sm text-gray-500 mt-1">Try expanding the search radius</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
