import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
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
import { MapPin, PhoneCall, Clock, Calendar, User, Mail, Navigation, Home, ChevronDown } from "lucide-react";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { useBookings, BookingService } from "@/contexts/BookingContext";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import api from "@/lib/api";

// ─── Step indicator ──────────────────────────────────────────────────────────
const steps = ["Your Details", "Choose Vehicle"];

const StepIndicator = ({ current }: { current: number }) => (
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
                isComplete ? "bg-blue-600 text-white" :
                isActive   ? "bg-blue-600 text-white ring-4 ring-blue-100" :
                             "bg-gray-200 text-gray-500"
              )}
            >
              {isComplete ? "✓" : stepNum}
            </div>
            <span className={cn("text-xs mt-1 font-medium", isActive ? "text-blue-600" : "text-gray-400")}>
              {label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div className={cn("w-16 h-0.5 mb-4 mx-1 transition-colors", isComplete ? "bg-blue-600" : "bg-gray-200")} />
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
      "hover:border-blue-400 hover:shadow-md",
      selected
        ? "border-blue-600 bg-blue-50 shadow-md"
        : "border-gray-200 bg-white"
    )}
  >
    <div className="text-5xl mb-3 text-center">{emoji}</div>
    <p className={cn("text-lg font-bold text-center mb-1", selected ? "text-blue-700" : "text-gray-800")}>
      {label}
    </p>
    <p className="text-xs text-gray-500 text-center leading-snug">{description}</p>
    {selected && (
      <div className="mt-3 flex justify-center">
        <span className="text-xs bg-blue-600 text-white px-3 py-0.5 rounded-full font-medium">Selected</span>
      </div>
    )}
  </button>
);

