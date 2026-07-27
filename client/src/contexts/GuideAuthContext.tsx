import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api from "@/lib/api"; // ✅ Correct path
import { useToast } from "@/components/ui/use-toast";


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
  isAuthLoading: boolean;
  isOnline: boolean;
  currentGuide: Guide | null;
  guideLogin: (phone: string, password: string) => Promise<"success" | "pending" | "rejected" | "invalid">;
  guideRegister: (phone: string, name: string, password: string, email?: string, location?: string,
    experience?: string,
    specialties?: string[],
    bio?: string, profile_picture?: FileList, government_id?: FileList) => Promise<string>;
  guideLogout: () => Promise<void>;
  getAllApprovedGuides: () => Promise<Guide[]>;
  updateGuideProfile: (updatedData: Partial<Guide>) => Promise<void>;
  toggleOnlineStatus: () => Promise<void>;
};

const GuideAuthContext = createContext<GuideAuthContextType | undefined>(undefined);

export const GuideAuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading]     = useState<boolean>(true); // true until session restore attempt finishes
  const [isOnline, setIsOnline]               = useState<boolean>(false);
  const [currentGuide, setCurrentGuide]       = useState<Guide | null>(null);
  const { toast } = useToast();

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
          setIsOnline(data.isOnline ?? false); // Restore online status from DB
        } catch (error: any) {
          // Only clear the session on an explicit auth rejection (401).
          // Network errors, 500s, or timeouts should NOT log the guide out —
          // they are transient and should not destroy a valid session.
          if (error?.response?.status === 401) {
            console.warn("⚠️ Guide token rejected by server — logging out.");
            await guideLogout();
          } else {
            console.warn("⚠️ Could not verify guide session (non-auth error). Keeping token.", error?.message);
          }
        } finally {
          setIsAuthLoading(false); // Session restore attempt is done either way
        }
      };

      fetchGuideData();
    } else {
      // No token — not loading, not authenticated
      setIsAuthLoading(false);
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
      setIsOnline(data.guide.isOnline ?? false); // FH-3 fix: Restore online status from login response

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
      const formData = new FormData();
      formData.append("name", name);
      formData.append("phone", phone);
      formData.append("password", password);

      if (email) formData.append("email", email);
      if (location) formData.append("location", location);
      if (experience) formData.append("experience", experience);
      if (bio) formData.append("bio", bio);

      // Send array items individually
      if (specialties && specialties.length > 0) {
        specialties.forEach(spec => formData.append("specialties[]", spec));
      }

      // Append files correctly
      if (profile_picture && profile_picture.length > 0) {
        formData.append("profile_picture", profile_picture[0]);
      }
      if (government_id && government_id.length > 0) {
        formData.append("government_id", government_id[0]);
      }

      const { data } = await api.post("/guides/register", formData, {
        headers: { "Content-Type": "multipart/form-data" }
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
      // FM-1 fix: Pass status=approved to backend so we don't fetch pending/rejected guides
      const { data } = await api.get('/guides/approved');
      return data;
    } catch (error) {
      console.error("Error fetching approved guides:", error);
      return [];
    }
  };

  const guideLogout = async () => {
    try {
      const token = localStorage.getItem("guide_token");
      if (token && isOnline) {
        await api.put('/guides/online-status', { isOnline: false }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (err) {
      console.error("Failed to set offline during logout:", err);
    } finally {
      localStorage.removeItem("guide_token");
      setIsAuthenticated(false);
      setIsOnline(false);
      setCurrentGuide(null);
    }
  };

  const toggleOnlineStatus = async () => {
    try {
      const next = !isOnline;
      const { data } = await api.put('/guides/online-status', { isOnline: next });
      setIsOnline(data.isOnline);
      console.log(`📡 Guide is now ${data.isOnline ? 'ONLINE 🟢' : 'OFFLINE 🔴'}`);

      if (data.isOnline) {
        toast({
          title: "You are online now!",
          description: "You're now visible to customers and can receive ride requests.",
        });
      }
    } catch (err) {
      console.error('❌ Failed to update online status:', err);
    }
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
        isAuthLoading,
        isOnline,
        currentGuide,
        guideLogin,
        guideRegister,
        guideLogout,
        getAllApprovedGuides,
        updateGuideProfile,
        toggleOnlineStatus,
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
