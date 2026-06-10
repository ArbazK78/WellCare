import { useEffect, useRef } from 'react';
import { useBookings } from '@/contexts/BookingContext';
import { bookingAudio } from '@/services/BookingAudioService';
import api from '@/lib/api';

// Import as a URL string — Vite resolves this at build time
import assignedSoundUrl from '@/assets/guide_assigned.wav';

const POLL_INTERVAL_MS = 8_000; // 8 seconds — snappy enough for Alpha UX

/**
 * useCustomerBookingSync
 *
 * Mounts on the customer Dashboard. Polls GET /bookings every 8s and watches
 * for bookings that transition from "pending" → "accepted".
 *
 * On that transition:
 *  1. Plays guide_assigned.wav once (no loop — it's a celebratory chime, not an alert ring).
 *  2. Calls refreshBookings() to update the booking cards in real-time without a page reload.
 *
 * Seeding: on first mount, we record every booking's current status so we never
 * fire a false alert for bookings that were already accepted before the user opened
 * the dashboard.
 *
 * Long-term: swap the setInterval + api.get() block with a WebSocket / SSE listener.
 * The sound + refresh logic stays exactly the same.
 */
export const useCustomerBookingSync = () => {
  const { bookings, refreshBookings } = useBookings();

  // Map of bookingId → last known status (used to detect transitions)
  const prevStatusMap = useRef<Map<string, string>>(new Map());
  const seededRef     = useRef(false);
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Seed on first bookings load ────────────────────────────────────────────
  // We seed from the initial context data so we don't alert for bookings
  // that were already accepted before the user opened the dashboard.
  useEffect(() => {
    if (!seededRef.current && bookings.length > 0) {
      bookings.forEach((b) => prevStatusMap.current.set(b._id, b.status));
      seededRef.current = true;
      console.log(`🌱 [CustomerSync] Seeded ${bookings.length} booking(s).`);
    }
  }, [bookings]);

  // ── Polling loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    const poll = async () => {
      // Don't alert before the initial seed is complete
      if (!seededRef.current) return;

      try {
        // api.ts interceptor automatically attaches userToken for /bookings routes
        const { data } = await api.get('/bookings/my-bookings');
        let hadTransition = false;

        (data as any[]).forEach((booking) => {
          const prev = prevStatusMap.current.get(booking._id);

          if (prev === 'pending' && booking.status === 'accepted') {
            // 🎉 Guide just accepted — play the chime once
            console.log(`🔔 [CustomerSync] Booking ${booking._id} accepted by guide!`);
            bookingAudio.playOnce(assignedSoundUrl);
            hadTransition = true;
          }

          // Always update the snapshot so we track the latest status
          prevStatusMap.current.set(booking._id, booking.status);
        });

        // Only re-render if something actually changed (avoids thrashing)
        if (hadTransition) {
          await refreshBookings();
        }
      } catch (err) {
        // Silent fail — just wait for the next poll cycle
        console.warn('⚠️ [CustomerSync] Poll failed:', err);
      }
    };

    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refreshBookings]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);
};
