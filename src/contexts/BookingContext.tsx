
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type BookingService = "Navigation Assistance" | "Heavy Lifting" | "Transport Assistance";

export type Guide = {
  id: number | string;
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
  id: string;
  status: "pending" | "accepted" | "rejected" | "completed";
  service: BookingService;
  guide: Guide;
  customer: Customer;
  date: string;
  time: string;
  location: string;
  waitingHours: number;
};

interface BookingContextType {
  bookings: Booking[];
  addBooking: (booking: Omit<Booking, "id" | "status" | "customer"> & {customerName: string, customerPhone: string, customerEmail?: string}) => string;
  getBookingsForGuide: (guideId: string | number) => Booking[];
  getBookingsForCustomer: (customerPhone: string) => Booking[];
  completeBooking: (id: string) => void;
  cancelBooking: (id: string) => void;
  acceptBooking: (id: string) => void;
  rejectBooking: (id: string, reason?: string) => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

// Sample guide data
const sampleGuides: Guide[] = [
  {
    id: 1,
    name: "Rajesh Kumar",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&auto=format&q=80",
    rating: 4.8
  },
  {
    id: 2,
    name: "Priya Sharma",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop&auto=format&q=80",
    rating: 4.9
  },
  {
    id: 3,
    name: "Amit Patel",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&auto=format&q=80",
    rating: 4.7
  }
];

export const BookingProvider = ({ children }: { children: ReactNode }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    // Load bookings from localStorage on mount
    const storedBookings = localStorage.getItem("bookings");
    if (storedBookings) {
      setBookings(JSON.parse(storedBookings));
    }
  }, []);

  useEffect(() => {
    // Save bookings to localStorage whenever they change
    localStorage.setItem("bookings", JSON.stringify(bookings));
  }, [bookings]);

  const addBooking = (bookingData: Omit<Booking, "id" | "status" | "customer"> & {customerName: string, customerPhone: string, customerEmail?: string}) => {
    const { customerName, customerPhone, customerEmail, ...rest } = bookingData;
    
    const newBooking: Booking = {
      ...rest,
      id: `B${Date.now()}`,
      status: "pending",
      customer: {
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        location: bookingData.location,
      }
    };
    
    setBookings(prev => [...prev, newBooking]);
    return newBooking.id;
  };

  const getBookingsForGuide = (guideId: string | number) => {
    return bookings.filter(booking => booking.guide.id.toString() === guideId.toString());
  };

  const getBookingsForCustomer = (customerPhone: string) => {
    return bookings.filter(booking => booking.customer.phone === customerPhone);
  };

  const completeBooking = (id: string) => {
    setBookings(prev => 
      prev.map(booking => 
        booking.id === id ? { ...booking, status: "completed" } : booking
      )
    );
  };

  const acceptBooking = (id: string) => {
    setBookings(prev => 
      prev.map(booking => 
        booking.id === id ? { ...booking, status: "accepted" } : booking
      )
    );
  };

  const rejectBooking = (id: string, reason?: string) => {
    setBookings(prev => 
      prev.map(booking => 
        booking.id === id ? { 
          ...booking, 
          status: "rejected",
          rejectionReason: reason 
        } : booking
      )
    );
  };

  const cancelBooking = (id: string) => {
    setBookings(prev => prev.filter(booking => booking.id !== id));
  };

  return (
    <BookingContext.Provider value={{ 
      bookings, 
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
  if (context === undefined) {
    throw new Error("useBookings must be used within a BookingProvider");
  }
  return context;
};

// Helper function to get a random guide
export const getRandomGuide = (): Guide => {
  const randomIndex = Math.floor(Math.random() * sampleGuides.length);
  return sampleGuides[randomIndex];
};
