import { useState } from "react";
import { BadgeCheck, HeartHandshake, LockKeyhole, Sparkles } from "lucide-react";
import AuthTabs from "@/components/auth/AuthTabs";
import { PublicPageShell } from "@/components/PublicPageShell";

const PhoneVerificationV2 = () => {
  const [activeTab, setActiveTab] = useState<"signin" | "register">("signin");

  return (
    <PublicPageShell>
      <section className="container py-10 md:py-16">
        <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] border bg-card shadow-[0_35px_100px_-50px_rgba(14,63,49,.6)] lg:grid-cols-[.92fr_1.08fr]">
          <aside className="relative hidden overflow-hidden bg-[hsl(160_28%_14%)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10 bg-white/[.04]" />
            <div className="relative">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[hsl(var(--warm))]"><Sparkles className="h-4 w-4" />Welcome to WellCare</p>
              <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-[-.045em]">A calmer way to arrange dependable help.</h1>
              <p className="mt-5 max-w-md leading-8 text-white/60">Your mobile number keeps your WellCare identity connected to the bookings and updates that matter.</p>
            </div>
            <div className="relative mt-16 space-y-4">
              {[["Mobile-first identity", LockKeyhole], ["Clear guide verification", BadgeCheck], ["Real human assistance", HeartHandshake]].map(([label, Icon]) => <div key={label as string} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-[hsl(var(--warm))]"><Icon className="h-5 w-5" /></span><span className="font-semibold">{label as string}</span></div>)}
            </div>
            <div className="relative mt-16 rounded-2xl border border-white/10 bg-white/[.06] p-5"><p className="text-sm leading-7 text-white/65">“Support should feel clear before the journey even begins.”</p><p className="mt-3 text-xs font-bold uppercase tracking-[.15em] text-white/40">WellCare principle</p></div>
          </aside>
          <div className="p-6 sm:p-10 lg:p-12">
            <div className="mx-auto max-w-md">
              <p className="eyebrow lg:hidden">Welcome to WellCare</p>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-.04em]">Continue with your mobile number.</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">Sign in to an existing account or create a new one in a few clear steps.</p>
              <div className="mt-9"><AuthTabs activeTab={activeTab} setActiveTab={setActiveTab} /></div>
              <p className="mt-8 text-center text-xs leading-6 text-muted-foreground">By continuing, you agree to WellCare’s future Terms and Privacy Policy. Demo authentication remains active during alpha development.</p>
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
};
export default PhoneVerificationV2;
