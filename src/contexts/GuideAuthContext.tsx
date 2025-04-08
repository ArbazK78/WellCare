
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type GuideStatus = "pending" | "approved" | "rejected";

export type Guide = {
  id: string;
  phone: string;
  name: string;
  email?: string;
  image?: string;
  bio?: string;
  experience?: string;
  languages?: string[];
  specialties?: string[];
  rating?: number;
  status: GuideStatus;
  registeredAt: string;
};

type GuideAuthContextType = {
  isAuthenticated: boolean;
  currentGuide: Guide | null;
  guideLogin: (phone: string, password: string) => Promise<boolean>;
  guideRegister: (phone: string, name: string, password: string, email?: string) => Promise<string>;
  guideLogout: () => void;
  updateGuideProfile: (data: Partial<Omit<Guide, "id" | "status" | "registeredAt">>) => void;
  getAllApprovedGuides: () => Guide[];
};

const GuideAuthContext = createContext<GuideAuthContextType | undefined>(undefined);

export const GuideAuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentGuide, setCurrentGuide] = useState<Guide | null>(null);

  useEffect(() => {
    // Check local storage for guide auth state on mount
    const storedAuth = localStorage.getItem("guide_isAuthenticated");
    const storedGuide = localStorage.getItem("currentGuide");
    
    if (storedAuth === "true" && storedGuide) {
      setIsAuthenticated(true);
      setCurrentGuide(JSON.parse(storedGuide));
    }
  }, []);

  // Function to simulate guide login
  const guideLogin = async (phone: string, password: string): Promise<boolean> => {
    // In a real app, this would validate against backend
    // For now, let's just check against localStorage to simulate backend
    const guides = JSON.parse(localStorage.getItem("guides") || "[]");
    const guide = guides.find((g: Guide & { password: string }) => 
      g.phone === phone && g.password === password
    );
    
    if (guide) {
      const { password, ...guideWithoutPassword } = guide;
      localStorage.setItem("guide_isAuthenticated", "true");
      localStorage.setItem("currentGuide", JSON.stringify(guideWithoutPassword));
      
      setIsAuthenticated(true);
      setCurrentGuide(guideWithoutPassword);
      return true;
    }
    
    return false;
  };

  // Function to register a new guide
  const guideRegister = async (phone: string, name: string, password: string, email?: string): Promise<string> => {
    // Check if guide already exists
    const guides = JSON.parse(localStorage.getItem("guides") || "[]");
    const existingGuide = guides.find((g: Guide) => g.phone === phone);
    
    if (existingGuide) {
      return "A guide with this phone number already exists";
    }
    
    // Create new guide
    const newGuide = {
      id: `G${Date.now()}`,
      phone,
      name,
      email,
      password, // In real app, this would be hashed
      status: "pending" as GuideStatus,
      registeredAt: new Date().toISOString(),
      rating: 0,
    };
    
    guides.push(newGuide);
    localStorage.setItem("guides", JSON.stringify(guides));
    
    return "success";
  };

  // Function to update guide profile
  const updateGuideProfile = (data: Partial<Omit<Guide, "id" | "status" | "registeredAt">>) => {
    if (currentGuide) {
      const updatedGuide = {
        ...currentGuide,
        ...data
      };
      
      setCurrentGuide(updatedGuide);
      localStorage.setItem("currentGuide", JSON.stringify(updatedGuide));
      
      // Also update in the guides array
      const guides = JSON.parse(localStorage.getItem("guides") || "[]");
      const updatedGuides = guides.map((guide: Guide & { password: string }) => 
        guide.id === currentGuide.id ? { ...guide, ...data } : guide
      );
      
      localStorage.setItem("guides", JSON.stringify(updatedGuides));
    }
  };

  // Function to get all approved guides
  const getAllApprovedGuides = (): Guide[] => {
    const guides = JSON.parse(localStorage.getItem("guides") || "[]");
    return guides.filter((guide: Guide) => guide.status === "approved");
  };

  // Function to logout
  const guideLogout = () => {
    localStorage.removeItem("guide_isAuthenticated");
    localStorage.removeItem("currentGuide");
    setIsAuthenticated(false);
    setCurrentGuide(null);
  };

  return (
    <GuideAuthContext.Provider 
      value={{ 
        isAuthenticated, 
        currentGuide, 
        guideLogin, 
        guideRegister, 
        guideLogout,
        updateGuideProfile,
        getAllApprovedGuides
      }}
    >
      {children}
    </GuideAuthContext.Provider>
  );
};

export const useGuideAuth = () => {
  const context = useContext(GuideAuthContext);
  if (context === undefined) {
    throw new Error("useGuideAuth must be used within a GuideAuthProvider");
  }
  return context;
};
