
import { useState, useEffect } from "react";
import { useGuideAuth } from "@/contexts/GuideAuthContext";
import { Booking } from "@/contexts/BookingContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, MapPin, User, Star, X, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useNavigate } from "react-router-dom";

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
    // Load bookings from localStorage
    const storedBookings = JSON.parse(localStorage.getItem("bookings") || "[]");
    
    // Filter bookings for the current guide - ensuring proper type comparison
    // Convert guide.id to string for comparison since IDs in BookingContext are strings
    const guideBookings = storedBookings.filter(
      (booking: any) => booking.guide?.id && booking.guide.id.toString() === currentGuide?.id
    );
    
    // Ensure bookings have the correct status type
    const typedBookings = guideBookings.map((booking: any) => ({
      ...booking,
      status: booking.status as "upcoming" | "completed"
    }));
    
    setBookings(typedBookings);
    setLoading(false);
  }, [currentGuide]);

  const upcomingBookings = bookings.filter(booking => booking.status === "upcoming");
  const completedBookings = bookings.filter(booking => booking.status === "completed");

  const handleAcceptBooking = (bookingId: string) => {
    // In a real app, this would update the booking status in the database
    // For now, we'll just show a toast
    toast({
      title: "Booking accepted",
      description: "You've accepted this booking.",
    });
  };

  const handleRejectBooking = (bookingId: string) => {
    // In a real app, this would update the booking status in the database
    // For now, we'll just show a toast
    toast({
      variant: "destructive",
      title: "Booking rejected",
      description: "You've rejected this booking.",
    });
  };

  const handleCompleteBooking = (bookingId: string) => {
    // Update the booking status in localStorage
    const updatedBookings = bookings.map(booking => 
      booking.id === bookingId ? { ...booking, status: "completed" as const } : booking
    );
    
    // Save all bookings back to localStorage
    const allStoredBookings = JSON.parse(localStorage.getItem("bookings") || "[]");
    const updatedAllBookings = allStoredBookings.map((booking: Booking) =>
      booking.id === bookingId ? { ...booking, status: "completed" as const } : booking
    );
    
    localStorage.setItem("bookings", JSON.stringify(updatedAllBookings));
    setBookings(updatedBookings);
    
    toast({
      title: "Booking completed",
      description: "You've marked this booking as completed.",
    });
  };

  const BookingCard = ({ booking, isUpcoming = true }: { booking: Booking, isUpcoming?: boolean }) => (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center">
              <span className="text-lg">Booking #{booking.id.substring(1, 6)}</span>
              {isUpcoming && (
                <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  Upcoming
                </span>
              )}
              {!isUpcoming && (
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
            <span className="ml-2">{booking.customerName || "Not provided"}</span>
            <span className="ml-2">{booking.customerPhone || "No phone"}</span>
          </div>
          
          <div className="flex items-start">
            <MapPin className="h-4 w-4 mr-2 text-gray-500 mt-1" />
            <div>
              <span className="font-medium">Location:</span>
              <div className="text-sm mt-1">{booking.location}</div>
            </div>
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
          
          {isUpcoming && (
            <div className="flex space-x-2 pt-2">
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => handleRejectBooking(booking.id)}
              >
                <X className="h-4 w-4 mr-1" /> Reject
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleAcceptBooking(booking.id)}
              >
                <Check className="h-4 w-4 mr-1" /> Accept
              </Button>
              <Button 
                size="sm"
                onClick={() => handleCompleteBooking(booking.id)}
              >
                <Check className="h-4 w-4 mr-1" /> Mark Complete
              </Button>
            </div>
          )}
          
          {!isUpcoming && (
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
      <Navbar />
      
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
        
        <Tabs defaultValue="upcoming">
          <TabsList className="mb-4">
            <TabsTrigger value="upcoming">
              Upcoming Bookings ({upcomingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed Bookings ({completedBookings.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upcoming">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : upcomingBookings.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No Upcoming Bookings</CardTitle>
                  <CardDescription>
                    You don't have any upcoming bookings at the moment.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              upcomingBookings.map(booking => (
                <BookingCard key={booking.id} booking={booking} isUpcoming={true} />
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
                <BookingCard key={booking.id} booking={booking} isUpcoming={false} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GuideDashboard;
