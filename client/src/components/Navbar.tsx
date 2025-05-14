
import { Link } from "react-router-dom";
import { Home, BookOpen, Info, Users, UserPlus, User } from "lucide-react";
import UserAuthButton from "./UserAuthButton";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGuideAuth } from "@/contexts/GuideAuthContext";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const Navbar = () => {
  const { isAuthenticated: isGuideAuthenticated, currentGuide, guideLogout } = useGuideAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we're in the guide section
  const isGuidePage = location.pathname.startsWith('/guide/');

  // Check if we're in the admin section
  const isAdminPage = location.pathname.startsWith('/admin/');

  // If admin page, only show logo and logout button
  if (isAdminPage) {
    return (
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="font-bold text-xl flex items-center">
            <BookOpen className="mr-2 h-5 w-5" />
            <span>GuideMate</span>
          </Link>

          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => {
              // Implement admin logout here when needed
              navigate("/admin");
            }}
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>
      </header>
    );
  }

  // If guide page, show simplified navbar for guides
  if (isGuidePage && isGuideAuthenticated) {
    return (
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="font-bold text-xl flex items-center">
              <BookOpen className="mr-2 h-5 w-5" />
              <span>GuideMate</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline-block">
                    {currentGuide?.name || "Guide Account"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {currentGuide?.name ? `Hi, ${currentGuide.name.split(' ')[0]}` : 'Guide Account'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/guide/dashboard")}>
                  Guide Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/guide/edit-profile")}>
                  Edit Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    guideLogout();
                    navigate("/guide/login");
                  }}
                  className="text-red-500"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    );
  }

  // Regular navbar for other pages
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" className="font-bold text-xl flex items-center">
            <BookOpen className="mr-2 h-5 w-5" />
            <span>GuideMate</span>
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

        <div className="flex items-center gap-4">
          {isGuideAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline-block">
                    {currentGuide?.name || "Guide Account"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  {currentGuide?.name ? `Hi, ${currentGuide.name.split(' ')[0]}` : 'Guide Account'}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/guide/dashboard")}>
                  Guide Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/guide/edit-profile")}>
                  Edit Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    guideLogout();
                    navigate("/guide/login");
                  }}
                  className="text-red-500"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" asChild>
              <Link to="/guide/register">
                <UserPlus className="mr-2 h-4 w-4" />
                Become a Guide
              </Link>
            </Button>
          )}
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
