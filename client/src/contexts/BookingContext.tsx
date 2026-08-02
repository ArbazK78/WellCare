import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import api from "@/lib/api";
import { useAuth } from "./AuthContext"; // Import useAuth


export type RatingSummary = {
  average: number | null;
  count: number;
  isVisible?: boolean;
  minimumRequired?: number;
};

export type Guide = {
  _id: number | string;
  name: string;
  image: string;
  rating: number;
  ratingSummary?: RatingSummary;
  currentLocation?: {
    lat: number;
    lng: number;
    accuracy: number;
    updatedAt: string;
  };
};

export type Customer = {
  name: string;
  phone: string;
  email?: string;
  location: string;
};

export type Booking = {
  _id: string;
  bookingFor?: "self" | "other";
  name?: string;
  contactPhone?: string;
  bookingMode?: "now" | "schedule";
  dispatchStartedAt?: string | null;
  scheduledAt?: string | null;
  estimatedEndAt?: string | null;
  reservationStatus?: "open" | "claimed" | "readiness_pending" | "ready" | "fallback_dispatching" | "fulfilled" | "unfulfilled";
  assignmentSource?: "instant" | "reservation" | "fallback";
  readinessRequestedAt?: string | null;
  readinessDeadline?: string | null;
  readinessConfirmedAt?: string | null;
  activationAt?: string | null;
  plannedDepartureAt?: string | null;
  guideToPickupEtaMinutes?: number | null;
  lastEtaCheckedAt?: string | null;
  pickupWindowStart?: string | null;
  pickupWindowEnd?: string | null;
  fallbackDispatchAt?: string | null;
  fulfilmentDeadline?: string | null;
  guideCommitmentStatus?: string;
  status: "pending" | "accepted" | "rejected" | "completed" | "arrived" | "in_progress" | "cancelled";
  vehicleType: "scooter" | "cab";
  pickupLocation: string;
  destinationAddress: string;
  dropBack: boolean;
  /** @deprecated Use pickupLocation / destinationAddress. Kept for old DB records. */
  location?: string;
  guide: Guide;
  customer: Customer;
  date: string;
  time: string;
  waitingHours: number;
  distanceKm?: number;
  durationMin?: number;
  totalFare?: number;
  rejectionReason?: string;
  paymentStatus?: "pending" | "paid" | "failed";
  customerReviewStatus?: "pending" | "submitted" | "unavailable";
  guideReviewStatus?: "pending" | "submitted";
  customerRatingPromptDismissedAt?: string | null;
  guideRatingPromptDismissedAt?: string | null;
};


interface BookingContextType {
  bookings: Booking[];
  refreshBookings: () => Promise<void>;
  addBooking: (booking: Omit<Booking, "id" | "status" | "customer"> & { customerName: string, customerPhone: string, customerEmail?: string }) => Promise<string>;
  cancelBooking: (_id: string, reason: string) => Promise<boolean>;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);


export const BookingProvider = ({ children }: { children: ReactNode }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const { isAuthenticated } = useAuth(); // Get isAuthenticated

  const fetchUserBookings = useCallback(async () => {
    if (isAuthenticated) {
      const token = localStorage.getItem('userToken'); // Explicitly get the token
      console.log("🔄 [BookingContext] Fetching user bookings...");
      console.log("🔑 [BookingContext] User Token (before fetch):", token ? token.slice(0, 10) + '...' : 'absent');
      if (token) {
        try {
          const { data } = await api.get('/bookings/my-bookings', {
            headers: {
              Authorization: `Bearer ${token}`, // Manually set the header for extra safety
            },
          });
          console.log("✅ [BookingContext] Bookings fetched successfully:", data);
          setBookings(data);
        } catch (error) {
          console.error("❌ [BookingContext] Error fetching user bookings:", error);
          if (error.response && error.response.status === 401) {
            console.warn("⚠️ [BookingContext] Received 401 Unauthorized. Token issue?");
          }
        }
      } else {
        console.warn("⚠️ [BookingContext] Not fetching bookings: No user token found in localStorage.");
      }
    } else {
      setBookings([]);
    }
  }, [isAuthenticated]); // FM-5 fix: Removed `api` from the dependency array

  useEffect(() => {
    fetchUserBookings();
  }, [isAuthenticated, fetchUserBookings]);

  const addBooking = async (bookingData: Omit<Booking, "id" | "status" | "customer"> & { customerName: string, customerPhone: string, customerEmail?: string }) => {
    try {
      const { customerName, customerPhone, customerEmail, ...rest } = bookingData;

      const bookingPayload = {
        ...rest,
        customer: {
          name: customerName,
          phone: customerPhone,
          email: customerEmail,
          location: bookingData.location,
        }
      };

      const { data } = await api.post('/bookings', bookingPayload);
      setBookings(prev => [...prev, data]);
      return data._id; // Assuming your backend returns _id
    } catch (error) {
      console.error("Error adding booking:", error);
      // Don't create fallback bookings with invalid IDs
      // Instead, throw the error so the caller can handle it
      throw error;
    }
  };

  const cancelBooking = async (_id: string, reason: string) => {
    try {
      await api.put(`/bookings/${_id}/cancel`, { reason });
      setBookings(prev => prev.map(booking =>
        booking._id === _id ? { ...booking, status: "cancelled" } : booking
      ));
      return true;
    } catch (error) {
      console.error("Error canceling booking:", error);
      return false;
    }
  };

  return (
    <BookingContext.Provider value={{
      bookings,
      refreshBookings: fetchUserBookings,
      addBooking,
      cancelBooking,
    }}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBookings = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBookings must be used within a BookingProvider");
  }
  return context;
};

