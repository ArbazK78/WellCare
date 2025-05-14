import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Clock, MapPin, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface BookingWaitingStateProps {
  service: string;
  date: string;
  time: string;
  location: string;
  booking: any;
  onCancel: () => void;
}

const BookingWaitingState = ({ service, date, time, location, onCancel }: BookingWaitingStateProps) => {
  const [progress, setProgress] = useState(0);
  const [waitingTime, setWaitingTime] = useState(0);

  // Effect to animate progress and increase waiting time
  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        // Reset progress when it reaches 100, creating a continuous animation
        if (prev >= 100) return 15;
        return prev + 1;
      });
    }, 300);

    // Update waiting time counter
    const waitingInterval = setInterval(() => {
      setWaitingTime((prev) => prev + 1);
    }, 60000); // Increment every minute

    return () => {
      clearInterval(progressInterval);
      clearInterval(waitingInterval);
    };
  }, []);

  // Format waiting time into minutes/hours
  const formatWaitingTime = () => {
    if (waitingTime < 60) {
      return `${waitingTime} minute${waitingTime !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(waitingTime / 60);
    const minutes = waitingTime % 60;
    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  return (
    <Card className="mb-4 border-2 border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center">
              <span className="text-lg">Finding your guide</span>
              <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full animate-pulse">
                Waiting
              </span>
            </CardTitle>
            <CardDescription>
              {service} on {date} at {time}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <div className="text-center text-sm text-blue-800 font-medium">
            Looking for the perfect guide for your booking...
          </div>

          <Progress value={progress} className="h-2 bg-blue-100" />

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-blue-600" />
              <span>{date}</span>
            </div>
            
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-blue-600" />
              <span>{time}</span>
            </div>
          </div>

          <div className="flex items-start">
            <MapPin className="h-4 w-4 mr-2 text-blue-600 mt-1" />
            <div className="text-sm">{location}</div>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Waiting time:</span>
              <span className="font-medium">{formatWaitingTime()}</span>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex space-x-2">
                  <Skeleton className="h-8 w-8 rounded-full bg-blue-200" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24 bg-blue-200" />
                    <Skeleton className="h-3 w-16 bg-blue-200" />
                  </div>
                </div>
              </div>

              
          {/* ✅ Add Cancel Button Here */}
          <div className="mt-6 text-center">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-red-500 text-red-500 rounded hover:bg-red-100 transition"
            >
              Cancel Booking
            </button>
          </div>
              
              <Skeleton className="h-8 w-24 bg-blue-200" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingWaitingState;