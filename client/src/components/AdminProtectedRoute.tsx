// client/src/components/AdminProtectedRoute.tsx
import { useEffect, useState, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import api from "@/lib/api";

const AdminProtectedRoute = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<"checking" | "authorized" | "unauthorized">("checking");

  useEffect(() => {
    const token = localStorage.getItem("admin_token");

    if (!token) {
      setStatus("unauthorized");
      return;
    }

    // Verify token with backend
    api
      .get("/admin/verify", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => setStatus("authorized"))
      .catch(() => {
        localStorage.removeItem("admin_token");
        setStatus("unauthorized");
      });
  }, []);

  if (status === "checking") {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Verifying admin access...</div>
      </div>
    );
  }

  if (status === "unauthorized") {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;
