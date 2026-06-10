import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';
import { bookingAudio } from '@/services/BookingAudioService';

export type IncomingBooking = {
  _id: string;
  service: string;
  pickupLocation?: string;
  destinationAddress?: string;
  location?: string;            // legacy field
  vehicleType?: 'scooter' | 'cab';
  dropBack?: boolean;
  waitingHours?: number;
  customer?: {
    name?: string;
    phone?: string;
  };
  date: string;
  time: string;
};

export type CancelledBooking = IncomingBooking & {
  cancelReason?: string;
  cancelledBy?: string;
};

/**
 * useBookingNotifications
 *
 * Polls GET /bookings/guide/pending every POLL_INTERVAL_MS when the guide is online.
 * On first mount, seeds the "already seen" set so existing bookings don't trigger an alert.
 * Any booking ID that appears in a subsequent poll and wasn't seen before triggers:
 *   1. bookingAudio.play() — loops guide_new_booking.wav
 *   2. Sets `incomingBooking` — parent renders <IncomingBookingPopup>
 *
 * Stops cleanly when:
 *   - isOnline flips to false
 *   - The component that mounts this hook unmounts
 *   - dismissIncoming() is called (Accept / Decline / Timeout)
 */

const POLL_INTERVAL_MS = 10_000; // 10 seconds

export const useBookingNotifications = (isOnline: boolean) => {
  const [incomingBooking, setIncomingBooking] = useState<IncomingBooking | null>(null);
  const [cancelledBooking, setCancelledBooking] = useState<CancelledBooking | null>(null);
  
  const seenIds = useRef<Set<string>>(new Set());
  const seenCancelIds = useRef<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSeeded = useRef(false);

  /** Seed existing pending/cancelled bookings without triggering alerts. */
  const seedExisting = useCallback(async () => {
    try {
      const token = localStorage.getItem('guide_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [pendingRes, cancelRes] = await Promise.all([
        api.get('/bookings/guide/pending', { headers }),
        api.get('/bookings/guide/recent-cancellations', { headers })
      ]);
      
      (pendingRes.data as IncomingBooking[]).forEach((b) => seenIds.current.add(b._id));
      (cancelRes.data as CancelledBooking[]).forEach((b) => seenCancelIds.current.add(b._id));
      
      isSeeded.current = true;
      console.log(`🌱 [Notifications] Seeded ${seenIds.current.size} pending, ${seenCancelIds.current.size} cancelled.`);
    } catch (err) {
      console.warn('⚠️ [Notifications] Could not seed existing bookings.', err);
    }
  }, []);

  /** Poll for new bookings and alert on unseen ones. */
  const poll = useCallback(async () => {
    if (!isSeeded.current) return; // Don't alert before seeding completes
    try {
      const token = localStorage.getItem('guide_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [pendingRes, cancelRes] = await Promise.all([
        api.get('/bookings/guide/pending', { headers }),
        api.get('/bookings/guide/recent-cancellations', { headers })
      ]);

      const newBookings = (pendingRes.data as IncomingBooking[]).filter(
        (b) => !seenIds.current.has(b._id)
      );
      
      const newCancellations = (cancelRes.data as CancelledBooking[]).filter(
        (b) => !seenCancelIds.current.has(b._id)
      );

      if (newBookings.length > 0) {
        newBookings.forEach((b) => seenIds.current.add(b._id));
        setIncomingBooking((current) => {
          if (current) return current;
          console.log(`🔔 [Notifications] New booking detected: ${newBookings[0]._id}`);
          bookingAudio.play();
          return newBookings[0];
        });
      }
      
      if (newCancellations.length > 0) {
        newCancellations.forEach((b) => seenCancelIds.current.add(b._id));
        setCancelledBooking((current) => {
          if (current) return current;
          console.log(`⚠️ [Notifications] Booking cancelled: ${newCancellations[0]._id}`);
          // Play a generic beep/alert sound here (we'll reuse the audio service soon)
          bookingAudio.playCancelSound(); 
          return newCancellations[0];
        });
      }
    } catch (err) {
      console.warn('⚠️ [Notifications] Poll failed.', err);
    }
  }, []);

  useEffect(() => {
    if (!isOnline) {
      // Going offline — stop everything
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      bookingAudio.stop();
      setIncomingBooking(null);
      setCancelledBooking(null);
      isSeeded.current = false;
      seenIds.current.clear();
      seenCancelIds.current.clear();
      return;
    }

    // Going online — seed first, then start polling
    seedExisting().then(() => {
      intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    });

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isOnline, seedExisting, poll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      bookingAudio.stop();
    };
  }, []);

  const dismissIncoming = useCallback(() => {
    bookingAudio.stop();
    setIncomingBooking(null);
  }, []);
  
  const dismissCancelled = useCallback(() => {
    setCancelledBooking(null);
  }, []);

  return { incomingBooking, dismissIncoming, cancelledBooking, dismissCancelled };
};
