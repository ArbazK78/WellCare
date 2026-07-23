import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import api from "@/lib/api";
import { useAuth } from "./AuthContext"; // Import useAuth


export type Guide = {
  _id: number | string;
  name: string;
  image: string;
  rating: number;
};

export type Customer = {
  name: string;
  phone: string;
  email?: string;
  location: string;
};

export type Booking = {
  _id: string;
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
  rejectionReason?: string;
};


interface BookingContextType {
  bookings: Booking[];
  refreshBookings: () => Promise<void>;
  addBooking: (booking: Omit<Booking, "id" | "status" | "customer"> & { customerName: string, customerPhone: string, customerEmail?: string }) => Promise<string>;
  getBookingsForGuide: (guideId: string | number) => Promise<Booking[]>;
  getBookingsForCustomer: () => Promise<Booking[]>;
  completeBooking: (_id: string) => Promise<boolean>;
  cancelBooking: (_id: string, reason: string) => Promise<boolean>;
  acceptBooking: (_id: string) => Promise<boolean>;
  rejectBooking: (_id: string, reason?: string) => Promise<boolean>;
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

  const getBookingsForGuide = async (guide_Id: string | number) => {
    try {
      const { data } = await api.get(`/bookings/guide/${guide_Id}`);
      return data;
    } catch (error) {
      console.error("Error fetching guide bookings:", error);
      return bookings.filter(booking => booking.guide._id.toString() === guide_Id.toString());
    }
  };

  const getBookingsForCustomer = async () => {
    try {
      const { data } = await api.get('/bookings/customer');
      return data;
    } catch (error) {
      console.error("Error fetching customer bookings:", error);
      return [];
    }
  };

  const completeBooking = async (_id: string) => {
    try {
      await api.put(`/bookings/${_id}/status`, { status: "completed" });
      setBookings(prev =>
        prev.map(booking =>
          booking._id === _id ? { ...booking, status: "completed" } : booking
        )
      );
      return true;
    } catch (error) {
      console.error("Error completing booking:", error);
      return false;
    }
  };

  const acceptBooking = async (_id: string) => {
    try {
      await api.put(`/bookings/${_id}/status`, { status: "accepted" });
      setBookings(prev =>
        prev.map(booking =>
          booking._id === _id ? { ...booking, status: "accepted" } : booking
        )
      );
      return true;
    } catch (error) {
      console.error("Error accepting booking:", error);
      return false;
    }
  };

  const rejectBooking = async (_id: string, reason?: string) => {
    try {
      await api.put(`/bookings/${_id}/status`, {
        status: "rejected",
        rejectionReason: reason
      });
      setBookings(prev =>
        prev.map(booking =>
          booking._id === _id ? {
            ...booking,
            status: "rejected",
            rejectionReason: reason
          } : booking
        )
      );
      return true;
    } catch (error) {
      console.error("Error rejecting booking:", error);
      return false;
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
      getBookingsForGuide,
      getBookingsForCustomer,
      completeBooking,
      cancelBooking,
      acceptBooking,
      rejectBooking
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