// ─── Main component ───────────────────────────────────────────────────────────
const Book = () => {
  const locationState = useLocation();
  const navigate      = useNavigate();
  const { toast }     = useToast();
  const { userPhone, userName, userEmail } = useAuth();
  const { refreshBookings } = useBookings();

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [dateOpen, setDateOpen] = useState(false);

  const [formData, setFormData] = useState({
    name:               userName || "",
    phone:              userPhone || "",
    email:              userEmail || "",
    pickupLocation:     "",
    destinationAddress: "",
    dropBack:           false,
    service:            "",
    date:               "",
    time:               "",
    waitingRequired:    false,
    waitingHours:       1,
    vehicleType:        "" as "scooter" | "cab" | "",
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleChange = (field: string, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) handleChange("date", format(date, "yyyy-MM-dd"));
  };

  // ── Active booking guard ──
  const checkForActiveBooking = async (): Promise<boolean> => {
    try {
      const token   = localStorage.getItem("userToken");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await api.get("/bookings/active", { headers });
      if (response.data.activeBooking) {
        toast({
          title: "Booking Blocked",
          description: "You already have an ongoing booking. Complete it to make a new request.",
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
    formData.name.trim() &&
    formData.phone.trim() &&
    formData.pickupLocation.trim() &&
    formData.destinationAddress.trim() &&
    formData.service &&
    formData.date &&
    formData.time;

  // ── Submit ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.vehicleType) {
      toast({ title: "Select a vehicle", description: "Please choose Scooter or Cab to continue.", variant: "destructive" });
      return;
    }

    let bookingService: BookingService;
    switch (formData.service) {
      case "navigation":    bookingService = "Navigation Assistance";  break;
      case "heavy-lifting": bookingService = "Heavy Lifting";           break;
      case "transport":     bookingService = "Transport Assistance";    break;
      default:              bookingService = "Navigation Assistance";
    }

    try {
      const response = await api.post("/bookings", {
        service:            bookingService,
        name:               userName || formData.name,
        date:               formData.date,
        time:               formData.time,
        pickupLocation:     formData.pickupLocation,
        destinationAddress: formData.destinationAddress,
        vehicleType:        formData.vehicleType,
        dropBack:           formData.dropBack,
        waitingHours:       formData.waitingRequired ? formData.waitingHours : 0,
      });

      if (response.status === 201) {
        await refreshBookings();
        toast({ title: "Booking Request Sent", description: "Your booking request has been received." });
        navigate(`/booking-confirmation/${response.data._id}`, {
          state: { bookingData: response.data },
        });
      }
    } catch (error: any) {
      console.error("❌ Booking failed:", error);
      toast({ title: "Booking Failed", description: "Failed to submit booking. Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-2">Book a Guide</h1>
          <p className="text-center text-gray-500 mb-8">Hospital assistance, made simple</p>

          <StepIndicator current={step} />

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                {step === 1 ? "Your Details & Journey" : "Choose Your Vehicle"}
              </CardTitle>
              {step === 2 && (
                <p className="text-sm text-gray-500">
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
                          onChange={(e) => handleChange("name", e.target.value)}
                          disabled={!!userName}
                          required
                        />
                        {userName && <p className="text-xs text-gray-400">Using name from your profile</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone" className="flex items-center gap-2">
                          <PhoneCall className="h-4 w-4" /> Phone Number
                        </Label>
                        <Input
                          id="phone"
                          placeholder="Enter your phone number"
                          value={formData.phone}
                          onChange={(e) => handleChange("phone", e.target.value)}
                          disabled={!!userPhone}
                          required
                        />
                        {userPhone && <p className="text-xs text-gray-400">Verified phone number</p>}
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
                          onChange={(e) => handleChange("email", e.target.value)}
                          disabled={!!userEmail}
                        />
                        {userEmail && <p className="text-xs text-gray-400">Using email from your profile</p>}
                      </div>
                    </div>

                    {/* Journey */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Journey Details</h3>

                      <div className="space-y-2">
                        <Label htmlFor="pickup" className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-600" /> Pickup Location
                        </Label>
                        <Input
                          id="pickup"
                          placeholder="Where should the guide pick you up?"
                          value={formData.pickupLocation}
                          onChange={(e) => handleChange("pickupLocation", e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="destination" className="flex items-center gap-2">
                          <Navigation className="h-4 w-4 text-green-600" /> Destination / Hospital
                        </Label>
                        <Input
                          id="destination"
                          placeholder="Which hospital or clinic are you going to?"
                          value={formData.destinationAddress}
                          onChange={(e) => handleChange("destinationAddress", e.target.value)}
                          required
                        />
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
                    </div>

                    {/* Service & Scheduling */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Service & Schedule</h3>

                      <div className="space-y-2">
                        <Label htmlFor="service">Service Required</Label>
                        <Select
                          value={formData.service}
                          onValueChange={(v) => handleChange("service", v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a service" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="heavy-lifting">Carrying Heavy Items</SelectItem>
                            <SelectItem value="navigation">Navigation Assistance</SelectItem>
                            <SelectItem value="transport">Transportation Assistance</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <FieldGroup className="flex-row items-end gap-3">
                        <Field>
                          <FieldLabel htmlFor="date-picker">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4" /> Date
                            </span>
                          </FieldLabel>
                          <Popover open={dateOpen} onOpenChange={setDateOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                id="date-picker"
                                className={cn(
                                  "w-40 justify-between font-normal",
                                  !selectedDate && "text-muted-foreground"
                                )}
                              >
                                {selectedDate ? format(selectedDate, "d MMM yyyy") : "Select date"}
                                <ChevronDown className="h-4 w-4 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                              <CalendarComponent
                                mode="single"
                                selected={selectedDate}
                                captionLayout="dropdown"
                                defaultMonth={selectedDate || today}
                                fromDate={today}
                                onSelect={(date) => {
                                  handleDateSelect(date);
                                  setDateOpen(false);
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                        </Field>

                        <Field className="w-36">
                          <FieldLabel htmlFor="time-picker">
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4" /> Time
                            </span>
                          </FieldLabel>
                          <input
                            type="time"
                            id="time-picker"
                            step="60"
                            value={formData.time}
                            onChange={(e) => handleChange("time", e.target.value)}
                            required
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          />
                        </Field>
                      </FieldGroup>

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
                      Continue → Choose Vehicle
                    </Button>
                  </div>
                )}

                {/* ── STEP 2 — Vehicle Selection ── */}
                {step === 2 && (
                  <div className="space-y-6">

                    {/* Journey summary */}
                    <div className="p-4 bg-gray-50 rounded-lg border text-sm space-y-1.5">
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span className="truncate"><span className="font-medium">Pickup:</span> {formData.pickupLocation}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Navigation className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        <span className="truncate"><span className="font-medium">Destination:</span> {formData.destinationAddress}</span>
                      </div>
                      {formData.dropBack && (
                        <div className="flex items-center gap-2 text-blue-600">
                          <Home className="h-3.5 w-3.5 shrink-0" />
                          <span className="font-medium">Drop-back home included</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-4">
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

                    <div className="flex gap-4 pt-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                        ← Back
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1"
                        disabled={!formData.vehicleType}
                      >
                        Confirm Booking
                      </Button>
                    </div>
                  </div>
                )}

              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Book;
