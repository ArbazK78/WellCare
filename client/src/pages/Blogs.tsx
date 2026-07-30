import { ArrowRight, BookOpen, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";
import { PublicPageShell } from "@/components/PublicPageShell";
import { SectionReveal } from "@/components/SectionReveal";

const articles = [
  { slug: "planning-help-for-a-parent", category: "Family & Care", time: "6 min read", title: "How to plan dependable help for a parent’s appointment", copy: "A calm checklist for coordinating timing, travel, waiting assistance and updates.", color: "from-[#c9ddce] to-[#efc2a6]" },
  { slug: "emotional-intelligence-as-a-skill", category: "Guide Stories", time: "5 min read", title: "Why emotional intelligence is a real-world skill", copy: "Patience, observation and thoughtful communication can transform an ordinary errand.", color: "from-[#2b6756] to-[#8fb09a]" },
  { slug: "trustworthy-assistance", category: "WellCare Notes", time: "4 min read", title: "What trustworthy assistance should feel like", copy: "Trust grows from transparent expectations, respectful behaviour and useful updates.", color: "from-[#e7d4c0] to-[#dcaa69]" },
  { slug: "living-away-from-parents", category: "Family & Care", time: "7 min read", title: "Supporting parents while living in another city", copy: "Distance changes logistics, but it should not remove reassurance or human presence.", color: "from-[#b7d5d0] to-[#e5ded0]" },
  { slug: "first-day-as-a-guide", category: "Guide Stories", time: "5 min read", title: "What a meaningful first day as a guide could look like", copy: "Preparedness, dignity and clear communication matter more than dramatic gestures.", color: "from-[#d6c3ad] to-[#719c84]" },
  { slug: "scheduled-assistance", category: "Product", time: "5 min read", title: "When scheduled assistance makes the day easier", copy: "Why planning ahead can reduce uncertainty around appointments and important errands.", color: "from-[#cbdcbf] to-[#e9b58d]" },
];

const Blogs = () => (
  <PublicPageShell>
    <section className="container py-20 md:py-28">
      <SectionReveal className="max-w-3xl">
        <p className="eyebrow">The WellCare Journal</p>
        <h1 className="mt-4 font-display text-5xl font-semibold tracking-[-.05em] sm:text-6xl">Thoughtful notes on care, distance and dependable help.</h1>
        <p className="section-copy mt-6">Practical ideas and human stories for families and future WellCare Guides. All articles currently contain illustrative editorial content.</p>
      </SectionReveal>
      <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((article, index) => (
          <SectionReveal key={article.slug} delay={(index % 3) * 70} className="group overflow-hidden rounded-[1.7rem] border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <div className={`grid h-48 place-items-center bg-gradient-to-br ${article.color}`}><BookOpen className="h-12 w-12 text-white/70" /></div>
            <div className="p-6">
              <div className="flex items-center justify-between gap-4 text-xs font-semibold uppercase tracking-[.13em] text-primary"><span>{article.category}</span><span className="flex items-center gap-1 normal-case tracking-normal text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{article.time}</span></div>
              <h2 className="mt-4 font-display text-2xl leading-8">{article.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{article.copy}</p>
              <Link to={`/blogs/${article.slug}`} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">Read sample article<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></Link>
            </div>
          </SectionReveal>
        ))}
      </div>
    </section>
  </PublicPageShell>
);

export default Blogs;
