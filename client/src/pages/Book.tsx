import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useNavigate } from "react-router-dom"; // Import useNavigate
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
import Navbar from "@/components/Navbar";
import { useBookings, getRandomGuide, BookingService } from "@/contexts/BookingContext";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import api from "@/lib/api";

const Book = () => {
  const location = useLocation();
  const navigate = useNavigate(); // Initialize useNavigate
  const { toast } = useToast();
  const { userPhone, userName, userEmail } = useAuth();
  const { addBooking } = useBookings();

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

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [step, setStep] = useState(1);

  const handleChange = (field: string, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const formattedDate = format(date, "yyyy-MM-dd");
      handleChange("date", formattedDate);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let bookingService: BookingService;
    switch (formData.service) {
      case "navigation":
        bookingService = "Navigation Assistance";
        break;
      case "heavy-lifting":
        bookingService = "Heavy Lifting";
        break;
      case "transport":
        bookingService = "Transport Assistance";
        break;
      default:
        bookingService = "Navigation Assistance";
    }

    try {
      const guide = await getRandomGuide();
      const token = localStorage.getItem("userToken");
      let userId = null;
      if (token) {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        userId = decoded.userId;
      }

      const response = await api.post("/bookings", {
        service: bookingService,
        guide: guide._id,
        customer: userId,
        date: formData.date,
        time: formData.time,
        location: formData.location,
        waitingHours: formData.waitingRequired ? formData.waitingHours : 0
      });

      if (response.status === 201) {
        const newBookingId = response.data._id;
        toast({
          title: "Booking Request Sent",
          description: "Your booking request has been received.",
        });
        // ✅ Navigate to the new BookingConfirmationPage
        navigate(`/booking-confirmation/${newBookingId}`, { state: { bookingData: formData } });
      }
    } catch (error) {
      console.error("Booking failed:", error);
      alert("Failed to submit booking. Please try again.");
    }
  };

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const checkForActiveBooking = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem("userToken");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await api.get('/bookings/active', { headers });

      if (response.data.activeBooking) {
        toast({
          title: 'Booking Blocked',
          description: 'You already have an ongoing booking. Complete it to make a new request.',
        });
        return false;
      }

      return true; // no active booking
    } catch (error) {
      console.error('Error checking active booking:', error);
      toast({
        title: 'Something went wrong',
        description: 'Unable to check your booking status. Please try again.',
      });
      return false;
    }
  };

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
                        disabled={!!userName}
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
                        disabled={!!userPhone}
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
                        disabled={!!userEmail}
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
                      onClick={async () => {
                        const allowed = await checkForActiveBooking();
                        if (allowed) setStep(2);
                      }}
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
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !selectedDate && "text-muted-foreground"
                              )}
                            >
                              {selectedDate ? (
                                format(selectedDate, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={selectedDate}
                              onSelect={handleDateSelect}
                              disabled={(date) => date < today}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
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
                        disabled={!formData.date || !formData.time || !formData.service}
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