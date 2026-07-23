import React, { useState, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, DirectionsRenderer, Marker } from '@react-google-maps/api';
import { MapPin, Navigation, PhoneCall, User, MessageSquare, ChevronUp, ChevronDown, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Booking } from '@/contexts/BookingContext';
import { parseLocation, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const libraries: ("places")[] = ["places"];

// Map options for a locked, clean navigation view
const mapOptions = {
  disableDefaultUI: true,
  gestureHandling: "greedy", // Allow panning/zooming as requested
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
  onStartTrip: (bookingId: string, pin: string) => Promise<boolean>;
  onCompleteTrip: (bookingId: string) => Promise<void>;
}

export default function ActiveRideView({ booking, onArrive, onCancel, onStartTrip, onCompleteTrip }: ActiveRideViewProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const { toast } = useToast();
  const { location: guideLocation } = useGeolocation();
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [routeMode, setRouteMode] = useState<'pickup' | 'dropoff' | null>(null);
  const [isArriving, setIsArriving] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  
  const [otpInput, setOtpInput] = useState("");
  const [isStartingTrip, setIsStartingTrip] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const CANCEL_REASONS = [
    "Customer not at pickup location",
    "Vehicle issue / Breakdown",
    "Cannot find the address",
    "Accidental Accept",
    "Other"
  ];

  const pickupData = parseLocation(booking.pickupLocation || booking.location || '');
  const isArrived = booking.status === 'arrived';
  const isInProgress = booking.status === 'in_progress';

  useEffect(() => {
    if (!isLoaded || !guideLocation) return;

    // Determine what route we should be showing right now
    const targetMode = isInProgress ? 'dropoff' : 'pickup';

    // If we've already calculated this exact route mode, don't do it again
    if (routeMode === targetMode && directions) return;

    const pickupPoint = pickupData.lat && pickupData.lng 
      ? { lat: pickupData.lat, lng: pickupData.lng } 
      : (pickupData.address || pickupData.name);

    let origin: google.maps.LatLngLiteral | string;
    let destination: google.maps.LatLngLiteral | string;

    if (targetMode === 'pickup') {
      origin = { lat: guideLocation.lat, lng: guideLocation.lng };
      destination = pickupPoint;
    } else {
      // In progress -> pickup to dropoff
      const destData = parseLocation((booking as any).destinationAddress || '');
      const dropoffPoint = destData.lat && destData.lng
        ? { lat: destData.lat, lng: destData.lng }
        : (destData.address || destData.name);
      
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
  }, [isLoaded, guideLocation, isInProgress, routeMode, directions, booking, pickupData.lat, pickupData.lng, pickupData.address, pickupData.name]);

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

  const handleStartTripSubmit = async () => {
    if (otpInput.length !== 4) return;
    setIsStartingTrip(true);
    const success = await onStartTrip(booking._id, otpInput);
    if (!success) {
      setOtpInput("");
    }
    setIsStartingTrip(false);
  };

  const handleCompleteClick = async () => {
    setIsCompleting(true);
    await onCompleteTrip(booking._id);
    setIsCompleting(false);
  };

  // Center map on guide if no route is loaded yet
  const defaultCenter = guideLocation || { lat: 20.5937, lng: 78.9629 };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full max-w-lg mx-auto overflow-hidden bg-gray-50 rounded-2xl shadow-xl relative mt-4 border border-gray-200">
      
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
            zoom={16}
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
                      strokeWeight: 6,
                      strokeOpacity: 0.8,
                    }
                  }}
                />
                {directions.routes[0]?.legs[0]?.start_location && (
                  <Marker 
                    position={directions.routes[0].legs[0].start_location}
                    icon={(!isInProgress) ? getVehicleIcon(booking.vehicleType || 'cab') : getPinIcon('#3b82f6')}
                    zIndex={100}
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

      {/* Bottom Dashboard Panel (Slide-up Drawer) */}
      <div className="bg-white rounded-t-3xl -mt-6 relative z-10 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] transition-all duration-300 ease-in-out max-h-[70%] overflow-y-auto shrink-0">
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
              {isInProgress ? "In Progress" : isArrived ? "Waiting for Customer" : "En Route to Pickup"}
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
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full w-10 h-10 border-gray-300 text-gray-700"
              onClick={() => {
                const phone = booking.customer?.phone || (booking as any).phone;
                if (phone) window.open(`tel:${phone}`);
              }}
            >
              <PhoneCall size={18} />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full w-10 h-10 border-gray-300 text-gray-700"
              onClick={() => toast({ title: "Coming soon", description: "In-app chat will be available in the next update." })}
            >
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
              <p className="font-bold text-gray-900 text-lg">₹{booking.totalFare || 0}</p>
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

        {isInProgress ? (
          <Button 
            className="w-full py-6 rounded-xl text-lg font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/30 transition-all active:scale-[0.98]"
            onClick={handleCompleteClick}
            disabled={isCompleting}
          >
            {isCompleting ? "Completing..." : "Complete Trip"}
          </Button>
        ) : isArrived ? (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col items-center">
            <p className="text-sm font-semibold text-blue-800 mb-3 text-center">
              Enter {booking.name || "Customer"}'s Safety PIN
            </p>
            <div className="flex gap-2 w-full max-w-[200px] mb-4">
              <Input 
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="____"
                className="text-center text-2xl tracking-[0.5em] font-bold h-12 bg-white"
                type="tel"
              />
            </div>
            <Button 
              className="w-full py-5 rounded-lg text-md font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all active:scale-[0.98]"
              onClick={handleStartTripSubmit}
              disabled={otpInput.length !== 4 || isStartingTrip}
            >
              {isStartingTrip ? "Starting..." : "Start Trip"}
            </Button>
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
