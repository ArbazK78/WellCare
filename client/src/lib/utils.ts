import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseLocation(locationString: string | undefined): { name: string; address: string; lat?: number; lng?: number } {
  if (!locationString) return { name: "Unknown", address: "" };
  try {
    const parsed = JSON.parse(locationString);
    if (parsed.name && parsed.address) {
      return parsed;
    }
  } catch (e) {
    // Legacy format or manual entry
  }
  return { name: locationString, address: "" };
}
