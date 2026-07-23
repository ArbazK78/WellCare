import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { bookingAudio } from "@/services/BookingAudioService";
import { useBookings } from "@/contexts/BookingContext";
import api from "@/lib/api";
import assignedSoundUrl from "@/assets/guide_assigned.wav";
import Navbar from "@/components/Navbar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

// ── Captions that cycle with a fade ──────────────────────────────────────────
const CAPTIONS = [
  "Finding the best guide for you…",
  "We are matching you with certified guides nearby",
  "Guides in your area are reviewing your request",
  "Almost there — connecting you now",
  "There are plenty of guides available for you",
  "Hang tight, we are working on it!",
];

const POLL_INTERVAL_MS = 5_000;   // Poll every 5s
const CAPTION_INTERVAL_MS = 3_000; // Rotate caption every 3s

const FindingGuide = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { refreshBookings, cancelBooking } = useBookings();

  const [captionIndex, setCaptionIndex] = useState(0);
  const [captionVisible, setCaptionVisible] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const intervalRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const captionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const captionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // FH-4 fix: Track timeout for unmount cleanup
  const hasPlayedRef    = useRef(false);

  // ── Poll booking status ────────────────────────────────────────────────────
  const pollStatus = useCallback(async () => {
    if (!bookingId) return;
    try {
      const { data } = await api.get(`/bookings/${bookingId}`);
      if (data?.status === "accepted" && !hasPlayedRef.current) {
        hasPlayedRef.current = true;
        setAccepted(true);

        // Play the guide-assigned chime once
        bookingAudio.playOnce(assignedSoundUrl);

        // Refresh context so Dashboard renders the updated booking immediately
        await refreshBookings();

        // Give the success state 1.8s to animate, then go to dashboard
        setTimeout(() => navigate("/dashboard"), 1800);
      }
    } catch (err) {
      // Silent — keep polling
    }
  }, [bookingId, navigate]);

  useEffect(() => {
    // Start polling
    pollStatus(); // immediate first check
    intervalRef.current = setInterval(pollStatus, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pollStatus]);

  // ── Rotate captions with a fade transition ────────────────────────────────
  useEffect(() => {
    captionTimerRef.current = setInterval(() => {
      setCaptionVisible(false);
      captionTimeoutRef.current = setTimeout(() => {
        setCaptionIndex(i => (i + 1) % CAPTIONS.length);
        setCaptionVisible(true);
      }, 400); // fade-out duration
    }, CAPTION_INTERVAL_MS);

    return () => {
      if (captionTimerRef.current) clearInterval(captionTimerRef.current);
      if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current); // FH-4 fix: Clear timeout on unmount
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-10">

          {/* ── Icon / animation ───────────────────────────────────────────── */}
          <div className="flex justify-center">
            {accepted ? (
              // Success checkmark
              <div className="relative">
                <div className="w-28 h-28 rounded-full bg-green-500/20 flex items-center justify-center animate-in zoom-in duration-500">
                  <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/40">
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ) : (
              // Pulsing search rings
              <div className="relative flex items-center justify-center">
                {/* Outer rings */}
                <span className="absolute w-28 h-28 rounded-full border-2 border-blue-400/30 animate-ping" style={{ animationDuration: '2s' }} />
                <span className="absolute w-20 h-20 rounded-full border-2 border-blue-400/50 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                {/* Core */}
                <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/40">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* ── Heading ────────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">
              {accepted ? "Guide Found! 🎉" : "Finding Your Guide"}
            </h1>
            <p
              className="text-blue-200 text-base transition-opacity duration-400"
              style={{ opacity: captionVisible ? 1 : 0 }}
            >
              {accepted ? "Your guide has accepted the request. Taking you to your dashboard…" : CAPTIONS[captionIndex]}
            </p>
          </div>

          {/* ── Progress bar ───────────────────────────────────────────────── */}
          {!accepted && (
            <div className="space-y-3">
              <div className="h-1.5 w-full bg-blue-800/60 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full animate-progress-indeterminate" />
              </div>
              <p className="text-xs text-blue-400/80 font-medium uppercase tracking-widest">
                Searching · Matching · Connecting
              </p>
            </div>
          )}

          {/* ── Success bar ────────────────────────────────────────────────── */}
          {accepted && (
            <div className="h-1.5 w-full bg-green-900/40 rounded-full overflow-hidden">
              <div className="h-full w-full bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-in slide-in-from-left duration-700" />
            </div>
          )}

          {/* ── Booking details card ───────────────────────────────────────── */}
          <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-left space-y-2 backdrop-blur-sm">
            <p className="text-xs text-blue-300 font-semibold uppercase tracking-widest mb-1">Your Booking</p>
            <p className="text-white/80 text-sm">
              Booking ID: <span className="font-mono text-white">{bookingId?.slice(-8).toUpperCase()}</span>
            </p>
            <p className="text-blue-200/70 text-xs">
              We will notify you the moment a guide accepts your request.
            </p>
            
            {/* ── Cancel button ────────────────────────────────────────────────── */}
            {!accepted && (
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={isCancelling}
                className="text-blue-400 hover:text-blue-300 text-sm underline underline-offset-4 transition-colors disabled:opacity-50 mt-2 block"
              >
                {isCancelling ? "Cancelling..." : "Cancel Ride"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── CSS for the indeterminate progress bar ─────────────────────────── */}
      <style>{`
        @keyframes progress-indeterminate {
          0%   { transform: translateX(-100%) scaleX(0.4); }
          50%  { transform: translateX(30%)   scaleX(0.8); }
          100% { transform: translateX(120%)  scaleX(0.4); }
        }
        .animate-progress-indeterminate {
          animation: progress-indeterminate 2s ease-in-out infinite;
          width: 60%;
        }
      `}</style>

      {/* Cancel Reason Dialog */}
      <Dialog open={showCancelModal} onOpenChange={(open) => { if (!open) { setShowCancelModal(false); setCancelReason(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Cancel Booking
            </DialogTitle>
            <DialogDescription>
              Please let us know why you're cancelling. This helps us improve our service.
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <RadioGroup value={cancelReason} onValueChange={setCancelReason} className="space-y-2">
              {[
                "Taking too long to find a guide",
                "Change of plans",
                "Booked by mistake",
                "Found alternative transport",
                "Emergency situation",
                "Other",
              ].map((reason) => (
                <label
                  key={reason}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50 has-[:checked]:bg-red-50 has-[:checked]:border-red-300"
                >
                  <RadioGroupItem value={reason} id={reason} />
                  <span className="text-sm">{reason}</span>
                </label>
              ))}
            </RadioGroup>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => { setShowCancelModal(false); setCancelReason(""); }}
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={!cancelReason || isCancelling}
              onClick={async () => {
                if (!bookingId || isCancelling) return;
                setIsCancelling(true);
                const success = await cancelBooking(bookingId, cancelReason);
                if (success) {
                  navigate("/dashboard");
                }
                setIsCancelling(false);
                setShowCancelModal(false);
              }}
            >
              {isCancelling ? "Cancelling..." : "Cancel Booking"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FindingGuide;
