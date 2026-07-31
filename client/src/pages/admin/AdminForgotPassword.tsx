import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { KeyRound, Loader2, Lock, Mail } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AdminAuthShell } from "@/components/admin/AdminAuthShell";

const AdminForgotPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const requestCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/admin/auth/forgot-password", { email });
      toast({ title: "Check your inbox", description: data.message });
      setStep("reset");
    } catch (error) {
      toast({ variant: "destructive", title: "Request unavailable", description: axios.isAxiosError(error) ? error.response?.data?.message || "Try again shortly." : "Try again shortly." });
    } finally { setLoading(false); }
  };

  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      toast({ variant: "destructive", title: "Passwords do not match", description: "Enter the same new password twice." });
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/admin/auth/reset-password", { email, code, password });
      toast({ title: "Password updated", description: data.message });
      navigate("/admin/login", { replace: true });
    } catch (error) {
      toast({ variant: "destructive", title: "Reset failed", description: axios.isAxiosError(error) ? error.response?.data?.message || "The code could not be verified." : "The code could not be verified." });
    } finally { setLoading(false); }
  };

  return (
    <AdminAuthShell eyebrow="Account recovery" title={step === "request" ? "Recover admin access." : "Choose a new password."} description={step === "request" ? "We will send an eight-digit, single-use code to the registered administrator email." : `Enter the code sent to ${email}. It expires in 10 minutes.`}>
      {step === "request" ? (
        <form onSubmit={requestCode} className="mt-8 space-y-5">
          <div className="space-y-2"><Label htmlFor="recovery-email" className="text-white/75">Registered email</Label><div className="relative"><Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><Input id="recovery-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" className="h-12 rounded-xl border-white/10 bg-black/15 pl-11 text-white placeholder:text-white/25" /></div></div>
          <Button disabled={loading} className="h-12 w-full bg-[hsl(var(--warm))] text-[hsl(166_35%_12%)] hover:bg-[hsl(var(--warm)/.9)]">{loading ? <><Loader2 className="animate-spin" />Sending code…</> : "Send recovery code"}</Button>
        </form>
      ) : (
        <form onSubmit={resetPassword} className="mt-8 space-y-5">
          <div className="space-y-2"><Label htmlFor="recovery-code" className="text-white/75">Eight-digit code</Label><div className="relative"><KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><Input id="recovery-code" inputMode="numeric" required maxLength={8} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="00000000" className="h-12 rounded-xl border-white/10 bg-black/15 pl-11 text-white tracking-[.2em] placeholder:text-white/25" /></div></div>
          {[{ id: "new-password", label: "New password", value: password, set: setPassword }, { id: "confirm-password", label: "Confirm password", value: confirmPassword, set: setConfirmPassword }].map((field) => <div key={field.id} className="space-y-2"><Label htmlFor={field.id} className="text-white/75">{field.label}</Label><div className="relative"><Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><Input id={field.id} type="password" required minLength={12} autoComplete="new-password" value={field.value} onChange={(event) => field.set(event.target.value)} className="h-12 rounded-xl border-white/10 bg-black/15 pl-11 text-white" /></div></div>)}
          <p className="text-xs leading-5 text-white/45">Use 12–128 characters and at least three of uppercase, lowercase, numbers, and symbols.</p>
          <Button disabled={loading || code.length !== 8} className="h-12 w-full bg-[hsl(var(--warm))] text-[hsl(166_35%_12%)] hover:bg-[hsl(var(--warm)/.9)]">{loading ? <><Loader2 className="animate-spin" />Updating…</> : "Set new password"}</Button>
          <button type="button" onClick={() => setStep("request")} className="w-full text-sm text-white/55 hover:text-white">Request another code</button>
        </form>
      )}
      <Link to="/admin/login" className="mt-5 block text-center text-sm font-semibold text-[hsl(var(--warm))] hover:underline">Back to sign in</Link>
    </AdminAuthShell>
  );
};

export default AdminForgotPassword;
