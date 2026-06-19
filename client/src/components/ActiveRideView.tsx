import React, { useState, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, DirectionsRenderer, Marker } from '@react-google-maps/api';
import { MapPin, Navigation, PhoneCall, User, MessageSquare, ChevronUp, ChevronDown, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Booking } from '@/contexts/BookingContext';
import { parseLocation, cn } from '@/lib/utils';

const libraries: ("places")[] = ["places"];

// Map options for a locked, clean navigation view
const mapOptions = {
  disableDefaultUI: true,
  gestureHandling: "none", // Lock pan/zoom for now as requested
  zoomControl: false,
  mapTypeControl: false,
  scaleControl: false,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: false,
};

// Map container styling with rounded corners
const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '16px',
};

interface ActiveRideViewProps {
  booking: Booking;
  onArrive: (bookingId: string) => Promise<void>;
  onCancel: (bookingId: string, reason: string) => Promise<void>;
}

export default function ActiveRideView({ booking, onArrive, onCancel }: ActiveRideViewProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const { location: guideLocation } = useGeolocation();
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [isArriving, setIsArriving] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const CANCEL_REASONS = [
    "Customer not at pickup location",
    "Vehicle issue / Breakdown",
    "Cannot find the address",
    "Accidental Accept",
    "Other"
  ];

  const pickupData = parseLocation(booking.pickupLocation || booking.location || '');
  const isArrived = booking.status === 'arrived';

  useEffect(() => {
    // Only calculate the route once when we have both locations and API is loaded
    if (!isLoaded || !guideLocation || directions || isArrived) return;

    const pickupPoint = pickupData.lat && pickupData.lng 
      ? { lat: pickupData.lat, lng: pickupData.lng } 
      : (pickupData.address || pickupData.name);

    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: { lat: guideLocation.lat, lng: guideLocation.lng },
        destination: pickupPoint,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
        } else {
          console.error(`Directions request failed due to ${status}`);
        }
      }
    );
  }, [isLoaded, guideLocation, directions, pickupData, isArrived]);

  const handleArriveClick = async () => {
    setIsArriving(true);
    await onArrive(booking._id);
    setIsArriving(false);
  };

  const handleCancelSubmit = async () => {
    if (!cancelReason) return;
    setIsCancelling(true);
    await onCancel(booking._id, cancelReason);
    setIsCancelling(false);
    setIsCancelModalOpen(false);
  };

  // Center map on guide if no route is loaded yet
  const defaultCenter = guideLocation || { lat: 20.5937, lng: 78.9629 };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full max-w-lg mx-auto overflow-hidden bg-gray-50 rounded-2xl shadow-xl relative mt-4 border border-gray-200">
      
      {/* Map Area */}
      <div className="flex-1 w-full bg-gray-200 relative">
        {!isLoaded ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500 font-medium">
            Loading Map...
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={defaultCenter}
            zoom={16}
            options={mapOptions}
            onLoad={(map) => { mapRef.current = map; }}
          >
            {directions && (
              <DirectionsRenderer 
                directions={directions} 
                options={{
                  suppressMarkers: true, // We will draw our own markers
                  polylineOptions: {
                    strokeColor: '#3b82f6', // Blue route line
                    strokeWeight: 6,
                    strokeOpacity: 0.8,
                  }
                }}
              />
            )}

            {/* Guide Location Marker (Live) */}
            {guideLocation && (
              <Marker
                position={{ lat: guideLocation.lat, lng: guideLocation.lng }}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: '#2563eb',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 3,
                }}
                zIndex={100}
              />
            )}

            {/* Pickup Marker */}
            {pickupData.lat && pickupData.lng && (
              <Marker
                position={{ lat: pickupData.lat, lng: pickupData.lng }}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 7,
                  fillColor: '#000000',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 2,
                }}
              />
            )}
          </GoogleMap>
        )}
      </div>

      {/* Bottom Dashboard Panel (Slide-up Drawer) */}
      <div className="bg-white rounded-t-3xl -mt-6 relative z-10 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] flex flex-col transition-all duration-300 ease-in-out">
        {/* Drawer Handle */}
        <button 
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className="w-full py-2 flex items-center justify-center -mt-4 mb-2 cursor-pointer focus:outline-none"
        >
          <div className="w-12 h-1.5 bg-gray-200 rounded-full flex items-center justify-center">
            {isDrawerOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronUp size={14} className="text-gray-400" />}
          </div>
        </button>
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-1">
              {isArrived ? "Waiting for Customer" : "En Route to Pickup"}
            </p>
            <h2 className="text-2xl font-bold text-gray-900 line-clamp-1">{pickupData.name}</h2>
            {pickupData.address && (
              <p className="text-gray-500 text-sm mt-1 line-clamp-1">{pickupData.address}</p>
            )}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl flex items-center justify-between mb-6 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <User size={20} />
            </div>
            <div>
              <p className="font-bold text-gray-900">{booking.name || booking.customer?.name || "Customer"}</p>
              <p className="text-xs text-gray-500 font-medium">Passenger</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="rounded-full w-10 h-10 border-gray-300 text-gray-700">
              <PhoneCall size={18} />
            </Button>
            <Button variant="outline" size="icon" className="rounded-full w-10 h-10 border-gray-300 text-gray-700">
              <MessageSquare size={18} />
            </Button>
          </div>
        </div>

        {/* Expanded Drawer Content */}
        <div className={cn("overflow-hidden transition-all duration-300 ease-in-out", isDrawerOpen ? "max-h-[500px] opacity-100 mb-6" : "max-h-0 opacity-0")}>
          <div className="space-y-4 pt-4 border-t border-gray-100">
            {/* Destination */}
            {booking.destinationAddress && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Dropoff</p>
                <p className="font-medium text-gray-900 line-clamp-1">{parseLocation(booking.destinationAddress).name}</p>
                <p className="text-sm text-gray-500 line-clamp-1">{parseLocation(booking.destinationAddress).address}</p>
              </div>
            )}
            
            {/* Fare Estimate */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Estimated Fare</p>
              <p className="font-bold text-gray-900 text-lg">₹ 250 - ₹ 300</p>
            </div>

            {/* Cancel Button */}
            <Button 
              variant="outline" 
              className="w-full mt-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={() => setIsCancelModalOpen(true)}
            >
              Cancel Ride
            </Button>
          </div>
        </div>

        {isArrived ? (
          <div className="w-full py-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 text-center font-bold flex items-center justify-center gap-2">
            <MapPin size={20} />
            Arrived at Location
          </div>
        ) : (
          <Button 
            className="w-full py-6 rounded-xl text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98]"
            onClick={handleArriveClick}
            disabled={isArriving}
          >
            {isArriving ? "Updating..." : (
              <span className="flex items-center gap-2">
                <Navigation size={22} className="fill-current" />
                Tap to Arrive
              </span>
            )}
          </Button>
        )}
      </div>

      {/* Cancellation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-6 animate-in slide-in-from-bottom-8 duration-300 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={24} />
                Cancel Ride
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setIsCancelModalOpen(false)}>
                <X size={20} />
              </Button>
            </div>
            <p className="text-gray-600 mb-6">Are you sure you want to cancel this ride? This will pass the booking to the next available guide.</p>
            
            <div className="space-y-2 mb-6">
              {CANCEL_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setCancelReason(reason)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg border transition-all duration-200",
                    cancelReason === reason 
                      ? "border-red-500 bg-red-50 text-red-700 font-medium shadow-sm" 
                      : "border-gray-200 hover:bg-gray-50 text-gray-700"
                  )}
                >
                  {reason}
                </button>
              ))}
            </div>

            <Button 
              className="w-full py-6 text-lg font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20"
              disabled={!cancelReason || isCancelling}
              onClick={handleCancelSubmit}
            >
              {isCancelling ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
