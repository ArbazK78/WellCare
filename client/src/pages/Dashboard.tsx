import { useEffect, useState, useMemo } from "react";
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
import { CheckCircle2, Clock, MapPin, Calendar, User, Mail, Phone, X, PhoneCall, MessageCircle, AlertCircle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Link } from "react-router-dom";
import { useBookings } from "@/contexts/BookingContext";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
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

/** Converts "14:30" (24h) → "2:30 PM" */
const formatBookingTime = (rawTime: string): string => {
  try {
    if (!rawTime) return rawTime;
    const [hStr, mStr] = rawTime.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(h) || isNaN(m)) return rawTime;
    const period = h >= 12 ? 'PM' : 'AM';
    const h12   = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  } catch { return rawTime; }
};


const Dashboard = () => {
  const { bookings, completeBooking, cancelBooking: contextCancelBooking } = useBookings();
  const { userPhone, userName, userEmail, updateProfile, user } = useAuth();
  const { toast } = useToast();

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

  const [contactGuide, setContactGuide] = useState<{ name: string; phone: string } | null>(null);
  const [cancelTarget, setCancelTarget]   = useState<string | null>(null);
  const [cancelReason, setCancelReason]   = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState("bookings");
  const [profileForm, setProfileForm] = useState({
    name: userName || "",
    email: userEmail || "",
    phone: userPhone || "",
    homeAddress: "",
    workAddress: "",
  });

  useEffect(() => {
    setLocalBookings(bookings);
  }, [bookings]);

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
    const upcoming = localBookings.filter(booking =>
      booking.status === "pending" || booking.status === "accepted"
    );

    const parseBookingDateTime = (booking: any) => {
      if (!booking.date || !booking.time) return new Date();
      return new Date(`${booking.date}T${booking.time}`);
    };

    const sortedUpcoming = [...upcoming].sort((a, b) => {
      return parseBookingDateTime(a).getTime() - parseBookingDateTime(b).getTime();
    });

    const todayStr = format(new Date(), "yyyy-MM-dd");
    let currentBooking = null;
    let scheduledBookings = [];

    const earliestTodayIndex = sortedUpcoming.findIndex(b => b.date && b.date.startsWith(todayStr));

    if (earliestTodayIndex !== -1) {
      currentBooking = sortedUpcoming[earliestTodayIndex];
      scheduledBookings = [
        ...sortedUpcoming.slice(0, earliestTodayIndex),
        ...sortedUpcoming.slice(earliestTodayIndex + 1)
      ];
    } else {
      scheduledBookings = sortedUpcoming;
    }

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
      className="min-h-screen bg-gradient-to-b from-blue-50 to-white"
      style={{ overflowY: activeTab === 'profile' ? 'hidden' : 'auto' }}
    >
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Your Dashboard</h1>
            <p className="text-gray-600">Manage your bookings and profile</p>
          </div>

          <Tabs defaultValue="bookings" onValueChange={setActiveTab}>
            <TabsList className="mb-8">
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
                                        <h3 className="font-medium text-gray-500">Awaiting Guide</h3>
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
                                <div className="flex items-start">
                                  <MapPin className="h-4 w-4 mr-2 mt-1 text-blue-600 shrink-0" />
                                  <span className="text-sm">
                                    {booking.pickupLocation || booking.location}
                                    {booking.destinationAddress && (
                                      <>
                                        <span className="mx-1 text-gray-400">→</span>
                                        {booking.destinationAddress}
                                      </>
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {booking.vehicleType && (
                                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium">
                                      {booking.vehicleType === "scooter" ? "🛵 Scooter" : "🚖 Cab"}
                                    </span>
                                  )}
                                  {booking.dropBack && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                      🏠 Drop-back included
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <span className="text-gray-600">Service:</span> {booking.service}
                                </div>
                                {booking.waitingHours > 0 && (
                                  <div>
                                    <span className="text-gray-600">Waiting:</span> {booking.waitingHours} hours
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="md:w-1/4 mt-4 md:mt-0 flex md:justify-end items-center">
                                <div className="space-y-2">
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
                    <Card>
                      <CardContent className="p-6 text-center">
                        <p className="text-gray-500 mb-4">You don't have any upcoming bookings</p>
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
                          <Card key={booking._id} className="bg-gray-50/50">
                            <CardContent className="p-6">
                              <div className="flex flex-col md:flex-row justify-between items-center">
                                <div className="space-y-2">
                                  <div className="flex items-center text-gray-500 text-sm">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    {format(new Date(booking.date), "MMM d, yyyy")} at {format(parseISO(`1970-01-01T${booking.time}`), "h:mm a")}
                                  </div>
                                  <div className="flex items-center">
                                    <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                                    <span className="font-medium">{booking.pickupLocation}</span>
                                  </div>
                                </div>
                                <span className="mt-4 md:mt-0 text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                                  {booking.service}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center border-2 border-dashed rounded-xl bg-gray-50">
                        <p className="text-gray-500">You'll find your future and scheduled bookings here</p>
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
                                <div className="flex items-center text-gray-500">
                                  <Calendar className="h-4 w-4 mr-2" />
                                  <span>{formatBookingDate(booking.date)}</span>
                                  <Clock className="h-4 w-4 ml-4 mr-2" />
                                  <span>{formatBookingTime(booking.time)}</span>
                                </div>
                                <div className="flex items-start text-gray-500">
                                  <MapPin className="h-4 w-4 mr-2 mt-1 shrink-0" />
                                  <span className="text-sm">
                                    {(booking as any).pickupLocation || booking.location}
                                    {(booking as any).destinationAddress && (
                                      <>
                                        <span className="mx-1 text-gray-400">→</span>
                                        {(booking as any).destinationAddress}
                                      </>
                                    )}
                                  </span>
                                </div>
                                {(booking as any).vehicleType && (
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                    {(booking as any).vehicleType === "scooter" ? "🛵 Scooter" : "🚖 Cab"}
                                  </span>
                                )}
                                <div className="text-gray-500">
                                  <span className="text-gray-600">Service:</span> {booking.service}
                                </div>
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
                    <Card>
                      <CardContent className="p-6 text-center">
                        <p className="text-gray-500">You don't have any past bookings</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ── PROFILE TAB ── */}
            <TabsContent value="profile" className="overflow-y-hidden">
              <Card>
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
                          <div className="text-xs text-gray-500 uppercase font-medium mt-1">Trips</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 text-center border shadow-sm">
                          <div className="text-2xl font-bold text-blue-600">4.8</div>
                          <div className="text-xs text-gray-500 uppercase font-medium mt-1">Rating</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 text-center border shadow-sm">
                          <div className="text-2xl font-bold text-blue-600">{monthsOnWellCare}</div>
                          <div className="text-xs text-gray-500 uppercase font-medium mt-1">
                            {monthsOnWellCare === 1 ? 'Month' : 'Months'}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Contact Information</h4>
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
                          <h4 className="text-sm font-medium text-gray-500">Saved Addresses</h4>
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
                        <h4 className="text-sm font-medium text-gray-500 mb-4">Contact Information</h4>
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
                        <h4 className="text-sm font-medium text-gray-500 mb-4">Saved Addresses</h4>
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
                  <p className="font-semibold text-gray-900">{contactGuide.name}</p>
                  <p className="text-sm text-gray-500">Your assigned guide</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Phone Number</p>
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
    </div>
  );
};

export default Dashboard;
