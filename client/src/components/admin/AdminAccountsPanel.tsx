import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Activity, Ban, CheckCircle2, Clock3, MailPlus, RefreshCw, Shield, UserRoundCog, XCircle } from "lucide-react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type AdminAccount = {
  id: string;
  email: string;
  role: "owner" | "admin";
  status: "invited" | "active" | "suspended" | "revoked";
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
};

type AuditEvent = {
  _id: string;
  action: string;
  actorEmail?: string | null;
  targetEmail?: string | null;
  createdAt: string;
};

const statusStyles: Record<AdminAccount["status"], string> = {
  active: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  invited: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  suspended: "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  revoked: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
};

const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Never";

const AdminAccountsPanel = () => {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revokeAccount, setRevokeAccount] = useState<AdminAccount | null>(null);

  const load = useCallback(async () => {
    try {
      const [accountsResponse, auditResponse] = await Promise.all([
        api.get("/admin/accounts"),
        api.get("/admin/audit-log"),
      ]);
      setAccounts(accountsResponse.data);
      setAudit(auditResponse.data.slice(0, 12));
    } catch (error) {
      toast({ variant: "destructive", title: "Admin accounts unavailable", description: axios.isAxiosError(error) ? error.response?.data?.message || "Unable to load administrator accounts." : "Unable to load administrator accounts." });
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusyId("invite");
    try {
      const { data } = await api.post("/admin/accounts/invitations", { email: inviteEmail });
      toast({ title: "Invitation created", description: data.emailProvider === "console" ? "Development preview is available in the server terminal." : `Invitation sent to ${inviteEmail}.` });
      setInviteEmail("");
      setInviteOpen(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Invitation incomplete", description: axios.isAxiosError(error) ? error.response?.data?.message || "The invitation could not be created." : "The invitation could not be created." });
    } finally { setBusyId(null); await load(); }
  };

  const resend = async (account: AdminAccount) => {
    setBusyId(account.id);
    try {
      const { data } = await api.post(`/admin/accounts/${account.id}/resend-invitation`);
      toast({ title: "Invitation refreshed", description: data.emailProvider === "console" ? "Development preview is available in the server terminal." : `A fresh invitation was sent to ${account.email}.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Could not resend", description: axios.isAxiosError(error) ? error.response?.data?.message || "Check the email configuration." : "Check the email configuration." });
    } finally { setBusyId(null); await load(); }
  };

  const changeStatus = async (account: AdminAccount, status: "active" | "suspended" | "revoked") => {
    const destructive = status === "revoked";
    const confirmation = destructive ? window.confirm(`Revoke ${account.email}? Their active sessions will end immediately.`) : true;
    if (!confirmation) return;
    setBusyId(account.id);
    try {
      const { data } = await api.patch(`/admin/accounts/${account.id}/status`, { status });
      toast({ title: "Access updated", description: data.message });
    } catch (error) {
      toast({ variant: "destructive", title: "Access update failed", description: axios.isAxiosError(error) ? error.response?.data?.message || "The account could not be updated." : "The account could not be updated." });
    } finally { setBusyId(null); await load(); }
  };

  return (
    <div className="space-y-6">
      <Card className="surface-card overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div><CardTitle className="flex items-center gap-2"><UserRoundCog className="h-5 w-5 text-primary" />Administrator accounts</CardTitle><CardDescription className="mt-2">Only the protected owner can invite, suspend, restore, or revoke administrators.</CardDescription></div>
          <Button onClick={() => setInviteOpen(true)}><MailPlus className="h-4 w-4" />Invite administrator</Button>
        </CardHeader>
        <CardContent>
          {loading ? <div className="py-12 text-center text-muted-foreground">Loading administrator accounts…</div> : <div className="grid gap-4 lg:grid-cols-2">
            {accounts.map((account) => <article key={account.id} className="rounded-2xl border border-border bg-background/55 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><p className="font-bold text-foreground">{account.email}</p>{account.role === "owner" && <Shield className="h-4 w-4 text-primary" />}</div><p className="mt-1 text-xs uppercase tracking-[.12em] text-muted-foreground">{account.role}</p></div><Badge variant="outline" className={statusStyles[account.status]}>{account.status}</Badge></div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-muted/45 p-3"><p className="text-xs text-muted-foreground">Last sign in</p><p className="mt-1 font-medium">{formatDate(account.lastLoginAt)}</p></div><div className="rounded-xl bg-muted/45 p-3"><p className="text-xs text-muted-foreground">Email verified</p><p className="mt-1 font-medium">{account.emailVerifiedAt ? "Verified" : "Pending"}</p></div></div>
              {account.role !== "owner" && <div className="mt-5 flex flex-wrap gap-2">
                {account.status === "invited" && <Button size="sm" variant="outline" disabled={busyId === account.id} onClick={() => resend(account)}><RefreshCw className="h-4 w-4" />Resend invitation</Button>}
                {account.status === "active" && <Button size="sm" variant="outline" disabled={busyId === account.id} onClick={() => changeStatus(account, "suspended")}><Ban className="h-4 w-4" />Suspend</Button>}
                {(account.status === "suspended" || (account.status === "revoked" && Boolean(account.emailVerifiedAt))) && <Button size="sm" variant="outline" disabled={busyId === account.id} onClick={() => changeStatus(account, "active")}><CheckCircle2 className="h-4 w-4" />Restore</Button>}
                {account.status !== "revoked" && <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" disabled={busyId === account.id} onClick={() => setRevokeAccount(account)}><XCircle className="h-4 w-4" />Revoke</Button>}
              </div>}
            </article>)}
          </div>}
        </CardContent>
      </Card>

      <Card className="surface-card"><CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />Security activity</CardTitle><CardDescription>Recent administrator authentication and access-management events.</CardDescription></CardHeader><CardContent className="space-y-2">{audit.length === 0 ? <p className="text-sm text-muted-foreground">No security events recorded yet.</p> : audit.map((event) => <div key={event._id} className="flex items-start justify-between gap-4 rounded-xl border border-border px-4 py-3"><div><p className="text-sm font-semibold">{event.action.replaceAll("admin.", "").replaceAll("_", " ")}</p><p className="mt-1 text-xs text-muted-foreground">{event.actorEmail || "Public recovery flow"}{event.targetEmail ? ` → ${event.targetEmail}` : ""}</p></div><span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3 w-3" />{formatDate(event.createdAt)}</span></div>)}</CardContent></Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}><DialogContent><form onSubmit={invite}><DialogHeader><DialogTitle>Invite an administrator</DialogTitle><DialogDescription>The recipient will verify this email and choose their own password. Invitations expire after 24 hours.</DialogDescription></DialogHeader><div className="my-6 space-y-2"><Label htmlFor="invite-admin-email">Email address</Label><Input id="invite-admin-email" type="email" required value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="operations@example.com" /></div><DialogFooter><Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button><Button disabled={busyId === "invite"}>{busyId === "invite" ? "Sending…" : "Send invitation"}</Button></DialogFooter></form></DialogContent></Dialog>
      <Dialog open={Boolean(revokeAccount)} onOpenChange={(open) => !open && setRevokeAccount(null)}><DialogContent><DialogHeader><DialogTitle>Revoke administrator access?</DialogTitle><DialogDescription>{revokeAccount?.email} will be signed out immediately and will no longer be able to enter the Admin Console.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setRevokeAccount(null)}>Keep access</Button><Button variant="destructive" disabled={!revokeAccount || busyId === revokeAccount.id} onClick={async () => { if (!revokeAccount) return; const account = revokeAccount; setRevokeAccount(null); await changeStatus(account, "revoked"); }}>Revoke access</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
};

export default AdminAccountsPanel;
