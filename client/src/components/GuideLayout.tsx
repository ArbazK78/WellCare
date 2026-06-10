import { useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGuideAuth } from "@/contexts/GuideAuthContext";
import { useBookingNotifications } from "@/hooks/useBookingNotifications";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut, LayoutDashboard, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import IncomingBookingPopup from "@/components/IncomingBookingPopup";
import CancelledBookingPopup from "@/components/CancelledBookingPopup";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

/**
 * GuideLayout — standalone layout for all /guide/* pages.
 *
 * Isolation rules:
 *  1. Clears userToken on mount (entering guide portal ends any customer session).
 *  2. No links to the customer site.
 *  3. Online toggle fires PUT /guides/online-status.
 *  4. When Online: useBookingNotifications polls every 10s and shows IncomingBookingPopup.
 */
const GuideLayout = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isOnline, currentGuide, guideLogout, toggleOnlineStatus } = useGuideAuth();
  const { incomingBooking, dismissIncoming, cancelledBooking, dismissCancelled } = useBookingNotifications(isOnline && isAuthenticated);
  const navigate  = useNavigate();
  const { toast } = useToast();

  // ── Conflict rule: log out guide if going online as customer ──────────────
  // NOTE: We do NOT clear userToken here. The guide portal never reads
  // userToken (it uses guide_token + GuideAuthContext exclusively), so there
  // is zero UI leakage from a customer session being present.
  // CustomerRouteGuard handles the reverse: clears guide_token on customer routes.

  const handleLogout = () => {
    guideLogout();
    navigate("/guide/login");
  };

  // ── Accept booking from the popup ─────────────────────────────────────────
  const handleAccept = useCallback(async (bookingId: string) => {
    try {
      const token = localStorage.getItem("guide_token");
      await api.put(
        `/bookings/${bookingId}/status`,
        { status: "accepted" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      dismissIncoming();
      toast({ title: "Booking Accepted ✅", description: "You've accepted the booking. Head to your dashboard." });
      // Pass a refresh timestamp so GuideDashboard re-fetches immediately
      navigate("/guide/dashboard", { state: { refresh: Date.now() } });
    } catch (err) {
      toast({ title: "Failed to accept", description: "Please try again.", variant: "destructive" });
    }
  }, [dismissIncoming, navigate, toast]);


  // ── Decline booking from the popup ───────────────────────────────────────
  const handleDecline = useCallback(async (bookingId: string) => {
    try {
      const token = localStorage.getItem("guide_token");
      await api.put(
        `/bookings/${bookingId}/status`,
        { status: "rejected" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch {
      // Silent fail — the booking stays pending for other guides
    } finally {
      dismissIncoming();
    }
  }, [dismissIncoming]);

  // ── Refresh Dashboard when a cancellation is received ─────────────────────
  useEffect(() => {
    if (cancelledBooking) {
      // Refresh the dashboard immediately so the cancelled booking disappears from the Active tab
      navigate("/guide/dashboard", { state: { refresh: Date.now() } });
    }
  }, [cancelledBooking, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Guide-only header ─────────────────────────────────────────────── */}
      <header className="border-b bg-white shadow-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">

          {/* Logo */}
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

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isAuthenticated && currentGuide ? (
              <>
                {/* ── Online / Offline toggle ── */}
                <button
                  onClick={toggleOnlineStatus}
                  title={isOnline ? "You are Online — click to go Offline" : "You are Offline — click to go Online"}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-300",
                    isOnline
                      ? "bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                      : "bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200"
                  )}
                >
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      isOnline ? "bg-green-500 animate-pulse" : "bg-gray-400"
                    )}
                  />
                  {isOnline ? (
                    <><Wifi className="h-3 w-3" /> Online</>
                  ) : (
                    <><WifiOff className="h-3 w-3" /> Offline</>
                  )}
                </button>

                {/* Dashboard shortcut */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/guide/dashboard")}
                  className="hidden sm:flex items-center gap-1.5 text-gray-600"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>

                {/* Account dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline-block max-w-[120px] truncate">
                        {currentGuide.name}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
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
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-red-500 focus:text-red-500"
                    >
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

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <main className="flex-1">
        {children}
      </main>

      {/* ── Incoming booking popup (rendered at layout level so it spans all guide pages) ── */}
      {incomingBooking && (
        <IncomingBookingPopup
          booking={incomingBooking}
          onAccept={handleAccept}
          onDecline={handleDecline}
          onTimeout={dismissIncoming}
        />
      )}

      {/* ── Cancelled booking popup ── */}
      {cancelledBooking && (
        <CancelledBookingPopup
          booking={cancelledBooking}
          onDismiss={dismissCancelled}
        />
      )}
    </div>
  );
};

export default GuideLayout;
