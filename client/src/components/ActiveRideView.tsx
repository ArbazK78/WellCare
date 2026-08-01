import React, { useState, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, DirectionsRenderer, Marker } from '@react-google-maps/api';
import { MapPin, Navigation, PhoneCall, User, MessageSquare, ChevronUp, ChevronDown, X, AlertTriangle, LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGuideLocation } from '@/contexts/GuideLocationContext';
import { Booking } from '@/contexts/BookingContext';
import { parseLocation, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_LOADER_ID } from '@/lib/googleMapsLoader';
import { useAnimatedCoordinate } from '@/hooks/useAnimatedCoordinate';
import { distanceBetweenCoordinatesMeters } from '@/lib/geo';

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
const ROUTE_REFRESH_MS = 45_000;
const ROUTE_REFRESH_DISTANCE_METERS = 150;

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
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const { toast } = useToast();
  const { publishedLocation, publishError, trackingState, pageVisible, setActiveBookingId } = useGuideLocation();
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [routeMode, setRouteMode] = useState<'pickup' | 'dropoff' | null>(null);
  const [isArriving, setIsArriving] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const lastFittedRouteRef = useRef<string | null>(null);
  const lastRouteRequestedAtRef = useRef(0);
  const lastRouteOriginRef = useRef<{ lat: number; lng: number } | null>(null);

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
  const destinationData = parseLocation(booking.destinationAddress || '');
  const publishedLat = publishedLocation?.lat;
  const publishedLng = publishedLocation?.lng;
  const isArrived = booking.status === 'arrived';
  const isInProgress = booking.status === 'in_progress';
  const animatedGuideLocation = useAnimatedCoordinate(publishedLocation, 2400);

  useEffect(() => {
    setActiveBookingId(booking._id);
    return () => setActiveBookingId(null);
  }, [booking._id, setActiveBookingId]);

  useEffect(() => {
    if (!isLoaded || publishedLat == null || publishedLng == null) return;
    const currentOrigin = { lat: publishedLat, lng: publishedLng };
    // Marker updates are continuous; billable route refreshes are phase-based and throttled.
    const targetMode = isInProgress ? 'dropoff' : 'pickup';
    const now = Date.now();
    const movedMeters = distanceBetweenCoordinatesMeters(lastRouteOriginRef.current, currentOrigin);
    const routeIsFresh = now - lastRouteRequestedAtRef.current < ROUTE_REFRESH_MS;
    if (routeMode === targetMode && routeIsFresh && movedMeters < ROUTE_REFRESH_DISTANCE_METERS) return;

    const pickupPoint = pickupData.lat && pickupData.lng 
      ? { lat: pickupData.lat, lng: pickupData.lng } 
      : (pickupData.address || pickupData.name);

    let origin: google.maps.LatLngLiteral | string;
    let destination: google.maps.LatLngLiteral | string;

    if (targetMode === 'pickup') {
      origin = currentOrigin;
      destination = pickupPoint;
    } else {
      const dropoffPoint = destinationData.lat && destinationData.lng
        ? { lat: destinationData.lat, lng: destinationData.lng }
        : (destinationData.address || destinationData.name);
      origin = currentOrigin;
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
          lastRouteRequestedAtRef.current = Date.now();
          lastRouteOriginRef.current = currentOrigin;
          setDirections(result);
          setRouteMode(targetMode);
        } else {
          console.error(`Directions request failed due to ${status}`);
        }
      }
    );
  }, [isLoaded, publishedLat, publishedLng, isInProgress, routeMode, pickupData.lat, pickupData.lng, pickupData.address, pickupData.name, destinationData.lat, destinationData.lng, destinationData.address, destinationData.name]);

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

  const initialMapCenter = publishedLocation
    || (pickupData.lat && pickupData.lng ? { lat: pickupData.lat, lng: pickupData.lng } : null)
    || { lat: 20.5937, lng: 78.9629 };

  useEffect(() => {
    if (!isMapReady || !directions || !routeMode || !mapRef.current) return;

    const routeKey = `${booking._id}:${routeMode}`;
    if (lastFittedRouteRef.current === routeKey) return;

    const routeBounds = directions.routes[0]?.bounds;
    if (routeBounds) {
      mapRef.current.fitBounds(routeBounds, 48);
      lastFittedRouteRef.current = routeKey;
    }
  }, [booking._id, directions, isMapReady, routeMode]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full max-w-lg mx-auto overflow-hidden bg-background rounded-2xl shadow-xl relative mt-4 border border-border">
      
      {/* Map Area */}
      <div className="flex-1 min-h-[30%] w-full bg-muted relative">
        {!isLoaded ? (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-medium">
            Loading Map...
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={containerStyle}
            options={mapOptions}
            onLoad={(map) => {
              mapRef.current = map;
              map.setCenter(initialMapCenter);
              map.setZoom(16);
              setIsMapReady(true);
            }}
            onUnmount={() => {
              mapRef.current = null;
              setIsMapReady(false);
            }}
          >
            {directions && (
              <>
                <DirectionsRenderer 
                  directions={directions} 
                  options={{
                    suppressMarkers: true,
                    preserveViewport: true,
                    polylineOptions: {
                      strokeColor: '#3b82f6',
                      strokeWeight: 6,
                      strokeOpacity: 0.8,
                    }
                  }}
                />

                {directions.routes[0]?.legs[0]?.end_location && (
                  <Marker 
                    position={directions.routes[0].legs[0].end_location}
                    icon={(!isInProgress) ? getPinIcon('#3b82f6') : getPinIcon('#10b981')}
                  />
                )}
              </>
            )}
            {animatedGuideLocation && (
              <Marker
                position={{ lat: animatedGuideLocation.lat, lng: animatedGuideLocation.lng }}
                icon={getVehicleIcon(booking.vehicleType || 'cab')}
                zIndex={100}
              />
            )}
          </GoogleMap>
        )}
        <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-full border border-border/80 bg-background/90 px-3 py-1.5 text-xs font-semibold text-foreground shadow-md backdrop-blur">
          <span className={`mr-2 inline-block h-2 w-2 rounded-full ${trackingState === "live" ? "bg-emerald-500 animate-pulse" : trackingState === "error" ? "bg-red-500" : "bg-amber-400"}`} />
          {!pageVisible
            ? "Keep this page open for live GPS"
            : publishError?.code === "IMPLAUSIBLE_MOVEMENT"
              ? "GPS jump rejected"
              : publishError?.code === "RATE_LIMITED"
                ? "Location updates settling"
                : publishError?.code === "OUT_OF_ORDER"
                  ? "Waiting for newer GPS"
                  : trackingState === "live"
                    ? "Live location sharing"
                    : trackingState === "reconnecting"
                      ? "Reconnecting tracking"
                      : trackingState === "delayed"
                        ? "Waiting for fresh GPS"
                        : trackingState === "error"
                          ? "Location sharing interrupted"
                          : "Location checkpointing"}
        </div>
        {publishedLocation && (
          <button
            type="button"
            aria-label="Recenter map on my location"
            title="Recenter on my location"
            onClick={() => {
              mapRef.current?.panTo({ lat: publishedLocation.lat, lng: publishedLocation.lng });
              mapRef.current?.setZoom(16);
            }}
            className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-md backdrop-blur transition hover:bg-accent"
          >
            <LocateFixed className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Bottom Dashboard Panel (Slide-up Drawer) */}
      <div className="bg-card text-card-foreground rounded-t-3xl -mt-6 relative z-10 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_-14px_45px_rgba(0,0,0,0.38)] transition-all duration-300 ease-in-out max-h-[70%] overflow-y-auto shrink-0 border-t border-border">
        {/* Drawer Handle */}
        <button 
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className="w-full py-2 flex items-center justify-center -mt-4 mb-2 cursor-pointer focus:outline-none"
        >
          <div className="w-12 h-1.5 bg-muted rounded-full flex items-center justify-center">
            {isDrawerOpen ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronUp size={14} className="text-muted-foreground" />}
          </div>
        </button>
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-1">
              {isInProgress ? "In Progress" : isArrived ? "Waiting for Customer" : "En Route to Pickup"}
            </p>
            <h2 className="text-2xl font-bold text-foreground line-clamp-1">{pickupData.name}</h2>
            {pickupData.address && (
              <p className="text-muted-foreground text-sm mt-1 line-clamp-1">{pickupData.address}</p>
            )}
          </div>
        </div>

        <div className="bg-muted/55 dark:bg-muted/35 p-4 rounded-xl flex items-center justify-between mb-6 border border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/15 rounded-full flex items-center justify-center text-primary">
              <User size={20} />
            </div>
            <div>
              <p className="font-bold text-foreground">{booking.name || booking.customer?.name || "Customer"}</p>
              <p className="text-xs text-muted-foreground font-medium">Passenger</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full w-10 h-10 border-border bg-background/60 text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-background/30"
              onClick={() => {
                const phone = booking.contactPhone || booking.customer?.phone || (booking as any).phone;
                if (phone) window.open(`tel:${phone}`);
              }}
            >
              <PhoneCall size={18} />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full w-10 h-10 border-border bg-background/60 text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-background/30"
              onClick={() => toast({ title: "Coming soon", description: "In-app chat will be available in the next update." })}
            >
              <MessageSquare size={18} />
            </Button>
          </div>
        </div>

        {/* Expanded Drawer Content */}
        <div className={cn("overflow-hidden transition-all duration-300 ease-in-out", isDrawerOpen ? "max-h-[500px] opacity-100 mb-6" : "max-h-0 opacity-0")}>
          <div className="space-y-4 pt-4 border-t border-border">
            {/* Destination */}
            {booking.destinationAddress && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Dropoff</p>
                <p className="font-medium text-foreground line-clamp-1">{parseLocation(booking.destinationAddress).name}</p>
                <p className="text-sm text-muted-foreground line-clamp-1">{parseLocation(booking.destinationAddress).address}</p>
              </div>
            )}
            
            {/* Fare Estimate */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Estimated Fare</p>
              <p className="font-bold text-foreground text-lg">₹{booking.totalFare || 0}</p>
            </div>

            {/* Cancel Button */}
            <Button 
              variant="outline" 
              className="w-full mt-2 bg-transparent text-destructive border-destructive/35 hover:bg-destructive/10 hover:text-destructive dark:text-red-400 dark:border-red-500/35 dark:hover:bg-red-500/10 dark:hover:text-red-300"
              onClick={() => setIsCancelModalOpen(true)}
            >
              Cancel Ride
            </Button>
          </div>
        </div>

        {isInProgress ? (
          <Button 
            className="w-full py-6 rounded-xl text-lg font-bold !bg-emerald-600 hover:!bg-emerald-700 !text-white shadow-lg shadow-emerald-600/25 transition-all active:scale-[0.98] disabled:!bg-muted disabled:!text-muted-foreground disabled:opacity-100 disabled:shadow-none"
            onClick={handleCompleteClick}
            disabled={isCompleting}
          >
            {isCompleting ? "Completing..." : "Complete Trip"}
          </Button>
        ) : isArrived ? (
          <div className="bg-muted/55 dark:bg-muted/35 border border-border rounded-xl p-4 flex flex-col items-center">
            <p className="text-sm font-semibold text-foreground mb-3 text-center">
              Enter {booking.name || "Customer"}'s Safety PIN
            </p>
            <div className="flex gap-2 w-full max-w-[200px] mb-4">
              <Input 
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="____"
                className="text-center text-2xl tracking-[0.5em] font-bold h-12 !bg-background !text-foreground border-border placeholder:text-muted-foreground focus-visible:ring-primary"
                type="tel"
              />
            </div>
            <Button 
              className="w-full py-5 rounded-lg text-md font-bold !bg-primary hover:!bg-primary/90 !text-primary-foreground shadow-md transition-all active:scale-[0.98] disabled:!bg-muted disabled:!text-muted-foreground disabled:opacity-100 disabled:shadow-none"
              onClick={handleStartTripSubmit}
              disabled={otpInput.length !== 4 || isStartingTrip}
            >
              {isStartingTrip ? "Starting..." : "Start Trip"}
            </Button>
          </div>
        ) : (
          <Button 
            className="w-full py-6 rounded-xl text-lg font-bold !bg-primary hover:!bg-primary/90 !text-primary-foreground shadow-lg shadow-primary/25 transition-all active:scale-[0.98] disabled:!bg-muted disabled:!text-muted-foreground disabled:opacity-100 disabled:shadow-none"
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
          <div className="bg-card text-card-foreground w-full max-w-lg rounded-t-2xl p-6 animate-in slide-in-from-bottom-8 duration-300 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={24} />
                Cancel Ride
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setIsCancelModalOpen(false)}>
                <X size={20} />
              </Button>
            </div>
            <p className="text-muted-foreground mb-6">Are you sure you want to cancel this ride? This will pass the booking to the next available guide.</p>
            
            <div className="space-y-2 mb-6">
              {CANCEL_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setCancelReason(reason)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg border transition-all duration-200",
                    cancelReason === reason 
                      ? "border-destructive bg-destructive/10 text-destructive font-medium shadow-sm"
                      : "border-border hover:bg-muted text-foreground"
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
