
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type ProtectedRouteProps = {
  children: ReactNode;
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to phone verification, passing the current path as returnUrl
    return (
      <Navigate 
        to="/verify-phone" 
        state={{ returnUrl: location.pathname + location.search }} 
        replace
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
