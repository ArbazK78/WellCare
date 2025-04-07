import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Clock, MapPin, Calendar, User, Mail, Phone, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useBookings } from "@/contexts/BookingContext";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const { bookings, completeBooking, cancelBooking } = useBookings();
  const { userPhone, userName, userEmail, updateProfile } = useAuth();
  const { toast } = useToast();
  
  const upcomingBookings = bookings.filter(booking => booking.status === "upcoming");
  const completedBookings = bookings.filter(booking => booking.status === "completed");

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: userName || "",
    email: userEmail || "",
    phone: userPhone || "",
    homeAddress: "",
    workAddress: "",
  });

  const handleProfileChange = (field: string, value: string) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
  };

  const saveProfileChanges = () => {
    if (!profileForm.name.trim()) {
      toast({
        variant: "destructive",
        title: "Name is required",
        description: "Please enter your name to continue.",
      });
      return;
    }

    if (profileForm.email && !/\S+@\S+\.\S+/.test(profileForm.email)) {
      toast({
        variant: "destructive",
        title: "Invalid email",
        description: "Please enter a valid email address.",
      });
      return;
    }

    updateProfile({
      name: profileForm.name,
      email: profileForm.email,
      phone: profileForm.phone,
    });

    if (profileForm.homeAddress) {
      localStorage.setItem("homeAddress", profileForm.homeAddress);
    }
    
    if (profileForm.workAddress) {
      localStorage.setItem("workAddress", profileForm.workAddress);
    }

    toast({
      title: "Profile updated",
      description: "Your profile information has been updated successfully.",
    });

    setIsEditingProfile(false);
  };

  useState(() => {
    const homeAddress = localStorage.getItem("homeAddress");
    const workAddress = localStorage.getItem("workAddress");
    
    setProfileForm(prev => ({
      ...prev,
      homeAddress: homeAddress || "",
      workAddress: workAddress || "",
    }));
  });

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
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Your Profile</CardTitle>
                  {isEditingProfile ? (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsEditingProfile(false)}
                      >
                        <X className="h-4 w-4 mr-1" /> 
                        Cancel
                      </Button>
                      <Button 
                        size="sm"
                        onClick={saveProfileChanges}
                      >
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
                          <p className="text-gray-500">Member since {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Contact Information</h4>
                          <div className="mt-2 space-y-2">
                            <div className="flex justify-between">
                              <span>Name</span>
                              <span>{userName || "Not provided"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Phone</span>
                              <span>{userPhone || "Not provided"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Email</span>
                              <span>{userEmail || "Not provided"}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Saved Addresses</h4>
                          <div className="mt-2 space-y-2">
                            <div className="flex justify-between">
                              <span>Home</span>
                              <span>{profileForm.homeAddress || "Not provided"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Work</span>
                              <span>{profileForm.workAddress || "Not provided"}</span>
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
    </div>
  );
};

export default Dashboard;
