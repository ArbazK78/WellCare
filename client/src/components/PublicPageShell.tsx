import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";
import { ThemeProvider } from "next-themes";
import "@/styles/ui2.css";

export const PublicPageShell = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <PublicNavbar />
      <main>{children}</main>
      <PublicFooter />
    </div>
  </ThemeProvider>
);
