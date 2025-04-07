
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
import { Phone, Send, ArrowRight, Shield, Copy, User, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";

const PhoneVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const [step, setStep] = useState<"details" | "phone" | "otp">("details");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Get the return URL from location state or default to book page
  const returnUrl = location.state?.returnUrl || "/book";

  const generateRandomOtp = () => {
    // Generate a random 6-digit number
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate name and email (simple validation)
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Name is required",
        description: "Please enter your name to continue.",
      });
      return;
    }

    // Basic email validation
    if (email && !/\S+@\S+\.\S+/.test(email)) {
      toast({
        variant: "destructive",
        title: "Invalid email",
        description: "Please enter a valid email address.",
      });
      return;
    }

    setStep("phone");
  };

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

    // Generate a random OTP
    const newOtp = generateRandomOtp();
    setGeneratedOtp(newOtp);

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

  const copyOtpToClipboard = () => {
    navigator.clipboard.writeText(generatedOtp);
    toast({
      title: "OTP copied",
      description: "OTP has been copied to clipboard",
    });
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

    // Verify if entered OTP matches generated OTP
    setTimeout(() => {
      setIsLoading(false);
      
      if (otp === generatedOtp) {
        toast({
          title: "Verification successful",
          description: "Your phone number has been verified.",
        });

        // Call the login function from AuthContext with name and email
        login(phoneNumber, name, email);
        
        // Navigate to the original destination
        navigate(returnUrl);
      } else {
        toast({
          variant: "destructive",
          title: "Invalid code",
          description: "The verification code you entered is incorrect.",
        });
      }
    }, 1500);
  };

  const resendOtp = () => {
    // Generate a new OTP
    const newOtp = generateRandomOtp();
    setGeneratedOtp(newOtp);
    
    toast({
      title: "Code resent",
      description: `A new verification code has been sent to ${phoneNumber}`,
    });
  };

  const renderStepContent = () => {
    if (step === "details") {
      return (
        <form onSubmit={handleDetailsSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="h-4 w-4" /> Full Name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> Email Address (optional)
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full"
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>
      );
    }
    
    if (step === "phone") {
      return (
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
          
          <div className="flex space-x-4">
            <Button 
              type="button"
              variant="outline"
              onClick={() => setStep("details")}
              className="flex-1"
            >
              Back
            </Button>
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send Code"}
              <Send className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      );
    }

    return (
      <form onSubmit={handleOtpSubmit} className="space-y-4">
        {/* For demo purposes only - show the OTP */}
        <div className="bg-amber-50 p-3 rounded-md border border-amber-200 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-medium text-amber-800">Demo Mode: Your OTP is</h4>
              <p className="text-amber-900 font-mono text-xl">{generatedOtp}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={copyOtpToClipboard}
              className="text-amber-800 border-amber-300"
            >
              <Copy className="h-4 w-4 mr-1" /> Copy
            </Button>
          </div>
        </div>
        
        <div className="space-y-4">
          <Label htmlFor="otp-input" className="text-center block">Enter verification code</Label>
          <div className="flex justify-center py-4">
            <InputOTP
              id="otp-input"
              maxLength={6}
              value={otp}
              onChange={setOtp}
              className="gap-2"
            >
              <InputOTPGroup>
                <InputOTPSlot key={0} index={0} />
                <InputOTPSlot key={1} index={1} />
                <InputOTPSlot key={2} index={2} />
                <InputOTPSlot key={3} index={3} />
                <InputOTPSlot key={4} index={4} />
                <InputOTPSlot key={5} index={5} />
              </InputOTPGroup>
            </InputOTP>
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
        
        <div className="flex space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setStep("phone")}
            className="flex-1"
          >
            Back
          </Button>
          <Button 
            type="submit" 
            className="flex-1" 
            disabled={isLoading}
          >
            {isLoading ? "Verifying..." : "Verify"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>
                {step === "details" && (
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    <span>Your Information</span>
                  </div>
                )}
                {step === "phone" && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    <span>Verify Your Phone</span>
                  </div>
                )}
                {step === "otp" && (
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    <span>Enter Verification Code</span>
                  </div>
                )}
              </CardTitle>
              <CardDescription>
                {step === "details" && "We need some basic information to get started"}
                {step === "phone" && "We'll send a verification code to your phone"}
                {step === "otp" && `Enter the 6-digit code sent to ${phoneNumber}`}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {renderStepContent()}
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
