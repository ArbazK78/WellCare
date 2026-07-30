import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Loader2, Lock, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { BrandLogo } from "@/components/BrandLogo";
import api from "@/lib/api";
import axios from "axios";
import "@/styles/ui2.css";

const AdminLoginV2 = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast({ variant: "destructive", title: "Missing credentials", description: "Please enter both username and password." });
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/admin/login", { username, password });
      localStorage.setItem("admin_token", data.token);
      toast({ title: "Access granted", description: "Welcome to the WellCare Admin Panel." });
      navigate("/admin");
    } catch (error: unknown) {
      const description = axios.isAxiosError(error) ? error.response?.data?.message || "Invalid admin credentials." : "Invalid admin credentials.";
      toast({ variant: "destructive", title: "Access denied", description });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[hsl(166_35%_9%)] px-4 py-12 text-white">
      <div className="premium-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex items-center justify-between"><BrandLogo link={false} className="[&_.font-display]:!text-white" /><span className="rounded-full border border-white/10 bg-white/[.06] px-3 py-1.5 text-xs font-bold uppercase tracking-[.15em] text-white/55">Admin console</span></div>
        <section className="rounded-[2rem] border border-white/10 bg-white/[.065] p-7 shadow-2xl backdrop-blur-xl sm:p-9">
          <span className="grid h-13 w-13 place-items-center rounded-2xl bg-[hsl(var(--warm))] text-[hsl(166_35%_12%)]"><ShieldCheck className="h-6 w-6" /></span>
          <h1 className="mt-7 font-display text-4xl font-semibold tracking-[-.04em]">Secure administration access.</h1>
          <p className="mt-3 text-sm leading-7 text-white/55">Sign in to manage WellCare operations, guide approvals and bookings.</p>
          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div className="space-y-2"><Label htmlFor="username" className="text-white/75">Username</Label><div className="relative"><User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><Input id="username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" placeholder="Admin username" className="h-12 rounded-xl border-white/10 bg-black/15 pl-11 text-white placeholder:text-white/25 focus-visible:ring-[hsl(var(--warm))]" /></div></div>
            <div className="space-y-2"><Label htmlFor="password" className="text-white/75">Password</Label><div className="relative"><Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Admin password" className="h-12 rounded-xl border-white/10 bg-black/15 pl-11 pr-11 text-white placeholder:text-white/25 focus-visible:ring-[hsl(var(--warm))]" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
            <Button type="submit" disabled={loading} className="h-12 w-full bg-[hsl(var(--warm))] text-[hsl(166_35%_12%)] hover:bg-[hsl(var(--warm)/.9)]">{loading ? <><Loader2 className="animate-spin" />Verifying access…</> : "Enter admin console"}</Button>
          </form>
          <p className="mt-6 border-t border-white/10 pt-5 text-center text-xs leading-6 text-white/35">Restricted to authorized WellCare administrators. Activity may be monitored for platform safety.</p>
        </section>
        <button onClick={() => navigate("/")} className="mx-auto mt-6 flex items-center gap-2 text-sm text-white/45 transition hover:text-white"><ArrowLeft className="h-4 w-4" />Return to WellCare</button>
      </div>
    </main>
  );
};
export default AdminLoginV2;
