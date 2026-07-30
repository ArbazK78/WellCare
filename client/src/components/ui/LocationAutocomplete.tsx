import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from './input';
import { MapPin } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';

export interface LocationData {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  placeId?: string;
}

interface LocationAutocompleteProps {
  id: string;
  placeholder: string;
  value: LocationData | string;
  onChange: (value: LocationData | string) => void;
  required?: boolean;
  customOrigin?: { lat: number; lng: number } | null;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  id,
  placeholder,
  value,
  onChange,
  required,
  customOrigin
}) => {
  const { location: userLocation } = useGeolocation();
  
  const [inputValue, setInputValue] = useState(typeof value === 'string' ? value : value?.name || '');
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  
  // Initialize services when google maps script is loaded
  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places && !autocompleteService.current) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
      // PlacesService requires a DOM element to attach to
      placesService.current = new window.google.maps.places.PlacesService(document.createElement('div'));
    }
  }, [window.google]); // This ensures it initializes when the script finishes loading

  // Sync prop value to input
  useEffect(() => {
    const newVal = typeof value === 'string' ? value : value?.name || '';
    if (newVal !== inputValue) {
      setInputValue(newVal);
    }
  }, [value]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPredictions = useCallback((val: string, location: Coordinates | null) => {
    if (!val.trim()) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    if (autocompleteService.current) {
      const request: google.maps.places.AutocompletionRequest = {
        input: val,
        types: ['geocode', 'establishment'],
      };
      
      // Determine which location to use: customOrigin takes priority over GPS userLocation
      const activeLocation = customOrigin || location;

      // Restrict results strictly to India (Prevents Finland/London matches)
      request.componentRestrictions = { country: 'in' };

      // Inject GPS location for distance tracking and strict biasing
      if (activeLocation) {
        // Use LatLngLiteral which is safer and fully supported by the API
        const originLiteral = { lat: activeLocation.lat, lng: activeLocation.lng };
        request.origin = new window.google.maps.LatLng(originLiteral.lat, originLiteral.lng);
        
        // Use locationBias instead of Restriction. This heavily prioritizes the 50km radius, 
        // but still allows users to search for cities like Delhi or Mumbai when needed.
        request.locationBias = {
          radius: 50000, 
          center: originLiteral
        };
      }

      autocompleteService.current.getPlacePredictions(request, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results);
          setIsOpen(true);
        } else {
          setPredictions([]);
        }
      });
    }
  }, []);

  // Re-fetch predictions if the customOrigin or user's GPS location finally resolves while they are typing
  useEffect(() => {
    if (inputValue && isOpen) {
      fetchPredictions(inputValue, customOrigin || userLocation);
    }
  }, [userLocation, customOrigin, fetchPredictions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val); // Initially update parent as string
    fetchPredictions(val, customOrigin || userLocation);
  };

  const handleSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    const name = prediction.structured_formatting.main_text;
    setInputValue(name);
    setIsOpen(false);

    if (placesService.current && prediction.place_id) {
      placesService.current.getDetails(
        { placeId: prediction.place_id, fields: ['formatted_address', 'name', 'geometry', 'place_id'] },
        (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            onChange({
              name: place.name || name,
              address: place.formatted_address || '',
              lat: place.geometry?.location?.lat(),
              lng: place.geometry?.location?.lng(),
              placeId: place.place_id || prediction.place_id
            });
          } else {
            onChange({ name, address: prediction.description });
          }
        }
      );
    } else {
      onChange({ name, address: prediction.description });
    }
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <Input
        id={id}
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => { if (predictions.length > 0) setIsOpen(true); }}
        required={required}
        autoComplete="off"
      />
      
      {isOpen && predictions.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-popover text-popover-foreground rounded-xl shadow-xl border border-border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
          <ul className="max-h-64 overflow-y-auto py-1">
            {predictions.map((p) => (
              <li
                key={p.place_id}
                onClick={() => handleSelect(p)}
                className="px-3 py-2 hover:bg-secondary/70 cursor-pointer flex items-center justify-between group transition-colors border-b border-border/60 last:border-0"
              >
                <div className="flex items-start gap-3 overflow-hidden">
                  <div className="mt-0.5 shrink-0 p-1.5 bg-muted rounded-full text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold text-popover-foreground truncate group-hover:text-primary transition-colors">
                      {p.structured_formatting.main_text}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {p.structured_formatting.secondary_text}
                    </p>
                  </div>
                </div>
                {p.distance_meters !== undefined && (
                  <div className="shrink-0 ml-3 text-right">
                    <span className="text-[11px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {(p.distance_meters / 1000).toFixed(1)} km
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
