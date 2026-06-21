import React, { useState, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, DirectionsRenderer, Marker } from '@react-google-maps/api';
import { PhoneCall, ChevronUp, ChevronDown, User, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Booking } from '@/contexts/BookingContext';
import { parseLocation } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const libraries: ("places")[] = ["places"];

const mapOptions = {
  disableDefaultUI: true,
  gestureHandling: "greedy",
  zoomControl: false,
  mapTypeControl: false,
  scaleControl: false,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: false,
};

const getVehicleIcon = (type: string) => {
  const isScooter = type === 'scooter';
  const emoji = isScooter ? '🛵' : '🚖';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="white" stroke="#3b82f6" stroke-width="3"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="20">${emoji}</text></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(40, 40),
    anchor: new window.google.maps.Point(20, 20),
  };
};

const getPinIcon = (color: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(32, 32),
    anchor: new window.google.maps.Point(16, 32),
  };
};

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '16px',
};

interface UserActiveRideViewProps {
  booking: Booking;
  onCancelClick: (bookingId: string) => void;
  onContactGuide: (guide: any) => void;
}

export default function UserActiveRideView({ booking, onCancelClick, onContactGuide }: UserActiveRideViewProps) {
  const { user } = useAuth();
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [routeMode, setRouteMode] = useState<'pickup' | 'dropoff' | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const pickupData = parseLocation(booking.pickupLocation || booking.location || '');
  const destinationData = parseLocation((booking as any).destinationAddress || '');
  
  const isAccepted = booking.status === 'accepted';
  const isArrived = booking.status === 'arrived';
  const isInProgress = booking.status === 'in_progress';

  // For the guide's location when they are en route to pickup, 
  // since we don't have live GPS streaming yet, we will mock their start location
  // slightly offset from the pickup location to simulate travel, or just use a fixed default.
  // In a real app, this would be a live GPS coordinate passed via WebSocket.
  const mockGuideLocation = { 
    lat: (pickupData.lat || 23.0225) + 0.01, 
    lng: (pickupData.lng || 72.5714) + 0.01 
  };

  const guideData = booking.guide ? parseLocation((booking.guide as any).location || '') : null;
  
  let guideLocationFromDb: any;
  if (guideData?.lat && guideData?.lng) {
    guideLocationFromDb = { lat: guideData.lat, lng: guideData.lng };
  } else if (guideData?.address) {
    guideLocationFromDb = guideData.address;
  } else if (guideData?.name && guideData.name !== "Unknown") {
    guideLocationFromDb = guideData.name;
  } else {
    guideLocationFromDb = mockGuideLocation;
  }

  useEffect(() => {
    if (!isLoaded) return;

    const targetMode = isInProgress ? 'dropoff' : 'pickup';

    if (routeMode === targetMode && directions) return;

    const pickupPoint = pickupData.lat && pickupData.lng 
      ? { lat: pickupData.lat, lng: pickupData.lng } 
      : (pickupData.address || pickupData.name);

    let origin: google.maps.LatLngLiteral | string;
    let destination: google.maps.LatLngLiteral | string;

    if (targetMode === 'pickup') {
      origin = guideLocationFromDb;
      destination = pickupPoint;
    } else {
      const dropoffPoint = destinationData.lat && destinationData.lng
        ? { lat: destinationData.lat, lng: destinationData.lng }
        : (destinationData.address || destinationData.name);
      
      origin = pickupPoint;
      destination = dropoffPoint;
    }

    if (!origin || !destination) return;

    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
          setRouteMode(targetMode);
        } else {
          console.error(`Directions request failed due to ${status}`);
        }
      }
    );
  }, [isLoaded, isInProgress, routeMode, directions, booking, pickupData.lat, pickupData.lng, pickupData.address, pickupData.name, destinationData.lat, destinationData.lng, destinationData.address, destinationData.name]);

  const defaultCenter = pickupData.lat && pickupData.lng ? { lat: pickupData.lat, lng: pickupData.lng } : { lat: 23.0225, lng: 72.5714 };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] w-full max-w-lg mx-auto overflow-hidden bg-gray-50 rounded-2xl shadow-xl relative mt-4 border border-gray-200">
      
      {/* Map Area */}
      <div className="flex-1 min-h-[30%] w-full bg-gray-200 relative">
        {!isLoaded ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 font-medium">
            Loading Map...
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={defaultCenter}
            zoom={14}
            options={mapOptions}
            onLoad={(map) => { mapRef.current = map; }}
          >
            {directions && (
              <>
                <DirectionsRenderer 
                  directions={directions} 
                  options={{
                    suppressMarkers: true,
                    polylineOptions: {
                      strokeColor: '#3b82f6',
                      strokeWeight: 5,
                      strokeOpacity: 0.8,
                    }
                  }}
                />
                {directions.routes[0]?.legs[0]?.start_location && (
                  <Marker 
                    position={directions.routes[0].legs[0].start_location}
                    icon={(!isInProgress) ? getVehicleIcon(booking.vehicleType || 'cab') : getPinIcon('#3b82f6')}
                  />
                )}
                {directions.routes[0]?.legs[0]?.end_location && (
                  <Marker 
                    position={directions.routes[0].legs[0].end_location}
                    icon={(!isInProgress) ? getPinIcon('#3b82f6') : getPinIcon('#10b981')}
                  />
                )}
              </>
            )}
          </GoogleMap>
        )}
      </div>

      {/* Drawer Container */}
      <div className="bg-white rounded-t-3xl -mt-6 relative z-10 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] transition-all duration-300 ease-in-out max-h-[70%] overflow-y-auto shrink-0 border-t border-gray-100">
        
        {/* Pull Handle */}
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6 cursor-pointer" onClick={() => setIsDrawerOpen(!isDrawerOpen)} />

        {/* Status Header */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            <p className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-1">
              {isAccepted ? "Guide En Route" : isArrived ? "Guide Arrived" : "In Progress"}
            </p>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {isAccepted ? "Heading to pickup" : isArrived ? "Meet your guide" : "Heading to drop-off"}
            </h2>
          </div>
          <button 
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 transition-colors"
          >
            {isDrawerOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>

        {/* Primary Info (Always visible) */}
        <div className="flex items-center gap-4 mb-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
          {booking.guide ? (
            <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-200 border-2 border-white shadow-sm shrink-0">
              <img src={(booking.guide as any).image} alt={(booking.guide as any).name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center shrink-0 border-2 border-white shadow-sm">
              <User className="h-6 w-6 text-blue-400" />
            </div>
          )}
          
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-900 leading-tight">{(booking.guide as any)?.name || "Your Guide"}</h3>
            <div className="flex items-center text-sm font-medium text-gray-600 mt-1">
              <span className="flex items-center text-yellow-500 mr-2">
                <span className="mr-1">★</span> {(booking.guide as any)?.rating || "New"}
              </span>
              {booking.vehicleType && (
                <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                  {booking.vehicleType === 'scooter' ? '🛵 Scooter' : '🚖 Cab'}
                </span>
              )}
            </div>
          </div>
          
          {booking.guide && (
            <Button 
              onClick={() => onContactGuide(booking.guide)}
              size="icon" 
              className="rounded-full w-12 h-12 bg-blue-600 hover:bg-blue-700 shadow-md shrink-0 transition-transform active:scale-95"
            >
              <PhoneCall className="w-5 h-5 text-white" />
            </Button>
          )}
        </div>

        {/* Safety PIN - Show prominently before trip starts */}
        {!isInProgress && user?.safetyPin && (
          <div className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 text-center mb-6 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Safety PIN</p>
            <p className="text-3xl font-black text-white tracking-[0.3em]">{user.safetyPin}</p>
            <p className="text-xs text-gray-500 mt-2">Share this with your guide to start the trip</p>
          </div>
        )}

        {/* Collapsible Section */}
        {isDrawerOpen && (
          <div className="space-y-6 pt-2 animate-in slide-in-from-top-4 fade-in duration-200">
            {/* Route Details */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Trip Details</h4>
              <div className="space-y-4">
                <div className="flex gap-3 relative">
                  <div className="absolute left-[9px] top-[24px] bottom-[-16px] w-[2px] bg-gray-200" />
                  <div className="w-5 h-5 rounded-full bg-blue-100 border-2 border-blue-600 z-10 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{pickupData.name || "Pickup Location"}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{pickupData.address}</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 border-2 border-green-600 z-10 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{destinationData.name || "Drop-off Location"}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{destinationData.address}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Estimated Fare */}
            <div className="bg-green-50/50 rounded-xl p-4 border border-green-100 flex justify-between items-center">
              <span className="text-sm font-bold text-gray-900 uppercase tracking-wider">Estimated Fare</span>
              <span className="text-xl font-black text-green-700">₹{(booking as any).totalFare || 0}</span>
            </div>

            {/* Cancel Button */}
            {!isInProgress && (
              <Button 
                variant="outline" 
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 h-12 font-semibold transition-colors"
                onClick={() => onCancelClick(booking._id)}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Cancel Ride
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
