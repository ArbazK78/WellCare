import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import UserAuthButton from "@/components/UserAuthButton";
import { cn } from "@/lib/utils";

const links = [
  { key: "home", href: "/" },
  { key: "howItWorks", href: "/#how-it-works" },
  { key: "about", href: "/about" },
  { key: "guides", href: "/guides" },
  { key: "blogs", href: "/blogs" },
] as const;

export const PublicNavbar = () => {
  const { t } = useTranslation(["navigation", "common"]);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-[4.75rem] items-center justify-between gap-5">
        <BrandLogo />
        <nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex">
          {links.map((item) => {
            const active = item.href === "/" ? location.pathname === "/" : location.pathname.startsWith(item.href.split("#")[0]);
            return (
              <Link
                key={item.key}
                to={item.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary/70 hover:text-foreground",
                  active && item.href !== "/#how-it-works" && "bg-secondary text-foreground",
                )}
              >
                {t(`navigation:${item.key}`)}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          <UserAuthButton />
          <Button asChild size="sm"><Link to="/book">{t("common:findHelp")}</Link></Button>
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <Button variant="ghost" size="icon" aria-label={t("navigation:openMenu")} onClick={() => setOpen((value) => !value)}>
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border/60 bg-background px-4 py-5 lg:hidden">
          <nav className="container flex flex-col gap-1" aria-label="Mobile navigation">
            {links.map((item) => (
              <Link key={item.key} to={item.href} onClick={() => setOpen(false)} className="rounded-2xl px-4 py-3 text-base font-medium hover:bg-secondary">
                {t(`navigation:${item.key}`)}
              </Link>
            ))}
            <div className="mt-4 grid gap-2 border-t pt-4">
              <Button asChild><Link to="/book" onClick={() => setOpen(false)}>{t("common:findHelp")}</Link></Button>
              <Button asChild variant="outline"><Link to="/guide/register" onClick={() => setOpen(false)}>{t("common:becomeGuide")}</Link></Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
