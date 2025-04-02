
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type AuthContextType = {
  isAuthenticated: boolean;
  userPhone: string | null;
  login: (phone: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userPhone, setUserPhone] = useState<string | null>(null);

  useEffect(() => {
    // Check local storage for auth state on mount
    const storedAuth = localStorage.getItem("isAuthenticated");
    const storedPhone = localStorage.getItem("userPhone");
    
    if (storedAuth === "true" && storedPhone) {
      setIsAuthenticated(true);
      setUserPhone(storedPhone);
    }
  }, []);

  const login = (phone: string) => {
    localStorage.setItem("isAuthenticated", "true");
    localStorage.setItem("userPhone", phone);
    setIsAuthenticated(true);
    setUserPhone(phone);
  };

  const logout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("userPhone");
    setIsAuthenticated(false);
    setUserPhone(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userPhone, login, logout }}>
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
