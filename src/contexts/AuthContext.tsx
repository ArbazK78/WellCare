
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type AuthContextType = {
  isAuthenticated: boolean;
  userPhone: string | null;
  userName: string | null;
  userEmail: string | null;
  login: (phone: string, name?: string, email?: string) => void;
  updateProfile: (data: {name?: string, email?: string, phone?: string}) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userPhone, setUserPhone] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Check local storage for auth state on mount
    const storedAuth = localStorage.getItem("isAuthenticated");
    const storedPhone = localStorage.getItem("userPhone");
    const storedName = localStorage.getItem("userName");
    const storedEmail = localStorage.getItem("userEmail");
    
    if (storedAuth === "true" && storedPhone) {
      setIsAuthenticated(true);
      setUserPhone(storedPhone);
      if (storedName) setUserName(storedName);
      if (storedEmail) setUserEmail(storedEmail);
    }
  }, []);

  const login = (phone: string, name?: string, email?: string) => {
    localStorage.setItem("isAuthenticated", "true");
    localStorage.setItem("userPhone", phone);
    if (name) localStorage.setItem("userName", name);
    if (email) localStorage.setItem("userEmail", email);
    
    setIsAuthenticated(true);
    setUserPhone(phone);
    if (name) setUserName(name);
    if (email) setUserEmail(email);
  };

  const updateProfile = (data: {name?: string, email?: string, phone?: string}) => {
    if (data.name) {
      localStorage.setItem("userName", data.name);
      setUserName(data.name);
    }
    if (data.email) {
      localStorage.setItem("userEmail", data.email);
      setUserEmail(data.email);
    }
    if (data.phone) {
      localStorage.setItem("userPhone", data.phone);
      setUserPhone(data.phone);
    }
  };

  const logout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("userPhone");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    setIsAuthenticated(false);
    setUserPhone(null);
    setUserName(null);
    setUserEmail(null);
  };

  const value = {
    isAuthenticated,
    userPhone,
    userName,
    userEmail,
    login,
    updateProfile,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
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
