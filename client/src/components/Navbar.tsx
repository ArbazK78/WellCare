import { Link } from "react-router-dom";
import { Home, BookOpen, Info, Users } from "lucide-react";
import UserAuthButton from "./UserAuthButton";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

/**
 * Customer-only Navbar.
 * Has zero knowledge of guide auth — guide portal uses GuideLayout instead.
 *
 * Conflict rule: if a guide_token exists when a customer-side page loads,
 * it is cleared here (handled via App.tsx CustomerRouteGuard).
 */
const Navbar = () => {
  const location  = useLocation();
  const navigate  = useNavigate();

  // Admin pages get a stripped-down header
  if (location.pathname.startsWith("/admin")) {
    return (
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="font-bold text-xl flex items-center">
            <BookOpen className="mr-2 h-5 w-5" />
            <span>WellCare</span>
          </Link>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => {
              localStorage.removeItem("admin_token");
              navigate("/admin/login");
            }}
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">

        {/* Logo + desktop nav */}
        <div className="flex items-center gap-2">
          <Link to="/" className="font-bold text-xl flex items-center">
            <BookOpen className="mr-2 h-5 w-5" />
            <span>WellCare</span>
          </Link>

          <NavigationMenu className="hidden md:flex ml-6">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                  <Link to="/">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Home
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                  <Link to="/book">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Book a Guide
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                  <Link to="/guides">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Guides
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                  <Link to="/about">
                    <BookOpen className="mr-2 h-4 w-4" />
                    About Us
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Customer auth only */}
        <div className="flex items-center gap-4">
          <UserAuthButton />
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="md:hidden border-t">
        <div className="container flex justify-between py-2">
          <Link to="/" className="flex flex-col items-center p-2">
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Home</span>
          </Link>
          <Link to="/book" className="flex flex-col items-center p-2">
            <BookOpen className="h-5 w-5" />
            <span className="text-xs mt-1">Book</span>
          </Link>
          <Link to="/guides" className="flex flex-col items-center p-2">
            <Users className="h-5 w-5" />
            <span className="text-xs mt-1">Guides</span>
          </Link>
          <Link to="/about" className="flex flex-col items-center p-2">
            <Info className="h-5 w-5" />
            <span className="text-xs mt-1">About</span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
