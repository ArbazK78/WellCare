import { useEffect, useState, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";

const AdminProtectedRoute = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<"checking" | "authorized" | "unauthorized">("checking");

  useEffect(() => {
    api.get("/admin/auth/session")
      .then(() => setStatus("authorized"))
      .catch(() => setStatus("unauthorized"));
  }, []);

  if (status === "checking") {
    return <div className="flex min-h-screen items-center justify-center gap-3 bg-background text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Verifying administrator session…</div>;
  }
  if (status === "unauthorized") return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
};

export default AdminProtectedRoute;