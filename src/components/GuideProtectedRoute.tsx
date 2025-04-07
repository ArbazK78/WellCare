
import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useGuideAuth } from "@/contexts/GuideAuthContext";

type GuideProtectedRouteProps = {
  children: ReactNode;
};

const GuideProtectedRoute = ({ children }: GuideProtectedRouteProps) => {
  const { isAuthenticated, currentGuide } = useGuideAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to guide login, passing the current path as returnUrl
    return (
      <Navigate 
        to="/guide/login" 
        state={{ returnUrl: location.pathname + location.search }} 
        replace
      />
    );
  }

  // If the guide is authenticated but not approved, redirect to a pending approval page
  if (currentGuide && currentGuide.status === "pending") {
    return (
      <Navigate 
        to="/guide/pending-approval" 
        replace
      />
    );
  }

  // If the guide is rejected, redirect to a rejection page
  if (currentGuide && currentGuide.status === "rejected") {
    return (
      <Navigate 
        to="/guide/rejected" 
        replace
      />
    );
  }

  return <>{children}</>;
};

export default GuideProtectedRoute;
