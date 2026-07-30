import React, { useState } from "react";
import { format, isToday } from "date-fns";
import { Clock, Calendar as CalendarIcon, MapPin, Navigation } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const activeTime = activeTab === "pickup" ? value.pickupTime : value.dropoffTime;
  const [activeHour24 = 9, activeMinute = 0] = (activeTime || "09:00").split(":").map(Number);
  const activePeriod = activeHour24 >= 12 ? "PM" : "AM";
  const activeHour12 = activeHour24 % 12 || 12;
  const updateClock = (part: "hour" | "minute" | "period", nextValue: string) => {
    let hour = activeHour12;
    let minute = activeMinute;
    let period = activePeriod;
    if (part === "hour") hour = Number(nextValue);
    if (part === "minute") minute = Number(nextValue);
    if (part === "period") period = nextValue;
    const hour24 = (hour % 12) + (period === "PM" ? 12 : 0);
    handleUpdate(activeTab === "pickup" ? "pickupTime" : "dropoffTime", `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  };

  // ── Date Disabled Rules ──
  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const latest = new Date();
    latest.setHours(0, 0, 0, 0);
    latest.setDate(latest.getDate() + 90);
    if (date > latest) return true;

    if (activeTab === "pickup") {
      return date < today;
    } else {
      const minDate = value.pickupDate ? new Date(value.pickupDate) : today;
      minDate.setHours(0, 0, 0, 0);
      return date < minDate;
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 rounded-xl bg-secondary p-1">
        <button
          type="button"
          className={cn(
            "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2",
            activeTab === "pickup" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:bg-background/60"
          )}
          onClick={() => setActiveTab("pickup")}
        >
          <MapPin className="h-4 w-4" /> Pick up at
        </button>
        <button
          type="button"
          className={cn(
            "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2",
            activeTab === "dropoff" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:bg-background/60"
          )}
          onClick={() => setActiveTab("dropoff")}
        >
          <Navigation className="h-4 w-4" /> Drop-off by
        </button>
      </div>

      <Card className="overflow-hidden border-border bg-card shadow-sm">
        <CardContent className="p-0">
          <div className="p-4 border-b border-border bg-secondary/35 flex justify-between items-center">
            <span className="text-sm font-medium text-foreground flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
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

          <div className="p-4 border-t border-border bg-secondary/35">
            <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-primary" />
              Select Time
            </label>
            <div className="grid grid-cols-[1fr_auto_1fr_1fr] items-center gap-2" aria-label="Choose time">
              <Select value={String(activeHour12)} onValueChange={(next) => updateClock("hour", next)}>
                <SelectTrigger className="h-12 rounded-xl border-border bg-background px-4 text-base font-semibold shadow-sm focus:ring-primary/25">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72 rounded-xl border-border bg-popover p-1 shadow-2xl">
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => (
                    <SelectItem className="h-10 rounded-lg pl-8 font-semibold focus:bg-primary/10 focus:text-primary" key={hour} value={String(hour)}>{String(hour).padStart(2, "0")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xl font-bold text-muted-foreground">:</span>
              <Select value={String(activeMinute)} onValueChange={(next) => updateClock("minute", next)}>
                <SelectTrigger className="h-12 rounded-xl border-border bg-background px-4 text-base font-semibold shadow-sm focus:ring-primary/25">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72 rounded-xl border-border bg-popover p-1 shadow-2xl">
                  {Array.from({ length: 60 }, (_, minute) => minute).map((minute) => (
                    <SelectItem className="h-10 rounded-lg pl-8 font-semibold focus:bg-primary/10 focus:text-primary" key={minute} value={String(minute)}>{String(minute).padStart(2, "0")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid h-12 grid-cols-2 rounded-xl bg-secondary p-1">
                {["AM", "PM"].map((period) => <button key={period} type="button" onClick={() => updateClock("period", period)} className={cn("rounded-lg text-xs font-bold transition", activePeriod === period ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{period}</button>)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── ETA Information Box ── */}
      <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 text-center">
        {activeTab === "pickup" && calcDropoff ? (
          <>
            <p className="text-foreground font-semibold text-lg">{format(calcDropoff, "h:mm a")} IST Drop-Off Time</p>
            <p className="text-muted-foreground text-sm mt-1">About {tripDuration} min trip</p>
          </>
        ) : activeTab === "dropoff" && calcPickup ? (
          <>
            <p className="text-foreground font-semibold text-lg">Earliest Pick-up at {format(calcPickup, "h:mm a")}</p>
            <p className="text-muted-foreground text-sm mt-1">Based on ~{tripDuration} min trip</p>
          </>
        ) : (
          <p className="text-muted-foreground text-sm italic">Select date and time to see estimates</p>
        )}
      </div>
    </div>
  );
}
