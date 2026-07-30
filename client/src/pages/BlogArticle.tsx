import { ArrowLeft, Clock3, Info } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { PublicPageShell } from "@/components/PublicPageShell";

const BlogArticle = () => {
  const { slug } = useParams();
  const title = slug?.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ") || "WellCare Journal";

  return (
    <PublicPageShell>
      <article className="container max-w-4xl py-16 md:py-24">
        <Link to="/blogs" className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft />Back to all articles</Link>
        <div className="mt-10 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[.14em] text-primary"><span>Illustrative article</span><span className="h-1 w-1 rounded-full bg-border" /><span className="flex items-center gap-1 normal-case tracking-normal text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />5 min read</span></div>
        <h1 className="mt-5 font-display text-5xl font-semibold capitalize leading-[1.05] tracking-[-.05em] sm:text-6xl">{title}</h1>
        <p className="mt-7 text-xl leading-9 text-muted-foreground">A sample WellCare Journal article demonstrating the editorial experience until genuine content is ready.</p>
        <div className="my-12 grid aspect-[16/7] place-items-center rounded-[2rem] bg-[linear-gradient(135deg,#bcd2c2,#efc5a9)]"><Info className="h-14 w-14 text-white/70" /></div>
        <div className="prose prose-lg max-w-none dark:prose-invert">
          <p>Being unable to attend every appointment or errand does not mean a family cares any less. Often, work, distance and timing simply make physical presence difficult.</p>
          <h2>Start with a clear picture of the day</h2>
          <p>Useful assistance begins with the basics: where someone needs to go, when they need to arrive, how long they may need to wait, and what would help them feel comfortable throughout the journey.</p>
          <h2>Preserve dignity and independence</h2>
          <p>The best support does not take control away. It makes the day easier while respecting the person’s preferences, pace and independence.</p>
          <blockquote>This is illustrative editorial content and is not presented as professional medical or legal advice.</blockquote>
        </div>
      </article>
    </PublicPageShell>
  );
};

export default BlogArticle;
