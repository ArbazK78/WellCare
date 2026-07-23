// pages/BookingConfirmationPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import BookingConfirmation from '@/components/BookingConfirmation';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface BookingData {
  name: string;
  phone?: string;
  // Phase 2 location fields
  pickupLocation?: string;
  destinationAddress?: string;
  vehicleType?: "scooter" | "cab";
  dropBack?: boolean;
  /** @deprecated legacy field */
  location?: string;
  date: string;
  time: string;
  waitingRequired?: boolean;
  waitingHours?: number;
  _id?: string;
}

const BookingConfirmationPage = () => {
  const { bookingId } = useParams();
  const locationState = useLocation().state as { bookingData?: BookingData } | null;
  const [booking, setBooking] = useState<BookingData | null>(locationState?.bookingData || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // FM-6 fix: Use locationState instead of the mutable `booking` state to determine if fetch is needed,
    // and removed `booking` from dependency array to prevent fetch loops.
    if (!locationState?.bookingData && bookingId) {
      setLoading(true);
      api.get(`/bookings/${bookingId}`)
        .then(response => {
          setBooking(response.data);
          setLoading(false);
        })
        .catch(error => {
          console.error("Error fetching booking details:", error);
          setError("Failed to fetch booking details.");
          setLoading(false);
        });
    }
  }, [bookingId, locationState?.bookingData]);

  if (loading) {
    return (
      <div className="container mx-auto py-12">
        <Card>
          <CardHeader>
            <CardTitle>Loading Booking Details...</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return <div className="container mx-auto py-12 text-red-500">{error}</div>;
  }

  if (booking) {
    return <BookingConfirmation booking={booking} />;
  }

  return <div className="container mx-auto py-12">Could not load booking confirmation.</div>;
};

export default BookingConfirmationPage;