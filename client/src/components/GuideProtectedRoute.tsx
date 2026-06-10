import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useGuideAuth } from "@/contexts/GuideAuthContext";
import { Loader2 } from "lucide-react";

type GuideProtectedRouteProps = {
  children: ReactNode;
};

/**
 * GuideProtectedRoute
 *
 * Waits for the async session restore (isAuthLoading) before making any routing
 * decision. This prevents the race condition where isAuthenticated is briefly
 * false during the profile fetch, causing an incorrect redirect to /guide/login
 * on every hard reload.
 *
 * States:
 *  isAuthLoading=true   → show a spinner (session restore in progress)
 *  isAuthenticated=false → redirect to /guide/login
 *  currentGuide.status=pending  → redirect to /guide/pending-approval
 *  currentGuide.status=rejected → redirect to /guide/rejected
 *  else                 → render children
 */
const GuideProtectedRoute = ({ children }: GuideProtectedRouteProps) => {
  const { isAuthenticated, isAuthLoading, currentGuide } = useGuideAuth();
  const location = useLocation();

  // Wait for session restore before making any routing decision
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-sm">Loading your session…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/guide/login"
        state={{ returnUrl: location.pathname + location.search }}
        replace
      />
    );
  }

  if (currentGuide && currentGuide.status === "pending") {
    return <Navigate to="/guide/pending-approval" replace />;
  }

  if (currentGuide && currentGuide.status === "rejected") {
    return <Navigate to="/guide/rejected" replace />;
  }

  return <>{children}</>;
};

export default GuideProtectedRoute;
