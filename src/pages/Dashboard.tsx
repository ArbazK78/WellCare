
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Clock, MapPin, Calendar, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useBookings } from "@/contexts/BookingContext";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";

const Dashboard = () => {
  const { bookings, completeBooking, cancelBooking } = useBookings();
  const { userPhone } = useAuth();
  
  const upcomingBookings = bookings.filter(booking => booking.status === "upcoming");
  const completedBookings = bookings.filter(booking => booking.status === "completed");

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Your Dashboard</h1>
            <p className="text-gray-600">Manage your bookings and profile</p>
          </div>

          <Tabs defaultValue="bookings">
            <TabsList className="mb-8">
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
            </TabsList>

            <TabsContent value="bookings">
              <div className="space-y-8">
                {/* Upcoming bookings */}
                <div>
                  <h2 className="text-2xl font-bold mb-4">Upcoming Bookings</h2>
                  {upcomingBookings.length > 0 ? (
                    <div className="space-y-4">
                      {upcomingBookings.map(booking => (
                        <Card key={booking.id}>
                          <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row">
                              <div className="md:w-1/4 mb-4 md:mb-0">
                                <div className="flex items-center space-x-4">
                                  <div className="w-16 h-16 rounded-full overflow-hidden">
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
                                </div>
                              </div>
                              
                              <div className="md:w-2/4 space-y-2">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                                  <span>{booking.date}</span>
                                  <Clock className="h-4 w-4 ml-4 mr-2 text-blue-600" />
                                  <span>{booking.time}</span>
                                </div>
                                
                                <div className="flex items-start">
                                  <MapPin className="h-4 w-4 mr-2 mt-1 text-blue-600" />
                                  <span>{booking.location}</span>
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
                              
                              <div className="md:w-1/4 mt-4 md:mt-0 flex md:justify-end items-center">
                                <div className="space-y-2">
                                  <Button variant="outline" size="sm" className="w-full" onClick={() => completeBooking(booking.id)}>
                                    Mark as Complete
                                  </Button>
                                  <Button variant="outline" size="sm" className="w-full text-red-500 hover:text-red-600" onClick={() => cancelBooking(booking.id)}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
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

                {/* Completed bookings */}
                <div>
                  <h2 className="text-2xl font-bold mb-4">Past Bookings</h2>
                  {completedBookings.length > 0 ? (
                    <div className="space-y-4">
                      {completedBookings.map(booking => (
                        <Card key={booking.id}>
                          <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row">
                              <div className="md:w-1/4 mb-4 md:mb-0">
                                <div className="flex items-center space-x-4">
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
                                </div>
                              </div>
                              
                              <div className="md:w-2/4 space-y-2">
                                <div className="flex items-center text-gray-500">
                                  <Calendar className="h-4 w-4 mr-2" />
                                  <span>{booking.date}</span>
                                  <Clock className="h-4 w-4 ml-4 mr-2" />
                                  <span>{booking.time}</span>
                                </div>
                                
                                <div className="flex items-start text-gray-500">
                                  <MapPin className="h-4 w-4 mr-2 mt-1" />
                                  <span>{booking.location}</span>
                                </div>
                                
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

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Your Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-10 w-10 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-medium">Your Profile</h3>
                      <p className="text-gray-500">Member since {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Contact Information</h4>
                      <div className="mt-2 space-y-2">
                        <div className="flex justify-between">
                          <span>Phone</span>
                          <span>{userPhone || "Not provided"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Email</span>
                          <span>Not provided</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Saved Addresses</h4>
                      <div className="mt-2 space-y-2">
                        <div className="flex justify-between">
                          <span>Home</span>
                          <span>Not provided</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Work</span>
                          <span>Not provided</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button>Edit Profile</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
