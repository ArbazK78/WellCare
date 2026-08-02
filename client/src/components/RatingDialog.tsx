import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, HeartHandshake, ShieldAlert, Star } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

export type RatingDirection = "customer_to_guide" | "guide_to_customer";

type TagOption = { value: string; label: string };

const TAGS: Record<RatingDirection, { positive: TagOption[]; improve: TagOption[] }> = {
  customer_to_guide: {
    positive: [
      { value: "caring_reassuring", label: "Caring & reassuring" },
      { value: "polite_respectful", label: "Polite & respectful" },
      { value: "helpful_hospital", label: "Helpful at the hospital" },
      { value: "patient_supportive", label: "Patient & supportive" },
      { value: "punctual", label: "Punctual" },
      { value: "clear_communication", label: "Clear communication" },
      { value: "safe_comfortable_journey", label: "Safe, comfortable journey" },
    ],
    improve: [
      { value: "arrived_late", label: "Arrived late" },
      { value: "communication_issue", label: "Communication issue" },
      { value: "assistance_incomplete", label: "Assistance was incomplete" },
      { value: "unprofessional_behaviour", label: "Unprofessional behaviour" },
      { value: "unsafe_driving", label: "Unsafe driving" },
      { value: "vehicle_cleanliness", label: "Vehicle cleanliness" },
      { value: "other", label: "Other" },
    ],
  },
  guide_to_customer: {
    positive: [
      { value: "ready_on_time", label: "Ready on time" },
      { value: "respectful", label: "Respectful" },
      { value: "clear_communication", label: "Clear communication" },
      { value: "accurate_booking_details", label: "Accurate booking details" },
      { value: "safe_cooperative", label: "Safe & cooperative" },
    ],
    improve: [
      { value: "unable_to_contact", label: "Unable to contact" },
      { value: "incorrect_pickup_information", label: "Incorrect pickup information" },
      { value: "unreasonable_waiting", label: "Unexpected waiting" },
      { value: "disrespectful_behaviour", label: "Disrespectful behaviour" },
      { value: "unsafe_request", label: "Unsafe request" },
      { value: "booking_details_mismatch", label: "Booking details did not match" },
      { value: "other", label: "Other" },
    ],
  },
};

type RatingDialogProps = {
  open: boolean;
  bookingId?: string;
  subjectName?: string;
  direction: RatingDirection;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
  onSafetyConcern?: () => void;
};

