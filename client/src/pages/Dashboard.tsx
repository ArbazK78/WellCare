import { useEffect, useState, useMemo, useRef } from "react";
import "@/styles/ui2.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CheckCircle2, Clock, MapPin, Calendar, User, Mail, Phone, X, PhoneCall, MessageCircle, AlertCircle, ArrowRight } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Link, useNavigate } from "react-router-dom";
import { useBookings } from "@/contexts/BookingContext";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/AppNavbar";
import UserActiveRideView from "@/components/UserActiveRideView";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { format, isToday, isTomorrow, parseISO, subMinutes } from "date-fns";
import { parseLocation } from "@/lib/utils";
import { useCustomerBookingSync } from "@/hooks/useCustomerBookingSync";

// ── Date/time formatters ─────────────────────────────────────────────────────
const ordinalSuffix = (d: number) => {
  if (d > 3 && d < 21) return 'th';
  switch (d % 10) { case 1: return 'st'; case 2: return 'nd'; case 3: return 'rd'; default: return 'th'; }
};

const formatBookingDate = (rawDate: string): string => {
  try {
    const date = new Date(rawDate);
    if (isNaN(date.getTime())) return rawDate;
    if (isToday(date))    return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    const d = date.getDate();
    return `${d}${ordinalSuffix(d)} ${format(date, 'MMMM, yyyy')}`;
  } catch { return rawDate; }
};

/** Converts "14:30" (24h) → "2:30 PM", or formats ISO date strings */
const formatBookingTime = (rawTime: string | Date): string => {
  try {
    if (!rawTime) return String(rawTime);
    if (rawTime instanceof Date || (typeof rawTime === 'string' && rawTime.includes('T'))) {
      const d = new Date(rawTime);
      return format(d, 'hh:mm a');
    }
    const [hStr, mStr] = String(rawTime).split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(h) || isNaN(m)) return String(rawTime);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12   = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  } catch { return String(rawTime); }
};

const parseBookingDateTime = (booking: any) => {
  if (!booking.date || !booking.time) return new Date(booking.createdAt || Date.now());
  try {
    const datePart = format(new Date(booking.date), "yyyy-MM-dd");
    return new Date(`${datePart}T${booking.time}`);
  } catch (e) {
    return new Date(booking.createdAt || Date.now());
  }
};

