import { useState, useEffect } from "react";
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
import { 
  MapPin, 
  PhoneCall, 
  Clock, 
  Calendar,
  User,
  Mail 
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import BookingConfirmation from "@/components/BookingConfirmation";
import Navbar from "@/components/Navbar";

const Book = () => {
  const { userPhone, userName, userEmail } = useAuth();
  
  const [formData, setFormData] = useState({
    name: "",
    phone: userPhone || "",
    email: userEmail || "",
    location: "",
    service: "",
    date: "",
    time: "",
    waitingRequired: false,
    waitingHours: 1,
  });

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      name: userName || prev.name,
      phone: userPhone || prev.phone,
      email: userEmail || prev.email
    }));
  }, [userName, userPhone, userEmail]);

  const [step, setStep] = useState(1);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  const handleChange = (field: string, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would send the data to the backend
    setBookingConfirmed(true);
  };

  if (bookingConfirmed) {
    return <BookingConfirmation booking={formData} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">Book a Guide</h1>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                {step === 1 ? "Your Information" : "Service Details"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                {step === 1 ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-2">
                        <User className="h-4 w-4" /> Full Name
                      </Label>
                      <Input
                        id="name"
                        placeholder="Enter your full name"
                        value={formData.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        disabled={!!userName} // Disable if we have a name
                        required
                      />
                      {userName && (
                        <p className="text-sm text-gray-500">
                          Using name from your profile
                        </p>
                      )}
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
                        disabled={!!userPhone} // Disable if we have a verified phone
                        required
                      />
                      {userPhone && (
                        <p className="text-sm text-gray-500">
                          This phone number has been verified
                        </p>
                      )}
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
                        disabled={!!userEmail} // Disable if we have an email
                      />
                      {userEmail && (
                        <p className="text-sm text-gray-500">
                          Using email from your profile
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location" className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Current Location
                      </Label>
                      <Input
                        id="location"
                        placeholder="Enter your current address"
                        value={formData.location}
                        onChange={(e) => handleChange("location", e.target.value)}
                        required
                      />
                    </div>

                    <Button 
                      type="button" 
                      className="w-full"
                      onClick={() => setStep(2)}
                    >
                      Continue
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="service">Service Required</Label>
                      <Select 
                        value={formData.service}
                        onValueChange={(value) => handleChange("service", value)}
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

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="date" className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" /> Date
                        </Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) => handleChange("date", e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="time" className="flex items-center gap-2">
                          <Clock className="h-4 w-4" /> Time
                        </Label>
                        <Input
                          id="time"
                          type="time"
                          value={formData.time}
                          onChange={(e) => handleChange("time", e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="waiting" 
                          checked={formData.waitingRequired}
                          onCheckedChange={(checked) => 
                            handleChange("waitingRequired", checked === true)
                          }
                        />
                        <Label htmlFor="waiting" className="font-normal">
                          I need the guide to wait during my appointment
                        </Label>
                      </div>
                      
                      {formData.waitingRequired && (
                        <div className="mt-4 pl-6">
                          <Label htmlFor="hours">Estimated waiting hours</Label>
                          <Select 
                            value={formData.waitingHours.toString()}
                            onValueChange={(value) => handleChange("waitingHours", parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select hours" />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5, 6].map(hour => (
                                <SelectItem key={hour} value={hour.toString()}>
                                  {hour} {hour === 1 ? 'hour' : 'hours'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-4">
                      <Button 
                        type="button" 
                        variant="outline"
                        className="flex-1"
                        onClick={() => setStep(1)}
                      >
                        Back
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1"
                      >
                        Book Now
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
