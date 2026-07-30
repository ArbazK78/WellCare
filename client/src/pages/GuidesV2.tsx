import { ArrowRight, BadgeCheck, Heart, MapPin, Quote, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { PublicPageShell } from "@/components/PublicPageShell";
import { SectionReveal } from "@/components/SectionReveal";
import { Button } from "@/components/ui/button";

const guides = [
  { initials: "AR", name: "Aarav Rao", city: "Bengaluru", story: "A patient listener who enjoys making unfamiliar appointments and journeys feel easier to navigate.", tone: "from-[#c7d9c8] to-[#eac4aa]" },
  { initials: "SM", name: "Sana Mirza", city: "Pune", story: "She believes reliability begins with arriving prepared, communicating clearly and respecting another person’s pace.", tone: "from-[#9fc0b2] to-[#d8c7ab]" },
  { initials: "VK", name: "Vihaan Kapoor", city: "Delhi", story: "Local familiarity and calm problem-solving help him make everyday errands feel less overwhelming.", tone: "from-[#d7c4ae] to-[#7ea28e]" },
];

const GuidesV2 = () => (
  <PublicPageShell>
    <section className="container py-20 md:py-28">
      <SectionReveal className="mx-auto max-w-4xl text-center"><p className="eyebrow"><Sparkles className="h-4 w-4" />The people who show up</p><h1 className="mt-5 font-display text-5xl font-semibold leading-[1] tracking-[-.055em] sm:text-6xl">A guide is more than someone who knows the route.</h1><p className="section-copy mx-auto mt-7 max-w-2xl">WellCare Guides bring patience, presence and practical local knowledge to everyday moments that matter.</p></SectionReveal>
    </section>
    <section className="container pb-24">
      <div className="grid gap-6 lg:grid-cols-3">{guides.map((guide, index) => <SectionReveal key={guide.name} delay={index * 90} className="surface-card overflow-hidden"><div className={`grid h-56 place-items-center bg-gradient-to-br ${guide.tone}`}><span className="grid h-24 w-24 place-items-center rounded-full border-4 border-white/50 bg-white/25 font-display text-3xl text-white shadow-xl">{guide.initials}</span></div><div className="p-7"><div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-2xl">{guide.name}</h2><p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{guide.city}</p></div><BadgeCheck className="h-6 w-6 text-primary" /></div><Quote className="mt-7 h-7 w-7 text-primary/25" /><p className="mt-3 leading-7 text-muted-foreground">{guide.story}</p><span className="mt-6 inline-flex rounded-full bg-accent px-3 py-1 text-[.68rem] font-bold uppercase tracking-[.12em] text-accent-foreground">Illustrative profile</span></div></SectionReveal>)}</div>
    </section>
    <section className="bg-[hsl(160_28%_14%)] py-24 text-white"><div className="container"><SectionReveal className="grid gap-12 lg:grid-cols-2 lg:items-center"><div><p className="eyebrow !text-[hsl(var(--warm))]">What makes a guide</p><h2 className="section-title mt-4">Skills that are deeply human—and genuinely valuable.</h2><p className="mt-6 text-lg leading-8 text-white/60">Patience, attentiveness, communication and local awareness can turn a stressful day into a manageable one.</p></div><div className="grid gap-4 sm:grid-cols-2">{["Dependable presence", "Patient communication", "Local familiarity", "Respect for independence"].map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] p-5"><Heart className="h-5 w-5 text-[hsl(var(--warm))]" /><span className="font-semibold">{item}</span></div>)}</div></SectionReveal></div></section>
    <section className="container py-24"><SectionReveal className="rounded-[2rem] bg-secondary p-8 sm:p-14 lg:flex lg:items-center lg:justify-between"><div className="max-w-2xl"><p className="eyebrow">Join the community</p><h2 className="mt-4 font-display text-4xl font-semibold tracking-[-.04em]">Make your time and empathy meaningful.</h2><p className="mt-4 leading-7 text-muted-foreground">Build flexible earning opportunities by helping people move through important everyday moments with confidence.</p></div><Button size="lg" className="mt-8 lg:mt-0" asChild><Link to="/guide/register">Start your guide journey<ArrowRight /></Link></Button></SectionReveal></section>
  </PublicPageShell>
);
export default GuidesV2;
