import { useState, useEffect } from "react";
import "@/styles/ui2.css";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, PhoneCall, Clock, Calendar, User, Mail, Navigation, Home, ChevronDown, CheckCircle2, Loader2 } from "lucide-react";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/AppNavbar";
import { useBookings, BookingService } from "@/contexts/BookingContext";
import { format } from "date-fns";
import { useJsApiLoader } from "@react-google-maps/api";
import { LocationAutocomplete, LocationData } from "@/components/ui/LocationAutocomplete";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SchedulePicker, ScheduleData } from "@/components/SchedulePicker";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import api from "@/lib/api";
import axios from "axios";

// ─── Step indicator ──────────────────────────────────────────────────────────
const StepIndicator = ({ current, steps }: { current: number, steps: string[] }) => (
  <div className="flex items-center justify-center gap-0 mb-8">
    {steps.map((label, idx) => {
      const stepNum = idx + 1;
      const isComplete = stepNum < current;
      const isActive   = stepNum === current;
      return (
        <div key={stepNum} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors",
                isComplete ? "bg-primary text-primary-foreground" :
                isActive   ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                             "bg-muted text-muted-foreground border border-border"
              )}
            >
              {isComplete ? "✓" : stepNum}
            </div>
            <span className={cn("text-xs mt-1 font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
              {label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div className={cn("w-16 h-0.5 mb-4 mx-1 transition-colors", isComplete ? "bg-primary" : "bg-border")} />
          )}
        </div>
      );
    })}
  </div>
);

// ─── Vehicle card ─────────────────────────────────────────────────────────────
const VehicleCard = ({
  type, label, description, emoji, selected, onSelect,
}: {
  type: "scooter" | "cab";
  label: string;
  description: string;
  emoji: string;
  selected: boolean;
  onSelect: () => void;
}) => (
  <button
    type="button"
    onClick={onSelect}
    className={cn(
      "flex-1 p-6 rounded-xl border-2 transition-all text-left cursor-pointer",
      "hover:border-primary/60 hover:shadow-md",
      selected
        ? "border-primary bg-primary/10 shadow-md"
        : "border-border bg-card"
    )}
  >
    <div className="text-5xl mb-3 text-center">{emoji}</div>
    <p className={cn("text-lg font-bold text-center mb-1", selected ? "text-primary" : "text-foreground")}>
      {label}
    </p>
    <p className="text-xs text-muted-foreground text-center leading-snug">{description}</p>
    {selected && (
      <div className="mt-3 flex justify-center">
        <span className="text-xs bg-primary text-primary-foreground px-3 py-0.5 rounded-full font-medium">Selected</span>
      </div>
    )}
  </button>
);

// ── Scheduled Booking Success View ──
const ScheduledSuccessView = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate("/dashboard");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-6 mx-auto">
        <CheckCircle2 className="h-10 w-10 text-green-600" />
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-4">Booking Scheduled!</h2>
      <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
        Your scheduled booking has been created successfully. We will notify you with guide details before the pickup time.
      </p>
      
      <div className="bg-blue-50 text-blue-800 px-6 py-3 rounded-full font-medium mb-8 flex items-center gap-2 mx-auto w-fit">
        <Clock className="h-5 w-5" />
        Redirecting to dashboard in {countdown}s...
      </div>

      <Button type="button" onClick={() => navigate("/dashboard")} size="lg" className="w-full sm:w-auto mx-auto">
        Go to Dashboard
      </Button>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
type FareEstimate = {
  distanceKm: number;
  durationMin: number;
  totalFare: number;
  fareBreakdown: {
    baseFare: number;
    perKmRate: number;
    distanceFare: number;
    tripMultiplier: 1 | 2;
    currency: "INR";
  };
};

const serializeLocation = (location: LocationData | string) =>
  typeof location === "string" ? location : JSON.stringify(location);

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data as { message?: string } | undefined;
  return data?.message || fallback;
};

const libraries: ("places" | "drawing" | "geometry" | "localContext" | "visualization")[] = ["places"];

