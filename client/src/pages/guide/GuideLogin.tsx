
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
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const GuideLogin = () => {
  const { guideLogin } = useGuideAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Forgot password states
  const [forgotPhone, setForgotPhone] = useState("");
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Get the return URL from location state or default to guide dashboard
  const returnUrl = location.state?.returnUrl || "/guide/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
  
    try {
      const result = await guideLogin(phone, password);
      console.log("Login result:", result); // <-- Add this line
  
      if (result === "success") {
        toast({
          title: "Login successful",
          description: "Welcome back to GuideMate!",
        });
        navigate(returnUrl);
      } else if (result === "pending") {
        navigate("/guide/pending-approval");
      } else if (result === "rejected") {
        navigate("/guide/rejected");
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
        title: "Something went wrong",
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  const handleSendOTP = () => {
    if (!forgotPhone) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter your phone number",
      });
      return;
    }
    
    setIsSendingOTP(true);
    
    // Simulate OTP sending
    setTimeout(() => {
      setIsSendingOTP(false);
      setShowOTPInput(true);
      toast({
        title: "OTP sent",
        description: "A demo OTP (1234) has been sent to your phone",
      });
    }, 1000);
  };
  
  const handleResetPassword = () => {
    if (otp !== "1234") {
      toast({
        variant: "destructive",
        title: "Invalid OTP",
        description: "Please enter the correct OTP",
      });
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "New password and confirm password must match",
      });
      return;
    }
    
    if (newPassword.length < 8) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 8 characters long",
      });
      return;
    }
    
    setIsResettingPassword(true);
    
    // Simulate password reset
    setTimeout(() => {
      // In a real app, we would call an API to reset the password
      // For demo, we'll just update localStorage
      
      const guides = JSON.parse(localStorage.getItem("guides") || "[]");
      const updatedGuides = guides.map((g: any) => 
        g.phone === forgotPhone ? {...g, password: newPassword} : g
      );
      localStorage.setItem("guides", JSON.stringify(updatedGuides));
      
      setIsResettingPassword(false);
      toast({
        title: "Password reset successful",
        description: "You can now login with your new password",
      });
      
      // Reset the form and close the dialog
      setForgotPhone("");
      setOtp("");
      setNewPassword("");
      setConfirmNewPassword("");
      setShowOTPInput(false);
    }, 1500);
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
                
                <div className="flex justify-end">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="link" type="button" className="px-0 h-auto font-normal">
                        Forgot Password?
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                          Enter your registered phone number to receive a verification code.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="forgotPhone">Phone Number</Label>
                          <Input
                            id="forgotPhone"
                            type="tel"
                            placeholder="Enter your registered phone number"
                            value={forgotPhone}
                            onChange={(e) => setForgotPhone(e.target.value)}
                          />
                        </div>
                        
                        {showOTPInput && (
                          <>
                            <div className="space-y-2">
                              <Label>Enter OTP</Label>
                              <div className="flex justify-center py-2">
                                <InputOTP maxLength={4} value={otp} onChange={setOtp}>
                                  <InputOTPGroup>
                                    <InputOTPSlot index={0} />
                                    <InputOTPSlot index={1} />
                                    <InputOTPSlot index={2} />
                                    <InputOTPSlot index={3} />
                                  </InputOTPGroup>
                                </InputOTP>
                              </div>
                              <p className="text-xs text-center text-muted-foreground">
                                Demo OTP is always "1234"
                              </p>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="newPassword">New Password</Label>
                              <div className="relative">
                                <Input
                                  id="newPassword"
                                  type={showNewPassword ? "text" : "password"}
                                  placeholder="Enter new password"
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                />
                                <button 
                                  type="button"
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                  onClick={() => setShowNewPassword(!showNewPassword)}
                                >
                                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                              <div className="relative">
                                <Input
                                  id="confirmNewPassword"
                                  type={showNewPassword ? "text" : "password"}
                                  placeholder="Confirm new password"
                                  value={confirmNewPassword}
                                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      
                      <DialogFooter>
                        {!showOTPInput ? (
                          <Button 
                            onClick={handleSendOTP} 
                            disabled={isSendingOTP || !forgotPhone}
                          >
                            {isSendingOTP ? "Sending..." : "Send OTP"}
                          </Button>
                        ) : (
                          <Button 
                            onClick={handleResetPassword} 
                            disabled={isResettingPassword || !otp || !newPassword || !confirmNewPassword}
                          >
                            {isResettingPassword ? "Resetting..." : "Reset Password"}
                          </Button>
                        )}
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
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
