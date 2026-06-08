import { useState, useEffect } from "react";
import { useGuideAuth } from "@/contexts/GuideAuthContext";
import { Booking } from "@/contexts/BookingContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, MapPin, User, Star, X, Check, Bell } from "lucide-react";

import { useNavigate } from "react-router-dom";
import api from "@/lib/api";

const GuideDashboard = () => {
  const { currentGuide } = useGuideAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Get initials from name for avatar
  const getInitials = (name: string) => {
    if (!name) return "";
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0);
    return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`;
  };

  useEffect(() => {
    // Fetch bookings from backend API instead of localStorage
    const fetchBookings = async () => {
      if (!currentGuide) {
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('guide_token');
        if (!token) {
          console.warn('⚠️ No guide token found');
          setLoading(false);
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };
        
        console.log('🔄 Fetching guide bookings from API...');
        
        // Fetch all booking types in parallel
        const [pendingRes, acceptedRes, completedRes] = await Promise.all([
          api.get('/bookings/guide/pending', { headers }),
          api.get('/bookings/guide/accepted', { headers }),
          api.get('/bookings/guide/completed', { headers })
        ]);
        
        // Combine all bookings
        const allBookings = [
          ...pendingRes.data,
          ...acceptedRes.data,
          ...completedRes.data
        ];
        
        console.log('✅ Fetched bookings:', {
          pending: pendingRes.data.length,
          accepted: acceptedRes.data.length,
          completed: completedRes.data.length,
          total: allBookings.length
        });
        
        setBookings(allBookings);
      } catch (error) {
        console.error('❌ Error fetching guide bookings:', error);
        toast({
          title: "Error loading bookings",
          description: "Failed to load your bookings. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchBookings();
  }, [currentGuide, toast]);

  // Filter bookings by status
  const pendingBookings = bookings.filter(booking => booking.status === "pending");
  const acceptedBookings = bookings.filter(booking => booking.status === "accepted");
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

  const handleCompleteBooking = async (bookingId: string) => {
    try {
      const token = localStorage.getItem('guide_token');
      await api.put(`/bookings/${bookingId}/status`, 
        { status: 'completed' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setBookings(prev => prev.map(b => 
        b._id === bookingId ? { ...b, status: 'completed' as const } : b
      ));
      
      toast({
        title: "Booking completed",
        description: "You've marked this booking as completed.",
      });
    } catch (error) {
      console.error('Error completing booking:', error);
      toast({
        title: "Error completing booking",
        description: "Failed to complete booking. Please try again.",
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
              {booking.service} on {booking.date} at {booking.time}
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
          
          <div className="flex items-start">
            <MapPin className="h-4 w-4 mr-2 text-gray-500 mt-1 shrink-0" />
            <div className="text-sm">
              <div>
                <span className="font-medium text-gray-600">Pickup:</span>{" "}
                {(booking as any).pickupLocation || (booking as any).location || "—"}
              </div>
              {(booking as any).destinationAddress && (
                <div>
                  <span className="font-medium text-gray-600">Destination:</span>{" "}
                  {(booking as any).destinationAddress}
                </div>
              )}
            </div>
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
              <span>{booking.date}</span>
            </div>
            
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-gray-500" />
              <span>{booking.time}</span>
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
          
          {isAccepted && (
            <div className="flex space-x-2 pt-2">
              <Button 
                size="sm"
                onClick={() => handleCompleteBooking(booking._id)}
              >
                <Check className="h-4 w-4 mr-1" /> Mark Complete
              </Button>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {currentGuide && (
          <Card className="mb-8">
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
        
        <Tabs defaultValue="pending">
          <TabsList className="mb-4">
            <TabsTrigger value="pending" className="flex items-center">
              <Bell className="h-4 w-4 mr-1" />
              Pending Requests ({pendingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="accepted" className="flex items-center">
              <Check className="h-4 w-4 mr-1" />
              Accepted Bookings ({acceptedBookings.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center">
              <Check className="h-4 w-4 mr-1 text-green-500" />
              Completed Bookings ({completedBookings.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : pendingBookings.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No Pending Booking Requests</CardTitle>
                  <CardDescription>
                    You don't have any pending booking requests at the moment.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              pendingBookings.map(booking => (
                <BookingCard key={booking._id} booking={booking} isPending={true} />
              ))
            )}
          </TabsContent>
          
          <TabsContent value="accepted">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : acceptedBookings.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No Accepted Bookings</CardTitle>
                  <CardDescription>
                    You don't have any accepted bookings at the moment.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              acceptedBookings.map(booking => (
                <BookingCard key={booking._id} booking={booking} isAccepted={true} />
              ))
            )}
          </TabsContent>
          
          <TabsContent value="completed">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : completedBookings.length === 0 ? (
              <Card>
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