import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGuideAuth } from "@/contexts/GuideAuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, LayoutDashboard } from "lucide-react";

/**
 * GuideLayout — standalone layout for all /guide/* pages.
 *
 * Isolation rules enforced here:
 *  1. Clears any customer userToken on mount (entering the guide portal
 *     ends any active customer session — no dual-login allowed).
 *  2. Has its own minimal header with no links to the customer site.
 *  3. Logo links to /guide/dashboard (not to /).
 */
const GuideLayout = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, currentGuide, guideLogout } = useGuideAuth();
  const navigate = useNavigate();

  // ── Conflict rule ──────────────────────────────────────────────────────────
  // Entering the guide portal clears any customer session token.
  // This makes it impossible to be simultaneously logged in as both.
  useEffect(() => {
    const customerToken = localStorage.getItem("userToken");
    if (customerToken) {
      localStorage.removeItem("userToken");
      // Also clear any auth-related customer state keys
      localStorage.removeItem("userData");
    }
  }, []);

  const handleLogout = () => {
    guideLogout();
    navigate("/guide/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Guide-only header — no customer nav links */}
      <header className="border-b bg-white shadow-sm">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo — links to guide dashboard, not customer home */}
          <Link
            to={isAuthenticated ? "/guide/dashboard" : "/guide/login"}
            className="flex items-center gap-2 font-bold text-xl text-blue-700 hover:text-blue-800 transition-colors"
          >
            <span className="text-2xl">🏥</span>
            <span>WellCare</span>
            <span className="text-xs font-normal text-gray-400 ml-1 hidden sm:inline">
              Guide Portal
            </span>
          </Link>

          {/* Right side — only guide auth actions */}
          <div className="flex items-center gap-3">
            {isAuthenticated && currentGuide ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/guide/dashboard")}
                  className="hidden sm:flex items-center gap-1.5 text-gray-600"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline-block max-w-[120px] truncate">
                        {currentGuide.name}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel className="text-xs text-gray-500 font-normal">
                      Signed in as guide
                    </DropdownMenuLabel>
                    <DropdownMenuLabel className="font-semibold -mt-1">
                      {currentGuide.name}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/guide/dashboard")}>
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      My Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/guide/edit-profile")}>
                      <User className="mr-2 h-4 w-4" />
                      Edit Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button size="sm" asChild>
                <Link to="/guide/login">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

export default GuideLayout;
