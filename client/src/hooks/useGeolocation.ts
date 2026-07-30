import { useState, useEffect } from 'react';
import { useToast } from './use-toast';

export interface Coordinates {
  lat: number;
  lng: number;
  accuracy: number;
}

export function useGeolocation(enabled = true) {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (!('geolocation' in navigator)) {
      const msg = 'Geolocation is not supported by your browser';
      setError(msg);
      toast({ title: "Location Error", description: msg, variant: "destructive" });
      setLoading(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setLoading(false);
      },
      (err) => {
        const msg = err.message || "Could not fetch your location.";
        setError(msg);
        toast({ title: "Location Error", description: msg, variant: "destructive" });
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0, // no cache for live tracking
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [enabled]);

  return { location, error, loading };
}
