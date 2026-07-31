import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import axios from "axios";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AdminAuthShell } from "@/components/admin/AdminAuthShell";
import "@/styles/ui2.css";

const AdminLoginV2 = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      toast({ variant: "destructive", title: "Missing credentials", description: "Please enter your email and password." });
      return;
    }
    setLoading(true);
    try {
      await api.post("/admin/auth/login", { email, password });
      toast({ title: "Access granted", description: "Welcome to the WellCare Admin Console." });
      navigate("/admin", { replace: true });
    } catch (error: unknown) {
      const description = axios.isAxiosError(error) ? error.response?.data?.message || "Invalid email or password." : "Invalid email or password.";
      toast({ variant: "destructive", title: "Access denied", description });
    } finally { setLoading(false); }
  };

  return (
    <AdminAuthShell eyebrow="Admin console" title="Secure administration access." description="Sign in with your registered administrator email to manage WellCare operations, guide approvals and platform access.">
      <form onSubmit={handleLogin} className="mt-8 space-y-5">
        <div className="space-y-2"><Label htmlFor="admin-email" className="text-white/75">Email address</Label><div className="relative"><Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><Input id="admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" placeholder="admin@example.com" className="h-12 rounded-xl border-white/10 bg-black/15 pl-11 text-white placeholder:text-white/25 focus-visible:ring-[hsl(var(--warm))]" /></div></div>
        <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="admin-password" className="text-white/75">Password</Label><Link to="/admin/forgot-password" className="text-xs font-semibold text-[hsl(var(--warm))] hover:underline">Forgot password?</Link></div><div className="relative"><Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><Input id="admin-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Admin password" className="h-12 rounded-xl border-white/10 bg-black/15 pl-11 pr-11 text-white placeholder:text-white/25 focus-visible:ring-[hsl(var(--warm))]" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
        <Button type="submit" disabled={loading} className="h-12 w-full bg-[hsl(var(--warm))] text-[hsl(166_35%_12%)] hover:bg-[hsl(var(--warm)/.9)]">{loading ? <><Loader2 className="animate-spin" />Verifying access…</> : "Enter admin console"}</Button>
      </form>
    </AdminAuthShell>
  );
};

export default AdminLoginV2;