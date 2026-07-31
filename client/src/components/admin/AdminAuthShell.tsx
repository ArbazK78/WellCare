import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export const AdminAuthShell = ({ eyebrow, title, description, children }: Props) => {
  const navigate = useNavigate();
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[hsl(166_35%_9%)] px-4 py-12 text-white">
      <div className="premium-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <BrandLogo link={false} className="[&_.font-display]:!text-white" />
          <span className="rounded-full border border-white/10 bg-white/[.06] px-3 py-1.5 text-xs font-bold uppercase tracking-[.15em] text-white/55">{eyebrow}</span>
        </div>
        <section className="rounded-[2rem] border border-white/10 bg-white/[.065] p-7 shadow-2xl backdrop-blur-xl sm:p-9">
          <span className="grid h-13 w-13 place-items-center rounded-2xl bg-[hsl(var(--warm))] text-[hsl(166_35%_12%)]"><ShieldCheck className="h-6 w-6" /></span>
          <h1 className="mt-7 text-4xl font-semibold tracking-[-.04em]">{title}</h1>
          <p className="mt-3 text-sm leading-7 text-white/55">{description}</p>
          {children}
          <p className="mt-6 border-t border-white/10 pt-5 text-center text-xs leading-6 text-white/35">Restricted to authorized WellCare administrators. Security activity is recorded.</p>
        </section>
        <button onClick={() => navigate("/")} className="mx-auto mt-6 flex items-center gap-2 text-sm text-white/45 transition hover:text-white"><ArrowLeft className="h-4 w-4" />Return to WellCare</button>
      </div>
    </main>
  );
};