export const RatingDialog = ({
  open,
  bookingId,
  subjectName,
  direction,
  onOpenChange,
  onSubmitted,
  onSafetyConcern,
}: RatingDialogProps) => {
  const { toast } = useToast();
  const [stars, setStars] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);
  const isCustomerReview = direction === "customer_to_guide";

  useEffect(() => {
    if (open) {
      setStars(0);
      setHoveredStar(0);
      setTags([]);
      setComment("");
      setSubmitting(false);
      submittedRef.current = false;
    }
  }, [open, bookingId]);

  const options = useMemo(
    () => stars > 0 && stars <= 3 ? TAGS[direction].improve : TAGS[direction].positive,
    [direction, stars],
  );

  useEffect(() => {
    const allowed = new Set(options.map((option) => option.value));
    setTags((current) => current.filter((tag) => allowed.has(tag)));
  }, [options]);

  const toggleTag = (value: string) => {
    setTags((current) => current.includes(value)
      ? current.filter((tag) => tag !== value)
      : current.length < 6 ? [...current, value] : current);
  };

  const dismiss = () => {
    if (bookingId && !submittedRef.current) {
      const endpoint = isCustomerReview
        ? `/ratings/customer/bookings/${bookingId}/prompt-dismissed`
        : `/ratings/guide/bookings/${bookingId}/prompt-dismissed`;
      void api.patch(endpoint).catch(() => undefined);
    }
    onOpenChange(false);
  };

  const submit = async () => {
    if (!bookingId || stars === 0) {
      toast({ title: "Choose a star rating", description: "Select between 1 and 5 stars before submitting.", variant: "destructive" });
      return;
    }
    if (stars <= 2 && tags.length === 0) {
      toast({ title: "Tell us what happened", description: "Choose at least one reason for a low rating.", variant: "destructive" });
      return;
    }
    if (tags.includes("other") && !comment.trim()) {
      toast({ title: "Add a little context", description: "Please explain what happened when choosing Other.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = isCustomerReview
        ? `/ratings/customer/bookings/${bookingId}/guide`
        : `/ratings/guide/bookings/${bookingId}/customer`;
      await api.post(endpoint, { stars, tags, comment });
      submittedRef.current = true;
      toast({
        title: isCustomerReview ? `Thank you for rating ${subjectName || "your guide"}` : "Thank you for your private feedback",
        description: isCustomerReview
          ? "Your feedback helps WellCare recognise thoughtful care."
          : "This helps WellCare keep assistance respectful and reliable.",
      });
      onSubmitted?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Could not save feedback",
        description: error?.response?.data?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const displayedStar = hoveredStar || stars;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => nextOpen ? onOpenChange(true) : dismiss()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-border bg-background p-0 sm:max-w-xl">
        <div className="border-b border-border bg-gradient-to-br from-primary/15 via-background to-accent/10 px-6 py-7 sm:px-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <DialogHeader className="text-left">
            <DialogTitle className="text-2xl">
              {isCustomerReview ? `How was your assistance with ${subjectName || "your guide"}?` : "How was this booking experience?"}
            </DialogTitle>
            <DialogDescription className="text-base">
              {isCustomerReview
                ? "Your rating is anonymous to the guide. Written feedback is visible only to authorised WellCare administrators."
                : "This feedback stays private and is never shown as an individual review to the customer."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-6 px-6 pb-7 sm:px-8">
          <div className="text-center">
            <div className="flex justify-center gap-2" onMouseLeave={() => setHoveredStar(0)}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={`Rate ${value} star${value === 1 ? "" : "s"}`}
                  className="rounded-xl p-1.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onMouseEnter={() => setHoveredStar(value)}
                  onClick={() => setStars(value)}
                >
                  <Star
                    className={`h-10 w-10 transition-colors ${value <= displayedStar ? "fill-[#e3a15f] text-[#e3a15f]" : "text-muted-foreground/35"}`}
                  />
                </button>
              ))}
            </div>
            <p className="mt-2 min-h-6 font-semibold text-foreground">
              {displayedStar === 5 ? "Exceptional care" : displayedStar === 4 ? "A reassuring experience" : displayedStar === 3 ? "It was okay" : displayedStar === 2 ? "Needs improvement" : displayedStar === 1 ? "A difficult experience" : "Tap a star to begin"}
            </p>
          </div>

          {stars > 0 && (
            <div>
              <p className="mb-3 text-sm font-bold text-foreground">
                {stars <= 3 ? "What could have been better?" : "What stood out?"}
                {stars <= 2 && <span className="ml-1 text-destructive">*</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {options.map((option) => {
                  const selected = tags.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleTag(option.value)}
                      className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition-all ${selected
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5"}`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="rating-comment" className="text-sm font-bold text-foreground">Private feedback <span className="font-normal text-muted-foreground">(optional)</span></label>
              <span className="text-xs text-muted-foreground">{comment.length}/500</span>
            </div>
            <Textarea
              id="rating-comment"
              value={comment}
              maxLength={500}
              onChange={(event) => setComment(event.target.value)}
              placeholder={isCustomerReview ? "Share anything that would help us improve future care?" : "Add useful, respectful context about this booking?"}
              className="min-h-28 resize-none rounded-2xl border-border bg-card"
            />
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            {isCustomerReview && onSafetyConcern ? (
              <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onSafetyConcern}>
                <ShieldAlert className="mr-2 h-4 w-4" /> Report a safety concern
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={dismiss}>Not now</Button>
              <Button type="button" onClick={submit} disabled={submitting || stars === 0}>
                {submitting ? "Submitting?" : "Submit feedback"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

type SafetyConcernDialogProps = {
  open: boolean;
  bookingId?: string;
  onOpenChange: (open: boolean) => void;
};

export const SafetyConcernDialog = ({ open, bookingId, onOpenChange }: SafetyConcernDialogProps) => {
  const { toast } = useToast();
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setDetails("");
  }, [open, bookingId]);

  const submit = async () => {
    if (!bookingId || !details.trim()) {
      toast({ title: "Describe the concern", description: "A short description helps WellCare review it.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/ratings/customer/bookings/${bookingId}/safety-report`, { details });
      toast({ title: "Concern recorded", description: "Thank you for reporting this. WellCare will review it carefully." });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Could not record concern", description: error?.response?.data?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-destructive/30 bg-background sm:max-w-lg">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <DialogTitle>Report a safety concern</DialogTitle>
          <DialogDescription>This is separate from your rating. Share only the facts needed for WellCare to review the trip.</DialogDescription>
        </DialogHeader>
        <Textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={500} className="min-h-36 rounded-2xl bg-card" placeholder="Tell us what happened?" />
        <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Up to 500 characters</span><span>{details.length}/500</span></div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={submitting}>{submitting ? "Submitting?" : "Submit concern"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
