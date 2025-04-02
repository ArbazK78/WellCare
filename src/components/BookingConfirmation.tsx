
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Calendar, Clock, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

type BookingProps = {
  booking: {
    name: string;
    phone: string;
    location: string;
    service: string;
    date: string;
    time: string;
    waitingRequired: boolean;
    waitingHours: number;
  };
};

const getServiceName = (serviceCode: string): string => {
  const services: Record<string, string> = {
    "heavy-lifting": "Carrying Heavy Items",
    "navigation": "Navigation Assistance",
    "transport": "Transportation Assistance",
  };
  return services[serviceCode] || serviceCode;
};

const BookingConfirmation = ({ booking }: BookingProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Booking Confirmed!</h1>
          <p className="text-lg text-gray-600 mb-8">
            Your guide request has been received and will be processed shortly.
          </p>

          <Card className="text-left mb-8">
            <CardHeader>
              <CardTitle>Booking Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Service</p>
                  <p className="font-medium">{getServiceName(booking.service)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{booking.name}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> Location
                </p>
                <p className="font-medium">{booking.location}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Calendar className="h-4 w-4" /> Date
                  </p>
                  <p className="font-medium">{booking.date}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="h-4 w-4" /> Time
                  </p>
                  <p className="font-medium">{booking.time}</p>
                </div>
              </div>

              {booking.waitingRequired && (
                <div>
                  <p className="text-sm text-gray-500">Waiting Time</p>
                  <p className="font-medium">
                    {booking.waitingHours} {booking.waitingHours === 1 ? 'hour' : 'hours'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="text-gray-600 mb-6">
            We will send a confirmation SMS to {booking.phone} once a guide is assigned.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <Link to="/dashboard">View Booking Status</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/">Return to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;
