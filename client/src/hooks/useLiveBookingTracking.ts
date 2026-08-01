import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { useCustomerRealtime } from "@/contexts/CustomerRealtimeContext";

export type LiveTrackingLocation = {
  bookingId?: string;
  guideId?: string;
  lat: number;
  lng: number;
  accuracy: number;
  speed?: number | null;
  heading?: number | null;
  capturedAt: number;
  serverReceivedAt: number;
  sequence: number;
  quality?: "good" | "degraded";
};

const STALE_AFTER_MS = 45000;
const FALLBACK_POLL_MS = 15000;

export const useLiveBookingTracking = (bookingId: string, enabled = true) => {
  const { socket, connectionState } = useCustomerRealtime();
  const [location, setLocation] = useState<LiveTrackingLocation | null>(null);
  const [ended, setEnded] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const latestSequenceRef = useRef(-1);

  const acceptLocation = useCallback((incoming?: LiveTrackingLocation | null) => {
    if (!incoming || !Number.isFinite(incoming.lat) || !Number.isFinite(incoming.lng)) return;
    const sequence = Number(incoming.sequence ?? incoming.serverReceivedAt ?? 0);
    if (sequence <= latestSequenceRef.current) return;
    latestSequenceRef.current = sequence;
    setLocation({ ...incoming, sequence });
    setEnded(false);
  }, []);

  const loadSnapshot = useCallback(async () => {
    if (!enabled || !bookingId) return;
    try {
      const { data } = await api.get(`/bookings/${bookingId}/tracking-snapshot`);
      acceptLocation(data.location);
      if (!data.trackingActive) setEnded(true);
    } catch {
      // The existing booking poll remains the reconciliation fallback.
    }
  }, [acceptLocation, bookingId, enabled]);

  useEffect(() => {
    if (!enabled || !bookingId || !socket) return;

    const joinTracking = () => {
      socket.timeout(5000).emit("tracking:join", { bookingId }, (error: Error | null, response?: { ok?: boolean; snapshot?: LiveTrackingLocation | null }) => {
        if (!error && response?.ok) acceptLocation(response.snapshot);
        else loadSnapshot();
      });
    };
    const handleEnded = ({ bookingId: endedBookingId }: { bookingId: string }) => {
      if (String(endedBookingId) === String(bookingId)) setEnded(true);
    };

    socket.on("connect", joinTracking);
    socket.on("tracking:snapshot", acceptLocation);
    socket.on("tracking:location", acceptLocation);
    socket.on("tracking:ended", handleEnded);
    if (socket.connected) joinTracking();

    return () => {
      if (socket.connected) socket.emit("tracking:leave", { bookingId });
      socket.off("connect", joinTracking);
      socket.off("tracking:snapshot", acceptLocation);
      socket.off("tracking:location", acceptLocation);
      socket.off("tracking:ended", handleEnded);
    };
  }, [acceptLocation, bookingId, enabled, loadSnapshot, socket]);

  useEffect(() => {
    if (!enabled) return;
    loadSnapshot();
    const fallback = window.setInterval(() => {
      if (!socket?.connected) loadSnapshot();
    }, FALLBACK_POLL_MS);
    return () => window.clearInterval(fallback);
  }, [enabled, loadSnapshot, socket]);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const lastUpdatedAt = location?.serverReceivedAt || location?.capturedAt || null;
  const ageMs = lastUpdatedAt ? Math.max(0, clock - lastUpdatedAt) : null;
  const stale = ageMs == null || ageMs > STALE_AFTER_MS;

  return {
    location,
    connectionState,
    ended,
    stale,
    ageMs,
    lastUpdatedAt,
    refreshSnapshot: loadSnapshot,
  };
};