import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import api from "@/lib/api";
import { createRealtimeSocket, RealtimeConnectionState } from "@/lib/realtimeSocket";
import { Coordinates, useGeolocation } from "@/hooks/useGeolocation";

export type GuideTrackingState = "off" | "available" | "live" | "delayed" | "reconnecting" | "background" | "error";

type PublishError = { code: string; message?: string } | null;

type GuideLocationContextValue = {
  location: Coordinates | null;
  publishedLocation: Coordinates | null;
  error: string | null;
  publishError: PublishError;
  loading: boolean;
  connectionState: RealtimeConnectionState;
  trackingState: GuideTrackingState;
  activeBookingId: string | null;
  lastAcknowledgedAt: number | null;
  pageVisible: boolean;
  setActiveBookingId: (bookingId: string | null) => void;
};

const GuideLocationContext = createContext<GuideLocationContextValue | null>(null);

const SOCKET_SEND_INTERVAL_MS = 2500;
const SENSOR_COALESCE_MS = 850;
const HEARTBEAT_INTERVAL_MS = 10000;
const REST_FALLBACK_INTERVAL_MS = 15000;
const FRESH_SAMPLE_MAX_AGE_MS = 45000;

export const GuideLocationProvider = ({
  authenticated,
  online,
  children,
}: {
  authenticated: boolean;
  online: boolean;
  children: ReactNode;
}) => {
  const { location, error, loading } = useGeolocation(authenticated && online);
  const [publishedLocation, setPublishedLocation] = useState<Coordinates | null>(null);
  const [publishError, setPublishError] = useState<PublishError>(null);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>("disconnected");
  const [lastAcknowledgedAt, setLastAcknowledgedAt] = useState<number | null>(null);
  const [pageVisible, setPageVisible] = useState(!document.hidden);
  const [healthClock, setHealthClock] = useState(Date.now());
  const socketRef = useRef<Socket | null>(null);
  const latestLocationRef = useRef<Coordinates | null>(null);
  const coalescingTimerRef = useRef<number | null>(null);
  const lastSocketSentAtRef = useRef(0);
  const lastRestSentAtRef = useRef(0);
  const lastSequenceRef = useRef(0);

  useEffect(() => {
    latestLocationRef.current = location;
  }, [location]);

  useEffect(() => {
    const handleVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", handleVisibility);
    const healthTimer = window.setInterval(() => setHealthClock(Date.now()), 5000);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(healthTimer);
      if (coalescingTimerRef.current != null) window.clearTimeout(coalescingTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!authenticated) {
      setConnectionState("disconnected");
      return;
    }
    const token = localStorage.getItem("guide_token");
    if (!token) return;

    const socket = createRealtimeSocket(token);
    socketRef.current = socket;
    setConnectionState("connecting");
    socket.on("connect", () => setConnectionState("connected"));
    socket.io.on("reconnect_attempt", () => setConnectionState("reconnecting"));
    socket.on("disconnect", (reason) => {
      setConnectionState(reason === "io client disconnect" ? "disconnected" : "reconnecting");
    });
    socket.on("connect_error", () => setConnectionState("error"));
    socket.on("booking:updated", (detail) => {
      window.dispatchEvent(new CustomEvent("wellcare:booking-updated", { detail }));
    });
    socket.connect();

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnectionState("disconnected");
    };
  }, [authenticated]);

  const acknowledge = useCallback((sample: Coordinates) => {
    setPublishedLocation(sample);
    setLastAcknowledgedAt(Date.now());
    setPublishError(null);
  }, []);

  const reject = useCallback((code: string, message?: string) => {
    setPublishError({ code, message });
  }, []);

  const publishLocation = useCallback(async (force = false) => {
    if (!authenticated || !online) return;
    const current = latestLocationRef.current;
    if (!current) return;
    const now = Date.now();
    if (now - current.capturedAt > FRESH_SAMPLE_MAX_AGE_MS) return;

    const sequence = Math.max(now, lastSequenceRef.current + 1);
    const payload = {
      bookingId: activeBookingId || undefined,
      lat: current.lat,
      lng: current.lng,
      accuracy: current.accuracy,
      speed: current.speed,
      heading: current.heading,
      capturedAt: current.capturedAt,
      sequence,
    };
    const socket = socketRef.current;

    if (socket?.connected) {
      if (!force && now - lastSocketSentAtRef.current < SOCKET_SEND_INTERVAL_MS) return;
      lastSequenceRef.current = sequence;
      lastSocketSentAtRef.current = now;
      socket.timeout(5000).emit(
        "guide:location:update",
        payload,
        (timeoutError: Error | null, response?: { ok?: boolean; trackingActive?: boolean; code?: string; message?: string }) => {
          if (!timeoutError && response?.ok && (!activeBookingId || response.trackingActive)) {
            acknowledge(current);
          } else {
            reject(response?.code || (timeoutError ? "SOCKET_TIMEOUT" : "TRACKING_NOT_ACTIVE"), response?.message);
          }
        },
      );
      return;
    }

    if (!force && now - lastRestSentAtRef.current < REST_FALLBACK_INTERVAL_MS) return;
    lastSequenceRef.current = sequence;
    lastRestSentAtRef.current = now;
    try {
      const { data } = await api.put("/guides/location", payload);
      if (data?.ok && (!activeBookingId || data.trackingActive)) acknowledge(current);
      else reject(data?.code || "REST_CHECKPOINT_REJECTED", data?.message);
    } catch (requestError: unknown) {
      const response = (requestError as { response?: { data?: { code?: string; message?: string } } }).response?.data;
      reject(response?.code || "REST_CHECKPOINT_FAILED", response?.message);
    }
  }, [acknowledge, activeBookingId, authenticated, online, reject]);

  useEffect(() => {
    if (!location || coalescingTimerRef.current != null) return;
    coalescingTimerRef.current = window.setTimeout(() => {
      coalescingTimerRef.current = null;
      void publishLocation(false);
    }, SENSOR_COALESCE_MS);
  }, [location, publishLocation]);

  useEffect(() => {
    if (!authenticated || !online) return;
    const heartbeat = window.setInterval(() => { void publishLocation(true); }, HEARTBEAT_INTERVAL_MS);
    return () => window.clearInterval(heartbeat);
  }, [authenticated, online, publishLocation]);

  useEffect(() => {
    if (!online) {
      setActiveBookingId(null);
      setPublishedLocation(null);
    }
  }, [online]);

  useEffect(() => {
    setLastAcknowledgedAt(null);
    setPublishError(null);
  }, [activeBookingId, online]);

  const acknowledgementStale = activeBookingId
    ? !lastAcknowledgedAt || healthClock - lastAcknowledgedAt > FRESH_SAMPLE_MAX_AGE_MS
    : false;
  const softRejection = publishError && ["RATE_LIMITED", "OUT_OF_ORDER"].includes(publishError.code);
  const trackingState: GuideTrackingState = !authenticated || !online
    ? "off"
    : !pageVisible
      ? "background"
      : connectionState === "reconnecting" || connectionState === "connecting"
        ? "reconnecting"
        : connectionState === "error"
          ? "error"
          : publishError && !softRejection
            ? "error"
            : activeBookingId && (acknowledgementStale || softRejection)
              ? "delayed"
              : activeBookingId && connectionState === "connected"
                ? "live"
                : "available";

  const value = useMemo<GuideLocationContextValue>(() => ({
    location,
    publishedLocation,
    error,
    publishError,
    loading,
    connectionState,
    trackingState,
    activeBookingId,
    lastAcknowledgedAt,
    pageVisible,
    setActiveBookingId,
  }), [location, publishedLocation, error, publishError, loading, connectionState, trackingState, activeBookingId, lastAcknowledgedAt, pageVisible]);

  return <GuideLocationContext.Provider value={value}>{children}</GuideLocationContext.Provider>;
};

export const useGuideLocation = () => {
  const context = useContext(GuideLocationContext);
  if (!context) throw new Error("useGuideLocation must be used inside GuideLocationProvider");
  return context;
};
