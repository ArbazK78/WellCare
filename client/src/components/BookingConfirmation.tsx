
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Calendar, Clock, MapPin, Navigation, Home } from "lucide-react";
import { Link } from "react-router-dom";

type BookingProps = {
  booking: {
    name: string;
    phone?: string;
    // Phase 2 fields
    pickupLocation?: string;
    destinationAddress?: string;
    vehicleType?: "scooter" | "cab";
    dropBack?: boolean;
    /** @deprecated legacy field for old records */
    location?: string;
    service: string;
    date: string;
    time: string;
    waitingRequired?: boolean;
    waitingHours?: number;
  };
};

const BookingConfirmation = ({ booking }: BookingProps) => {
  const vehicleLabel = booking.vehicleType === "scooter" ? "🛵 Scooter" : booking.vehicleType === "cab" ? "🚖 Cab" : null;

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
                  <p className="font-medium">{booking.service}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{booking.name}</p>
                </div>
              </div>

              {/* Vehicle type */}
              {vehicleLabel && (
                <div>
                  <p className="text-sm text-gray-500">Vehicle</p>
                  <p className="font-medium">{vehicleLabel}</p>
                </div>
              )}

              {/* Pickup location */}
              <div>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-blue-500" /> Pickup Location
                </p>
                <p className="font-medium">
                  {booking.pickupLocation || booking.location || "—"}
                </p>
              </div>

              {/* Destination */}
              {booking.destinationAddress && (
                <div>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Navigation className="h-4 w-4 text-green-500" /> Destination / Hospital
                  </p>
                  <p className="font-medium">{booking.destinationAddress}</p>
                </div>
              )}

              {/* Drop-back */}
              {booking.dropBack && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  <Home className="h-4 w-4 shrink-0" />
                  <span>Your guide will drop you back home after the visit</span>
                </div>
              )}

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

              {(booking.waitingRequired || (booking.waitingHours && booking.waitingHours > 0)) && (
                <div>
                  <p className="text-sm text-gray-500">Waiting Time</p>
                  <p className="font-medium">
                    {booking.waitingHours} {booking.waitingHours === 1 ? "hour" : "hours"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {booking.phone && (
            <p className="text-gray-600 mb-6">
              We will send a confirmation SMS to {booking.phone} once a guide is assigned.
            </p>
          )}

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
