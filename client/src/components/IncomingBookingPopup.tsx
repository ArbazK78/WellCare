import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, MapPin, Navigation, Clock, User } from 'lucide-react';
import { cn, parseLocation } from '@/lib/utils';
import { useGeolocation } from '@/hooks/useGeolocation';
import { IncomingBooking } from '@/hooks/useBookingNotifications';
import { useJsApiLoader } from '@react-google-maps/api';

const libraries: ("places")[] = ["places"];

const COUNTDOWN_SECONDS = 30;

type Props = {
  booking: IncomingBooking;
  onAccept:  (bookingId: string) => Promise<void>;
  onDecline: (bookingId: string) => Promise<void>;
  onTimeout: () => void;
};

/**
 * IncomingBookingPopup
 *
 * Full-screen overlay (Uber-style) shown when a new pending booking arrives.
 * - 15-second countdown: auto-dismisses on timeout (booking moves to next guide)
 * - Pulsing ring animation gives urgency without being jarring
 * - Accept/Decline call parent handlers which stop the audio and clear the popup
 */
const IncomingBookingPopup = ({ booking, onAccept, onDecline, onTimeout }: Props) => {
  const [countdown, setCountdown] = useState(() => {
    if (booking.offerExpiresAt) {
      const remainingMs = new Date(booking.offerExpiresAt).getTime() - Date.now();
      return Math.max(0, Math.ceil(remainingMs / 1000));
    }
    return COUNTDOWN_SECONDS;
  });
  const [isActing, setIsActing] = useState(false);

  // Load Google Maps API so DistanceMatrixService is available
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const { location: guideLocation } = useGeolocation();
  const [awayText, setAwayText] = useState<string | null>(null);
  const tripText = booking.distanceKm && booking.durationMin
    ? `${booking.durationMin} min (${booking.distanceKm.toFixed(1)} km) trip`
    : null;

  // Calculate the guide-to-pickup arrival estimate
  useEffect(() => {
    // Only proceed if Google Maps is loaded
    if (!isLoaded || !window.google?.maps?.DistanceMatrixService) return;

    const service = new window.google.maps.DistanceMatrixService();
    const pickupData = parseLocation(booking.pickupLocation || booking.location || '');
    
    const pickupPoint = pickupData.lat && pickupData.lng 
      ? { lat: pickupData.lat, lng: pickupData.lng } 
      : (pickupData.address || pickupData.name);

    // Leg 1: Guide to Pickup (Away)
    if (guideLocation && pickupPoint) {
      service.getDistanceMatrix({
        origins: [{ lat: guideLocation.lat, lng: guideLocation.lng }],
        destinations: [pickupPoint],
        travelMode: window.google.maps.TravelMode.DRIVING,
      }, (response, status) => {
        if (status === 'OK' && response?.rows[0]?.elements[0]?.status === 'OK') {
          const element = response.rows[0].elements[0];
          setAwayText(`${element.duration.text} (${element.distance.text}) away`);
        }
      });
    }

  }, [guideLocation, booking, isLoaded]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      onTimeout();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, onTimeout]);

  const handleAccept = useCallback(async () => {
    setIsActing(true);
    try {
      await onAccept(booking._id);
    } catch {
      // Parent shows the actionable error and keeps this offer visible.
    } finally {
      setIsActing(false);
    }
  }, [booking._id, onAccept]);

  const handleDecline = useCallback(async () => {
    setIsActing(true);
    try {
      await onDecline(booking._id);
    } catch {
      // Parent shows the actionable error and keeps this offer visible.
    } finally {
      setIsActing(false);
    }
  }, [booking._id, onDecline]);

  const vehicleLabel = booking.vehicleType === 'scooter' ? '🛵 Scooter' : booking.vehicleType === 'cab' ? '🚖 Cab' : null;

  // Countdown ring progress (SVG stroke-dashoffset)
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const progress = (countdown / COUNTDOWN_SECONDS) * circumference;
  const ringColor = countdown > 8 ? '#22c55e' : countdown > 4 ? '#f59e0b' : '#ef4444';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in slide-in-from-bottom-8 duration-300">

        {/* Top urgency bar */}
        <div
          className="h-1.5 bg-green-500 transition-all duration-1000"
          style={{ width: `${(countdown / COUNTDOWN_SECONDS) * 100}%`, backgroundColor: ringColor }}
        />

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-200 uppercase tracking-widest mb-0.5">New Booking Request</p>
              <h2 className="text-xl font-bold">
                {booking.vehicleType === 'scooter' ? '🛵 Scooter Ride' : booking.vehicleType === 'cab' ? '🚖 Cab Ride' : 'Booking Request'}
              </h2>
            </div>
            {/* Countdown ring */}
            <div className="relative flex items-center justify-center">
              <svg width="64" height="64" className="-rotate-90">
                <circle cx="32" cy="32" r={radius} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                <circle
                  cx="32" cy="32" r={radius} fill="none"
                  stroke={ringColor}
                  strokeWidth="4"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - progress}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
                />
              </svg>
              <span className="absolute text-lg font-bold">{countdown}</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-3">
          {/* Customer */}
          {booking.customer?.name && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <User className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="font-medium">{booking.customer.name}</span>
            </div>
          )}

          {/* Locations Timeline */}
          <div className="flex flex-col flex-1 mt-2 border-l-[3px] border-black pl-4 ml-2 mb-2 space-y-3">
            {/* Pickup */}
            <div className="relative">
              <div className="absolute -left-[22.5px] top-1.5 w-2.5 h-2.5 rounded-full bg-black ring-[5px] ring-white" />
              <div>
                {awayText && <p className="font-bold text-gray-900 text-[13px] mb-0.5">{awayText}</p>}
                <p className="font-medium text-gray-700 text-[14px] leading-tight">{parseLocation(booking.pickupLocation || booking.location || '—').name}</p>
                {parseLocation(booking.pickupLocation || booking.location || '—').address && (
                  <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-1">{parseLocation(booking.pickupLocation || booking.location || '—').address}</p>
                )}
              </div>
            </div>
            
            {/* Destination */}
            {booking.destinationAddress && (
              <div className="relative pt-1">
                <div className="absolute -left-[22.5px] top-2.5 w-2.5 h-2.5 rounded-sm bg-black ring-[5px] ring-white" />
                <div>
                  {tripText && <p className="font-bold text-gray-900 text-[13px] mb-0.5">{tripText}</p>}
                  <p className="font-medium text-gray-700 text-[14px] leading-tight">{parseLocation(booking.destinationAddress).name}</p>
                  {parseLocation(booking.destinationAddress).address && (
                    <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-1">{parseLocation(booking.destinationAddress).address}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {vehicleLabel && (
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full font-medium">
                {vehicleLabel}
              </span>
            )}
            {booking.totalFare !== undefined && (
              <span className="text-xs bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-1 rounded-full font-semibold">
                ₹{booking.totalFare} fare
              </span>
            )}
            {booking.dropBack && (
              <span className="text-xs bg-green-50 text-green-700 border border-green-100 px-2.5 py-1 rounded-full font-medium">
                🏠 Drop-back
              </span>
            )}
            {booking.waitingHours && booking.waitingHours > 0 ? (
              <span className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" /> {booking.waitingHours}h wait
              </span>
            ) : null}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={handleDecline}
            disabled={isActing}
          >
            <X className="h-4 w-4 mr-1.5" />
            Decline
          </Button>
          <Button
            className={cn('flex-1 bg-green-600 hover:bg-green-700 text-white', isActing && 'opacity-70')}
            onClick={handleAccept}
            disabled={isActing}
          >
            <Check className="h-4 w-4 mr-1.5" />
            {isActing ? 'Accepting…' : 'Accept'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IncomingBookingPopup;
