import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, ArrowUp, BadgeCheck, CalendarClock, CheckCircle2, Clock3, HeartHandshake,
  MapPinned, Navigation, Play, Quote, Route, ShieldCheck, Sparkles, Star, Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { PublicPageShell } from "@/components/PublicPageShell";
import { SectionReveal } from "@/components/SectionReveal";
import heroImage from "@/assets/wellcare-hero.png";

const steps = [
  ["01", "Tell us what is needed", "Share the place, time and kind of everyday assistance your loved one needs."],
  ["02", "Choose now or later", "Request immediate help or schedule support around an upcoming appointment or errand."],
  ["03", "Meet the right guide", "WellCare matches the request with an available guide suited to the journey."],
  ["04", "Stay peacefully informed", "Follow clear booking updates from confirmation through safe completion."],
];

const features = [
  { icon: CalendarClock, title: "Schedule around real life", copy: "Plan assistance ahead of important appointments and time-sensitive errands.", tint: "bg-secondary" },
  { icon: Navigation, title: "Route-aware journeys", copy: "Clear pickup, destination and route context helps everyone understand the journey.", tint: "bg-accent" },
  { icon: Clock3, title: "Patient waiting support", copy: "A real person can accompany and wait—not just provide a quick ride between places.", tint: "bg-secondary" },
  { icon: ShieldCheck, title: "Safety in every state", copy: "Verification cues and transparent booking updates make the experience easier to trust.", tint: "bg-accent" },
];

const stories = [
  { person: "Ananya, Bengaluru", relation: "Booking for her father", quote: "A weekday appointment no longer has to mean choosing between an important meeting and making sure Papa is not alone." },
  { person: "Kabir, Pune", relation: "Living in another city", quote: "Knowing someone patient can help Maa with the errand makes distance feel a little less difficult." },
  { person: "Meera, Delhi", relation: "Planning ahead", quote: "She can schedule support early, explain the day clearly and remain informed without repeatedly calling home." },
];

const posts = [
  ["Family & Care", "How to plan dependable help for a parent’s appointment", "A practical checklist for turning a stressful weekday into a calmer, well-coordinated day."],
  ["Guide Stories", "Why emotional intelligence is a real-world skill", "Patience, awareness and communication can make ordinary assistance deeply meaningful."],
  ["WellCare Notes", "What trustworthy assistance should feel like", "Clear expectations, thoughtful updates and respect should be part of every journey."],
];

const reassurancePhrases = [
  "Someone dependable is there.",
  "Their day has a trusted companion.",
  "You stay informed, even from afar.",
  "The appointment feels less overwhelming.",
  "A little help brings real peace of mind.",
];

