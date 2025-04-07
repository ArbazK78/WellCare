
import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useGuideAuth } from "@/contexts/GuideAuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Phone, Lock, Eye, EyeOff } from "lucide-react";
import Navbar from "@/components/Navbar";

const GuideLogin = () => {
  const { guideLogin } = useGuideAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Get the return URL from location state or default to guide dashboard
  const returnUrl = location.state?.returnUrl || "/guide/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await guideLogin(phone, password);
      
      if (success) {
        toast({
          title: "Login successful",
          description: "Welcome back to GuideMate!",
        });
        navigate(returnUrl);
      } else {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: "Invalid phone number or password.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Guide Login</CardTitle>
              <CardDescription>
                Log in to your guide account to manage bookings and update your profile.
              </CardDescription>
            </CardHeader>
            
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" /> Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your registered phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" /> Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button 
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      onClick={togglePasswordVisibility}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col space-y-4">
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? "Logging in..." : "Login"}
                </Button>
                
                <div className="text-center text-sm">
                  Not registered yet? {" "}
                  <Link to="/guide/register" className="text-blue-600 hover:underline">
                    Register as a guide
                  </Link>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GuideLogin;
