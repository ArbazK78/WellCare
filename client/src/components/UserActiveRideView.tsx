import React, { useState, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, DirectionsRenderer, Marker } from '@react-google-maps/api';
import { PhoneCall, ChevronUp, ChevronDown, User, AlertTriangle, LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Booking } from '@/contexts/BookingContext';
import { parseLocation } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_LOADER_ID } from '@/lib/googleMapsLoader';
import { useLiveBookingTracking, LiveTrackingLocation } from '@/hooks/useLiveBookingTracking';
import { useAnimatedCoordinate } from '@/hooks/useAnimatedCoordinate';
import { distanceBetweenCoordinatesMeters } from '@/lib/geo';

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

const ROUTE_REFRESH_MS = 45_000;
const ROUTE_REFRESH_DISTANCE_METERS = 150;

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
    id: GOOGLE_MAPS_LOADER_ID,
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [routeMode, setRouteMode] = useState<'pickup' | 'dropoff' | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const lastFittedRouteRef = useRef<string | null>(null);
  const lastRouteRequestedAtRef = useRef(0);
  const lastRouteOriginRef = useRef<{ lat: number; lng: number } | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const pickupData = parseLocation(booking.pickupLocation || booking.location || '');
  const destinationData = parseLocation((booking as any).destinationAddress || '');
  
  const isAccepted = booking.status === 'accepted';
  const isArrived = booking.status === 'arrived';
  const isInProgress = booking.status === 'in_progress';
  const trackingEnabled = isAccepted || isArrived || isInProgress;
  const liveTracking = useLiveBookingTracking(booking._id, trackingEnabled);

  const storedGuideLocation = booking.guide?.currentLocation;
  const storedGuideLocationAt = storedGuideLocation?.updatedAt
    ? new Date(storedGuideLocation.updatedAt).getTime()
    : 0;
  const hasGuideLocation = Boolean(
    storedGuideLocation
    && Number.isFinite(storedGuideLocation.lat)
    && Number.isFinite(storedGuideLocation.lng)
    && Number.isFinite(storedGuideLocationAt)
    && Date.now() - storedGuideLocationAt <= 45_000
  );
  const guideLocationFromDb: LiveTrackingLocation | null = hasGuideLocation
    ? {
        lat: storedGuideLocation!.lat,
        lng: storedGuideLocation!.lng,
        accuracy: storedGuideLocation!.accuracy,
        capturedAt: storedGuideLocationAt,
        serverReceivedAt: storedGuideLocationAt,
        sequence: 0,
        quality: storedGuideLocation!.accuracy <= 500 ? 'good' : 'degraded',
      }
    : null;
  const latestGuideLocation = liveTracking.location || guideLocationFromDb;
  const latestGuideLat = latestGuideLocation?.lat;
  const latestGuideLng = latestGuideLocation?.lng;
  const animatedGuideLocation = useAnimatedCoordinate(latestGuideLocation, 2400);

  useEffect(() => {
    if (!isLoaded) return;

    const targetMode = isInProgress ? 'dropoff' : 'pickup';
    const currentOrigin = latestGuideLat == null || latestGuideLng == null
      ? null
      : { lat: latestGuideLat, lng: latestGuideLng };
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
      if (!currentOrigin) {
        setDirections(null);
        setRouteMode(null);
        return;
      }
      origin = currentOrigin;
      destination = pickupPoint;
    } else {
      const dropoffPoint = destinationData.lat && destinationData.lng
        ? { lat: destinationData.lat, lng: destinationData.lng }
        : (destinationData.address || destinationData.name);
      
      if (!currentOrigin) return;
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
    // FM-3 fix: Removed `booking` and `directions` from dependency array to prevent infinite re-fetches on poll
  }, [isLoaded, isInProgress, routeMode, latestGuideLat, latestGuideLng, pickupData.lat, pickupData.lng, pickupData.address, pickupData.name, destinationData.lat, destinationData.lng, destinationData.address, destinationData.name]);

  const initialMapCenter = latestGuideLocation
    ? { lat: latestGuideLocation.lat, lng: latestGuideLocation.lng }
    : pickupData.lat && pickupData.lng
      ? { lat: pickupData.lat, lng: pickupData.lng }
      : { lat: 23.0225, lng: 72.5714 };

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
    <div className="flex flex-col h-[calc(100vh-80px)] w-full max-w-lg mx-auto overflow-hidden bg-background rounded-2xl shadow-xl relative mt-4 border border-border">
      
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
              map.setZoom(14);
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
                      strokeWeight: 5,
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
          <span className={`mr-2 inline-block h-2 w-2 rounded-full ${!liveTracking.stale && liveTracking.connectionState === "connected" ? "bg-emerald-500 animate-pulse" : liveTracking.connectionState === "error" ? "bg-red-500" : "bg-amber-400"}`} />
          {!latestGuideLocation ? "Waiting for guide location" : liveTracking.stale ? "Location temporarily delayed" : liveTracking.location?.quality === "degraded" ? "Live · weak GPS accuracy" : "Live guide location"}
        </div>
        {latestGuideLocation && (
          <button
            type="button"
            aria-label="Recenter map on guide"
            title="Recenter on guide"
            onClick={() => {
              mapRef.current?.panTo({ lat: latestGuideLocation.lat, lng: latestGuideLocation.lng });
              mapRef.current?.setZoom(16);
            }}
            className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full border border-border/80 bg-background/90 text-foreground shadow-md backdrop-blur transition hover:bg-accent"
          >
            <LocateFixed className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Drawer Container */}
      <div className="bg-card text-card-foreground rounded-t-3xl -mt-6 relative z-10 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_-14px_45px_rgba(0,0,0,0.38)] transition-all duration-300 ease-in-out max-h-[70%] overflow-y-auto shrink-0 border-t border-border">
        
        {/* Pull Handle */}
        <div className="w-12 h-1.5 bg-muted-foreground/40 rounded-full mx-auto mb-6 cursor-pointer" onClick={() => setIsDrawerOpen(!isDrawerOpen)} />

        {/* Status Header */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            <p className="text-xs font-bold tracking-widest text-primary uppercase mb-1">
              {isAccepted ? "Guide En Route" : isArrived ? "Guide Arrived" : "In Progress"}
            </p>
            <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
              {isAccepted ? "Heading to pickup" : isArrived ? "Meet your guide" : "Heading to drop-off"}
            </h2>
          </div>
          <button 
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="p-2 bg-muted rounded-full text-foreground hover:bg-accent transition-colors border border-border"
          >
            {isDrawerOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>

        {/* Primary Info (Always visible) */}
        <div className="flex items-center gap-4 mb-6 bg-muted/55 dark:bg-muted/35 p-4 rounded-xl border border-border">
          {booking.guide ? (
            <div className="w-14 h-14 rounded-full overflow-hidden bg-muted border-2 border-background shadow-sm shrink-0">
              <img src={(booking.guide as any).image} alt={(booking.guide as any).name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center shrink-0 border-2 border-background shadow-sm">
              <User className="h-6 w-6 text-primary" />
            </div>
          )}
          
          <div className="flex-1">
            <h3 className="font-bold text-lg text-foreground leading-tight">{(booking.guide as any)?.name || "Your Guide"}</h3>
            <div className="flex items-center text-sm font-medium text-muted-foreground mt-1">
              <span className="flex items-center text-yellow-500 mr-2">
                <span className="mr-1">★</span> {(booking.guide as any)?.rating || "New"}
              </span>
              {booking.vehicleType && (
                <span className="bg-muted text-foreground px-2 py-0.5 rounded-full text-xs">
                  {booking.vehicleType === 'scooter' ? '🛵 Scooter' : '🚖 Cab'}
                </span>
              )}
            </div>
          </div>
          
          {booking.guide && (
            <Button 
              onClick={() => onContactGuide(booking.guide)}
              size="icon" 
              className="rounded-full w-12 h-12 !bg-primary hover:!bg-primary/90 !text-primary-foreground shadow-md shrink-0 transition-transform active:scale-95"
            >
              <PhoneCall className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Safety PIN - Show prominently before trip starts */}
        {!isInProgress && user?.safetyPin && (
          <div className="w-full bg-muted/55 dark:bg-muted/35 border border-border rounded-xl p-4 text-center mb-6 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Safety PIN</p>
            <p className="text-3xl font-black text-foreground tracking-[0.3em]">{user.safetyPin}</p>
            <p className="text-xs text-muted-foreground mt-2">Share this with your guide to start the trip</p>
          </div>
        )}

        {/* Collapsible Section */}
        {isDrawerOpen && (
          <div className="space-y-6 pt-2 animate-in slide-in-from-top-4 fade-in duration-200">
            {/* Route Details */}
            <div className="bg-muted/50 rounded-xl p-4 border border-border">
              <h4 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wider">Trip Details</h4>
              <div className="space-y-4">
                <div className="flex gap-3 relative">
                  <div className="absolute left-[9px] top-[24px] bottom-[-16px] w-[2px] bg-gray-200" />
                  <div className="w-5 h-5 rounded-full bg-primary/15 border-2 border-blue-600 z-10 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{pickupData.name || "Pickup Location"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{pickupData.address}</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 border-2 border-green-600 z-10 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{destinationData.name || "Drop-off Location"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{destinationData.address}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Estimated Fare */}
            <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/25 flex justify-between items-center">
              <span className="text-sm font-bold text-foreground uppercase tracking-wider">Estimated Fare</span>
              <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">₹{(booking as any).totalFare || 0}</span>
            </div>

            {/* Cancel Button */}
            {!isInProgress && (
              <Button 
                variant="outline" 
                className="w-full bg-transparent text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/35 h-12 font-semibold transition-colors dark:text-red-400 dark:border-red-500/35 dark:hover:bg-red-500/10 dark:hover:text-red-300"
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
