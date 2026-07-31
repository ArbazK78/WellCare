import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { Loader2, Lock, Mail, ShieldAlert } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AdminAuthShell } from "@/components/admin/AdminAuthShell";

const AdminAcceptInvitation = () => {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"checking" | "valid" | "invalid">("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    api.get(`/admin/auth/invitations/${encodeURIComponent(token)}`)
      .then(({ data }) => { setEmail(data.email); setStatus("valid"); })
      .catch(() => setStatus("invalid"));
  }, [token]);

  const accept = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      toast({ variant: "destructive", title: "Passwords do not match", description: "Enter the same password twice." });
      return;
    }
    setLoading(true);
    try {
      await api.post("/admin/auth/accept-invitation", { token, password });
      toast({ title: "Account activated", description: "Welcome to the WellCare Admin Console." });
      navigate("/admin", { replace: true });
    } catch (error) {
      toast({ variant: "destructive", title: "Invitation unavailable", description: axios.isAxiosError(error) ? error.response?.data?.message || "The invitation could not be accepted." : "The invitation could not be accepted." });
    } finally { setLoading(false); }
  };

  return (
    <AdminAuthShell eyebrow="Administrator invitation" title={status === "invalid" ? "This invitation is unavailable." : "Create your admin password."} description={status === "valid" ? "Accept the invitation to verify your email and activate your WellCare administrator account." : "Invitation links are single-use and expire after 24 hours."}>
      {status === "checking" && <div className="mt-8 flex items-center justify-center gap-3 text-white/60"><Loader2 className="animate-spin" />Verifying invitation…</div>}
      {status === "invalid" && <div className="mt-8 rounded-2xl border border-red-400/20 bg-red-400/10 p-5 text-sm text-red-100"><ShieldAlert className="mb-3 h-5 w-5" />Ask the WellCare owner to send a fresh invitation.</div>}
      {status === "valid" && <form onSubmit={accept} className="mt-8 space-y-5">
        <div className="space-y-2"><Label className="text-white/75">Verified invitation email</Label><div className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-black/15 px-4 text-sm text-white/75"><Mail className="h-4 w-4 text-white/35" />{email}</div></div>
        {[{ id: "invite-password", label: "Password", value: password, set: setPassword }, { id: "invite-confirm", label: "Confirm password", value: confirmPassword, set: setConfirmPassword }].map((field) => <div key={field.id} className="space-y-2"><Label htmlFor={field.id} className="text-white/75">{field.label}</Label><div className="relative"><Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" /><Input id={field.id} type="password" required minLength={12} autoComplete="new-password" value={field.value} onChange={(event) => field.set(event.target.value)} className="h-12 rounded-xl border-white/10 bg-black/15 pl-11 text-white" /></div></div>)}
        <p className="text-xs leading-5 text-white/45">Use 12–128 characters and at least three of uppercase, lowercase, numbers, and symbols.</p>
        <Button disabled={loading} className="h-12 w-full bg-[hsl(var(--warm))] text-[hsl(166_35%_12%)] hover:bg-[hsl(var(--warm)/.9)]">{loading ? <><Loader2 className="animate-spin" />Activating…</> : "Activate administrator account"}</Button>
      </form>}
    </AdminAuthShell>
  );
};

export default AdminAcceptInvitation;
