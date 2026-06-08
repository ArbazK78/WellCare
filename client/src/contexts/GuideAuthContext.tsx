import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api from "@/lib/api"; // ✅ Correct path


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
  profile_picture?: FileList,
  government_id?: FileList,
};

type GuideAuthContextType = {
  isAuthenticated: boolean;
  currentGuide: Guide | null;
  guideLogin: (phone: string, password: string) => Promise<"success" | "pending" | "rejected" | "invalid">;
  guideRegister: (phone: string, name: string, password: string, email?: string, location?: string,
    experience?: string,
    specialties?: string[],
    bio?: string, profile_picture?: FileList, government_id?: FileList) => Promise<string>;
  guideLogout: () => void;
  getAllApprovedGuides: () => Promise<Guide[]>;
  updateGuideProfile: (updatedData: Partial<Guide>) => Promise<void>; // <-- ✅ Add this

};

const GuideAuthContext = createContext<GuideAuthContextType | undefined>(undefined);

export const GuideAuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentGuide, setCurrentGuide] = useState<Guide | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("guide_token");

    if (token) {
      const fetchGuideData = async () => {
        try {
          const { data } = await api.get("/guides/profile", {
            headers: { Authorization: `Bearer ${token}` }
          });
          setIsAuthenticated(true);
          setCurrentGuide(data);
        } catch (error: any) {
          // Only clear the session on an explicit auth rejection (401).
          // Network errors, 500s, or timeouts should NOT log the guide out —
          // they are transient and should not destroy a valid session.
          if (error?.response?.status === 401) {
            console.warn("⚠️ Guide token rejected by server — logging out.");
            guideLogout();
          } else {
            console.warn("⚠️ Could not verify guide session (non-auth error). Keeping token.", error?.message);
          }
        }
      };

      fetchGuideData();
    }
  }, []);


  const guideLogin = async (phone: string, password: string) => {
    try {
      const { data } = await api.post('/guides/login', { phone, password });
      
      // Store token and user data
      localStorage.setItem('guide_token', data.token);
      localStorage.setItem('guide_data', JSON.stringify(data.guide));
      
      // Update state
      setIsAuthenticated(true);
      setCurrentGuide(data.guide);
      
      return "success";
    } catch (error) {
      return "invalid";
    }
  };

  const guideRegister = async (
    phone: string,
    name: string,
    password: string,
    email?: string,
    location?: string,
    experience?: string,
    specialties?: string[],
    bio?: string,
    profile_picture?: FileList,
    government_id?: FileList,

  ): Promise<string> => {
    try {
      const { data } = await api.post("/guides/register", {
        name,
        phone,
        email,
        password,
        location,
        experience,
        specialties,
        bio,
        profile_picture ,
        government_id,
      });

      console.log("✅ Guide registered:", data);
      return "success";
    } catch (error: any) {
      console.error("❌ Registration error:", error);

      if (error.response?.data?.message) {
        return error.response.data.message;
      }

      return "Registration failed. Please try again.";
    }
  };

  const getAllApprovedGuides = async (): Promise<Guide[]> => {
    try {
      const { data } = await api.get('/guides/all'); // TEMP: fetch all guides for dev
      return data;
    } catch (error) {
      console.error("Error fetching approved guides:", error);
      return [];
    }
  };

  const guideLogout = () => {
    localStorage.removeItem("guide_token");
    setIsAuthenticated(false);
    setCurrentGuide(null);
  };

  const updateGuideProfile = async (updatedData: Partial<Guide>) => {
    try {
      const token = localStorage.getItem("guide_token");
      console.log("🔥 Sending update request", updatedData);

      
      // Always use axios instance with interceptors
      const { data } = await api.put("/guides/update-profile", updatedData);
      
      setCurrentGuide(data.updatedGuide);
      console.log("✅ Guide profile updated successfully");
      return data.updatedGuide; // Return updated data for immediate UI updates
    } catch (error) {
      console.error("❌ Error updating guide profile:", error);
      throw error; // Propagate error for UI handling
    }
  };

  return (
    <GuideAuthContext.Provider
      value={{
        isAuthenticated,
        currentGuide,
        guideLogin,
        guideRegister,
        guideLogout,
        getAllApprovedGuides,
        updateGuideProfile // <-- ✅ Add this

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
