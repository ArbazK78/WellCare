import { useCallback, useEffect, useRef } from "react";
import { format } from "date-fns";
import api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const POLL_INTERVAL_MS = 10_000;

export const useReservationNotifications = (enabled: boolean) => {
  const { toast } = useToast();
  const seen = useRef<Set<string>>(new Set());

  const notifyBrowser = useCallback((title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  }, []);

  const poll = useCallback(async () => {
    if (!enabled) return;
    try {
      const [scheduleResult, activeResult, outboxResult] = await Promise.allSettled([
        api.get("/bookings/guide/reservations/schedule"),
        api.get("/bookings/guide/accepted"),
        api.get("/bookings/guide/reservations/notifications"),
      ]);
      if (scheduleResult.status === "fulfilled") {
        for (const booking of scheduleResult.value.data as any[]) {
          if (booking.reservationStatus !== "readiness_pending") continue;
          const key = `${booking._id}:readiness_pending`;
          if (seen.current.has(key)) continue;
          seen.current.add(key);
          const deadline = booking.readinessDeadline ? format(new Date(booking.readinessDeadline), "h:mm a") : "soon";
          toast({ title: "Scheduled pickup needs confirmation", description: `Confirm readiness by ${deadline}. Go online with location enabled.` });
          notifyBrowser("WellCare readiness required", `Confirm your scheduled pickup by ${deadline}.`);
        }
      }
      if (outboxResult.status === "fulfilled") {
        for (const event of outboxResult.value.data as any[]) {
          if (event.type === "reservation_released_by_system") {
            const messages: Record<string, string> = {
              guide_cannot_arrive_on_time: `Maps estimated ${event.payload?.etaMinutes || "more"} minutes to pickup, so WellCare started backup dispatch to protect the scheduled time.`,
              guide_unavailable: "You were not online by the availability checkpoint, so WellCare started backup dispatch.",
              location_stale: "A fresh location could not be verified, so WellCare started backup dispatch.",
              eta_unavailable: "The route ETA could not be verified, so WellCare started backup dispatch.",
              readiness_missed: "The readiness deadline was missed, so WellCare started backup dispatch.",
            };
            const description = messages[event.payload?.reason] || "WellCare released this commitment and started backup dispatch.";
            toast({ title: "Scheduled commitment released", description, variant: "destructive" });
            notifyBrowser("WellCare commitment released", description);
          }
          await api.put(`/bookings/guide/reservations/notifications/${event._id}/ack`).catch(() => undefined);
        }
      }

      if (activeResult.status === "fulfilled") {
        for (const booking of activeResult.value.data as any[]) {
          if (booking.bookingMode !== "schedule" || !booking.activationAt) continue;
          const key = `${booking._id}:activated`;
          if (seen.current.has(key)) continue;
          seen.current.add(key);
          const pickup = booking.scheduledAt ? format(new Date(booking.scheduledAt), "h:mm a") : booking.time;
          toast({ title: "Time to head to pickup", description: `Your scheduled Cab booking is active. Pickup is at ${pickup}.` });
          notifyBrowser("WellCare: time to leave", `Your scheduled pickup is at ${pickup}. Open WellCare for navigation.`);
        }
      }
    } catch (error) {
      console.warn("Scheduled notification polling failed; the next poll will retry.", error);
    }
  }, [enabled, notifyBrowser, toast]);

  useEffect(() => {
    if (!enabled) {
      seen.current.clear();
      return;
    }
    poll();
    const interval = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [enabled, poll]);
};