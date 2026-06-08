import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api from "../lib/api";
import { jwtDecode } from "jwt-decode";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  isAuthenticated: boolean;
  userPhone: string | null;
  userName: string | null;
  userEmail: string | null;
  checkingAuth: boolean;
  login: (phone: string, name?: string, email?: string) => Promise<boolean>;
  updateProfile: (data: { name?: string; email?: string; phone?: string }) => Promise<boolean>;
  logout: () => void;
  register: (name: string, phone: string, email?: string) => Promise<boolean>;
  setUser: (user: { _id: string; name: string; email: string; phone?: string; profilePicture?: string } | null) => void; // ✅ UPDATED TYPE TO INCLUDE phone
};


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // ✅ Updated type for the full user object to include phone
  const [user, setUserState] = useState<{ _id: string; name: string; email: string; phone?: string; profilePicture?: string } | null>(null);

  interface JwtPayload {
    userId: string;
    exp: number;
  }

  useEffect(() => {
    const userToken = localStorage.getItem("userToken");
    console.log("🔍 [AuthContext] Token on initial load:", userToken ? 'present' : 'absent');

    if (!userToken) {
      setCheckingAuth(false);
      return;
    }

    try {
      const decoded: any = jwtDecode(userToken);
      const isExpired = decoded.exp * 1000 < Date.now();

      if (isExpired) {
        localStorage.removeItem("userToken");
        setCheckingAuth(false);
        return;
      }

      api
        .get("/users/profile", {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        })
        .then(({ data }) => {
          setIsAuthenticated(true);
          setUserName(data.name);
          setUserPhone(data.phone);
          setUserEmail(data.email);
          // ✅ Update the full user object as well, including phone
          setUserState({ _id: data._id, name: data.name, email: data.email, phone: data.phone });
          console.log("✅ [AuthContext] User profile fetched:", data); // ADD THIS LINE
          console.log("✅ [AuthContext] userName set to:", data.name); // ADD THIS LINE
        })
        .catch((err) => {
          console.error("❌ Auth check failed:", err);
          localStorage.removeItem("userToken");
        })
        .finally(() => setCheckingAuth(false));
    } catch (error) {
      console.error("❌ Token decode error:", error);
      localStorage.removeItem("userToken");
      setCheckingAuth(false);
    }
  }, []);

  const { toast } = useToast();

  const login = async (phone: string): Promise<boolean> => {
    try {
      const { data } = await api.post("/users/login", { phone });
      localStorage.setItem("userToken", data.token);
      console.log("🔐 Received token:", data.token);
      setIsAuthenticated(true);
      setUserPhone(data.user.phone);
      setUserName(data.user.name);
      setUserEmail(data.user.email);
      // ✅ Update the full user object on login, including phone
      setUserState({ _id: data.user._id, name: data.user.name, email: data.user.email, phone: data.user.phone });
      console.log("✅ [AuthContext] Login successful, user data:", data.user); // ADD THIS LINE
  console.log("✅ [AuthContext] userName set to:", data.user.name); // ADD THIS LINE
      return true;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.response?.data?.message || "Phone number not registered.",
      });
      return false;
    }
  };

  const register = async (name: string, phone: string, email?: string): Promise<boolean> => {
    try {
      const { data } = await api.post("/users/register", { name, phone, email });
      localStorage.setItem("userToken", data.token);
      setIsAuthenticated(true);
      setUserPhone(data.user.phone);
      setUserName(data.user.name);
      setUserEmail(data.user.email);
      // ✅ Update the full user object on registration, including phone
      setUserState({ _id: data.user._id, name: data.user.name, email: data.user.email, phone: data.user.phone });
      console.log("✅ [AuthContext] Login successful, user data:", data.user); // ADD THIS LINE
  console.log("✅ [AuthContext] userName set to:", data.user.name); // ADD THIS LINE
      return true;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error.response?.data?.message || "Something went wrong during registration.",
      });
      return false;
    }
  };

  const getProfile = async () => {
    try {
      const { data } = await api.get("/users/profile");
      setUserName(data.name);
      setUserPhone(data.phone);
      setUserEmail(data.email || "");
      // ✅ Update the full user object on profile fetch, including phone
      setUserState({ _id: data._id, name: data.name, email: data.email, phone: data.phone });
    } catch (error) {
      console.error("❌ Failed to load user profile:", error);
    }
  };

  const updateProfile = async (data: { name?: string; email?: string; phone?: string }): Promise<boolean> => {
    try {
      const userToken = localStorage.getItem("userToken");
      const { data: userData } = await api.put("/users/profile", data, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      if (userData) {
        setUserName(userData.name);
        setUserPhone(userData.phone);
        setUserEmail(userData.email);
        // ✅ Update the full user object on profile update, including phone
        setUserState({ _id: userData._id, name: userData.name, email: userData.email, phone: userData.phone });
        return true;
      }
      return false;
    } catch (error) {
      console.error("❌ Profile update error:", error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("userToken");
    setIsAuthenticated(false);
    setUserPhone(null);
    setUserName(null);
    setUserEmail(null);
    // ✅ Clear the user object on logout
    setUserState(null);
  };

  // ✅ The setUser function that will be passed in the context
  const setUser = (newUser: { _id: string; name: string; email: string; phone?: string; profilePicture?: string } | null) => { // ✅ UPDATED TYPE HERE TOO
    setUserState(newUser);
    setIsAuthenticated(!!newUser);
    if (newUser) {
      setUserName(newUser.name);
      setUserPhone(newUser.phone || null);
      setUserEmail(newUser.email);
    } else {
      setUserName(null);
      setUserPhone(null);
      setUserEmail(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userPhone,
        userName,
        userEmail,
        checkingAuth,
        login,
        logout,
        updateProfile,
        register,
        setUser, // ✅ Expose the setUser function
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};