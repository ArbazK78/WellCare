
import { Link } from "react-router-dom";
import { Home, BookOpen, Info, Users, UserPlus } from "lucide-react";
import UserAuthButton from "./UserAuthButton";
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGuideAuth } from "@/contexts/GuideAuthContext";

const Navbar = () => {
  const { isAuthenticated: isGuideAuthenticated } = useGuideAuth();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link to="/" className="font-bold text-xl flex items-center">
            <BookOpen className="mr-2 h-5 w-5" />
            <span>Guide Connect</span>
          </Link>
          
          <NavigationMenu className="hidden md:flex ml-6">
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link to="/">
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    <Home className="mr-2 h-4 w-4" />
                    Home
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              
              <NavigationMenuItem>
                <Link to="/book">
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Book a Guide
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              
              <NavigationMenuItem>
                <Link to="/guides">
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    <Users className="mr-2 h-4 w-4" />
                    Guides
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
              
              <NavigationMenuItem>
                <Link to="/about">
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    <Info className="mr-2 h-4 w-4" />
                    About Us
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
        
        <div className="flex items-center gap-4">
          {isGuideAuthenticated ? (
            <Button variant="outline" asChild>
              <Link to="/guide/dashboard">Guide Dashboard</Link>
            </Button>
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
          
          <Link to="/dashboard" className="flex flex-col items-center p-2">
            <Users className="h-5 w-5" />
            <span className="text-xs mt-1">Dashboard</span>
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