const Book = () => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const locationState = useLocation();
  const navigate      = useNavigate();
  const { toast }     = useToast();
  const { userPhone, userName, userEmail } = useAuth();
  const { refreshBookings } = useBookings();

  const [step, setStep] = useState(1);
  const [bookingMode, setBookingMode] = useState<"now" | "schedule">("now");
  const [tempBookingMode, setTempBookingMode] = useState<"now" | "schedule">("now");
  const [modePopoverOpen, setModePopoverOpen] = useState(false);
  const [isScheduledSuccess, setIsScheduledSuccess] = useState(false);
  const [fareEstimate, setFareEstimate] = useState<FareEstimate | null>(null);
  const [isEstimatingFare, setIsEstimatingFare] = useState(false);
  const [fareEstimateError, setFareEstimateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [scheduleData, setScheduleData] = useState<ScheduleData>({
    pickupDate: new Date(),
    pickupTime: "",
    dropoffDate: new Date(),
    dropoffTime: "",
  });

  const [formData, setFormData] = useState({
    name:               userName || "",
    phone:              userPhone || "",
    email:              userEmail || "",
    pickupLocation:     "" as LocationData | string,
    destinationAddress: "" as LocationData | string,
    dropBack:           false,
    waitingRequired:    false,
    waitingHours:       1,
    vehicleType:        "" as "scooter" | "cab" | "",
    visitReason:        "",
  });

  const handleChange = (field: string, value: string | boolean | number | LocationData) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // ── Active booking guard ──
  const checkForActiveBooking = async (): Promise<boolean> => {
    // If scheduling for later, bypass the active limit entirely!
    if (bookingMode === 'schedule') {
      return true;
    }

    try {
      const token   = localStorage.getItem("userToken");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await api.get("/bookings/active", { headers });
      
      const activeBookings = response.data.activeBookings || [];
      
      // Check if any active booking is happening "Today"
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const hasCurrentBooking = activeBookings.some((b: any) => b.date && b.date.startsWith(todayStr));

      if (hasCurrentBooking) {
        toast({
          title: "Booking Blocked",
          description: "You already have an active booking. Book once you finish that or schedule a booking for later.",
          action: (
            <ToastAction 
              altText="Schedule for later" 
              onClick={() => {
                setBookingMode('schedule');
                setStep(2);
              }}
            >
              Schedule for later
            </ToastAction>
          ),
        });
        return false;
      }
      return true;
    } catch {
      toast({ title: "Something went wrong", description: "Unable to check your booking status." });
      return false;
    }
  };

  // ── Step 1 validation ──
  const step1Valid =
    Boolean(formData.name?.toString().trim()) &&
    Boolean(formData.phone?.toString().trim()) &&
    Boolean(typeof formData.pickupLocation === 'string' ? formData.pickupLocation.trim() : formData.pickupLocation?.name?.trim()) &&
    Boolean(typeof formData.destinationAddress === 'string' ? formData.destinationAddress.trim() : formData.destinationAddress?.name?.trim());

  // Fetch the customer-facing estimate only on the final step. The server
  // recalculates it again during creation and remains the pricing authority.
  useEffect(() => {
    const finalStep = bookingMode === "schedule" ? 3 : 2;
    if (step !== finalStep || !formData.vehicleType || !step1Valid) {
      setFareEstimate(null);
      setFareEstimateError(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsEstimatingFare(true);
      setFareEstimate(null);
      setFareEstimateError(null);
      try {
        const { data } = await api.post<FareEstimate>("/bookings/fare-estimate", {
          pickupLocation: serializeLocation(formData.pickupLocation),
          destinationAddress: serializeLocation(formData.destinationAddress),
          vehicleType: formData.vehicleType,
          dropBack: formData.dropBack,
        });
        if (!cancelled) setFareEstimate(data);
      } catch (error: unknown) {
        if (!cancelled) {
          setFareEstimateError(getApiErrorMessage(error, "Unable to calculate the route fare."));
        }
      } finally {
        if (!cancelled) setIsEstimatingFare(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    bookingMode,
    step,
    formData.vehicleType,
    formData.pickupLocation,
    formData.destinationAddress,
    formData.dropBack,
    step1Valid,
  ]);
  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.vehicleType) {
      toast({ title: "Select a vehicle", description: "Please choose Scooter or Cab to continue.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post("/bookings", {
        name:               userName || formData.name,
        date:               bookingMode === 'schedule' && scheduleData.pickupDate ? format(scheduleData.pickupDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"), 
        time:               bookingMode === 'schedule' && scheduleData.pickupTime ? scheduleData.pickupTime : format(new Date(), "HH:mm"), 
        pickupLocation:     serializeLocation(formData.pickupLocation),
        destinationAddress: serializeLocation(formData.destinationAddress),
        vehicleType:        formData.vehicleType,
        dropBack:           formData.dropBack,
        waitingHours:       formData.waitingRequired ? formData.waitingHours : 0,
        bookingMode:        bookingMode,
        metadata: {
          visitReason: formData.visitReason
        }
      });

      if (response.status === 201) {
        await refreshBookings();
        if (bookingMode === 'schedule') {
          setIsScheduledSuccess(true);
        } else {
          navigate(`/finding-guide/${response.data._id}`);
        }
      }
    } catch (error: unknown) {
      console.error("Booking failed:", error);
      toast({
        title: "Booking Failed",
        description: getApiErrorMessage(error, "Failed to submit booking. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {isScheduledSuccess ? (
            <ScheduledSuccessView />
          ) : (
            <>
              <h1 className="text-3xl font-bold text-center mb-2">Book a Guide</h1>
              <p className="text-center text-gray-500 mb-6">Hospital assistance, made simple</p>

          {/* ── Booking Mode Dropdown ── */}
          {step === 1 && (
            <div className="flex justify-center mb-8">
              <Popover open={modePopoverOpen} onOpenChange={setModePopoverOpen}>
                <PopoverTrigger asChild>
                  <button className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-full border shadow-sm transition-all text-sm font-medium",
                    bookingMode === 'schedule' ? "bg-white border-blue-200 text-blue-700" : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                  )}>
                    {bookingMode === 'now' ? <Clock className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                    {bookingMode === 'now' ? 'Pick-up Now' : 'Pick-up Later'}
                    <ChevronDown className="h-4 w-4 ml-1 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-4" align="center">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 text-sm">When do you need the guide?</h4>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setTempBookingMode('now')}
                        className={cn("w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all", tempBookingMode === 'now' ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-300")}
                      >
                        <Clock className={cn("h-5 w-5 mt-0.5", tempBookingMode === 'now' ? "text-blue-600" : "text-gray-500")} />
                        <div>
                          <p className={cn("font-medium", tempBookingMode === 'now' ? "text-blue-700" : "text-gray-900")}>Now</p>
                          <p className="text-xs text-gray-500 mt-0.5">Request a booking for instant guide</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTempBookingMode('schedule')}
                        className={cn("w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all", tempBookingMode === 'schedule' ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-blue-300")}
                      >
                        <Calendar className={cn("h-5 w-5 mt-0.5", tempBookingMode === 'schedule' ? "text-blue-600" : "text-gray-500")} />
                        <div>
                          <p className={cn("font-medium", tempBookingMode === 'schedule' ? "text-blue-700" : "text-gray-900")}>Schedule Later</p>
                          <p className="text-xs text-gray-500 mt-0.5">Reserve for extra peace of mind</p>
                        </div>
                      </button>
                    </div>
                    <Button
                      className="w-full mt-2"
                      onClick={() => {
                        setBookingMode(tempBookingMode);
                        setModePopoverOpen(false);
                        setStep(1); 
                      }}
                    >
                      Done
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

          <StepIndicator 
            current={step} 
            steps={bookingMode === 'now' ? ["Your Details", "Choose Vehicle"] : ["Your Details", "Choose Date", "Choose Vehicle"]} 
          />

          <Card className="surface-card">
            <CardHeader>
              <CardTitle className="text-xl">
                {step === 1 ? "Your Details & Journey" : 
                 step === 2 && bookingMode === 'schedule' ? "Choose Date & Time" :
                 "Choose Your Vehicle"}
              </CardTitle>
              {step === (bookingMode === 'schedule' ? 3 : 2) && (
                <p className="text-sm text-muted-foreground mt-1">
                  Your guide will arrive in the selected vehicle type to pick you up.
                </p>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>

                {/* ── STEP 1 ── */}
                {step === 1 && (
                  <div className="space-y-6">

                    {/* Personal info */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Personal Information</h3>

                      <div className="space-y-2">
                        <Label htmlFor="name" className="flex items-center gap-2">
                          <User className="h-4 w-4" /> Full Name
                        </Label>
                        <Input
                          id="name"
                          placeholder="Enter your full name"
                          value={formData.name}
                          readOnly
                          className="cursor-not-allowed focus-visible:ring-0 focus-visible:ring-offset-0"
                          required
                        />
                        {userName && <p className="text-xs text-gray-400">Auto-filled from profile. Change details in your dashboard.</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="flex items-center gap-2">
                          <PhoneCall className="h-4 w-4" /> Phone Number
                        </Label>
                        <Input
                          id="phone"
                          placeholder="Enter your phone number"
                          value={formData.phone}
                          readOnly
                          className="cursor-not-allowed focus-visible:ring-0 focus-visible:ring-offset-0"
                          required
                        />
                        {userPhone && <p className="text-xs text-gray-400">Auto-filled from profile. Change details in your dashboard.</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center gap-2">
                          <Mail className="h-4 w-4" /> Email Address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email address"
                          value={formData.email}
                          readOnly
                          className="cursor-not-allowed focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                        {userEmail && <p className="text-xs text-gray-400">Auto-filled from profile. Change details in your dashboard.</p>}
                      </div>
                    </div>

                    {/* Journey */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Journey Details</h3>

                      <div className="space-y-2">
                        <Label htmlFor="pickup" className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-600" /> Pickup Location
                        </Label>
                        {isLoaded ? (
                          <LocationAutocomplete
                            id="pickup"
                            placeholder="Where should the guide pick you up?"
                            value={formData.pickupLocation}
                            onChange={(val) => handleChange("pickupLocation", val)}
                            required
                          />
                        ) : (
                          <Input
                            id="pickup"
                            placeholder="Where should the guide pick you up?"
                            value={formData.pickupLocation}
                            onChange={(e) => handleChange("pickupLocation", e.target.value)}
                            required
                          />
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="destination" className="flex items-center gap-2">
                          <Navigation className="h-4 w-4 text-green-600" /> Destination / Hospital
                        </Label>
                        {isLoaded ? (
                          <LocationAutocomplete
                            id="destination"
                            placeholder="Which hospital or clinic are you going to?"
                            value={formData.destinationAddress}
                            onChange={(val) => handleChange("destinationAddress", val)}
                            customOrigin={
                              typeof formData.pickupLocation === 'object' && formData.pickupLocation?.lat && formData.pickupLocation?.lng 
                                ? { lat: formData.pickupLocation.lat, lng: formData.pickupLocation.lng }
                                : undefined
                            }
                            required
                          />
                        ) : (
                          <Input
                            id="destination"
                            placeholder="Which hospital or clinic are you going to?"
                            value={formData.destinationAddress}
                            onChange={(e) => handleChange("destinationAddress", e.target.value)}
                            required
                          />
                        )}
                      </div>

                      {/* Drop-back home */}
                      <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <Checkbox
                          id="dropBack"
                          checked={formData.dropBack}
                          onCheckedChange={(checked) => handleChange("dropBack", checked === true)}
                          className="mt-0.5"
                        />
                        <div>
                          <Label htmlFor="dropBack" className="font-medium cursor-pointer flex items-center gap-1.5">
                            <Home className="h-4 w-4 text-blue-600" /> Drop me back home after the visit
                          </Label>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Your guide will return you to your pickup location
                          </p>
                        </div>
                      </div>
                      
                      {/* Visit Reason */}
                      <div className="space-y-2 pt-2">
                        <Label htmlFor="visitReason" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          Let us know, why you are visiting the hospital <span className="text-gray-400 font-normal">( Optional )</span>
                        </Label>
                        <Input
                          id="visitReason"
                          placeholder="E.g., Routine checkup, surgery, visiting a patient..."
                          value={formData.visitReason}
                          onChange={(e) => handleChange("visitReason", e.target.value)}
                        />
                        <p className="text-[11px] text-gray-500">This will help us understand and serve you better in future trips.</p>
                      </div>
                    </div>

                    {/* Waiting Time Assistance */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Waiting Time Assistance</h3>

                        {/* Date and Time picker removed for Phase 1. */}

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="waiting"
                            checked={formData.waitingRequired}
                            onCheckedChange={(checked) => handleChange("waitingRequired", checked === true)}
                          />
                          <Label htmlFor="waiting" className="font-normal cursor-pointer">
                            I need the guide to wait during my appointment
                          </Label>
                        </div>
                        {formData.waitingRequired && (
                          <div className="mt-2 pl-6">
                            <Label htmlFor="hours">Estimated waiting hours</Label>
                            <Select
                              value={formData.waitingHours.toString()}
                              onValueChange={(v) => handleChange("waitingHours", parseInt(v))}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select hours" />
                              </SelectTrigger>
                              <SelectContent>
                                {[1, 2, 3, 4, 5, 6].map(h => (
                                  <SelectItem key={h} value={h.toString()}>
                                    {h} {h === 1 ? "hour" : "hours"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      type="button"
                      className="w-full"
                      disabled={!step1Valid}
                      onClick={async () => {
                        const allowed = await checkForActiveBooking();
                        if (allowed) setStep(2);
                      }}
                    >
                      Next
                    </Button>
                  </div>
                )}

                {/* ── STEP 2 — Choose Date (Schedule Mode) ── */}
                {step === 2 && bookingMode === 'schedule' && (
                  <div className="space-y-6 py-6">
                    <SchedulePicker value={scheduleData} onChange={setScheduleData} />
                    
                    <div className="flex gap-4 pt-6 max-w-sm mx-auto">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                        ← Back
                      </Button>
                      <Button 
                        type="button" 
                        className="flex-1" 
                        disabled={!scheduleData.pickupDate || !scheduleData.pickupTime || !scheduleData.dropoffDate || !scheduleData.dropoffTime}
                        onClick={() => setStep(3)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── FINAL STEP — Vehicle Selection ── */}
                {step === (bookingMode === 'schedule' ? 3 : 2) && (
                  <div className="space-y-6">

                    {/* Journey summary */}
                    <div className="p-4 bg-gray-50 rounded-lg border text-sm space-y-1.5">
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span className="truncate"><span className="font-medium">Pickup:</span> {typeof formData.pickupLocation === 'string' ? formData.pickupLocation : formData.pickupLocation?.name || ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Navigation className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        <span className="truncate"><span className="font-medium">Destination:</span> {typeof formData.destinationAddress === 'string' ? formData.destinationAddress : formData.destinationAddress?.name || ''}</span>
                      </div>
                      {formData.dropBack && (
                        <div className="flex items-center gap-2 text-blue-600">
                          <Home className="h-3.5 w-3.5 shrink-0" />
                          <span className="font-medium">Drop-back home included</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-foreground/80 mb-4">
                        Your guide will arrive in this vehicle to pick you up at your specified location.
                      </p>
                      <div className="flex gap-4">
                        <VehicleCard
                          type="scooter"
                          label="Scooter"
                          description="Compact & quick. Best for solo travel through busy areas."
                          emoji="🛵"
                          selected={formData.vehicleType === "scooter"}
                          onSelect={() => handleChange("vehicleType", "scooter")}
                        />
                        <VehicleCard
                          type="cab"
                          label="Cab"
                          description="Comfortable 4-wheeler. Ideal if you're bringing a companion."
                          emoji="🚖"
                          selected={formData.vehicleType === "cab"}
                          onSelect={() => handleChange("vehicleType", "cab")}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4" aria-live="polite">
                      {isEstimatingFare ? (
                        <div className="flex items-center justify-center gap-2 py-3 text-sm font-medium text-blue-700">
                          <Loader2 className="h-4 w-4 animate-spin" /> Calculating the driving route…
                        </div>
                      ) : fareEstimate ? (
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Estimated route fare</p>
                              <p className="mt-1 text-sm text-gray-600">
                                {fareEstimate.distanceKm.toFixed(1)} km · approximately {fareEstimate.durationMin} min
                                {formData.dropBack ? " round trip" : ""}
                              </p>
                            </div>
                            <p className="text-2xl font-black text-blue-800">₹{fareEstimate.totalFare}</p>
                          </div>
                          <div className="border-t border-blue-100 pt-2 text-xs text-gray-500">
                            ₹{fareEstimate.fareBreakdown.baseFare} base + {fareEstimate.distanceKm.toFixed(1)} km × ₹{fareEstimate.fareBreakdown.perKmRate}/km
                          </div>
                        </div>
                      ) : fareEstimateError ? (
                        <p className="py-2 text-sm font-medium text-red-700">{fareEstimateError}</p>
                      ) : (
                        <p className="py-2 text-sm text-muted-foreground">Select a vehicle to calculate your route and fare.</p>
                      )}
                    </div>
                    <div className="flex gap-4 pt-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(bookingMode === 'schedule' ? 2 : 1)}>
                        ← Back
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={!formData.vehicleType || !fareEstimate || isEstimatingFare || isSubmitting}
                      >
                        {isSubmitting ? "Confirming…" : "Confirm Booking"}
                      </Button>
                    </div>
                  </div>
                )}

              </form>
            </CardContent>
          </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Book;
