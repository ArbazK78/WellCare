import { ArrowRight, Eye, HeartHandshake, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { PublicPageShell } from "@/components/PublicPageShell";
import { SectionReveal } from "@/components/SectionReveal";
import { Button } from "@/components/ui/button";

const principles = [
  [HeartHandshake, "Presence with dignity", "Assistance should protect independence and make people feel supported—not managed."],
  [Eye, "Clarity reduces worry", "Families deserve understandable booking states and useful updates throughout the journey."],
  [ShieldCheck, "Trust is designed in", "Verification, transparent expectations and responsible product decisions belong in every flow."],
];

const AboutV2 = () => (
  <PublicPageShell>
    <section className="container py-20 md:py-28">
      <SectionReveal className="grid gap-12 lg:grid-cols-[1.05fr_.95fr] lg:items-end">
        <div><p className="eyebrow"><Sparkles className="h-4 w-4" />Why WellCare exists</p><h1 className="mt-5 font-display text-5xl font-semibold leading-[1] tracking-[-.055em] sm:text-6xl lg:text-7xl">Care should not disappear when life gets busy.</h1></div>
        <p className="section-copy">Families often want to be present for every appointment, errand and difficult day. Work, distance and timing make that impossible. WellCare is being built to close that practical gap with dependable human assistance.</p>
      </SectionReveal>
    </section>
    <section className="border-y bg-[hsl(160_28%_14%)] py-24 text-white">
      <div className="container grid gap-6 md:grid-cols-3">
        {principles.map(([Icon, title, copy], index) => <SectionReveal key={title as string} delay={index * 80} className="rounded-[1.7rem] border border-white/10 bg-white/[.06] p-7"><Icon className="h-8 w-8 text-[hsl(var(--warm))]" /><h2 className="mt-8 font-display text-2xl">{title as string}</h2><p className="mt-3 leading-7 text-white/60">{copy as string}</p></SectionReveal>)}
      </div>
    </section>
    <section className="container py-24 md:py-32">
      <div className="grid gap-14 lg:grid-cols-2">
        <SectionReveal><p className="eyebrow">Our mission</p><h2 className="section-title mt-4">Make dependable everyday help easier to arrange and easier to trust.</h2></SectionReveal>
        <SectionReveal delay={100} className="space-y-6 text-lg leading-9 text-muted-foreground"><p>WellCare is not intended to replace family, medical professionals or emergency services. It supports the ordinary but important moments where another responsible person can make a meaningful difference.</p><p>The product is designed first for adults coordinating assistance for parents or loved ones, while preserving respect and clarity for the person receiving support.</p></SectionReveal>
      </div>
      <SectionReveal id="safety" className="mt-20 rounded-[2rem] bg-secondary p-8 sm:p-12"><div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]"><div><ShieldCheck className="h-12 w-12 text-primary" /><h2 className="mt-6 font-display text-3xl">Safety without empty promises.</h2></div><div className="grid gap-4 sm:grid-cols-2">{["Clear guide identity", "Transparent journey details", "Intentional booking states", "Respectful communication"].map((item) => <div key={item} className="rounded-2xl border bg-background/65 p-5 font-semibold">{item}</div>)}</div></div></SectionReveal>
    </section>
    <section className="container pb-24"><SectionReveal className="rounded-[2rem] border bg-card p-8 text-center sm:p-14"><Users className="mx-auto h-10 w-10 text-primary" /><h2 className="section-title mx-auto mt-5 max-w-3xl">A platform shaped by the people who ask for help—and the people who show up.</h2><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Button size="lg" asChild><Link to="/book">Find trusted help<ArrowRight /></Link></Button><Button size="lg" variant="outline" asChild><Link to="/guide/register">Become a guide</Link></Button></div></SectionReveal></section>
  </PublicPageShell>
);
export default AboutV2;
