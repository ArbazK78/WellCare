
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  InputOTP, 
  InputOTPGroup, 
  InputOTPSlot 
} from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { Phone, Send, ArrowRight, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const PhoneVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Get the return URL from location state or default to book page
  const returnUrl = location.state?.returnUrl || "/book";

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate phone number (simple validation for demo)
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        variant: "destructive",
        title: "Invalid phone number",
        description: "Please enter a valid phone number.",
      });
      return;
    }

    setIsLoading(true);

    // In a real app, you would call an API to send OTP
    // Simulate API call with timeout
    setTimeout(() => {
      setIsLoading(false);
      setStep("otp");
      
      toast({
        title: "Verification code sent",
        description: `A 6-digit code has been sent to ${phoneNumber}`,
      });
    }, 1500);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      toast({
        variant: "destructive",
        title: "Invalid code",
        description: "Please enter a valid 6-digit code.",
      });
      return;
    }

    setIsLoading(true);

    // In a real app, you would verify the OTP with an API
    // Simulate API call with timeout
    setTimeout(() => {
      setIsLoading(false);
      
      // For demo purposes, any 6-digit OTP is valid
      // In production, this would verify against the actual OTP
      toast({
        title: "Verification successful",
        description: "Your phone number has been verified.",
      });

      // Call the login function from AuthContext
      login(phoneNumber);
      
      // Navigate to the original destination
      navigate(returnUrl);
    }, 1500);
  };

  const resendOtp = () => {
    toast({
      title: "Code resent",
      description: `A new verification code has been sent to ${phoneNumber}`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>
                {step === "phone" ? (
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    <span>Verify Your Phone</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    <span>Enter Verification Code</span>
                  </div>
                )}
              </CardTitle>
              <CardDescription>
                {step === "phone" 
                  ? "We'll send a verification code to your phone" 
                  : `Enter the 6-digit code sent to ${phoneNumber}`}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {step === "phone" ? (
                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="flex gap-2">
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        required
                        className="flex-1"
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending..." : "Send Verification Code"}
                    <Send className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleOtpSubmit} className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex justify-center py-4">
                      <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={setOtp}
                        render={({ slots }) => (
                          <InputOTPGroup>
                            {slots.map((slot, i) => (
                              <InputOTPSlot key={i} index={i} />
                            ))}
                          </InputOTPGroup>
                        )}
                      />
                    </div>
                    
                    <div className="text-center">
                      <Button 
                        variant="link" 
                        type="button" 
                        onClick={resendOtp}
                        className="text-sm"
                      >
                        Didn't receive a code? Resend
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Verifying..." : "Verify"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              )}
            </CardContent>
            
            <CardFooter className="flex justify-center text-sm text-gray-500 border-t pt-4">
              <p>Your privacy is important to us. We'll never share your information.</p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PhoneVerification;
