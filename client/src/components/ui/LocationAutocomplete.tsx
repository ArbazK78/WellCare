import React, { useCallback, useEffect, useRef, useState } from "react";
import { Hospital, Loader2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Input } from "./input";

export const MEDICAL_PLACE_TYPES = [
  "hospital",
  "general_hospital",
  "medical_clinic",
  "medical_center",
  "doctor",
] as const;

export interface LocationData {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  placeTypes?: string[];
  primaryType?: string;
}

type Suggestion = {
  key: string;
  name: string;
  address: string;
  distanceMeters?: number | null;
  place?: google.maps.places.Place;
  prediction?: google.maps.places.PlacePrediction;
};

interface LocationAutocompleteProps {
  id: string;
  placeholder: string;
  value: LocationData | string;
  onChange: (value: LocationData | string) => void;
  required?: boolean;
  customOrigin?: { lat: number; lng: number } | null;
  purpose?: "general" | "medical";
}

const isMedicalPlace = (types: readonly string[] = []) =>
  types.some((type) => MEDICAL_PLACE_TYPES.includes(type as (typeof MEDICAL_PLACE_TYPES)[number]));

const toLocationData = (place: google.maps.places.Place): LocationData => ({
  name: place.displayName || "Medical facility",
  address: place.formattedAddress || "",
  lat: place.location?.lat(),
  lng: place.location?.lng(),
  placeId: place.id,
  placeTypes: place.types || [],
  primaryType: place.primaryType || undefined,
});

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  id,
  placeholder,
  value,
  onChange,
  required,
  customOrigin,
  purpose = "general",
}) => {
  const { toast } = useToast();
  const { location: userLocation } = useGeolocation();
  const [inputValue, setInputValue] = useState(typeof value === "string" ? value : value?.name || "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showingNearby, setShowingNearby] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const requestSequenceRef = useRef(0);

  const activeOrigin = customOrigin || userLocation;

  useEffect(() => {
    const nextValue = typeof value === "string" ? value : value?.name || "";
    setInputValue((current) => current === nextValue ? current : nextValue);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const ensureSessionToken = useCallback(async () => {
    if (!sessionTokenRef.current) {
      const { AutocompleteSessionToken } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
      sessionTokenRef.current = new AutocompleteSessionToken();
    }
    return sessionTokenRef.current;
  }, []);

  const fetchPredictions = useCallback(async (input: string) => {
    const sequence = ++requestSequenceRef.current;
    if (!input.trim() || !window.google?.maps?.places) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    setShowingNearby(false);
    try {
      const { AutocompleteSuggestion } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
      const sessionToken = await ensureSessionToken();
      const request: google.maps.places.AutocompleteRequest = {
        input,
        includedRegionCodes: ["in"],
        sessionToken,
      };
      if (purpose === "medical") request.includedPrimaryTypes = [...MEDICAL_PLACE_TYPES];
      if (activeOrigin) {
        request.origin = activeOrigin;
        request.locationBias = { center: activeOrigin, radius: 50000 };
      }

      const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
      if (sequence !== requestSequenceRef.current) return;
      const nextSuggestions = response.suggestions
        .map((item) => item.placePrediction)
        .filter((prediction): prediction is google.maps.places.PlacePrediction => Boolean(prediction))
        .map((prediction) => ({
          key: prediction.placeId,
          name: prediction.mainText?.toString() || prediction.text.toString(),
          address: prediction.secondaryText?.toString() || "",
          distanceMeters: prediction.distanceMeters,
          prediction,
        }));
      setSuggestions(nextSuggestions);
      setIsOpen(nextSuggestions.length > 0);
    } catch (error) {
      console.error("Unable to load place suggestions", error);
      if (sequence === requestSequenceRef.current) setSuggestions([]);
    } finally {
      if (sequence === requestSequenceRef.current) setIsLoading(false);
    }
  }, [activeOrigin, ensureSessionToken, purpose]);

  const fetchNearbyMedicalPlaces = useCallback(async () => {
    if (purpose !== "medical" || !activeOrigin || !window.google?.maps?.places) return;
    const sequence = ++requestSequenceRef.current;
    setIsLoading(true);
    setShowingNearby(true);
    try {
      const { Place, SearchNearbyRankPreference } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
      const { places } = await Place.searchNearby({
        fields: ["id", "displayName", "formattedAddress", "location", "types", "primaryType"],
        locationRestriction: { center: activeOrigin, radius: 15000 },
        includedTypes: [...MEDICAL_PLACE_TYPES],
        maxResultCount: 8,
        rankPreference: SearchNearbyRankPreference.DISTANCE,
        region: "in",
      });
      if (sequence !== requestSequenceRef.current) return;
      const nextSuggestions = places.filter((place) => isMedicalPlace(place.types)).map((place) => ({
        key: place.id,
        name: place.displayName || "Medical facility",
        address: place.formattedAddress || "",
        place,
      }));
      setSuggestions(nextSuggestions);
      setIsOpen(nextSuggestions.length > 0);
    } catch (error) {
      console.error("Unable to load nearby medical facilities", error);
      if (sequence === requestSequenceRef.current) setSuggestions([]);
    } finally {
      if (sequence === requestSequenceRef.current) setIsLoading(false);
    }
  }, [activeOrigin, purpose]);

  useEffect(() => {
    if (!isOpen || !inputValue.trim()) return;
    const timer = window.setTimeout(() => fetchPredictions(inputValue), 180);
    return () => window.clearTimeout(timer);
  }, [activeOrigin, fetchPredictions, inputValue, isOpen]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setInputValue(nextValue);
    onChange(nextValue);
    setIsOpen(Boolean(nextValue.trim()));
    if (!nextValue.trim()) {
      setSuggestions([]);
      if (purpose === "medical") void fetchNearbyMedicalPlaces();
    }
  };

  const handleFocus = () => {
    if (inputValue.trim()) {
      setIsOpen(true);
      void fetchPredictions(inputValue);
    } else if (purpose === "medical") {
      void fetchNearbyMedicalPlaces();
    }
  };

  const handleSelect = async (suggestion: Suggestion) => {
    setIsLoading(true);
    try {
      const place = suggestion.place || suggestion.prediction?.toPlace();
      if (!place) throw new Error("Place details are unavailable");
      if (!suggestion.place) {
        await place.fetchFields({ fields: ["id", "displayName", "formattedAddress", "location", "types", "primaryType"] });
      }
      if (purpose === "medical" && !isMedicalPlace(place.types)) {
        toast({
          title: "Choose a hospital or clinic",
          description: "WellCare destinations must be medical facilities verified by Google Maps.",
          variant: "destructive",
        });
        return;
      }
      const location = toLocationData(place);
      setInputValue(location.name);
      onChange(location);
      setSuggestions([]);
      setIsOpen(false);
      sessionTokenRef.current = null;
    } catch (error) {
      console.error("Unable to select place", error);
      toast({ title: "Place unavailable", description: "Please choose another suggestion.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const ResultIcon = purpose === "medical" ? Hospital : MapPin;

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <Input
        id={id}
        placeholder={placeholder}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        required={required}
        autoComplete="off"
      />

      {isLoading && <Loader2 className="pointer-events-none absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}

      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-xl animate-in fade-in zoom-in-95 duration-100">
          {showingNearby && (
            <div className="border-b border-border/70 bg-primary/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
              Nearby hospitals &amp; clinics
            </div>
          )}
          <ul className="max-h-64 overflow-y-auto py-1">
            {suggestions.map((suggestion) => (
              <li
                key={suggestion.key}
                onClick={() => void handleSelect(suggestion)}
                className="group flex cursor-pointer items-center justify-between border-b border-border/60 px-3 py-2 transition-colors last:border-0 hover:bg-secondary/70"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 shrink-0 rounded-full bg-muted p-1.5 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                    <ResultIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-popover-foreground transition-colors group-hover:text-primary">{suggestion.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{suggestion.address}</p>
                  </div>
                </div>
                {suggestion.distanceMeters != null && (
                  <span className="ml-3 shrink-0 whitespace-nowrap rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {(suggestion.distanceMeters / 1000).toFixed(1)} km
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div className="border-t border-border/60 px-3 py-1.5 text-right text-[10px] font-medium text-muted-foreground">Powered by Google</div>
        </div>
      )}
    </div>
  );
};
