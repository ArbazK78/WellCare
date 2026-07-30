import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

const groups = [
  { title: "Product", links: [["How It Works", "/#how-it-works"], ["Book a Guide", "/book"], ["Safety", "/about#safety"]] },
  { title: "Company", links: [["About Us", "/about"], ["Know Our Guides", "/guides"], ["Careers · Soon", "/about"]] },
  { title: "Resources", links: [["Blogs", "/blogs"], ["Help · Soon", "/about"], ["Contact · Soon", "/about"]] },
  { title: "For Guides", links: [["Become a Guide", "/guide/register"], ["Guide Sign In", "/guide/login"]] },
];

export const PublicFooter = () => (
  <footer className="border-t border-white/10 bg-[hsl(166_35%_10%)] text-white">
    <div className="container py-16 md:py-20">
      <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr]">
        <div className="max-w-sm space-y-5">
          <BrandLogo link={false} className="[&_.font-display]:!text-white" />
          <p className="text-sm leading-7 text-white/65">Dependable human assistance for the everyday moments that matter.</p>
          <ThemeToggle />
        </div>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{group.title}</p>
              <ul className="space-y-3">
                {group.links.map(([label, href]) => (
                  <li key={label}>
                    <Link className="group inline-flex items-center gap-1 text-sm text-white/75 transition hover:text-white" to={href}>
                      {label}<ArrowUpRight className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-16 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} WellCare. All rights reserved.</p>
        <div className="flex gap-5"><span>Privacy · Soon</span><span>Terms · Soon</span><span>Accessibility</span></div>
      </div>
    </div>
  </footer>
);
