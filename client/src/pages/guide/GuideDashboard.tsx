import { useState, useEffect, useCallback } from "react";
import "@/styles/ui2.css";
import { useGuideAuth } from "@/contexts/GuideAuthContext";
import { Booking } from "@/contexts/BookingContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, MapPin, User, Star, X, Check, Bell } from "lucide-react";

import { useNavigate, useLocation } from "react-router-dom";
import api from "@/lib/api";
import { format, isToday, isTomorrow } from "date-fns";
import { parseLocation } from "@/lib/utils";
import ActiveRideView from "@/components/ActiveRideView";

// ── Date / time formatters (consistent with customer Dashboard) ─────────────
const ordinalSuffix = (d: number) => {
  if (d > 3 && d < 21) return 'th';
  switch (d % 10) { case 1: return 'st'; case 2: return 'nd'; case 3: return 'rd'; default: return 'th'; }
};

const formatBookingDate = (raw: string): string => {
  try {
    const date = new Date(raw);
    if (isNaN(date.getTime())) return raw;
    if (isToday(date))    return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    const d = date.getDate();
    return `${d}${ordinalSuffix(d)} ${format(date, 'MMMM, yyyy')}`;
  } catch { return raw; }
};

const formatBookingTime = (raw: string | Date): string => {
  try {
    if (!raw) return String(raw);
    if (raw instanceof Date || (typeof raw === 'string' && raw.includes('T'))) {
      const d = new Date(raw);
      return format(d, 'hh:mm a');
    }
    const [hStr, mStr] = String(raw).split(':');
    const h = parseInt(hStr, 10), m = parseInt(mStr, 10);
    if (isNaN(h) || isNaN(m)) return String(raw);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  } catch { return String(raw); }
};


