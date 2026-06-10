import React, { useState } from "react";
import { format, isToday } from "date-fns";
import { Clock, Calendar as CalendarIcon, MapPin, Navigation } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface ScheduleData {
  pickupDate?: Date;
  pickupTime: string;
  dropoffDate?: Date;
  dropoffTime: string;
}

interface SchedulePickerProps {
  value: ScheduleData;
  onChange: (data: ScheduleData) => void;
}

export function SchedulePicker({ value, onChange }: SchedulePickerProps) {
  const [activeTab, setActiveTab] = useState<"pickup" | "dropoff">("pickup");
  const [tripDuration] = useState(40); // 40 minutes randomly assigned
  const { toast } = useToast();

  const handleUpdate = (field: keyof ScheduleData, val: any) => {
    let newData = { ...value, [field]: val };

    // ── INTERCEPT & ENFORCE PICKUP DATE (RULE 3 FIX) ──
    if (field === "pickupDate" && isToday(val) && newData.pickupTime) {
      const now = new Date();
      const currentHrs = now.getHours();
      const currentMins = now.getMinutes();
      const [selHrs, selMins] = newData.pickupTime.split(":").map(Number);
      
      if (selHrs < currentHrs || (selHrs === currentHrs && selMins < currentMins)) {
        newData.pickupTime = `${String(currentHrs).padStart(2, "0")}:${String(currentMins).padStart(2, "0")}`;
        
        // Push dropoff time based on snapped pickup time
        const newDropoff = new Date(val);
        newDropoff.setHours(currentHrs, currentMins + tripDuration, 0, 0);
        newData.dropoffDate = newDropoff;
        newData.dropoffTime = `${String(newDropoff.getHours()).padStart(2, "0")}:${String(newDropoff.getMinutes()).padStart(2, "0")}`;
      }
    }

    // ── INTERCEPT & ENFORCE PICKUP TIME (RULE 3) ──
    if (field === "pickupTime" && newData.pickupDate && isToday(newData.pickupDate)) {
      const now = new Date();
      const currentHrs = now.getHours();
      const currentMins = now.getMinutes();
      const [selHrs, selMins] = String(val).split(":").map(Number);
      
      if (selHrs < currentHrs || (selHrs === currentHrs && selMins < currentMins)) {
        // Silently snap to current time
        newData.pickupTime = `${String(currentHrs).padStart(2, "0")}:${String(currentMins).padStart(2, "0")}`;
      }
    }

    // ── AUTO-POPULATE OR RECALCULATE DROPOFF TIME ──
    // If pickup changes, automatically push the dropoff time forward
    if ((field === "pickupDate" || field === "pickupTime") && newData.pickupDate && newData.pickupTime) {
      const [pHrs, pMins] = newData.pickupTime.split(":").map(Number);
      const newDropoff = new Date(newData.pickupDate);
      newDropoff.setHours(pHrs, pMins + tripDuration, 0, 0);
      
      newData.dropoffDate = newDropoff;
      newData.dropoffTime = `${String(newDropoff.getHours()).padStart(2, "0")}:${String(newDropoff.getMinutes()).padStart(2, "0")}`;
    }

    // ── INTERCEPT & ENFORCE DROPOFF TIME (RULES 4, 5 & 2-WAY BINDING) ──
    if (field === "dropoffTime" && newData.pickupDate && newData.pickupTime) {
      const [pHrs, pMins] = newData.pickupTime.split(":").map(Number);
      const minDropoff = new Date(newData.pickupDate);
      minDropoff.setHours(pHrs, pMins + tripDuration, 0, 0);

      const dDateOnly = new Date(newData.dropoffDate || minDropoff);
      dDateOnly.setHours(0, 0, 0, 0);
      const minDDateOnly = new Date(minDropoff);
      minDDateOnly.setHours(0, 0, 0, 0);

      if (dDateOnly.getTime() === minDDateOnly.getTime()) {
        const [dHrs, dMins] = String(val).split(":").map(Number);
        if (dHrs < minDropoff.getHours() || (dHrs === minDropoff.getHours() && dMins < minDropoff.getMinutes())) {
          newData.dropoffTime = `${String(minDropoff.getHours()).padStart(2, "0")}:${String(minDropoff.getMinutes()).padStart(2, "0")}`;
          toast({
            title: "Time Adjusted",
            description: `The earliest drop-off time is ${format(minDropoff, "MMM d, h:mm a")} for this trip.`,
          });
        } else {
          // Valid change! The user explicitly increased it. Auto-calculate the pickup time (2-way binding)
          const newPickup = new Date(newData.dropoffDate || minDropoff);
          newPickup.setHours(dHrs, dMins - tripDuration, 0, 0);
          newData.pickupDate = newPickup;
          newData.pickupTime = `${String(newPickup.getHours()).padStart(2, "0")}:${String(newPickup.getMinutes()).padStart(2, "0")}`;
        }
      } else {
          // Date is strictly > minDate. Time can be anything. Still adjust pick-up back!
          const [dHrs, dMins] = String(val).split(":").map(Number);
          const newPickup = new Date(newData.dropoffDate || minDropoff);
          newPickup.setHours(dHrs, dMins - tripDuration, 0, 0);
          newData.pickupDate = newPickup;
          newData.pickupTime = `${String(newPickup.getHours()).padStart(2, "0")}:${String(newPickup.getMinutes()).padStart(2, "0")}`;
      }
    }
    
    // Enforce Dropoff Date to not precede Pickup Date
    if (field === "dropoffDate" && newData.pickupDate && newData.pickupTime) {
      const [pHrs, pMins] = newData.pickupTime.split(":").map(Number);
      const minDropoff = new Date(newData.pickupDate);
      minDropoff.setHours(pHrs, pMins + tripDuration, 0, 0);

      const dDateOnly = new Date(val);
      dDateOnly.setHours(0, 0, 0, 0);
      const minDDateOnly = new Date(minDropoff);
      minDDateOnly.setHours(0, 0, 0, 0);

      if (dDateOnly < minDDateOnly) {
         newData.dropoffDate = new Date(minDropoff);
         newData.dropoffTime = `${String(minDropoff.getHours()).padStart(2, "0")}:${String(minDropoff.getMinutes()).padStart(2, "0")}`;
         toast({
            title: "Date Adjusted",
            description: `Drop-off cannot be earlier than ${format(minDropoff, "MMM d, h:mm a")}.`,
          });
      } else {
         // Explicit date change, shift pick-up as well
         const [dHrs, dMins] = newData.dropoffTime.split(":").map(Number);
         const newPickup = new Date(val);
         newPickup.setHours(dHrs, dMins - tripDuration, 0, 0);
         newData.pickupDate = newPickup;
         newData.pickupTime = `${String(newPickup.getHours()).padStart(2, "0")}:${String(newPickup.getMinutes()).padStart(2, "0")}`;
      }
    }

    onChange(newData);
  };

  // ── ETA Calculators ──
  const getCalculatedDropoffTime = () => {
    if (!value.pickupDate || !value.pickupTime) return null;
    const [pHrs, pMins] = value.pickupTime.split(":").map(Number);
    const dropoff = new Date(value.pickupDate);
    dropoff.setHours(pHrs, pMins + tripDuration, 0, 0);
    return dropoff;
  };

  const getCalculatedPickupTime = () => {
    if (!value.dropoffDate || !value.dropoffTime) return null;
    const [dHrs, dMins] = value.dropoffTime.split(":").map(Number);
    const pickup = new Date(value.dropoffDate);
    pickup.setHours(dHrs, dMins - tripDuration, 0, 0);
    return pickup;
  };

  const calcDropoff = getCalculatedDropoffTime();
  const calcPickup = getCalculatedPickupTime();

  // ── Date Disabled Rules ──
  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (activeTab === "pickup") {
      return date < today;
    } else {
      const minDate = value.pickupDate ? new Date(value.pickupDate) : today;
      minDate.setHours(0, 0, 0, 0);
      return date < minDate;
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
        <button
          type="button"
          className={cn(
            "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2",
            activeTab === "pickup" ? "bg-white shadow-sm text-blue-600" : "text-gray-600 hover:bg-gray-200"
          )}
          onClick={() => setActiveTab("pickup")}
        >
          <MapPin className="h-4 w-4" /> Pick up at
        </button>
        <button
          type="button"
          className={cn(
            "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2",
            activeTab === "dropoff" ? "bg-white shadow-sm text-blue-600" : "text-gray-600 hover:bg-gray-200"
          )}
          onClick={() => setActiveTab("dropoff")}
        >
          <Navigation className="h-4 w-4" /> Drop-off by
        </button>
      </div>

      <Card className="overflow-hidden border-gray-200 shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-blue-500" />
              Select Date
            </span>
            <Button 
              type="button"
              variant="outline" 
              size="sm" 
              className="h-7 text-xs px-3"
              onClick={() => {
                const today = new Date();
                if (activeTab === "pickup") handleUpdate("pickupDate", today);
                else handleUpdate("dropoffDate", today);
              }}
            >
              Today
            </Button>
          </div>
          
          <Calendar
            mode="single"
            selected={activeTab === "pickup" ? value.pickupDate : value.dropoffDate}
            onSelect={(d) => handleUpdate(activeTab === "pickup" ? "pickupDate" : "dropoffDate", d)}
            disabled={isDateDisabled}
            className="p-4 flex justify-center"
          />

          <div className="p-4 border-t bg-gray-50/50">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-blue-500" />
              Select Time
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="time"
                className="w-full flex h-10 rounded-md border border-input bg-white px-3 py-2 pl-10 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none cursor-pointer"
                value={activeTab === "pickup" ? value.pickupTime : value.dropoffTime}
                onChange={(e) => handleUpdate(activeTab === "pickup" ? "pickupTime" : "dropoffTime", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── ETA Information Box ── */}
      <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-4 text-center">
        {activeTab === "pickup" && calcDropoff ? (
          <>
            <p className="text-blue-900 font-semibold text-lg">{format(calcDropoff, "h:mm a")} IST Drop-Off Time</p>
            <p className="text-blue-600/80 text-sm mt-1">About {tripDuration} min trip</p>
          </>
        ) : activeTab === "dropoff" && calcPickup ? (
          <>
            <p className="text-blue-900 font-semibold text-lg">Earliest Pick-up at {format(calcPickup, "h:mm a")}</p>
            <p className="text-blue-600/80 text-sm mt-1">Based on ~{tripDuration} min trip</p>
          </>
        ) : (
          <p className="text-blue-700/60 text-sm italic">Select date and time to see estimates</p>
        )}
      </div>
    </div>
  );
}
