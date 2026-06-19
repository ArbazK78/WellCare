import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { Phone, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Navigate } from "react-router-dom";
import PhoneVerificationForm from "./PhoneVerificationForm";
import api from "@/lib/api";

const SignInForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationStep, setVerificationStep] = useState<"phone" | "otp">("phone"); const { toast } = useToast();
  const navigate = useNavigate();
  const { setUser, isAuthenticated, checkingAuth } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [navigate, isAuthenticated]);

  const handleGoogleSignIn = () => {
    toast({
      title: "Google Sign In",
      description: "This is a dummy implementation. Please connect Supabase for actual Google authentication.",
    });
  };

  if (checkingAuth) {
    return null; // or <LoadingSpinner />
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        variant: "destructive",
        title: "Invalid phone number",
        description: "Please enter a valid phone number.",
      });
      return;
    }

    setIsLoading(true);

    try {
      await api.post("/users/login", { phone: phoneNumber });
      setVerificationStep("otp");
      toast({
        title: "Verification code sent",
        description: `A 6-digit code has been sent to ${phoneNumber}`,
      });
    } catch (error: any) {
      console.error("❌ Login attempt failed:", error?.response?.data);
      toast({
        variant: "destructive",
        title: "Phone number not registered",
        description: "Please register before signing in.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (verificationStep === "otp") {
    return (
      <PhoneVerificationForm
        phoneNumber={phoneNumber}
        onBack={() => setVerificationStep("phone")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone" className="flex items-center gap-2">
          <Phone className="h-4 w-4" /> Phone Number
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="Enter your phone number"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
        />
      </div>

      <Button
        type="button"
        className="w-full"
        disabled={isLoading}
        onClick={handleSendOtp}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            Send Verification Code
            <Send className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with Google
          </span>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignIn}
      >
        <div className="mr-2 h-4 w-4 flex items-center justify-center">
          <span className="font-bold text-red-500">G</span>
        </div>
        Sign in with Google
      </Button>
    </div>
  );
};

export default SignInForm;