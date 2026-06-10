import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, MapPin, Navigation, Clock, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IncomingBooking } from '@/hooks/useBookingNotifications';

const COUNTDOWN_SECONDS = 15;

type Props = {
  booking: IncomingBooking;
  onAccept:  (bookingId: string) => Promise<void>;
  onDecline: (bookingId: string) => void;
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
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [isActing, setIsActing] = useState(false);

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
    await onAccept(booking._id);
    setIsActing(false);
  }, [booking._id, onAccept]);

  const handleDecline = useCallback(() => {
    onDecline(booking._id);
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
              <h2 className="text-xl font-bold">{booking.service}</h2>
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

          {/* Pickup */}
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs text-gray-400 block">Pickup</span>
              <span className="text-gray-800 font-medium">
                {booking.pickupLocation || booking.location || '—'}
              </span>
            </div>
          </div>

          {/* Destination */}
          {booking.destinationAddress && (
            <div className="flex items-start gap-2 text-sm">
              <Navigation className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs text-gray-400 block">Destination</span>
                <span className="text-gray-800 font-medium">{booking.destinationAddress}</span>
              </div>
            </div>
          )}

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {vehicleLabel && (
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full font-medium">
                {vehicleLabel}
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