const IndexV2 = () => {
  const [reassuranceIndex, setReassuranceIndex] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(
      () => setReassuranceIndex((index) => (index + 1) % reassurancePhrases.length),
      3600,
    );
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateBackToTopVisibility = () => setShowBackToTop(window.scrollY > 560);

    updateBackToTopVisibility();
    window.addEventListener("scroll", updateBackToTopVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateBackToTopVisibility);
  }, []);
  const { t } = useTranslation(["landing", "common"]);

  return (
    <PublicPageShell>
      <section className="relative isolate min-h-[calc(100vh-4.75rem)] overflow-hidden">
        <div className="premium-grid pointer-events-none absolute inset-0 -z-10" />
        <div className="container grid items-center gap-12 py-16 lg:grid-cols-[0.88fr_1.12fr] lg:py-20">
          <SectionReveal className="relative z-10 max-w-2xl">
            <div className="eyebrow mb-6"><Sparkles className="h-4 w-4" />{t("landing:eyebrow")}</div>
            <h1 className="font-display text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-[4.75rem]">
              {t("landing:title")}
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">{t("landing:description")}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild><Link to="/book">{t("common:findHelp")}<ArrowRight /></Link></Button>
              <Button size="lg" variant="outline" asChild><Link to="/guide/register">{t("common:becomeGuide")}</Link></Button>
            </div>
            <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((item) => <span key={item} className="grid h-9 w-9 place-items-center rounded-full border-2 border-background bg-secondary text-xs font-bold text-primary">{item === 1 ? "W" : item === 2 ? "C" : "✓"}</span>)}
              </div>
              <span>{t("landing:trustLine")}</span>
            </div>
          </SectionReveal>
          <SectionReveal delay={120} className="relative">
            <div className="absolute -left-8 top-12 z-10 hidden rounded-2xl border bg-card/92 p-4 shadow-xl backdrop-blur md:block">
              <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-primary"><BadgeCheck /></span><div><p className="text-xs text-muted-foreground">Guide status</p><p className="font-semibold">Verified & ready</p></div></div>
            </div>
            <div className="relative overflow-hidden rounded-[2rem] border border-white/40 bg-card shadow-[0_35px_90px_-35px_rgba(16,70,54,.5)]">
              <img src={heroImage} alt="An illustrative WellCare guide accompanying an older woman while her daughter stays connected by video call" className="aspect-[1.18/1] h-full w-full object-cover object-center lg:aspect-[1.22/1]" />
              <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/30 bg-[rgba(13,48,39,.84)] p-4 text-white backdrop-blur-md sm:inset-x-6 sm:bottom-6">
                <div className="flex items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-[.16em] text-white/60">Today’s reassurance</p><p key={reassuranceIndex} className="reassurance-swap mt-1 font-medium">{reassurancePhrases[reassuranceIndex]}</p></div><Route className="h-6 w-6 text-[hsl(var(--warm))]" /></div>
              </div>
            </div>
            <div className="absolute -bottom-7 -right-4 hidden rounded-2xl border bg-card/92 p-4 shadow-xl backdrop-blur sm:block">
              <p className="text-xs text-muted-foreground">Journey visibility</p><div className="mt-2 flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-primary" />Clear updates, less worry</div>
            </div>
          </SectionReveal>
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/55">
        <div className="container grid gap-6 py-7 text-sm text-muted-foreground sm:grid-cols-3">
          {[["Verified guide cues", BadgeCheck], ["Human waiting assistance", HeartHandshake], ["Clear journey context", MapPinned]].map(([label, Icon]) => (
            <div key={label as string} className="flex items-center justify-center gap-3 sm:border-r sm:last:border-0"><Icon className="h-5 w-5 text-primary" /><span className="font-medium text-foreground">{label as string}</span></div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="container py-24 md:py-32">
        <SectionReveal className="max-w-3xl"><p className="eyebrow">{t("landing:howEyebrow")}</p><h2 className="section-title mt-4">{t("landing:howTitle")}</h2></SectionReveal>
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(([number, title, copy], index) => (
            <SectionReveal key={number} delay={index * 75} className="surface-card group relative min-h-64 p-6 transition duration-500 hover:-translate-y-2">
              <span className="font-display text-5xl text-primary/20">{number}</span><h3 className="mt-8 text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{copy}</p><ArrowRight className="absolute bottom-6 right-6 h-5 w-5 text-primary opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
            </SectionReveal>
          ))}
        </div>
      </section>

      <section className="bg-[hsl(160_28%_14%)] py-24 text-white md:py-32">
        <div className="container">
          <SectionReveal className="grid items-end gap-8 lg:grid-cols-2"><div><p className="eyebrow !text-[hsl(var(--warm))]">{t("landing:featuresEyebrow")}</p><h2 className="section-title mt-4 max-w-2xl">{t("landing:featuresTitle")}</h2></div><p className="section-copy !text-white/60">WellCare connects thoughtful human presence with just enough technology to keep the experience clear, coordinated and reassuring.</p></SectionReveal>
          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {features.map(({ icon: Icon, title, copy }, index) => (
              <SectionReveal key={title} delay={index * 70} className="rounded-[1.75rem] border border-white/10 bg-white/[.055] p-7 transition hover:bg-white/[.09]">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-[hsl(var(--warm))]"><Icon /></span><h3 className="mt-8 font-display text-2xl">{title}</h3><p className="mt-3 max-w-lg leading-7 text-white/60">{copy}</p>
              </SectionReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-24 md:py-32">
        <SectionReveal className="grid gap-12 lg:grid-cols-[.95fr_1.05fr] lg:items-center">
          <div className="relative overflow-hidden rounded-[2rem] bg-secondary p-4 sm:p-7">
            <div className="aspect-video rounded-[1.4rem] bg-[linear-gradient(135deg,hsl(164_50%_21%),hsl(145_28%_42%))] p-7 text-white">
              <div className="flex h-full flex-col justify-between"><p className="text-xs font-bold uppercase tracking-[.18em] text-white/60">WellCare film · Coming soon</p><button aria-label="Play the future WellCare introduction video" className="grid h-16 w-16 place-items-center rounded-full bg-[hsl(var(--warm))] text-[hsl(166_35%_12%)] shadow-xl transition hover:scale-105"><Play className="ml-1 fill-current" /></button><p className="font-display text-2xl sm:text-3xl">See what dependable presence can change.</p></div>
            </div>
          </div>
          <div><p className="eyebrow">{t("landing:trustEyebrow")}</p><h2 className="section-title mt-4">{t("landing:trustTitle")}</h2><p className="section-copy mt-6">Trust is not a badge placed at the bottom of a page. It is the result of clear expectations, visible progress and respectful people.</p>
            <div className="mt-8 grid gap-4">{["Guide identity and verification cues", "Clear booking and matching states", "Transparent route and fare context"].map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl border bg-card p-4"><CheckCircle2 className="h-5 w-5 text-primary" /><span className="font-medium">{item}</span></div>)}</div>
          </div>
        </SectionReveal>
      </section>

      <section className="bg-secondary/55 py-24 md:py-32">
        <div className="container">
          <SectionReveal className="max-w-3xl"><p className="eyebrow">{t("landing:storiesEyebrow")}</p><h2 className="section-title mt-4">{t("landing:storiesTitle")}</h2></SectionReveal>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {stories.map((story, index) => <SectionReveal key={story.person} delay={index * 80} className="surface-card flex min-h-80 flex-col p-7"><Quote className="h-9 w-9 text-primary/30" /><p className="mt-8 font-display text-xl leading-8">“{story.quote}”</p><div className="mt-auto pt-8"><p className="font-semibold">{story.person}</p><p className="text-sm text-muted-foreground">{story.relation}</p><span className="mt-3 inline-flex rounded-full bg-accent px-3 py-1 text-[.68rem] font-bold uppercase tracking-[.12em] text-accent-foreground">{t("common:sampleStory")}</span></div></SectionReveal>)}
          </div>
        </div>
      </section>

      <section className="container py-24 md:py-32">
        <SectionReveal className="overflow-hidden rounded-[2.2rem] bg-[hsl(160_28%_14%)] text-white">
          <div className="grid lg:grid-cols-[1fr_.85fr]">
            <div className="p-8 sm:p-12 lg:p-16"><p className="eyebrow !text-[hsl(var(--warm))]">{t("landing:guideEyebrow")}</p><h2 className="section-title mt-4">{t("landing:guideTitle")}</h2><p className="mt-6 max-w-xl text-lg leading-8 text-white/70">WellCare Guides bring patience, awareness and dependable presence to the moments when families need another trusted person nearby.</p><Button className="mt-9 bg-[hsl(var(--warm))] text-[hsl(166_35%_12%)] hover:bg-[hsl(var(--warm)/.9)]" size="lg" asChild><Link to="/guide/register">Start your guide journey<ArrowRight /></Link></Button></div>
            <div className="grid gap-4 bg-black/10 p-8 sm:grid-cols-2 lg:grid-cols-1 lg:p-12">{[["Flexible", "Choose when you are available."], ["Meaningful", "Help people with dignity."], ["Rewarding", "Earn through dependable service."]].map(([title, copy]) => <div key={title} className="rounded-2xl border border-white/10 bg-white/10 p-5"><Star className="h-5 w-5 text-[hsl(var(--warm))]" /><h3 className="mt-4 text-lg font-semibold">{title}</h3><p className="mt-1 text-sm text-white/60">{copy}</p></div>)}</div>
          </div>
        </SectionReveal>
      </section>

      <section className="container pb-24 md:pb-32">
        <SectionReveal className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow">{t("landing:blogEyebrow")}</p><h2 className="section-title mt-4 max-w-3xl">{t("landing:blogTitle")}</h2></div><Button variant="outline" asChild><Link to="/blogs">View all articles<ArrowRight /></Link></Button></SectionReveal>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">{posts.map(([category, title, copy], index) => <SectionReveal delay={index * 80} key={title} className="group overflow-hidden rounded-[1.6rem] border bg-card"><div className={`h-44 ${index === 0 ? "bg-[linear-gradient(135deg,#cddfce,#f5c9ab)]" : index === 1 ? "bg-[linear-gradient(135deg,#1f5c4a,#91b39c)]" : "bg-[linear-gradient(135deg,#f0d8c5,#e3b06f)]"} p-6`}><span className="grid h-full place-items-center rounded-2xl border border-white/30 bg-white/15"><Users className="h-10 w-10 text-white/75" /></span></div><div className="p-6"><p className="text-xs font-bold uppercase tracking-[.15em] text-primary">{category}</p><h3 className="mt-3 font-display text-2xl leading-8">{title}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{copy}</p><span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">Read article<ArrowRight className="transition group-hover:translate-x-1" /></span></div></SectionReveal>)}</div>
      </section>

      <button
        type="button"
        aria-label="Back to top"
        title="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full border border-primary-foreground/15 bg-primary text-primary-foreground shadow-[0_14px_35px_-12px_hsl(var(--primary)/.75)] transition-all duration-300 hover:-translate-y-1 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:bottom-8 md:right-8 ${
          showBackToTop
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        <ArrowUp className="h-5 w-5" aria-hidden="true" />
      </button>
    </PublicPageShell>
  );
};

export default IndexV2;
