import { useEffect, useState } from "react";
import { CancelledBooking } from "@/hooks/useBookingNotifications";
import { AlertCircle, X } from "lucide-react";
import { Button } from "./ui/button";

interface CancelledBookingPopupProps {
  booking: CancelledBooking;
  onDismiss: () => void;
}

const CancelledBookingPopup = ({ booking, onDismiss }: CancelledBookingPopupProps) => {
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    if (timeLeft <= 0) {
      onDismiss();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onDismiss]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl w-full max-w-sm mx-4 overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header - Red Alert Style */}
        <div className="bg-red-500 text-white p-6 flex flex-col items-center justify-center relative">
          <button 
            onClick={onDismiss}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="bg-white/20 p-3 rounded-full mb-3">
            <AlertCircle className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-center">Booking Cancelled</h2>
        </div>

        {/* Content */}
        <div className="p-6 text-center space-y-4 bg-gray-50">
          <p className="text-gray-800 font-medium text-lg">
            {booking.customer?.name || "The user"} cancelled their ride.
          </p>
          
          <p className="text-sm text-gray-500">
            They will be charged a penalty fee if eligible according to the cancellation policy.
          </p>

          <div className="pt-4">
            <Button 
              onClick={onDismiss} 
              variant="outline" 
              className="w-full font-medium"
            >
              Dismiss ({timeLeft}s)
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-gray-200 w-full relative">
          <div 
            className="absolute top-0 left-0 h-full bg-red-500 transition-all duration-1000 linear"
            style={{ width: `${(timeLeft / 15) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default CancelledBookingPopup;