const GuideDashboard = () => {
  const { currentGuide } = useGuideAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Get initials from name for avatar
  const getInitials = (name: string) => {
    if (!name) return "";
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0);
    return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`;
  };

  // ── Fetch all guide bookings (pending / accepted / completed) ─────────────
  const fetchBookings = useCallback(async () => {
    if (!currentGuide) { setLoading(false); return; }

    try {
      const token = localStorage.getItem('guide_token');
      if (!token) { setLoading(false); return; }

      const headers = { Authorization: `Bearer ${token}` };
      const [pendingRes, acceptedRes, completedRes] = await Promise.all([
        api.get('/bookings/guide/pending',   { headers }),
        api.get('/bookings/guide/accepted',  { headers }),
        api.get('/bookings/guide/completed', { headers }),
      ]);

      setBookings([
        ...pendingRes.data,
        ...acceptedRes.data,
        ...completedRes.data,
      ]);
    } catch (error) {
      console.error('❌ Error fetching guide bookings:', error);
      toast({ title: "Error loading bookings", description: "Failed to load your bookings.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [currentGuide, toast]);

  // Initial fetch on mount / currentGuide change
  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // Re-fetch when GuideLayout signals an acceptance (state.refresh changes)
  useEffect(() => {
    if (location.state?.refresh) {
      fetchBookings();
    }
  }, [location.state?.refresh]); // eslint-disable-line react-hooks/exhaustive-deps


  // Filter bookings by status
  const pendingBookings = bookings.filter(booking => booking.status === "pending");
  const acceptedBookings = bookings.filter(booking => booking.status === "accepted" || booking.status === "arrived" || booking.status === "in_progress");
  const completedBookings = bookings.filter(booking => booking.status === "completed");


  const handleAcceptBooking = async (bookingId: string) => {
    try {
      const token = localStorage.getItem('guide_token');
      await api.put(`/bookings/${bookingId}/status`, 
        { status: 'accepted' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setBookings(prev => prev.map(b => 
        b._id === bookingId ? { ...b, status: 'accepted' as const } : b
      ));
      
      toast({
        title: "Booking accepted",
        description: "You've accepted this booking.",
      });
    } catch (error) {
      console.error('Error accepting booking:', error);
      toast({
        title: "Error accepting booking",
        description: "Failed to accept booking. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    try {
      const token = localStorage.getItem('guide_token');
      await api.put(`/bookings/${bookingId}/status`, 
        { status: 'rejected' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Remove from local state (or update status)
      setBookings(prev => prev.filter(b => b._id !== bookingId));
      
      toast({
        title: "Booking rejected",
        description: "You've rejected this booking.",
      });
    } catch (error) {
      console.error('Error rejecting booking:', error);
      toast({
        title: "Error rejecting booking",
        description: "Failed to reject booking. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleArriveBooking = async (bookingId: string) => {
    try {
      const token = localStorage.getItem('guide_token');
      await api.put(`/bookings/${bookingId}/status`, 
        { status: 'arrived' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setBookings(prev => prev.map(b => 
        b._id === bookingId ? { ...b, status: 'arrived' as any } : b
      ));
      
      toast({
        title: "Arrived",
        description: "You've successfully notified the user that you have arrived.",
      });
    } catch (error) {
      console.error('Error marking as arrived:', error);
      toast({
        title: "Error",
        description: "Failed to mark as arrived. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCancelBooking = async (bookingId: string, reason: string) => {
    try {
      const token = localStorage.getItem('guide_token');
      await api.put(`/bookings/${bookingId}/status`, 
        { status: 'guide_cancelled', reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setBookings(prev => prev.filter(b => b._id !== bookingId));
      
      toast({
        title: "Ride Cancelled",
        description: "The booking has been passed to the next available guide.",
      });
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: "Error",
        description: "Failed to cancel ride. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleStartTrip = async (bookingId: string, pin: string) => {
    try {
      const token = localStorage.getItem('guide_token');
      const response = await api.post(`/bookings/${bookingId}/start-trip`, 
        { pin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setBookings(prev => prev.map(b => b._id === bookingId ? response.data.booking : b));
      toast({
        title: "Trip Started",
        description: "The Safety PIN is verified and trip has started.",
      });
      return true;
    } catch (error: any) {
      console.error('Error starting trip:', error);
      toast({
        title: error.response?.status === 400 ? "Invalid PIN" : "Error Starting Trip",
        description: error.response?.data?.message || "Failed to start trip. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  const handleCompleteTrip = async (bookingId: string) => {
    try {
      const token = localStorage.getItem('guide_token');
      const response = await api.put(`/bookings/${bookingId}/status`, 
        { status: 'completed' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBookings(prev => prev.map(b => b._id === bookingId ? response.data.booking : b));
      toast({
        title: "Trip Completed",
        description: "The trip has been successfully marked as completed.",
      });
    } catch (error) {
      console.error('Error completing booking:', error);
      toast({
        title: "Error",
        description: "Failed to complete trip. Please try again.",
        variant: "destructive"
      });
    }
  };

  const BookingCard = ({ 
    booking, 
    isPending = false, 
    isAccepted = false 
  }: { 
    booking: Booking, 
    isPending?: boolean, 
    isAccepted?: boolean 
  }) => (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center">
              <span className="text-lg">Booking #{booking._id.substring(1, 6)}</span>
              {isPending && (
                <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                  Pending
                </span>
              )}
              {isAccepted && (
                <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  Accepted
                </span>
              )}
              {!isPending && !isAccepted && (
                <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  Completed
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {!isPending && !isAccepted && (booking as any).completedAt ? (
                <>Today at {formatBookingTime((booking as any).completedAt)}</>
              ) : (
                <>{formatBookingDate(booking.date)} at {formatBookingTime(booking.time)}</>
              )}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="font-medium">{booking.waitingHours} hr wait time</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center">
            <User className="h-4 w-4 mr-2 text-gray-500" />
            <span className="font-medium">Customer Details:</span> 
            <span className="ml-2">{booking.customer?.name || "Not provided"}</span>
            <span className="ml-2">{booking.customer?.phone || "No phone"}</span>
          </div>
          
          <div className="flex flex-col flex-1 mt-1 border-l-2 border-gray-100 pl-4 ml-2 mb-4">
            <div className="relative">
              <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white" />
              <div>
                <p className="font-semibold text-gray-900 text-sm">{parseLocation((booking as any).pickupLocation || (booking as any).location).name}</p>
                {parseLocation((booking as any).pickupLocation || (booking as any).location).address && (
                  <p className="text-xs text-gray-500 mt-0.5">{parseLocation((booking as any).pickupLocation || (booking as any).location).address}</p>
                )}
              </div>
            </div>
            
            {(booking as any).destinationAddress && (
              <div className="relative mt-3">
                <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-sm bg-green-500 ring-4 ring-white" />
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{parseLocation((booking as any).destinationAddress).name}</p>
                  {parseLocation((booking as any).destinationAddress).address && (
                    <p className="text-xs text-gray-500 mt-0.5">{parseLocation((booking as any).destinationAddress).address}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {(booking as any).vehicleType && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                {(booking as any).vehicleType === "scooter" ? "🛵 Scooter" : "🚖 Cab"}
              </span>
            )}
            {(booking as any).dropBack && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                🏠 Drop-back home
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-gray-500" />
              <span>
                {!isPending && !isAccepted && (booking as any).completedAt 
                  ? 'Today' 
                  : formatBookingDate(booking.date)}
              </span>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-gray-500" />
              <span>
                {!isPending && !isAccepted && (booking as any).completedAt 
                  ? formatBookingTime((booking as any).completedAt) 
                  : formatBookingTime(booking.time)}
              </span>
            </div>
          </div>
          
          <Separator />
          
          {isPending && (
            <div className="flex space-x-2 pt-2">
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => handleRejectBooking(booking._id)}
              >
                <X className="h-4 w-4 mr-1" /> Reject
              </Button>
              <Button 
                size="sm"
                onClick={() => handleAcceptBooking(booking._id)}
              >
                <Check className="h-4 w-4 mr-1" /> Accept
              </Button>
            </div>
          )}
          
          {isAccepted && booking.status === 'accepted' && (
            <div className="flex space-x-2 pt-2">
              <Button 
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleArriveBooking(booking._id)}
              >
                <MapPin className="h-4 w-4 mr-1" /> Arrived
              </Button>
            </div>
          )}

          {isAccepted && booking.status === 'arrived' && (
            <div className="pt-2 text-center text-blue-600 font-medium bg-blue-50 py-2 rounded-md border border-blue-100">
              <MapPin className="h-5 w-5 inline mr-1" /> Arrived at Location
            </div>
          )}
          
          {!isPending && !isAccepted && (
            <div className="pt-2 text-center text-green-600 font-medium">
              <Check className="h-5 w-5 inline mr-1" /> Completed
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Active Ride View (Takes over the entire dashboard)
  // An active ride is one that is 'accepted', 'arrived', or 'in_progress'
  const activeBooking = acceptedBookings.find(b => 
    b.status === 'accepted' || b.status === 'arrived' || b.status === 'in_progress'
  );

  if (activeBooking) {
    return (
      <div className="min-h-screen bg-background text-foreground pb-8 flex flex-col">
        {/* Minimal header for active ride */}
        <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            Active Ride
          </h1>
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <X className="h-5 w-5 text-gray-500" />
          </Button>
        </div>
        <div className="flex-1 px-4">
          <ActiveRideView 
            booking={activeBooking} 
            onArrive={handleArriveBooking} 
            onCancel={handleCancelBooking}
            onStartTrip={handleStartTrip}
            onCompleteTrip={handleCompleteTrip}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        {currentGuide && (
          <Card className="mb-8 surface-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={currentGuide.image} alt={currentGuide.name} />
                    <AvatarFallback>{getInitials(currentGuide.name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-2xl">{currentGuide.name}</CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <Star className="h-4 w-4 text-yellow-500 mr-1" />
                      {currentGuide.rating || "No ratings yet"}
                    </CardDescription>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/guide/edit-profile')}
                >
                  Edit Profile
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Phone</h3>
                  <p>{currentGuide.phone}</p>
                </div>
                {currentGuide.email && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                    <p>{currentGuide.email}</p>
                  </div>
                )}
                {currentGuide.languages && currentGuide.languages.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Languages</h3>
                    <p>{currentGuide.languages.join(", ")}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        <Tabs defaultValue="active">
          <TabsList className="mb-4">
            <TabsTrigger value="active" className="flex items-center">
              <Check className="h-4 w-4 mr-1 text-green-500" />
              Active ({acceptedBookings.length})
            </TabsTrigger>
            <TabsTrigger value="scheduled" className="flex items-center">
              <Bell className="h-4 w-4 mr-1" />
              Scheduled
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center">
              <Check className="h-4 w-4 mr-1 text-gray-400" />
              Completed ({completedBookings.length})
            </TabsTrigger>
          </TabsList>
          
          {/* ── Active (accepted) bookings ─────────────────────────────────── */}
          <TabsContent value="active">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : acceptedBookings.length === 0 ? (
              <Card className="surface-card">
                <CardHeader>
                  <CardTitle>No Active Bookings</CardTitle>
                  <CardDescription>
                    You don't have any active bookings right now. Go online to start receiving requests.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              acceptedBookings.map(booking => (
                <BookingCard key={booking._id} booking={booking} isAccepted={true} />
              ))
            )}
          </TabsContent>
          
          {/* ── Scheduled — reserved for future pre-planned bookings ─────────── */}
          <TabsContent value="scheduled">
            <Card className="surface-card">
              <CardHeader>
                <CardTitle>Scheduled Bookings</CardTitle>
                <CardDescription>
                  Pre-planned and schedule-based bookings will appear here. Coming soon.
                </CardDescription>
              </CardHeader>
            </Card>
          </TabsContent>
          
          {/* ── Completed bookings ────────────────────────────────────────────── */}
          <TabsContent value="completed">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : completedBookings.length === 0 ? (
              <Card className="surface-card">
                <CardHeader>
                  <CardTitle>No Completed Bookings</CardTitle>
                  <CardDescription>
                    You haven't completed any bookings yet.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              completedBookings.map(booking => (
                <BookingCard key={booking._id} booking={booking} />
              ))
            )}
          </TabsContent>
        </Tabs>

      </div>

    </div>
  );
};

export default GuideDashboard;