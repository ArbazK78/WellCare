
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type BookingService = "Navigation Assistance" | "Heavy Lifting" | "Transport Assistance";

export type Guide = {
  id: number;
  name: string;
  image: string;
  rating: number;
};

export type Booking = {
  id: string;
  status: "upcoming" | "completed";
  service: BookingService;
  guide: Guide;
  date: string;
  time: string;
  location: string;
  waitingHours: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
};

interface BookingContextType {
  bookings: Booking[];
  addBooking: (booking: Omit<Booking, "id" | "status">) => string;
  completeBooking: (id: string) => void;
  cancelBooking: (id: string) => void;
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

  const addBooking = (bookingData: Omit<Booking, "id" | "status">) => {
    const newBooking: Booking = {
      ...bookingData,
      id: `B${Date.now()}`,
      status: "upcoming"
    };
    
    setBookings(prev => [...prev, newBooking]);
    return newBooking.id;
  };

  const completeBooking = (id: string) => {
    setBookings(prev => 
      prev.map(booking => 
        booking.id === id ? { ...booking, status: "completed" } : booking
      )
    );
  };

  const cancelBooking = (id: string) => {
    setBookings(prev => prev.filter(booking => booking.id !== id));
  };

  return (
    <BookingContext.Provider value={{ bookings, addBooking, completeBooking, cancelBooking }}>
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
