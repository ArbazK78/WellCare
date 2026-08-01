import { ArrowLeft, Home, RefreshCw, RouteOff, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import "@/styles/ui2.css";

type ErrorStatePageProps = {
  kind: "not-found" | "unexpected";
  onRetry?: () => void;
};

export const ErrorStatePage = ({ kind, onRetry }: ErrorStatePageProps) => {
  const { t } = useTranslation("errors");
  const navigate = useNavigate();
  const notFound = kind === "not-found";
  const Icon = notFound ? RouteOff : ShieldAlert;
  const code = notFound ? "404" : "500";

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="premium-grid pointer-events-none absolute inset-0 opacity-65" />
      <div className="pointer-events-none absolute -left-28 top-24 h-72 w-72 rounded-full bg-[hsl(var(--warm)/.18)] blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-12 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />

      <header className="relative z-10 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="container flex h-[4.75rem] items-center justify-between">
          <BrandLogo />
          <ThemeToggle />
        </div>
      </header>

      <section className="container relative z-10 flex min-h-[calc(100vh-4.75rem)] items-center justify-center py-12 sm:py-20">
        <div className="surface-card relative w-full max-w-3xl overflow-hidden px-6 py-10 text-center sm:px-12 sm:py-14">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[hsl(var(--warm))] to-transparent" />

          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-primary/15 bg-primary/10 text-primary shadow-[0_20px_45px_-28px_hsl(var(--primary))] sm:h-24 sm:w-24">
            <Icon className="h-9 w-9 sm:h-11 sm:w-11" strokeWidth={1.7} />
          </div>

          <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/55 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--warm))]" />
            {t("code", { code })}
          </div>

          <h1 className="mx-auto mt-6 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
            {t(`${kind}.title`)}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            {t(`${kind}.description`)}
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            {!notFound && onRetry && (
              <Button size="lg" onClick={onRetry} className="gap-2 rounded-full px-7">
                <RefreshCw className="h-4 w-4" />
                {t("tryAgain")}
              </Button>
            )}
            <Button size="lg" variant={notFound ? "default" : "outline"} onClick={() => navigate("/")} className="gap-2 rounded-full px-7">
              <Home className="h-4 w-4" />
              {t("home")}
            </Button>
            <Button size="lg" variant="ghost" onClick={() => navigate(-1)} className="gap-2 rounded-full px-7">
              <ArrowLeft className="h-4 w-4" />
              {t("goBack")}
            </Button>
          </div>

          <p className="mt-10 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground/80">
            {t("reassurance")}
          </p>
        </div>
      </section>
    </main>
  );
};
