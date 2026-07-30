import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  compact?: boolean;
  link?: boolean;
};

const BrandMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className={cn("h-9 w-9", className)} fill="none">
    <path
      d="M24 4.75c8.8 0 16 6.69 16 15.09 0 10.57-10.5 18.77-16 22.41-5.5-3.64-16-11.84-16-22.41C8 11.44 15.2 4.75 24 4.75Z"
      className="fill-primary"
    />
    <path
      d="M16.2 23.1c3.15-5.25 7.35-6.64 11.9-4.47 1.52.73 2.92 1.9 4.2 3.5-2.17 4.91-5.14 8.18-8.3 10.58-3.16-2.4-6.07-5.57-7.8-9.61Z"
      className="fill-primary-foreground"
    />
    <path d="M15 19.9c2.68.2 5.5 1.53 8.45 3.98 2.05-4.1 5.23-6.94 9.55-8.52" stroke="hsl(var(--warm))" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

export const BrandLogo = ({ className, compact = false, link = true }: BrandLogoProps) => {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark />
      {!compact && (
        <span className="font-display text-xl font-semibold tracking-[-0.035em] text-foreground">
          Well<span className="text-primary">Care</span>
        </span>
      )}
    </span>
  );

  return link ? (
    <Link to="/" aria-label="WellCare home" className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4">
      {content}
    </Link>
  ) : content;
};