const Dashboard = () => {
  const { bookings, completeBooking, cancelBooking: contextCancelBooking } = useBookings();
  const { userPhone, userName, userEmail, updateProfile, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const memberSince = user?.createdAt ? new Date(user.createdAt) : new Date();
  const monthsDiff = Math.floor((new Date().getTime() - memberSince.getTime()) / (1000 * 60 * 60 * 24 * 30));
  const monthsOnWellCare = Math.max(1, monthsDiff);

  // Real-time booking status sync — polls every 8s, plays guide_assigned.wav on acceptance
  useCustomerBookingSync();

  const [localBookings, setLocalBookings] = useState(bookings);

  // Keep localBookings in sync when context refreshes (e.g. after guide accepts)
  useEffect(() => {
    setLocalBookings(bookings);
  }, [bookings]);

  const activeBooking = localBookings.find(
    (b: any) =>
      ["accepted", "arrived", "in_progress"].includes(b.status) ||
      (b.status === "pending" && b.bookingMode !== "schedule")
  );

  useEffect(() => {
    if (activeBooking && activeBooking.status === "pending" && activeBooking.bookingMode !== "schedule") {
      navigate(`/finding-guide/${activeBooking._id}`, { replace: true });
    }
  }, [activeBooking, navigate]);

  const [isPaying, setIsPaying] = useState(false);
  const [closedPaymentModalId, setClosedPaymentModalId] = useState<string | null>(null);

  const paymentBooking = useMemo(() => {
    return localBookings.find((b: any) => 
      b.status === "completed" && 
      b.paymentStatus === "pending" &&
      b._id !== closedPaymentModalId
    );
  }, [localBookings, closedPaymentModalId]);

  const handlePayment = async () => {
    if (!paymentBooking) return;
    setIsPaying(true);
    try {
      // 1. Create Order
      const { data: orderData } = await api.post('/payments/create-order', { bookingId: paymentBooking._id });
      
      const options = {
        key: orderData.key_id,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: "WellCare",
        description: `Payment for Ride with ${(paymentBooking.guide as any)?.name || 'Guide'}`,
        order_id: orderData.order.id,
        handler: async function (response: any) {
          try {
            // 2. Verify Payment
            await api.post('/payments/verify', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              bookingId: paymentBooking._id
            });
            toast({ title: "Payment Successful", description: `Payment done to ${(paymentBooking.guide as any)?.name || 'Guide'}` });
            setClosedPaymentModalId(paymentBooking._id);
          } catch (err) {
            toast({ title: "Verification Failed", description: "Payment verification failed.", variant: "destructive" });
          } finally {
            setIsPaying(false);
          }
        },
        modal: {
          ondismiss: function() {
            // Re-open our local dialog if user cancels Razorpay checkout
            setClosedPaymentModalId(null);
            setIsPaying(false);
          }
        },
        prefill: {
          name: profileForm.name,
          email: profileForm.email,
          contact: profileForm.phone
        },
        theme: {
          color: "#2563eb"
        }
      };

      const razorpayInstance = new (window as any).Razorpay(options);
      razorpayInstance.on('payment.failed', function (response: any) {
        toast({ title: "Payment Failed", description: response.error.description, variant: "destructive" });
      });
      
      // Temporarily hide Shadcn Dialog so it doesn't block pointer events for Razorpay
      setClosedPaymentModalId(paymentBooking._id);
      razorpayInstance.open();
    } catch (err) {
      toast({ title: "Error", description: "Could not initialize payment. Please try again.", variant: "destructive" });
      setIsPaying(false);
    }
  };

  // Detect remote close and show toast
  const prevPaymentBookingRef = useRef<any>(null);
  useEffect(() => {
    if (prevPaymentBookingRef.current && !paymentBooking) {
      if (closedPaymentModalId !== prevPaymentBookingRef.current._id) {
        toast({ 
          title: "Payment Completed", 
          description: `Your payment of ₹${prevPaymentBookingRef.current.totalFare || 0} to ${prevPaymentBookingRef.current.guide?.name || 'Guide'} is completed successfully.` 
        });
      }
    }
    prevPaymentBookingRef.current = paymentBooking;
  }, [paymentBooking, closedPaymentModalId, toast]);

  const [contactGuide, setContactGuide] = useState<{ name: string; phone: string } | null>(null);
  const [cancelTarget, setCancelTarget]   = useState<string | null>(null);
  const [cancelReason, setCancelReason]   = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState("bookings");
  const [selectedScheduledBooking, setSelectedScheduledBooking] = useState<any>(null);
  const [profileForm, setProfileForm] = useState({
    name: userName || "",
    email: userEmail || "",
    phone: userPhone || "",
    homeAddress: "",
    workAddress: "",
  });

  // FM-7 fix: Removed duplicate useEffect for setLocalBookings that caused double re-renders

  // Load saved addresses from localStorage on mount
  useEffect(() => {
    const homeAddress = localStorage.getItem("homeAddress");
    const workAddress = localStorage.getItem("workAddress");
    setProfileForm(prev => ({
      ...prev,
      homeAddress: homeAddress || "",
      workAddress: workAddress || "",
    }));
  }, []);

  const { currentBooking, scheduledBookings } = useMemo(() => {
    const upcoming = localBookings.filter((booking) =>
      ["pending", "accepted", "arrived", "in_progress"].includes(booking.status)
    );
    const byPickup = (a: any, b: any) => parseBookingDateTime(a).getTime() - parseBookingDateTime(b).getTime();
    const currentBooking = upcoming
      .filter((booking) => booking.bookingMode !== "schedule")
      .sort(byPickup)[0] || null;
    const scheduledBookings = upcoming
      .filter((booking) => booking.bookingMode === "schedule")
      .sort(byPickup);
    return { currentBooking, scheduledBookings };
  }, [localBookings]);
  const completedBookings = localBookings.filter(booking => booking.status === "completed");

  const originalProfile = {
    name: userName,
    email: userEmail || "",
    phone: userPhone || "",
  };

  const hasProfileChanged = useMemo(() => {
    return (
      profileForm.name !== originalProfile.name ||
      profileForm.email !== originalProfile.email ||
      profileForm.phone !== originalProfile.phone
    );
  }, [profileForm, originalProfile]);

  const handleProfileChange = (field: string, value: string) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
  };

  const saveProfileChanges = () => {
    if (!hasProfileChanged) {
      toast({ title: "No changes made", description: "You haven't updated any profile fields." });
      return;
    }
    if (!profileForm.name.trim()) {
      toast({ variant: "destructive", title: "Name is required", description: "Please enter your name to continue." });
      return;
    }
    if (profileForm.email && !/\S+@\S+\.\S+/.test(profileForm.email)) {
      toast({ variant: "destructive", title: "Invalid email", description: "Please enter a valid email address." });
      return;
    }

    updateProfile({ name: profileForm.name, email: profileForm.email, phone: profileForm.phone });

    if (profileForm.homeAddress) localStorage.setItem("homeAddress", profileForm.homeAddress);
    if (profileForm.workAddress) localStorage.setItem("workAddress", profileForm.workAddress);

    toast({ title: "Profile updated", description: "Your profile information has been updated successfully." });
    setIsEditingProfile(false);
  };

  const handleCancelBooking = async (bookingId: string) => {
    // Opens the reason dialog; actual deletion happens in confirmCancel
    setCancelTarget(bookingId);
    setCancelReason("");
  };

  const handleCancelConfirm = async () => {
    if (!cancelTarget || !cancelReason) return;
    
    try {
      const success = await contextCancelBooking(cancelTarget, cancelReason);
      if (success) {
        toast({ title: "Booking Cancelled", description: "Your booking has been successfully cancelled." });
        if (selectedScheduledBooking?._id === cancelTarget) {
          setSelectedScheduledBooking(null);
        }
        setCancelTarget(null);
        setCancelReason("");
      } else {
        toast({ title: "Cancellation Failed", description: "Failed to cancel the booking. Please try again.", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Cancellation Error", description: error.message || "Something went wrong while cancelling.", variant: "destructive" });
    }
  };

  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col"
      style={{ overflowY: activeTab === 'profile' ? 'hidden' : 'auto' }}
    >
      <Navbar />

      {/* Show Active Tracking View if a ride is in progress or guide has accepted/arrived */}
      {activeBooking && activeBooking.status !== "pending" ? (
        <div className="flex-1 overflow-hidden">
          <UserActiveRideView 
            booking={activeBooking} 
            onCancelClick={handleCancelBooking} 
            onContactGuide={(guide) => setContactGuide({ name: guide.name, phone: guide.phone || "Not available", email: guide.email || "Not available" })} 
          />
        </div>
      ) : selectedScheduledBooking ? (
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto flex flex-col items-start min-h-[60vh]">
            <Button variant="ghost" onClick={() => setSelectedScheduledBooking(null)} className="mb-6 -ml-4 hover:bg-transparent hover:text-blue-600">
              ← Back to Dashboard
            </Button>
            
            <div className="w-full">
              <h1 className="text-3xl font-bold mb-6">Scheduled Booking Details</h1>
              
              {selectedScheduledBooking.guide ? (
                <div className="mb-8 flex items-center gap-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-secondary ring-4 ring-background">
                    {selectedScheduledBooking.guide.image ? (
                      <img src={selectedScheduledBooking.guide.image} alt={selectedScheduledBooking.guide.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xl font-bold text-primary">{selectedScheduledBooking.guide.name?.charAt(0)}</div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-700 dark:text-emerald-300">Your guide is reserved</p>
                    <h2 className="mt-1 text-2xl font-bold text-foreground">{selectedScheduledBooking.guide.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">We will reconfirm readiness closer to your pickup time.</p>
                  </div>
                </div>
              ) : (
                <div className="mb-8 flex items-start gap-4 rounded-2xl border border-primary/25 bg-primary/10 p-5 text-foreground">
                  <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
                  <div>
                    <h3 className="mb-1 font-semibold text-foreground">Guide assignment pending</h3>
                    <p className="text-muted-foreground">
                      Cab guides can review this request now. We will confirm fulfilment no later than <strong className="text-foreground">{(() => {
                        const dt = parseBookingDateTime(selectedScheduledBooking);
                        return format(subMinutes(dt, 10), "h:mm a, MMM d");
                      })()}</strong>.
                    </p>
                  </div>
                </div>
              )}
              <Card className="mb-8 surface-card overflow-hidden">
                <CardHeader className="bg-secondary/35 border-b pb-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      {formatBookingDate(selectedScheduledBooking.date)} at {formatBookingTime(selectedScheduledBooking.time)}
                    </CardTitle>
                    <span className="bg-primary/15 text-primary px-3 py-1 rounded-full text-sm font-semibold">
                      Scheduled
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {selectedScheduledBooking.bookingFor === "other" && (
                    <div className="flex flex-col gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-primary">Assistance booked for</p>
                        <p className="mt-1 font-semibold text-foreground">{selectedScheduledBooking.name}</p>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">{selectedScheduledBooking.contactPhone}</p>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {selectedScheduledBooking.vehicleType === "scooter" ? "🛵" : "🚖"}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide mb-1">Vehicle</p>
                      <p className="font-medium text-foreground capitalize">{selectedScheduledBooking.vehicleType}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 relative">
                    <div className="absolute left-2 top-3 bottom-3 w-0.5 bg-border"></div>
                    <div className="relative z-10 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-background mt-1 shrink-0"></div>
                    <div>
                      <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide mb-1">Pick-up</p>
                      <p className="font-semibold text-foreground">{parseLocation(selectedScheduledBooking.pickupLocation).name}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{parseLocation(selectedScheduledBooking.pickupLocation).address}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 relative">
                    <div className="relative z-10 w-4 h-4 rounded-full bg-green-500 ring-4 ring-background mt-1 shrink-0"></div>
                    <div>
                      <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide mb-1">Drop-off</p>
                      <p className="font-semibold text-foreground">{parseLocation(selectedScheduledBooking.destinationAddress).name}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{parseLocation(selectedScheduledBooking.destinationAddress).address}</p>
                    </div>
                  </div>

                  {selectedScheduledBooking.totalFare !== undefined && (
                    <div className="grid grid-cols-3 gap-4 border-t pt-4">
                      <div>
                        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide mb-1">Distance</p>
                        <p className="font-medium text-foreground">{selectedScheduledBooking.distanceKm?.toFixed(1) || "—"} km</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide mb-1">Drive Time</p>
                        <p className="font-medium text-foreground">~{selectedScheduledBooking.durationMin || "—"} min</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide mb-1">Estimated Fare</p>
                        <p className="font-bold text-primary">₹{selectedScheduledBooking.totalFare}</p>
                      </div>
                    </div>
                  )}

                  {(selectedScheduledBooking.waitingHours > 0 || selectedScheduledBooking.dropBack) && (
                    <div className="pt-4 border-t mt-2 grid grid-cols-2 gap-4">
                      {selectedScheduledBooking.waitingHours > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide mb-1">Waiting Time</p>
                          <p className="font-medium text-foreground">{selectedScheduledBooking.waitingHours} Hour(s)</p>
                        </div>
                      )}
                      {selectedScheduledBooking.dropBack && (
                        <div>
                          <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide mb-1">Return Trip</p>
                          <p className="font-medium text-foreground">Requested</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="border-t pt-8 flex justify-end">
                <Button 
                  variant="destructive" 
                  onClick={() => handleCancelBooking(selectedScheduledBooking._id)}
                  className="w-full sm:w-auto"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel Booking
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8 surface-card">
            <h1 className="text-3xl font-bold mb-2">Your Dashboard</h1>
            <p className="text-gray-600">Manage your bookings and profile</p>
          </div>

          <Tabs defaultValue="bookings" onValueChange={setActiveTab}>
            <TabsList className="mb-8 surface-card">
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
            </TabsList>

            {/* ── BOOKINGS TAB ── */}
            <TabsContent value="bookings">
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold mb-4">Current Booking</h2>
                  {currentBooking ? (
                    <div className="space-y-4">
                      {(() => {
                        const booking = currentBooking;
                        return (
                          <Card key={booking._id}>
                            <CardContent className="p-6">
                              <div className="flex flex-col md:flex-row">
                              {/* Guide info */}
                              <div className="md:w-1/4 mb-4 md:mb-0">
                                <div className="flex items-center space-x-4">
                                  {booking.guide ? (
                                    <>
                                      <div className="w-12 h-12 rounded-full overflow-hidden">
                                        <img
                                          src={booking.guide.image}
                                          alt={booking.guide.name}
                                          className="object-cover w-full h-full"
                                        />
                                      </div>
                                      <div>
                                        <h3 className="font-medium">{booking.guide.name}</h3>
                                        <div className="flex items-center text-yellow-500">
                                          <span>{booking.guide.rating}</span>
                                          <span className="ml-1">★</span>
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                        <User className="h-6 w-6 text-blue-400" />
                                      </div>
                                      <div>
                                        <h3 className="font-medium text-muted-foreground">Awaiting Guide</h3>
                                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                                          Pending
                                        </span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Booking details */}
                              <div className="md:w-2/4 space-y-2">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                                  <span className="font-medium">{formatBookingDate(booking.date)}</span>
                                  <Clock className="h-4 w-4 ml-4 mr-2 text-blue-600" />
                                  <span>{formatBookingTime(booking.time)}</span>
                                </div>
                                <div className="flex flex-col flex-1 pl-1">
                                  <div className="flex items-start">
                                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 mr-3 shrink-0" />
                                    <div>
                                      <p className="font-semibold text-foreground text-sm">{parseLocation(booking.pickupLocation || booking.location).name}</p>
                                      {parseLocation(booking.pickupLocation || booking.location).address && (
                                        <p className="text-xs text-muted-foreground">{parseLocation(booking.pickupLocation || booking.location).address}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="w-0.5 h-4 bg-border ml-[3px] my-0.5" />
                                  <div className="flex items-start">
                                    <div className="w-2 h-2 rounded-sm bg-green-600 mt-1.5 mr-3 shrink-0" />
                                    <div>
                                      <p className="font-semibold text-foreground text-sm">{parseLocation(booking.destinationAddress).name}</p>
                                      {parseLocation(booking.destinationAddress).address && (
                                        <p className="text-xs text-muted-foreground">{parseLocation(booking.destinationAddress).address}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {booking.vehicleType && (
                                    <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-medium">
                                      {booking.vehicleType === "scooter" ? "🛵 Scooter" : "🚖 Cab"}
                                    </span>
                                  )}
                                  {booking.dropBack && (
                                    <span className="text-xs bg-blue-100 text-primary px-2 py-0.5 rounded-full font-medium">
                                      🏠 Drop-back included
                                    </span>
                                  )}
                                </div>
                                {booking.waitingHours > 0 && (
                                  <div>
                                    <span className="text-gray-600">Waiting:</span> {booking.waitingHours} hours
                                  </div>
                                )}
                              </div>

                                {/* Actions */}
                                <div className="md:w-1/4 mt-4 md:mt-0 flex flex-col md:justify-end items-center gap-3">
                                  {user?.safetyPin && (
                                    <div className="w-full bg-blue-50 border border-blue-100 rounded-lg p-3 text-center">
                                      <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">Safety PIN</p>
                                      <p className="text-xl font-bold text-primary tracking-[0.25em]">{user.safetyPin}</p>
                                    </div>
                                  )}
                                  <div className="w-full space-y-2">
                                    {booking.status === "accepted" && booking.guide && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() =>
                                          setContactGuide({
                                            name: booking.guide.name,
                                            phone: (booking.guide as any).phone || "Not available",
                                          })
                                        }
                                      >
                                        <PhoneCall className="h-4 w-4 mr-1" />
                                        Contact Guide
                                      </Button>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full text-red-500 hover:text-red-600"
                                      onClick={() => handleCancelBooking(booking._id)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })()}
                    </div>
                  ) : (
                    <Card className="surface-card">
                      <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground mb-4">You don't have any upcoming bookings</p>
                        <Button asChild>
                          <Link to="/book">Book a Guide</Link>
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Past bookings */}
                <div>
                  {/* ── SCHEDULED BOOKINGS PLACEHOLDER ── */}
                  <div className="mt-12 mb-8">
                    <h2 className="text-2xl font-bold mb-4">Scheduled Bookings</h2>
                    {scheduledBookings.length > 0 ? (
                      <div className="space-y-4">
                        {scheduledBookings.map((booking: any) => (
                          <Card key={booking._id} className="bg-secondary/35 border-border/70">
                            <CardContent className="p-6">
                              <div className="flex flex-col md:flex-row justify-between items-center">
                                <div className="space-y-2">
                                  <div className="flex items-center text-muted-foreground text-sm">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    {format(new Date(booking.date), "MMM d, yyyy")} at {format(parseISO(`1970-01-01T${booking.time}`), "h:mm a")}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    {!booking.guide?.name && (
                                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                      {{
                                        open: "Finding an advance guide",
                                        claimed: "Guide reserved",
                                        readiness_pending: "Awaiting guide readiness",
                                        ready: "Guide ready",
                                        fallback_dispatching: "Finding a backup guide",
                                        fulfilled: "Guide confirmed",
                                        unfulfilled: "Could not fulfil",
                                      }[booking.reservationStatus as string] || "Scheduled"}
                                    </span>
                                    )}
                                    {booking.guide?.name && (
                                      <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                                        <div className="h-10 w-10 overflow-hidden rounded-full bg-background">
                                          {booking.guide.image ? <img src={booking.guide.image} alt={booking.guide.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center font-bold text-primary">{booking.guide.name.charAt(0)}</div>}
                                        </div>
                                        <div><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Guide reserved</p><p className="font-semibold text-foreground">{booking.guide.name}</p></div>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col flex-1 pl-1 mt-2">
                                    <div className="flex items-start">
                                      <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 mr-3 shrink-0" />
                                      <div>
                                        <p className="font-semibold text-foreground text-sm">{parseLocation(booking.pickupLocation || booking.location).name}</p>
                                        {parseLocation(booking.pickupLocation || booking.location).address && (
                                          <p className="text-xs text-muted-foreground">{parseLocation(booking.pickupLocation || booking.location).address}</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="w-0.5 h-4 bg-border ml-[3px] my-0.5" />
                                    <div className="flex items-start">
                                      <div className="w-2 h-2 rounded-sm bg-green-600 mt-1.5 mr-3 shrink-0" />
                                      <div>
                                        <p className="font-semibold text-foreground text-sm">{parseLocation(booking.destinationAddress).name}</p>
                                        {parseLocation(booking.destinationAddress).address && (
                                          <p className="text-xs text-muted-foreground">{parseLocation(booking.destinationAddress).address}</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                      <div className="flex items-center gap-2 mt-2">
                                        {booking.vehicleType && (
                                          <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-medium">
                                            {booking.vehicleType === "scooter" ? "🛵 Scooter" : "🚖 Cab"}
                                          </span>
                                        )}
                                        {booking.dropBack && (
                                          <span className="text-xs bg-blue-100 text-primary px-2 py-0.5 rounded-full font-medium">
                                            🏠 Drop-back
                                          </span>
                                        )}
                                      </div>
                                </div>
                                <Button 
                                  variant="outline" 
                                  className="mt-4 md:mt-0 rounded-full border-blue-200 text-primary hover:bg-blue-50 hover:text-blue-800"
                                  onClick={() => setSelectedScheduledBooking(booking)}
                                >
                                  Check Status <ArrowRight className="ml-2 w-4 h-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center border-2 border-dashed rounded-xl bg-gray-50">
                        <p className="text-muted-foreground">You'll find your future and scheduled bookings here</p>
                      </div>
                    )}
                  </div>

                  <h2 className="text-2xl font-bold mb-4">Past Bookings</h2>
                  {completedBookings.length > 0 ? (
                    <div className="space-y-4">
                      {completedBookings.map((booking: any) => (
                        <Card key={booking._id}>
                          <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row">
                              <div className="md:w-1/4 mb-4 md:mb-0">
                                <div className="flex items-center space-x-4">
                                  <div className="w-12 h-12 rounded-full overflow-hidden">
                                    <img
                                      src={booking.guide?.image}
                                      alt={booking.guide?.name}
                                      className="object-cover w-full h-full"
                                    />
                                  </div>
                                  <div>
                                    <h3 className="font-medium">{booking.guide?.name}</h3>
                                    <div className="flex items-center text-yellow-500">
                                      <span>{booking.guide?.rating}</span>
                                      <span className="ml-1">★</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="md:w-2/4 space-y-2">
                                <div className="flex items-center text-muted-foreground">
                                  <span className="font-medium text-foreground">
                                    Booking #{booking._id.substring(1, 6)} • {(booking as any).completedAt ? (
                                      <>Completed {formatBookingDate((booking as any).completedAt)} at {formatBookingTime((booking as any).completedAt)}</>
                                    ) : (
                                      <>{formatBookingDate(booking.date)}</>
                                    )}
                                  </span>
                                  <Clock className="h-4 w-4 ml-4 mr-2" />
                                  <span>{formatBookingTime(booking.time)}</span>
                                </div>
                                <div className="flex flex-col flex-1 pl-1 mt-2 opacity-80">
                                  <div className="flex items-start">
                                    <div className="w-2 h-2 rounded-full bg-gray-400 mt-1.5 mr-3 shrink-0" />
                                    <div>
                                      <p className="font-semibold text-gray-700 text-sm">{parseLocation((booking as any).pickupLocation || booking.location).name}</p>
                                    </div>
                                  </div>
                                  <div className="w-0.5 h-3 bg-border ml-[3px] my-0.5" />
                                  <div className="flex items-start">
                                    <div className="w-2 h-2 rounded-sm bg-gray-400 mt-1.5 mr-3 shrink-0" />
                                    <div>
                                      <p className="font-semibold text-gray-700 text-sm">{parseLocation((booking as any).destinationAddress).name}</p>
                                    </div>
                                  </div>
                                </div>
                                {(booking as any).vehicleType && (
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                    {(booking as any).vehicleType === "scooter" ? "🛵 Scooter" : "🚖 Cab"}
                                  </span>
                                )}
                                <div className="flex items-center text-green-600">
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  <span>Completed</span>
                                </div>
                              </div>
                              <div className="md:w-1/4 mt-4 md:mt-0 flex md:justify-end items-center">
                                <Button variant="outline" size="sm" asChild>
                                  <Link to="/book">Book Again</Link>
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="surface-card">
                      <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground">You don't have any past bookings</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ── PROFILE TAB ── */}
            <TabsContent value="profile" className="overflow-y-hidden">
              <Card className="surface-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Your Profile</CardTitle>
                  {isEditingProfile ? (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(false)}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                      </Button>
                      <Button disabled={!hasProfileChanged} size="sm" onClick={saveProfileChanges}>
                        Save Changes
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={() => setIsEditingProfile(true)}>Edit Profile</Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  {!isEditingProfile ? (
                    <>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="h-10 w-10 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-medium">{userName || "Your Profile"}</h3>
                        </div>
                      </div>

                      {/* ── 3-PART PROFILE STATS ── */}
                      <div className="grid grid-cols-3 gap-4 my-6">
                        <div className="bg-white rounded-lg p-4 text-center border shadow-sm">
                          <div className="text-2xl font-bold text-blue-600">{completedBookings.length}</div>
                          <div className="text-xs text-muted-foreground uppercase font-medium mt-1">Trips</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 text-center border shadow-sm">
                          <div className="text-2xl font-bold text-blue-600">
                            {(user as any)?.rating ? (user as any).rating.toFixed(1) : "5.0"}
                          </div>
                          <div className="text-xs text-muted-foreground uppercase font-medium mt-1">Rating</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 text-center border shadow-sm">
                          <div className="text-2xl font-bold text-blue-600">{monthsOnWellCare}</div>
                          <div className="text-xs text-muted-foreground uppercase font-medium mt-1">
                            {monthsOnWellCare === 1 ? 'Month' : 'Months'}
                          </div>
                        </div>
                      </div>

                      {/* ── SAFETY PIN BLOCK ── */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 shadow-sm my-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-blue-800 uppercase tracking-wider mb-1">Your Safety PIN</h3>
                            <p className="text-gray-600 text-sm">Share this with your Guide to start the trip</p>
                          </div>
                          <div className="bg-white px-6 py-3 rounded-lg border-2 border-blue-200 shadow-inner">
                            <span className="text-2xl font-bold text-primary tracking-[0.25em]">{user?.safetyPin || "----"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground">Contact Information</h4>
                          <div className="mt-2 space-y-2">
                            <div className="flex justify-between">
                              <span>Name</span><span>{userName || "Not provided"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Phone</span><span>{userPhone || "Not provided"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Email</span><span>{userEmail || "Not provided"}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground">Saved Addresses</h4>
                          <div className="mt-2 space-y-2">
                            <div className="flex justify-between">
                              <span>Home</span><span>{profileForm.homeAddress || "Not provided"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Work</span><span>{profileForm.workAddress || "Not provided"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-4">Contact Information</h4>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-name" className="flex items-center gap-2">
                              <User className="h-4 w-4" /> Name
                            </Label>
                            <Input
                              id="edit-name"
                              value={profileForm.name}
                              onChange={(e) => handleProfileChange("name", e.target.value)}
                              placeholder="Your name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-email" className="flex items-center gap-2">
                              <Mail className="h-4 w-4" /> Email
                            </Label>
                            <Input
                              id="edit-email"
                              type="email"
                              value={profileForm.email}
                              onChange={(e) => handleProfileChange("email", e.target.value)}
                              placeholder="Your email address"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-phone" className="flex items-center gap-2">
                              <Phone className="h-4 w-4" /> Phone
                            </Label>
                            <Input
                              id="edit-phone"
                              value={profileForm.phone}
                              onChange={(e) => handleProfileChange("phone", e.target.value)}
                              placeholder="Your phone number"
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-4">Saved Addresses</h4>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-home" className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" /> Home Address
                            </Label>
                            <Input
                              id="edit-home"
                              value={profileForm.homeAddress}
                              onChange={(e) => handleProfileChange("homeAddress", e.target.value)}
                              placeholder="Your home address"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-work" className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" /> Work Address
                            </Label>
                            <Input
                              id="edit-work"
                              value={profileForm.workAddress}
                              onChange={(e) => handleProfileChange("workAddress", e.target.value)}
                              placeholder="Your work address"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      )}

      {/* Cancel Reason Dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) { setCancelTarget(null); setCancelReason(""); } }}>
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
                "Change of plans",
                "Guide is taking too long",
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
              onClick={() => { setCancelTarget(null); setCancelReason(""); }}
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={!cancelReason}
              onClick={handleCancelConfirm}
            >
              Cancel Booking
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Guide Dialog */}
      <Dialog open={!!contactGuide} onOpenChange={(open) => !open && setContactGuide(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-blue-600" />
              Contact Your Guide
            </DialogTitle>
            <DialogDescription>
              Your guide has accepted your booking. You can reach them directly.
            </DialogDescription>
          </DialogHeader>
          {contactGuide && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <User className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-semibold text-foreground">{contactGuide.name}</p>
                  <p className="text-sm text-muted-foreground">Your assigned guide</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Phone Number</p>
                  <a
                    href={`tel:${contactGuide.phone}`}
                    className="text-blue-600 font-semibold text-lg hover:underline"
                  >
                    {contactGuide.phone}
                  </a>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => window.open(`tel:${contactGuide.phone}`)}
                >
                  <PhoneCall className="h-4 w-4 mr-2" />
                  Call
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    toast({
                      title: "Coming Soon",
                      description: "Chat to Guide functionality will be available soon.",
                    });
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Success Modal */}
      <Dialog open={!!paymentBooking} onOpenChange={(open) => !open && setPaymentBooking(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-[#1e1e1e] border-0 rounded-2xl">
          <div className="bg-green-500 p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Trip Completed!</h2>
            <p className="text-green-50">Your ride has successfully ended.</p>
          </div>
          
          <div className="p-8 text-center bg-[#1e1e1e]">
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-2">Amount to Pay</p>
            <p className="text-5xl font-black text-white mb-8">₹{paymentBooking?.totalFare || 0}</p>
            
            <div className="bg-[#2a2a2a] rounded-xl p-4 flex items-center gap-4 mb-8 border border-white/5">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800 shrink-0">
                {paymentBooking?.guide?.image ? (
                  <img src={paymentBooking.guide.image} alt={paymentBooking.guide.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground"><User size={24}/></div>
                )}
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-white">{paymentBooking?.guide?.name || "Your Guide"}</p>
                <p className="text-xs text-gray-400">Please pay the guide directly for now</p>
              </div>
            </div>
            
            <Button 
              className="w-full h-14 bg-green-500 hover:bg-green-600 text-white rounded-xl text-lg font-bold transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)]"
              onClick={handlePayment}
              disabled={isPaying}
            >
              {isPaying ? "Processing..." : "Pay"} <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
